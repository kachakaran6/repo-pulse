import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { db } from '../db/index.js';
import { statusOf, explainStatus, generateSummarySentence, type SummaryStats } from '../core/status.js';

export const reposRouter = Router();

// Require authentication for all repo routes
reposRouter.use(requireAuth);

/**
 * GET /api/repos
 * Returns authenticated user's repositories with computed status and activity strips
 */
reposRouter.get('/', async (req, res) => {
  const userId = req.user!.id;
  const userSettings = await db.getSettings(userId);
  const thresholds = {
    active: userSettings.active_days,
    cooling: userSettings.cooling_days,
    stale: userSettings.stale_days,
  };

  const rawRepos = await db.getUserRepos(userId);
  const now = Date.now();
  const todayStr = new Date().toISOString().split('T')[0];

  let weeklyCommits = 0;
  let committedReposThisWeek = 0;
  let wentColdCount = 0;

  const enrichedRepos = rawRepos.map((r) => {
    const status = statusOf(r.last_commit_at, now, thresholds);
    const explanation = explainStatus(r.last_commit_at, now, thresholds);

    // Calculate weekly commit activity
    const sevenDaysAgo = new Date(now - 7 * 864e5).toISOString().split('T')[0];
    const recentCommits = r.activity
      .filter((a: any) => a.day >= sevenDaysAgo)
      .reduce((sum: number, a: any) => sum + (a.commits || 0), 0);

    if (recentCommits > 0) {
      weeklyCommits += recentCommits;
      committedReposThisWeek++;
    }

    // A repository went cold if its last commit fell out of active range within the last 7 days
    if (explanation.days !== null && explanation.days > thresholds.active && explanation.days <= thresholds.active + 7) {
      wentColdCount++;
    }

    // Check if repo is paused until a future date
    const meta = r.meta || {};
    const isPaused = meta.decision === 'pause' && meta.paused_until && meta.paused_until > todayStr;
    const isRetired = meta.decision === 'retire';

    return {
      id: String(r.id),
      github_repo_id: String(r.github_repo_id),
      full_name: r.full_name,
      is_private: r.is_private,
      default_branch: r.default_branch,
      last_commit_at: r.last_commit_at ? new Date(r.last_commit_at).toISOString() : null,
      language: r.language,
      archived_on_github: r.archived_on_github,
      status,
      explanation,
      meta: {
        label: meta.label || null,
        goal_date: meta.goal_date || null,
        note: meta.note || null,
        decision: meta.decision || null,
        paused_until: meta.paused_until || null,
        decided_at: meta.decided_at ? new Date(meta.decided_at).toISOString() : null,
      },
      is_paused: Boolean(isPaused),
      is_retired: Boolean(isRetired),
      activity: r.activity || [],
      weekly_commits: recentCommits,
    };
  });

  const activeCount = enrichedRepos.filter((r) => r.status === 'active' && !r.is_retired).length;
  const coolingCount = enrichedRepos.filter((r) => r.status === 'cooling' && !r.is_retired).length;
  const staleCount = enrichedRepos.filter((r) => r.status === 'stale' && !r.is_retired).length;
  const deadCount = enrichedRepos.filter((r) => r.status === 'dead' && !r.is_retired).length;
  const retiredCount = enrichedRepos.filter((r) => r.is_retired).length;

  const stats: SummaryStats = {
    totalRepos: enrichedRepos.length,
    activeCount,
    coolingCount,
    staleCount,
    deadCount,
    weeklyCommits,
    committedReposThisWeek,
    wentColdCount,
  };

  const summarySentence = generateSummarySentence(stats);

  res.json({
    repos: enrichedRepos,
    summary: summarySentence,
    stats: {
      ...stats,
      retiredCount,
    },
    thresholds,
  });
});

/**
 * GET /api/repos/analytics
 * Returns comprehensive repository portfolio statistics, language distribution, velocity, and health scores
 */
reposRouter.get('/analytics', async (req, res) => {
  const userId = req.user!.id;
  const userSettings = await db.getSettings(userId);
  const thresholds = {
    active: userSettings.active_days,
    cooling: userSettings.cooling_days,
    stale: userSettings.stale_days,
  };

  const rawRepos = await db.getUserRepos(userId);
  const now = Date.now();
  const dayMs = 864e5;

  let totalCommits7d = 0;
  let totalCommits30d = 0;
  let totalCommits90d = 0;
  let privateCount = 0;
  let publicCount = 0;
  let archivedCount = 0;

  const languagesMap: Record<string, number> = {};
  const globalDailyActivity: Record<string, number> = {};

  for (let i = 89; i >= 0; i--) {
    const d = new Date(now - i * dayMs).toISOString().split('T')[0];
    globalDailyActivity[d] = 0;
  }

  let mostActiveRepo: any = null;
  let maxRepoCommits90d = -1;

  let oldestDormantRepo: any = null;
  let maxDormantDays = -1;

  let activeCount = 0;
  let coolingCount = 0;
  let staleCount = 0;
  let deadCount = 0;
  let retiredCount = 0;

  const cutoff7d = new Date(now - 7 * dayMs).toISOString().split('T')[0];
  const cutoff30d = new Date(now - 30 * dayMs).toISOString().split('T')[0];
  const cutoff90d = new Date(now - 90 * dayMs).toISOString().split('T')[0];

  for (const r of rawRepos) {
    if (r.is_private) privateCount++;
    else publicCount++;

    if (r.archived_on_github) archivedCount++;

    const status = statusOf(r.last_commit_at, now, thresholds);
    const explanation = explainStatus(r.last_commit_at, now, thresholds);

    const isRetired = r.meta?.decision === 'retire';
    if (isRetired) {
      retiredCount++;
    } else {
      if (status === 'active') activeCount++;
      else if (status === 'cooling') coolingCount++;
      else if (status === 'stale') staleCount++;
      else deadCount++;
    }

    const lang = r.language || 'Other';
    languagesMap[lang] = (languagesMap[lang] || 0) + 1;

    let repo90dCommits = 0;
    for (const act of r.activity || []) {
      if (act.day >= cutoff90d) {
        totalCommits90d += act.commits;
        repo90dCommits += act.commits;
        if (globalDailyActivity[act.day] !== undefined) {
          globalDailyActivity[act.day] += act.commits;
        }
      }
      if (act.day >= cutoff30d) {
        totalCommits30d += act.commits;
      }
      if (act.day >= cutoff7d) {
        totalCommits7d += act.commits;
      }
    }

    if (repo90dCommits > maxRepoCommits90d) {
      maxRepoCommits90d = repo90dCommits;
      mostActiveRepo = {
        id: String(r.id),
        name: r.full_name,
        commits_90d: repo90dCommits,
        language: r.language,
      };
    }

    if (explanation.days !== null && explanation.days > maxDormantDays) {
      maxDormantDays = explanation.days;
      oldestDormantRepo = {
        id: String(r.id),
        name: r.full_name,
        days_inactive: explanation.days,
        last_commit_at: r.last_commit_at ? new Date(r.last_commit_at).toISOString() : null,
      };
    }
  }

  const totalWithLang = rawRepos.length || 1;
  const languages = Object.entries(languagesMap)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalWithLang) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const warmRatio = rawRepos.length > 0 ? (activeCount + coolingCount * 0.75) / rawRepos.length : 1;
  const commitHealthBonus = Math.min(25, totalCommits7d * 2);
  const healthScore = Math.min(100, Math.round(warmRatio * 75 + commitHealthBonus));

  const dailyTrend = Object.entries(globalDailyActivity).map(([day, commits]) => ({ day, commits }));

  res.json({
    total_repos: rawRepos.length,
    public_count: publicCount,
    private_count: privateCount,
    archived_count: archivedCount,
    health_score: healthScore,
    commits: {
      past_7_days: totalCommits7d,
      past_30_days: totalCommits30d,
      past_90_days: totalCommits90d,
      weekly_average: Math.round(totalCommits90d / 12),
    },
    heat_distribution: {
      active: activeCount,
      cooling: coolingCount,
      stale: staleCount,
      dead: deadCount,
      retired: retiredCount,
    },
    languages,
    most_active_repo: mostActiveRepo,
    oldest_dormant_repo: oldestDormantRepo,
    daily_trend: dailyTrend,
  });
});

/**
 * PATCH /api/repos/:id/meta
 * Updates custom label, goal date, note, or triage decision
 */
reposRouter.patch('/:id/meta', async (req, res) => {
  const userId = req.user!.id;
  const repoId = req.params.id;

  if (!repoId) {
    res.status(400).json({ error: 'Invalid repository ID' });
    return;
  }

  const schema = z.object({
    label: z.string().nullable().optional(),
    goal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Goal date must be YYYY-MM-DD').nullable().optional(),
    note: z.string().max(2000).nullable().optional(),
    decision: z.enum(['keep', 'pause', 'retire']).nullable().optional(),
    paused_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Paused until must be YYYY-MM-DD').nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    return;
  }

  try {
    const updatedMeta = await db.upsertRepoMeta(repoId, userId, parsed.data);
    await db.logAudit(userId, 'repo_meta_updated', { repo_id: repoId, changes: parsed.data });

    res.json({
      ok: true,
      meta: {
        label: updatedMeta.label || null,
        goal_date: updatedMeta.goal_date || null,
        note: updatedMeta.note || null,
        decision: updatedMeta.decision || null,
        paused_until: updatedMeta.paused_until || null,
        decided_at: updatedMeta.decided_at ? new Date(updatedMeta.decided_at).toISOString() : null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Database Error', message: err.message });
  }
});
