import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { memoryDb } from '../db/index.js';
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
  const userSettings = memoryDb.getSettings(userId);
  const thresholds = {
    active: userSettings.active_days,
    cooling: userSettings.cooling_days,
    stale: userSettings.stale_days,
  };

  const rawRepos = memoryDb.getUserRepos(userId);
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
      id: r.id,
      github_repo_id: r.github_repo_id,
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
 * PATCH /api/repos/:id/meta
 * Updates custom label, goal date, note, or triage decision
 */
reposRouter.patch('/:id/meta', async (req, res) => {
  const userId = req.user!.id;
  const repoId = Number(req.params.id);

  if (isNaN(repoId)) {
    res.status(400).json({ error: 'Invalid repository ID' });
    return;
  }

  // Strict tenant verification: make sure this repo belongs to the requesting user
  const userRepos = memoryDb.getUserRepos(userId);
  const repo = userRepos.find((r) => r.id === repoId);

  if (!repo) {
    res.status(404).json({ error: 'Repository not found or access denied' });
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

  const updatedMeta = memoryDb.upsertRepoMeta(repoId, userId, parsed.data);
  memoryDb.logAudit(userId, 'repo_meta_updated', { repo_id: repoId, changes: parsed.data });

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
});
