import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { db } from '../db/index.js';
import { statusOf, explainStatus } from '../core/status.js';
import { computeUnifiedStats, type RepoWithActivity } from '../core/stats.js';

export const reposRouter = Router();

// Require authentication for all repo routes
reposRouter.use(requireAuth);

/**
 * GET /api/repos
 * Returns authenticated user's repositories with computed status, unified stats, and optional filtering/sorting
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
  const statusChanges = await db.getRecentStatusChanges(userId, 7);
  const now = Date.now();
  const todayStr = new Date().toISOString().split('T')[0];

  const unifiedStats = computeUnifiedStats(rawRepos as any, thresholds, statusChanges, now);

  // Enrich raw repos with status and metadata flags
  let enrichedRepos = rawRepos.map((r: any) => {
    const status = statusOf(r.last_commit_at, now, thresholds);
    const explanation = explainStatus(r.last_commit_at, now, thresholds);

    const sevenDaysAgo = new Date(now - 7 * 864e5).toISOString().split('T')[0];
    const recentCommits = (r.activity || [])
      .filter((a: any) => a.day >= sevenDaysAgo)
      .reduce((sum: number, a: any) => sum + (a.commits_mine ?? a.commits ?? 0), 0);

    const totalCommits90d = (r.activity || [])
      .reduce((sum: number, a: any) => sum + (a.commits_mine ?? a.commits ?? 0), 0);
    const totalCommitsAll90d = (r.activity || [])
      .reduce((sum: number, a: any) => sum + (a.commits_all ?? a.commits_mine ?? a.commits ?? 0), 0);

    const mySharePercentage = totalCommitsAll90d > 0
      ? Math.round((totalCommits90d / totalCommitsAll90d) * 100)
      : 100;

    const meta = r.meta || {};
    const isPaused = meta.decision === 'pause' && meta.paused_until && meta.paused_until > todayStr;
    const isRetired = meta.decision === 'retire';

    const isCollaborative =
      r.owner_type === 'Organization' ||
      r.relationship === 'organization' ||
      r.relationship === 'collaborator' ||
      (r.owner_login && r.owner_login !== req.user!.login);

    return {
      id: String(r.id),
      github_repo_id: String(r.github_repo_id),
      installation_id: r.installation_id ? String(r.installation_id) : null,
      full_name: r.full_name,
      is_private: Boolean(r.is_private),
      is_fork: Boolean(r.is_fork),
      is_archived: Boolean(r.is_archived || r.archived_on_github),
      owner_login: r.owner_login || r.full_name.split('/')[0] || req.user!.login,
      owner_type: r.owner_type || 'User',
      relationship: r.relationship || 'owner',
      permission: r.permission || 'admin',
      default_branch: r.default_branch || 'main',
      last_commit_at: r.last_commit_at ? new Date(r.last_commit_at).toISOString() : null,
      pushed_at: r.pushed_at ? new Date(r.pushed_at).toISOString() : null,
      created_at_github: r.created_at_github ? new Date(r.created_at_github).toISOString() : null,
      language: r.language || null,
      archived_on_github: Boolean(r.archived_on_github),
      status,
      explanation,
      is_collaborative: Boolean(isCollaborative),
      my_share_percentage: mySharePercentage,
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

  // Query parameters for filtering and sorting
  const {
    view,
    search,
    status,
    relationship,
    visibility,
    language,
    label,
    decision,
    sort,
  } = req.query as Record<string, string | undefined>;

  // 1. View filter (all, mine, shared, orgs)
  if (view === 'mine') {
    enrichedRepos = enrichedRepos.filter((r) => !r.is_collaborative);
  } else if (view === 'shared') {
    enrichedRepos = enrichedRepos.filter((r) => r.relationship === 'collaborator');
  } else if (view === 'organizations') {
    enrichedRepos = enrichedRepos.filter((r) => r.owner_type === 'Organization' || r.relationship === 'organization');
  }

  // 2. Search query filter
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    enrichedRepos = enrichedRepos.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        (r.language && r.language.toLowerCase().includes(q)) ||
        (r.meta.label && r.meta.label.toLowerCase().includes(q))
    );
  }

  // 3. Status filter
  if (status && status !== 'all') {
    const statuses = status.split(',');
    enrichedRepos = enrichedRepos.filter((r) => statuses.includes(r.status));
  }

  // 4. Relationship filter
  if (relationship && relationship !== 'all') {
    const rels = relationship.split(',');
    enrichedRepos = enrichedRepos.filter((r) => rels.includes(r.relationship));
  }

  // 5. Visibility filter
  if (visibility && visibility !== 'all') {
    if (visibility === 'private') enrichedRepos = enrichedRepos.filter((r) => r.is_private);
    else if (visibility === 'public') enrichedRepos = enrichedRepos.filter((r) => !r.is_private);
  }

  // 6. Language filter
  if (language && language !== 'all') {
    const langs = language.split(',');
    enrichedRepos = enrichedRepos.filter((r) => r.language && langs.includes(r.language));
  }

  // 7. Decision filter
  if (decision && decision !== 'all') {
    if (decision === 'undecided') enrichedRepos = enrichedRepos.filter((r) => !r.meta.decision);
    else enrichedRepos = enrichedRepos.filter((r) => r.meta.decision === decision);
  }

  // 8. Sorting
  if (sort === 'last_commit_oldest') {
    enrichedRepos.sort((a, b) => {
      if (!a.last_commit_at) return 1;
      if (!b.last_commit_at) return -1;
      return new Date(a.last_commit_at).getTime() - new Date(b.last_commit_at).getTime();
    });
  } else if (sort === 'commits_30d') {
    enrichedRepos.sort((a, b) => {
      const aCommits = a.activity.slice(-30).reduce((s: number, x: any) => s + (x.commits_mine || x.commits || 0), 0);
      const bCommits = b.activity.slice(-30).reduce((s: number, x: any) => s + (x.commits_mine || x.commits || 0), 0);
      return bCommits - aCommits;
    });
  } else if (sort === 'commits_90d') {
    enrichedRepos.sort((a, b) => {
      const aCommits = a.activity.reduce((s: number, x: any) => s + (x.commits_mine || x.commits || 0), 0);
      const bCommits = b.activity.reduce((s: number, x: any) => s + (x.commits_mine || x.commits || 0), 0);
      return bCommits - aCommits;
    });
  } else if (sort === 'name') {
    enrichedRepos.sort((a, b) => a.full_name.localeCompare(b.full_name));
  } else if (sort === 'created') {
    enrichedRepos.sort((a, b) => {
      if (!a.created_at_github) return 1;
      if (!b.created_at_github) return -1;
      return new Date(b.created_at_github).getTime() - new Date(a.created_at_github).getTime();
    });
  } else {
    // Default: status priority, then recency
    const statusWeight: Record<string, number> = { active: 1, cooling: 2, stale: 3, dead: 4 };
    enrichedRepos.sort((a, b) => {
      const wA = statusWeight[a.status] || 5;
      const wB = statusWeight[b.status] || 5;
      if (wA !== wB) return wA - wB;
      if (!a.last_commit_at) return 1;
      if (!b.last_commit_at) return -1;
      return new Date(b.last_commit_at).getTime() - new Date(a.last_commit_at).getTime();
    });
  }

  res.json({
    repos: enrichedRepos,
    summary: unifiedStats.summarySentence,
    stats: unifiedStats,
    thresholds,
  });
});

/**
 * GET /api/facets
 * Returns multi-select facet counts for all filter options
 */
reposRouter.get('/facets', async (req, res) => {
  const userId = req.user!.id;
  const userSettings = await db.getSettings(userId);
  const thresholds = {
    active: userSettings.active_days,
    cooling: userSettings.cooling_days,
    stale: userSettings.stale_days,
  };

  const rawRepos = await db.getUserRepos(userId);
  const now = Date.now();

  const facetCounts: {
    status: { active: number; cooling: number; stale: number; dead: number };
    relationship: { owner: number; organization: number; collaborator: number; fork: number };
    visibility: { public: number; private: number };
    languages: Record<string, number>;
    decision: Record<string, number>;
  } = {
    status: { active: 0, cooling: 0, stale: 0, dead: 0 },
    relationship: { owner: 0, organization: 0, collaborator: 0, fork: 0 },
    visibility: { public: 0, private: 0 },
    languages: {},
    decision: { undecided: 0, keep: 0, pause: 0, retire: 0 },
  };

  for (const r of rawRepos) {
    const status = statusOf(r.last_commit_at, now, thresholds);
    facetCounts.status[status] = (facetCounts.status[status] || 0) + 1;

    if (r.is_fork) facetCounts.relationship.fork++;
    else if (r.relationship === 'organization' || r.owner_type === 'Organization') facetCounts.relationship.organization++;
    else if (r.relationship === 'collaborator') facetCounts.relationship.collaborator++;
    else facetCounts.relationship.owner++;

    if (r.is_private) facetCounts.visibility.private++;
    else facetCounts.visibility.public++;

    if (r.language) {
      facetCounts.languages[r.language] = (facetCounts.languages[r.language] || 0) + 1;
    }

    const dec = r.meta?.decision;
    if (!dec) {
      facetCounts.decision.undecided = (facetCounts.decision.undecided || 0) + 1;
    } else {
      facetCounts.decision[dec] = (facetCounts.decision[dec] || 0) + 1;
    }
  }

  res.json(facetCounts);
});


/**
 * GET /api/installations
 * Returns user's active GitHub App installations
 */
reposRouter.get('/installations', async (req, res) => {
  const userId = req.user!.id;
  const installations = await db.getInstallations(userId);
  res.json(installations);
});

/**
 * GET /api/repos/analytics
 * Returns comprehensive repository portfolio analytics computed via unified stats service
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
  const statusChanges = await db.getRecentStatusChanges(userId, 7);
  const stats = computeUnifiedStats(rawRepos as any, thresholds, statusChanges);

  res.json(stats);
});

/**
 * GET /api/saved-views
 */
reposRouter.get('/saved-views', async (req, res) => {
  const userId = req.user!.id;
  const views = await db.getSavedViews(userId);
  res.json(views);
});

/**
 * POST /api/saved-views
 */
reposRouter.post('/saved-views', async (req, res) => {
  const userId = req.user!.id;
  const { name, query } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const view = await db.createSavedView(userId, name.trim(), query || {});
  res.json({ ok: true, view });
});

/**
 * DELETE /api/saved-views/:id
 */
reposRouter.delete('/saved-views/:id', async (req, res) => {
  const userId = req.user!.id;
  const success = await db.deleteSavedView(req.params.id, userId);
  res.json({ ok: success });
});

/**
 * GET /api/achievements
 */
reposRouter.get('/achievements', async (req, res) => {
  const userId = req.user!.id;
  const achievements = await db.getAchievements(userId);
  res.json(achievements);
});

/**
 * GET /api/contributors/:repoId
 */
reposRouter.get('/contributors/:repoId', async (req, res) => {
  const userId = req.user!.id;
  const contribs = await db.getRepoContributors(req.params.repoId, userId);
  res.json(contribs);
});

const patchMetaSchema = z.object({
  label: z.string().max(50).nullable().optional(),
  goal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
  decision: z.enum(['keep', 'pause', 'retire']).nullable().optional(),
  paused_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

/**
 * PATCH /api/repos/:id/meta
 * Updates custom metadata (labels, notes, triage decision, goal date)
 */
reposRouter.patch('/:id/meta', async (req, res) => {
  const userId = req.user!.id;
  const repoId = req.params.id;

  const parsed = patchMetaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid Metadata',
      details: parsed.error.format(),
    });
    return;
  }

  const updatedMeta = await db.upsertRepoMeta(repoId, userId, parsed.data);
  await db.logAudit(userId, 'repo_meta_updated', { repo_id: repoId, updates: parsed.data });

  res.json({
    ok: true,
    meta: updatedMeta,
  });
});
