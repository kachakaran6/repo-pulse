import { Router } from 'express';
import { requireAuth, syncRateLimiter } from '../auth/middleware.js';
import { runUserSync } from '../sync/engine.js';
import { db } from '../db/index.js';

export const syncRouter = Router();

syncRouter.use(requireAuth);

// Map to track last sync timestamp per user for the 5-minute cooldown rule
const lastUserSyncAttempt = new Map<string, number>();

/**
 * POST /api/sync
 * Triggers background sync with 5-minute per-user cooldown
 */
syncRouter.post('/', syncRateLimiter, async (req, res) => {
  const userId = req.user!.id;
  const now = Date.now();
  const lastSync = lastUserSyncAttempt.get(userId) || 0;
  const cooldownMs = 5 * 60 * 1000; // 5 minutes

  // Cooldown check (can be bypassed with ?force=true in dev/test)
  const isForce = req.query.force === 'true';
  if (!isForce && now - lastSync < cooldownMs) {
    const waitSeconds = Math.ceil((cooldownMs - (now - lastSync)) / 1000);
    res.status(429).json({
      error: 'Cooldown active',
      message: `Sync is limited to once every 5 minutes. Please wait ${waitSeconds} seconds.`,
      retry_after: waitSeconds,
    });
    return;
  }

  lastUserSyncAttempt.set(userId, now);

  const syncPromise = runUserSync(userId);

  // In test / fast mode wait for completion; otherwise return job status
  if (req.query.wait === 'true' || process.env.NODE_ENV === 'test') {
    const result = await syncPromise;
    res.json({
      ok: true,
      status: result.status,
      repos_read: result.reposRead,
      message: `Synced ${result.reposRead} repositories.`,
      paused_until: result.pausedUntil,
    });
    return;
  }

  res.status(202).json({
    ok: true,
    status: 'running',
    message: 'Repository synchronization initiated.',
  });
});

/**
 * GET /api/sync/status
 * Returns current or last sync run status
 */
syncRouter.get('/status', async (req, res) => {
  const userId = req.user!.id;
  const latestRun = await db.getLatestSyncRun(userId);

  if (!latestRun) {
    res.json({
      status: 'idle',
      repos_read: 0,
      started_at: null,
      finished_at: null,
      error: null,
    });
    return;
  }

  res.json({
    status: latestRun.status,
    repos_read: latestRun.repos_read,
    started_at: latestRun.started_at ? new Date(latestRun.started_at).toISOString() : null,
    finished_at: latestRun.finished_at ? new Date(latestRun.finished_at).toISOString() : null,
    error: latestRun.error || null,
  });
});
