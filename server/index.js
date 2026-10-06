import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const db = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null;

export const initDb = async () => {
  if (!db) {
    console.warn('DATABASE_URL not set; database features are disabled until configured.');
    return;
  }
  try {
    const schemaSql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
    await db.query(schemaSql);
    console.log('Database schema verified.');
  } catch (err) {
    console.error('Database initialization warning:', err.message);
  }
};

export const app = express();
app.use(cors(), express.json());

// Health check endpoint for container and deployment verification
app.get('/health', async (_req, res) => {
  let dbStatus = 'not_configured';
  if (db) {
    try {
      await db.query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'unreachable';
    }
  }
  res.json({ status: 'ok', service: 'repopulse-api', database: dbStatus, uptime: process.uptime() });
});

// The one place status is decided. Defaults to 7/14/30 days.
export const statusOf = (lastCommitAt, now = Date.now(), thresholds = { active: 7, cooling: 14, stale: 30 }) => {
  if (!lastCommitAt) return 'dead';
  const days = Math.floor((now - new Date(lastCommitAt)) / 864e5);
  return days <= thresholds.active ? 'active' : days <= thresholds.cooling ? 'cooling' : days <= thresholds.stale ? 'stale' : 'dead';
};

const DEFAULT_THRESHOLDS = { active_max_days: 7, cooling_max_days: 14, stale_max_days: 30 };

export const getSettings = async () => {
  if (!db) return DEFAULT_THRESHOLDS;
  try {
    const { rows } = await db.query('SELECT active_max_days, cooling_max_days, stale_max_days FROM settings WHERE id=1');
    return rows[0] || DEFAULT_THRESHOLDS;
  } catch {
    return DEFAULT_THRESHOLDS;
  }
};

const gh = async (path) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not configured in server environment.');
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    throw new Error(`GitHub rate limit hit. Try again at ${new Date(reset * 1000).toLocaleTimeString()}.`);
  }
  if (res.status === 401) throw new Error('GitHub rejected the token. Check GITHUB_TOKEN in server/.env.');
  if (res.status === 409) return []; // empty repo
  if (!res.ok) throw new Error(`GitHub returned ${res.status} for ${path}`);
  return res.json();
};

const DAYS = 30;
const strip = (commits) => {
  const bins = Array(DAYS).fill(0);
  for (const c of commits) {
    const age = Math.floor((Date.now() - new Date(c.commit.author.date)) / 864e5);
    if (age >= 0 && age < DAYS) bins[DAYS - 1 - age]++;
  }
  return bins; // oldest -> newest
};

// Global settings API
app.get('/api/settings', async (_req, res) => {
  const settings = await getSettings();
  res.json(settings);
});

app.patch('/api/settings', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  const active = Math.max(1, parseInt(req.body.active_max_days, 10) || 7);
  const cooling = Math.max(active, parseInt(req.body.cooling_max_days, 10) || 14);
  const stale = Math.max(cooling, parseInt(req.body.stale_max_days, 10) || 30);

  try {
    const { rows } = await db.query(
      `UPDATE settings SET active_max_days=$1, cooling_max_days=$2, stale_max_days=$3, updated_at=now()
       WHERE id=1 RETURNING active_max_days, cooling_max_days, stale_max_days`,
      [active, cooling, stale]
    );
    res.json(rows[0] || { active_max_days: active, cooling_max_days: cooling, stale_max_days: stale });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Summary KPI statistics
app.get('/api/stats', async (_req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const settings = await getSettings();
    const thresholds = { active: settings.active_max_days, cooling: settings.cooling_max_days, stale: settings.stale_max_days };
    const { rows } = await db.query('SELECT * FROM repos');

    let active = 0, cooling = 0, stale = 0, dead = 0, paused = 0, favorites = 0, archived = 0;
    for (const r of rows) {
      if (r.is_archived) { archived++; continue; }
      if (r.lifecycle_status === 'paused') { paused++; }
      if (r.is_favorite) favorites++;
      const st = statusOf(r.last_commit_at, Date.now(), thresholds);
      if (st === 'active') active++;
      else if (st === 'cooling') cooling++;
      else if (st === 'stale') stale++;
      else dead++;
    }

    res.json({
      total: rows.length,
      active,
      cooling,
      stale,
      dead,
      paused,
      favorites,
      archived,
      thresholds
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync from GitHub
app.post('/api/sync', async (_req, res) => {
  try {
    if (!db) throw new Error('DATABASE_URL not configured.');
    const me = await gh('/user');
    const repos = await gh('/user/repos?per_page=100&sort=pushed&affiliation=owner');
    const since = new Date(Date.now() - DAYS * 864e5).toISOString();
    for (let i = 0; i < repos.length; i += 5) {
      await Promise.all(repos.slice(i, i + 5).map(async (r) => {
        const base = `/repos/${r.full_name}/commits?author=${me.login}`;
        const recent = await gh(`${base}&since=${since}&per_page=100`);
        const [latest] = recent.length ? recent : await gh(`${base}&per_page=1`);
        await db.query(
          `INSERT INTO repos (github_id, full_name, html_url, description, language, last_commit_at, commit_days, synced_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,now())
           ON CONFLICT (github_id) DO UPDATE SET full_name=$2, html_url=$3, description=$4, language=$5,
             last_commit_at=$6, commit_days=$7, synced_at=now()`,
          [r.id, r.full_name, r.html_url, r.description, r.language, latest?.commit.author.date ?? null, JSON.stringify(strip(recent))]
        );
      }));
    }
    res.json({ synced: repos.length });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// Seed deterministic demo data for instant evaluation
app.post('/api/demo-seed', async (_req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const now = Date.now();
    const day = 864e5;
    const samples = [
      {
        id: 101,
        name: 'repo-pulse',
        url: 'https://github.com/kachakaran6/repo-pulse',
        desc: 'Personal developer activity dashboard and repository pulse',
        lang: 'JavaScript',
        daysAgo: 0,
        commits: [3, 2, 5, 1, 0, 4, 2, 0, 1, 0, 0, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
        label: 'Application',
        lifecycle: 'active',
        priority: 'high',
        stack: ['React', 'Node.js', 'Express', 'PostgreSQL', 'Docker'],
        fav: true,
        notes: 'Targeting production release on Coolify.'
      },
      {
        id: 102,
        name: 'trust-tracker',
        url: 'https://github.com/kachakaran6/Trust-Tracker',
        desc: 'AI-powered financial transaction ledger and expense tracking',
        lang: 'TypeScript',
        daysAgo: 2,
        commits: [0, 0, 1, 0, 2, 4, 3, 1, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        label: 'Web app',
        lifecycle: 'active',
        priority: 'high',
        stack: ['Next.js', 'FastAPI', 'PostgreSQL'],
        fav: true,
        notes: 'Core ledger logic verified with PostHog analytics.'
      },
      {
        id: 103,
        name: 'ledgr-core',
        url: 'https://github.com/kachakaran6/Ledgr',
        desc: 'Double-entry accounting microservice with cryptographic audit trails',
        lang: 'Go',
        daysAgo: 10,
        commits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        label: 'API/service',
        lifecycle: 'active',
        priority: 'normal',
        stack: ['Go', 'PostgreSQL', 'Redis'],
        fav: false,
        notes: 'Needs database vacuuming and read replica setup.'
      },
      {
        id: 104,
        name: 'equiptrack-be',
        url: 'https://github.com/kachakaran6/equiptrack',
        desc: 'Industrial asset management and telemetry ingestion engine',
        lang: 'TypeScript',
        daysAgo: 12,
        commits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        label: 'Full ERP',
        lifecycle: 'active',
        priority: 'normal',
        stack: ['NestJS', 'PostgreSQL', 'Telegram API'],
        fav: false,
        notes: 'Automated nightly Telegram backup verified.'
      },
      {
        id: 105,
        name: 'chattalk-server',
        url: 'https://github.com/kachakaran6/chattalk',
        desc: 'WebSocket powered real-time team messaging engine',
        lang: 'TypeScript',
        daysAgo: 20,
        commits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        label: 'API/service',
        lifecycle: 'paused',
        priority: 'normal',
        stack: ['Node.js', 'Socket.IO', 'Redis'],
        fav: false,
        notes: 'Paused while focusing on RepoPulse.'
      },
      {
        id: 106,
        name: 'beacon-landing',
        url: 'https://github.com/kachakaran6/beacon',
        desc: 'High-converting marketing static site for SaaS analytics',
        lang: 'HTML',
        daysAgo: 26,
        commits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0],
        label: 'Client work',
        lifecycle: 'completed',
        priority: 'low',
        stack: ['Astro', 'Tailwind CSS'],
        fav: false,
        notes: 'Launched and handed off.'
      },
      {
        id: 107,
        name: 'crypto-arbitrage-bot',
        url: 'https://github.com/kachakaran6/crypto-bot',
        desc: 'Experimental high-frequency DEX orderbook scanner',
        lang: 'Python',
        daysAgo: 58,
        commits: Array(30).fill(0),
        label: 'Experiment',
        lifecycle: 'needs_review',
        priority: 'low',
        stack: ['Python', 'Asyncio', 'Web3.py'],
        fav: false,
        notes: 'No commits in ~2 months. Candidate for archive.'
      },
      {
        id: 108,
        name: 'legacy-invoice-pdf',
        url: 'https://github.com/kachakaran6/invoice-pdf',
        desc: 'Headless Chrome invoice generator with Puppeteer',
        lang: 'JavaScript',
        daysAgo: 120,
        commits: Array(30).fill(0),
        label: 'Library',
        lifecycle: 'completed',
        priority: 'low',
        stack: ['Node.js', 'Puppeteer'],
        fav: false,
        notes: 'Frozen stable utility.'
      }
    ];

    for (const s of samples) {
      const lastCommit = new Date(now - s.daysAgo * day).toISOString();
      await db.query(
        `INSERT INTO repos (github_id, full_name, html_url, description, language, last_commit_at, commit_days, label, lifecycle_status, priority, tech_stack, notes, is_favorite, is_archived, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,FALSE,now())
         ON CONFLICT (github_id) DO UPDATE SET full_name=$2, html_url=$3, description=$4, language=$5,
           last_commit_at=$6, commit_days=$7, label=$8, lifecycle_status=$9, priority=$10, tech_stack=$11, notes=$12, is_favorite=$13, synced_at=now()`,
        [s.id, s.name, s.url, s.desc, s.lang, lastCommit, JSON.stringify(s.commits), s.label, s.lifecycle, s.priority, JSON.stringify(s.stack), s.notes, s.fav]
      );
    }
    res.json({ message: 'Demo data loaded successfully', count: samples.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List repositories with search, filter, and sorting
app.get('/api/repos', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const settings = await getSettings();
    const thresholds = {
      active: settings.active_max_days,
      cooling: settings.cooling_max_days,
      stale: settings.stale_max_days
    };

    const { rows } = await db.query('SELECT * FROM repos ORDER BY last_commit_at DESC NULLS LAST');

    const search = String(req.query.search || '').trim().toLowerCase();
    const statusFilter = String(req.query.status || 'all').toLowerCase();
    const lifecycleFilter = String(req.query.lifecycle || 'all').toLowerCase();
    const labelFilter = String(req.query.label || 'all').toLowerCase();
    const showArchived = req.query.archived === 'true';
    const sortBy = String(req.query.sort || 'recent').toLowerCase();

    let list = rows.map((r) => {
      const computedStatus = statusOf(r.last_commit_at, Date.now(), thresholds);
      return {
        ...r,
        status: computedStatus,
        tech_stack: Array.isArray(r.tech_stack) ? r.tech_stack : (typeof r.tech_stack === 'string' ? JSON.parse(r.tech_stack || '[]') : []),
        commit_days: Array.isArray(r.commit_days) ? r.commit_days : (typeof r.commit_days === 'string' ? JSON.parse(r.commit_days || '[]') : [])
      };
    });

    // Archived filter
    list = list.filter(r => showArchived ? r.is_archived : !r.is_archived);

    // Search filter
    if (search) {
      list = list.filter(r =>
        (r.full_name && r.full_name.toLowerCase().includes(search)) ||
        (r.description && r.description.toLowerCase().includes(search)) ||
        (r.label && r.label.toLowerCase().includes(search)) ||
        (r.language && r.language.toLowerCase().includes(search)) ||
        (r.tech_stack && r.tech_stack.some(t => String(t).toLowerCase().includes(search)))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(r => r.status === statusFilter);
    }

    // Lifecycle filter
    if (lifecycleFilter !== 'all') {
      list = list.filter(r => r.lifecycle_status === lifecycleFilter);
    }

    // Label filter
    if (labelFilter !== 'all') {
      list = list.filter(r => (r.label || '').toLowerCase() === labelFilter);
    }

    // Sorting
    if (sortBy === 'name_asc') {
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (sortBy === 'commits_desc') {
      const sum = arr => arr.reduce((acc, n) => acc + (Number(n) || 0), 0);
      list.sort((a, b) => sum(b.commit_days) - sum(a.commit_days));
    } else if (sortBy === 'priority_desc') {
      const pMap = { high: 3, normal: 2, low: 1 };
      list.sort((a, b) => (pMap[b.priority] || 2) - (pMap[a.priority] || 2));
    } else {
      // default: recent commit
      list.sort((a, b) => {
        if (!a.last_commit_at && !b.last_commit_at) return 0;
        if (!a.last_commit_at) return 1;
        if (!b.last_commit_at) return -1;
        return new Date(b.last_commit_at) - new Date(a.last_commit_at);
      });
    }

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update repository annotations
app.patch('/api/repos/:id', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const id = req.params.id;
    const updates = [];
    const values = [];
    let idx = 1;

    if (req.body.label !== undefined) {
      updates.push(`label=$${idx++}`);
      values.push(String(req.body.label ?? '').trim().slice(0, 40) || null);
    }
    if (req.body.lifecycle_status !== undefined) {
      const allowed = ['active', 'paused', 'completed', 'archived', 'needs_review'];
      const st = String(req.body.lifecycle_status).toLowerCase();
      if (allowed.includes(st)) {
        updates.push(`lifecycle_status=$${idx++}`);
        values.push(st);
      }
    }
    if (req.body.priority !== undefined) {
      const allowed = ['low', 'normal', 'high'];
      const pr = String(req.body.priority).toLowerCase();
      if (allowed.includes(pr)) {
        updates.push(`priority=$${idx++}`);
        values.push(pr);
      }
    }
    if (req.body.tech_stack !== undefined) {
      updates.push(`tech_stack=$${idx++}`);
      values.push(JSON.stringify(Array.isArray(req.body.tech_stack) ? req.body.tech_stack : []));
    }
    if (req.body.notes !== undefined) {
      updates.push(`notes=$${idx++}`);
      values.push(String(req.body.notes ?? '').trim() || null);
    }
    if (req.body.is_favorite !== undefined) {
      updates.push(`is_favorite=$${idx++}`);
      values.push(Boolean(req.body.is_favorite));
    }
    if (req.body.is_archived !== undefined) {
      updates.push(`is_archived=$${idx++}`);
      values.push(Boolean(req.body.is_archived));
    }
    if (req.body.threshold_days !== undefined) {
      updates.push(`threshold_days=$${idx++}`);
      values.push(req.body.threshold_days ? parseInt(req.body.threshold_days, 10) : null);
    }

    if (!updates.length) return res.json({ ok: true, message: 'No updates provided' });

    values.push(id);
    await db.query(`UPDATE repos SET ${updates.join(', ')} WHERE github_id=$${idx}`, values);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear repos (reset)
app.delete('/api/repos', async (_req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    await db.query('TRUNCATE TABLE repos');
    res.json({ ok: true, message: 'Repositories cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend build if present
const clientDist = path.resolve(__dirname, '../client/dist');
const publicDir = path.resolve(__dirname, './public');
const staticDir = fs.existsSync(clientDist) ? clientDist : (fs.existsSync(publicDir) ? publicDir : null);

if (staticDir) {
  app.use(express.static(staticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await initDb();
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`RepoPulse API on :${port}`));
}
