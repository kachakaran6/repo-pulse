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

// The one place status is decided.
export const statusOf = (lastCommitAt, now = Date.now()) => {
  if (!lastCommitAt) return 'dead';
  const days = Math.floor((now - new Date(lastCommitAt)) / 864e5);
  return days <= 7 ? 'active' : days <= 14 ? 'cooling' : days <= 30 ? 'stale' : 'dead';
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

app.get('/api/repos', async (_req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows } = await db.query('SELECT * FROM repos ORDER BY last_commit_at DESC NULLS LAST');
    res.json(rows.map((r) => ({ ...r, status: statusOf(r.last_commit_at) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/repos/:id', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const label = String(req.body.label ?? '').trim().slice(0, 40) || null;
    await db.query('UPDATE repos SET label=$1 WHERE github_id=$2', [label, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend build if present (for single-container production deployment)
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
