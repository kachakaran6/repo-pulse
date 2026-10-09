import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { db } from '../db/index.js';
import { computeUnifiedStats, computeAchievements } from '../core/stats.js';
import { DEFAULT_THRESHOLDS } from '../core/status.js';

export const shareRouter = Router();

const snapshotConfigSchema = z.object({
  template: z.enum(['summary', 'streak', 'heat_strip', 'language_mix', 'achievements', 'triage_progress']),
  size: z.enum(['1200x630', '1080x1080', '1080x1350', '1080x1920']).default('1200x630'),
  period: z.enum(['7d', '30d', '90d', 'year']).default('30d'),
  theme: z.enum(['light', 'dark', 'heat-accent']).default('dark'),
  scale: z.enum(['small', 'medium', 'large']).default('medium'),
  title: z.string().max(80).optional(),
  subtitle: z.string().max(80).optional(),
  showAvatar: z.boolean().default(true),
  showHandle: z.boolean().default(true),
  watermark: z.boolean().default(true),
  hidePrivateNames: z.boolean().default(true),
  hideAllRepoNames: z.boolean().default(false),
  activeStats: z.array(z.string()).default([
    'commits',
    'reposTouched',
    'activeRepos',
    'longestStreak',
    'languages',
  ]),
});

/**
 * POST /api/snapshots
 * Creates a frozen snapshot record with 128-bit random base64url slug
 */
shareRouter.post('/api/snapshots', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const parsed = snapshotConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid share card configuration', details: parsed.error.format() });
    return;
  }

  const config = parsed.data;
  const user = await db.findUserById(userId);
  const rawRepos = await db.getUserRepos(userId);
  const statusChanges = await db.getRecentStatusChanges(userId, 7);
  const stats = computeUnifiedStats(rawRepos as any, DEFAULT_THRESHOLDS, statusChanges);
  const achievements = computeAchievements(stats);

  // Sanitize repo names according to privacy settings
  const sanitizedRepos = rawRepos.map((r) => {
    let name = r.full_name;
    if (config.hideAllRepoNames) {
      name = 'Repository';
    } else if (config.hidePrivateNames && r.is_private) {
      name = 'Private repo';
    }

    return {
      name,
      is_private: r.is_private,
      status: r.status || 'active',
      language: r.language,
      commits_30d: (r.activity || []).slice(-30).reduce((s, a: any) => s + (a.commits_mine || a.commits || 0), 0),
    };
  });

  // Frozen data payload
  const snapshotData = {
    user: {
      login: config.showHandle ? user?.login : undefined,
      avatar_url: config.showAvatar ? user?.avatar_url : undefined,
    },
    stats: {
      totalRepos: stats.totalRepos,
      activeCount: stats.activeCount,
      coolingCount: stats.coolingCount,
      staleCount: stats.staleCount,
      deadCount: stats.deadCount,
      weeklyCommits: stats.weeklyCommits,
      totalCommits7d: stats.totalCommits7d,
      totalCommits30d: stats.totalCommits30d,
      totalCommits90d: stats.totalCommits90d,
      longestStreak: stats.longestStreak,
      currentStreak: stats.currentStreak,
      mostActiveWeekday: stats.mostActiveWeekday,
      summarySentence: stats.summarySentence,
      languages: stats.languages.slice(0, 5),
      weeklyVelocity: stats.weeklyVelocity.slice(-8),
    },
    achievements: achievements.filter(a => a.earned),
    repos: sanitizedRepos.slice(0, 10),
    created_at: new Date().toISOString(),
  };

  // Generate 128-bit random base64url slug
  const slug = crypto.randomBytes(16).toString('base64url');

  const snapshot = await db.createSnapshot(userId, {
    slug,
    title: config.title || `${user?.login || 'Developer'}'s RepoPulse`,
    template: config.template,
    config,
    data: snapshotData,
  });

  await db.logAudit(userId, 'snapshot_created', { slug, template: config.template });

  res.json({
    ok: true,
    slug,
    url: `/s/${slug}`,
    snapshot,
  });
});

/**
 * GET /api/snapshots
 * Returns all active snapshots created by the user
 */
shareRouter.get('/api/snapshots', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const snapshots = await db.getSnapshots(userId);
  res.json(snapshots);
});

/**
 * DELETE /api/snapshots/:slug
 * Revokes a snapshot
 */
shareRouter.delete('/api/snapshots/:slug', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const slug = req.params.slug;
  const revoked = await db.revokeSnapshot(slug, userId);
  if (!revoked) {
    res.status(404).json({ error: 'Snapshot not found or already revoked' });
    return;
  }
  await db.logAudit(userId, 'snapshot_revoked', { slug });
  res.json({ ok: true, message: 'Card revoked successfully' });
});

/**
 * Helper to render SVG Card based on selected template
 */
export function renderCardSvg(snapshot: any): string {
  const { config, data } = snapshot;
  const [wStr, hStr] = (config.size || '1200x630').split('x');
  const width = parseInt(wStr, 10) || 1200;
  const height = parseInt(hStr, 10) || 630;

  const isDark = config.theme === 'dark' || config.theme === 'heat-accent';
  const isHeatAccent = config.theme === 'heat-accent';
  const bgColor = isDark ? '#131413' : '#F2F3F1';
  const surfaceColor = isDark ? '#1C1D1B' : '#FFFFFF';
  const textColor = isDark ? '#EDEEEA' : '#14181B';
  const subtextColor = isDark ? '#A2A8A4' : '#4B545B';
  const borderColor = isDark ? '#2E302D' : '#DADDDA';
  const accentColor = isHeatAccent ? '#D2382A' : (isDark ? '#EDEEEA' : '#14181B');

  const title = config.title || `${data.user?.login ? `@${data.user.login}'s ` : ''}RepoPulse`;
  const subtitle = config.subtitle || data.stats?.summarySentence || 'Active repository momentum and commit health';
  const stats = data.stats || {};
  const template = config.template || 'summary';

  // Card Inner Canvas Dimensions
  const pad = 40;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  let templateContent = '';

  if (template === 'summary') {
    templateContent = `
      <!-- Stat Blocks (4 columns) -->
      <g transform="translate(80, 180)">
        <rect x="0" y="0" width="220" height="110" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
        <text x="20" y="55" class="stat-val">${stats.totalCommits30d || stats.weeklyCommits || 0}</text>
        <text x="20" y="85" class="stat-label">Commits (30 Days)</text>

        <rect x="240" y="0" width="220" height="110" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
        <text x="260" y="55" class="stat-val">${stats.activeCount || 0}</text>
        <text x="260" y="85" class="stat-label">Active Repositories</text>

        <rect x="480" y="0" width="220" height="110" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
        <text x="500" y="55" class="stat-val">${stats.longestStreak || 0}d</text>
        <text x="500" y="85" class="stat-label">Longest Streak</text>

        <rect x="720" y="0" width="220" height="110" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
        <text x="740" y="55" class="stat-val">${stats.totalRepos || 0}</text>
        <text x="740" y="85" class="stat-label">Total Repositories</text>
      </g>

      <!-- Heat Status Bar -->
      <g transform="translate(80, 330)">
        <text x="0" y="-12" class="section-label">LIVELINESS DISTRIBUTION</text>
        <rect x="0" y="0" width="${innerW - 80}" height="18" rx="4" fill="${borderColor}" />
        <rect x="0" y="0" width="${Math.max(4, ((stats.activeCount || 0) / Math.max(1, stats.totalRepos || 1)) * (innerW - 80))}" height="18" rx="4" fill="#D2382A" />
      </g>

      <!-- Liveliness Legend -->
      <g transform="translate(80, 380)">
        <rect x="0" y="0" width="12" height="12" rx="2" fill="#D2382A" />
        <text x="20" y="10" class="legend-text">Active (${stats.activeCount || 0})</text>

        <rect x="140" y="0" width="12" height="12" rx="2" fill="#E88C38" />
        <text x="160" y="10" class="legend-text">Cooling (${stats.coolingCount || 0})</text>

        <rect x="280" y="0" width="12" height="12" rx="2" fill="#86AED0" />
        <text x="300" y="10" class="legend-text">Stale (${stats.staleCount || 0})</text>

        <rect x="420" y="0" width="12" height="12" rx="2" fill="#757D84" />
        <text x="440" y="10" class="legend-text">Dead (${stats.deadCount || 0})</text>
      </g>
    `;
  } else if (template === 'streak') {
    templateContent = `
      <g transform="translate(80, 180)">
        <rect x="0" y="0" width="340" height="200" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
        <text x="30" y="70" class="hero-val">${stats.longestStreak || 0}</text>
        <text x="30" y="105" class="hero-unit">DAYS</text>
        <text x="30" y="140" class="stat-label">Longest Continuous Streak</text>
        <text x="30" y="165" class="stat-sub">Current: ${stats.currentStreak || 0} consecutive days</text>

        <rect x="370" y="0" width="340" height="200" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
        <text x="400" y="70" class="hero-val">${stats.totalCommits30d || 0}</text>
        <text x="400" y="105" class="hero-unit">COMMITS</text>
        <text x="400" y="140" class="stat-label">30-Day Total Velocity</text>
        <text x="400" y="165" class="stat-sub">Most active day: ${stats.mostActiveWeekday || 'Weekday'}</text>

        <rect x="740" y="0" width="240" height="200" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
        <text x="765" y="70" class="hero-val">${stats.activeCount || 0}</text>
        <text x="765" y="105" class="hero-unit">ACTIVE</text>
        <text x="765" y="140" class="stat-label">Repositories in Motion</text>
      </g>
    `;
  } else if (template === 'heat_strip') {
    const repos = (data.repos || []).slice(0, 6);
    const rowsSvg = repos.map((r: any, idx: number) => {
      const y = idx * 42;
      const statusColor = r.status === 'active' ? '#D2382A' : r.status === 'cooling' ? '#E88C38' : r.status === 'stale' ? '#86AED0' : '#757D84';
      return `
        <g transform="translate(0, ${y})">
          <circle cx="8" cy="14" r="4" fill="${statusColor}" />
          <text x="24" y="18" class="repo-name">${r.name}</text>
          <text x="380" y="18" class="repo-meta">${r.language || 'Plain Text'}</text>
          <rect x="520" y="6" width="360" height="16" rx="2" fill="${borderColor}" />
          <rect x="520" y="6" width="${Math.min(360, (r.commits_30d || 1) * 20)}" height="16" rx="2" fill="${statusColor}" />
          <text x="900" y="18" class="repo-meta">${r.commits_30d || 0} commits</text>
        </g>
      `;
    }).join('');

    templateContent = `
      <g transform="translate(80, 180)">
        <text x="0" y="-12" class="section-label">ACTIVE REPOSITORY LEDGER</text>
        ${rowsSvg}
      </g>
    `;
  } else if (template === 'language_mix') {
    const langs = (stats.languages || []).slice(0, 5);
    const langRows = langs.map((l: any, idx: number) => {
      const y = idx * 38;
      return `
        <g transform="translate(0, ${y})">
          <text x="0" y="18" class="repo-name">${l.name}</text>
          <rect x="200" y="6" width="480" height="14" rx="2" fill="${borderColor}" />
          <rect x="200" y="6" width="${(l.percentage / 100) * 480}" height="14" rx="2" fill="#D2382A" />
          <text x="700" y="18" class="repo-meta">${l.percentage}% (${l.count} repos)</text>
        </g>
      `;
    }).join('');

    templateContent = `
      <g transform="translate(80, 180)">
        <text x="0" y="-12" class="section-label">LANGUAGE DISTRIBUTION</text>
        ${langRows}
      </g>
    `;
  } else if (template === 'achievements') {
    const badges = (data.achievements || []).slice(0, 6);
    const badgeSvg = badges.map((b: any, idx: number) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = col * 320;
      const y = row * 110;
      return `
        <g transform="translate(${x}, ${y})">
          <rect x="0" y="0" width="300" height="90" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
          <circle cx="36" cy="45" r="18" fill="${accentColor}" fill-opacity="0.15" />
          <text x="36" y="51" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="${accentColor}">✓</text>
          <text x="68" y="38" class="badge-title">${b.name}</text>
          <text x="68" y="58" class="badge-desc">${b.description}</text>
        </g>
      `;
    }).join('');

    templateContent = `
      <g transform="translate(80, 180)">
        <text x="0" y="-12" class="section-label">EARNED MILESTONES & BADGES</text>
        ${badgeSvg || `<text x="0" y="40" class="subtext">No milestones recorded yet.</text>`}
      </g>
    `;
  } else if (template === 'triage_progress') {
    templateContent = `
      <g transform="translate(80, 180)">
        <rect x="0" y="0" width="460" height="180" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
        <text x="30" y="45" class="stat-label">REPOSITORIES IN ACTIVE RETENTION</text>
        <text x="30" y="95" class="hero-val">${stats.activeCount || 0}</text>
        <text x="30" y="135" class="stat-sub">Healthy momentum within active threshold</text>

        <rect x="490" y="0" width="460" height="180" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
        <text x="520" y="45" class="stat-label">TRIAGE DECISION STATUS</text>
        <text x="520" y="95" class="hero-val">${(stats.coolingCount || 0) + (stats.staleCount || 0)}</text>
        <text x="520" y="135" class="stat-sub">${stats.coolingCount + stats.staleCount === 0 ? 'Triage inbox clean' : 'Repositories awaiting keep/pause/retire decision'}</text>
      </g>
    `;
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 30px; font-weight: 700; fill: ${textColor}; }
        .subtext { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; fill: ${subtextColor}; }
        .section-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; fill: ${subtextColor}; }
        .stat-val { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 36px; font-weight: 700; fill: ${textColor}; }
        .stat-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 500; fill: ${subtextColor}; }
        .stat-sub { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; fill: ${subtextColor}; }
        .hero-val { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 56px; font-weight: 700; fill: ${textColor}; }
        .hero-unit { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 1px; fill: ${subtextColor}; }
        .legend-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; fill: ${textColor}; }
        .repo-name { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 14px; font-weight: 600; fill: ${textColor}; }
        .repo-meta { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; fill: ${subtextColor}; }
        .badge-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; fill: ${textColor}; }
        .badge-desc { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; fill: ${subtextColor}; }
      </style>
      <rect width="${width}" height="${height}" fill="${bgColor}" />
      
      <!-- Card Outer Border & Surface -->
      <rect x="${pad}" y="${pad}" width="${innerW}" height="${innerH}" rx="8" fill="${surfaceColor}" stroke="${borderColor}" stroke-width="1" />
      
      <!-- Header Area -->
      <g transform="translate(80, 95)">
        <text x="0" y="0" class="title">${title}</text>
        <text x="0" y="28" class="subtext">${subtitle}</text>
      </g>

      <!-- Template Body -->
      ${templateContent}

      <!-- Watermark Footer -->
      ${config.watermark ? `<text x="${width - pad - 30}" y="${height - pad - 24}" text-anchor="end" class="subtext" style="font-size: 12px;">Made with RepoPulse</text>` : ''}
    </svg>
  `;
}

/**
 * GET /s/:slug
 * Public server-rendered share page with Open Graph and Twitter Card tags
 */
shareRouter.get('/s/:slug', async (req, res) => {
  const slug = req.params.slug;
  const snapshot = await db.getSnapshotBySlug(slug);

  if (!snapshot || snapshot.revoked_at) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Card Not Found · RepoPulse</title>
        <meta name="robots" content="noindex, nofollow">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #131413; color: #EDEEEA; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { text-align: center; max-width: 420px; padding: 32px; border: 1px solid #2E302D; border-radius: 6px; background: #1C1D1B; }
          a { color: #86AED0; text-decoration: none; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 style="margin-top: 0;">Card Unavailable</h2>
          <p style="color: #A2A8A4; font-size: 14px; margin-bottom: 24px;">This share card has been revoked or does not exist.</p>
          <a href="/">Track your own repositories on RepoPulse &rarr;</a>
        </div>
      </body>
      </html>
    `);
    return;
  }

  const svgContent = renderCardSvg(snapshot);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${snapshot.title || 'Developer Portfolio'} · RepoPulse</title>
      <meta name="description" content="${snapshot.data?.stats?.summarySentence || 'Track repository momentum and commit velocity'}">
      <meta name="robots" content="noindex, nofollow">

      <!-- Open Graph / Twitter Cards -->
      <meta property="og:type" content="website">
      <meta property="og:title" content="${snapshot.title || 'Developer Portfolio'} · RepoPulse">
      <meta property="og:description" content="${snapshot.data?.stats?.summarySentence || 'Track repository momentum and commit velocity'}">
      <meta property="og:image" content="/s/${slug}/og.png">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${snapshot.title || 'Developer Portfolio'} · RepoPulse">
      <meta name="twitter:description" content="${snapshot.data?.stats?.summarySentence || 'Track repository momentum and commit velocity'}">
      <meta name="twitter:image" content="/s/${slug}/og.png">

      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #131413;
          color: #EDEEEA;
          margin: 0;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
          box-sizing: border-box;
        }
        .container {
          max-width: 900px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .card-wrapper {
          width: 100%;
          border: 1px solid #2E302D;
          border-radius: 8px;
          overflow: hidden;
          background-color: #1C1D1B;
          margin-bottom: 24px;
        }
        .card-wrapper svg {
          width: 100%;
          height: auto;
          display: block;
        }
        .cta-band {
          text-align: center;
          font-size: 14px;
          color: #A2A8A4;
        }
        .cta-btn {
          display: inline-block;
          margin-top: 12px;
          background-color: #EDEEEA;
          color: #14181B;
          padding: 10px 20px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card-wrapper">
          ${svgContent}
        </div>
        <div class="cta-band">
          <div>Want to see which of your repositories are still alive?</div>
          <a href="/" class="cta-btn">Track your own repos with RepoPulse</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

/**
 * GET /s/:slug/og.png
 * Dynamic Open Graph SVG/PNG image rendering
 */
shareRouter.get('/s/:slug/og.png', async (req, res) => {
  const slug = req.params.slug;
  const snapshot = await db.getSnapshotBySlug(slug);

  if (!snapshot || snapshot.revoked_at) {
    res.status(404).send('Not Found');
    return;
  }

  const svg = renderCardSvg(snapshot);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

