import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { db } from '../db/index.js';
import { destroyAllUserSessions } from '../auth/session.js';
import { thresholdsSchema } from '../core/status.js';
import { logger } from '../utils/logger.js';

export const settingsRouter = Router();

// Apply requireAuth to all settings and profile routes
settingsRouter.use(requireAuth);

/**
 * GET /api/me
 * Returns authenticated user details, settings, and installation state
 */
settingsRouter.get('/me', async (req, res) => {
  const userId = req.user!.id;
  const user = await db.findUserById(userId);

  if (!user) {
    res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
    return;
  }

  const settings = await db.getSettings(userId);
  const installation = await db.getInstallation(userId);
  const lastSync = await db.getLatestSyncRun(userId);

  res.json({
    id: String(user.id),
    login: user.login,
    avatarUrl: user.avatar_url,
    hasInstallation: Boolean(installation || (user as any).github_token),
    user: {
      id: String(user.id),
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
      email: (user as any).email || null,
      github_user_id: (user as any).github_user_id || null,
      created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
    },
    settings: {
      active_days: settings.active_days,
      cooling_days: settings.cooling_days,
      stale_days: settings.stale_days,
      theme: settings.theme,
    },
    installation: installation
      ? {
          connected: true,
          account_login: installation.account_login,
          github_installation_id: String(installation.github_installation_id),
        }
      : (user as any).github_token
      ? {
          connected: true,
          token_connected: true,
          account_login: user.login,
        }
      : {
          connected: false,
        },
    last_sync: lastSync
      ? {
          status: lastSync.status,
          repos_read: lastSync.repos_read,
          finished_at: lastSync.finished_at ? new Date(lastSync.finished_at).toISOString() : null,
        }
      : null,
  });
});

/**
 * PATCH /api/settings
 * Updates user thresholds and UI theme
 */
settingsRouter.patch('/settings', async (req, res) => {
  const userId = req.user!.id;

  const schema = z.object({
    active_days: z.number().int().min(1).max(90).optional(),
    cooling_days: z.number().int().min(2).max(180).optional(),
    stale_days: z.number().int().min(3).max(365).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    return;
  }

  const current = await db.getSettings(userId);
  const newActive = parsed.data.active_days ?? current.active_days;
  const newCooling = parsed.data.cooling_days ?? current.cooling_days;
  const newStale = parsed.data.stale_days ?? current.stale_days;

  // Validate threshold ordering: active < cooling < stale
  const thresholdValidation = thresholdsSchema.safeParse({
    active_days: newActive,
    cooling_days: newCooling,
    stale_days: newStale,
  });

  if (!thresholdValidation.success) {
    res.status(400).json({
      error: 'Threshold Error',
      message: 'Thresholds must be strictly ascending: Active < Cooling < Stale',
      details: thresholdValidation.error.issues,
    });
    return;
  }

  const updated = await db.updateSettings(userId, {
    active_days: newActive,
    cooling_days: newCooling,
    stale_days: newStale,
    theme: parsed.data.theme ?? current.theme,
  });

  await db.logAudit(userId, 'settings_updated', parsed.data);

  res.json({
    ok: true,
    settings: {
      active_days: updated.active_days,
      cooling_days: updated.cooling_days,
      stale_days: updated.stale_days,
      theme: updated.theme,
    },
  });
});

/**
 * GET /api/export
 * Exports complete tenant data as downloadable JSON
 */
settingsRouter.get('/export', async (req, res) => {
  const userId = req.user!.id;
  const user = await db.findUserById(userId);
  const settings = await db.getSettings(userId);
  const repos = await db.getUserRepos(userId);
  const audit = await db.getAuditLogs(userId);

  const exportData = {
    version: '2.0.0',
    exported_at: new Date().toISOString(),
    user: {
      id: String(user.id),
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    },
    settings,
    repositories: repos.map((r) => ({
      id: String(r.id),
      github_repo_id: String(r.github_repo_id),
      full_name: r.full_name,
      is_private: r.is_private,
      default_branch: r.default_branch,
      last_commit_at: r.last_commit_at,
      language: r.language,
      archived_on_github: r.archived_on_github,
      metadata: r.meta || null,
      activity: r.activity || [],
    })),
    audit_logs: audit,
  };

  await db.logAudit(userId, 'data_exported');

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="repopulse-export-${user.login}-${new Date().toISOString().split('T')[0]}.json"`
  );
  res.send(JSON.stringify(exportData, null, 2));
});

/**
 * DELETE /api/account
 * Completely deletes user account, all repositories, activities, settings, sessions, and audit logs
 */
settingsRouter.delete('/account', async (req, res) => {
  const userId = req.user!.id;

  logger.info({ userId }, 'Processing permanent user account deletion');

  // Cascade wipe all tenant data from Postgres
  await db.deleteUserAccount(userId);
  await destroyAllUserSessions(userId, res);

  res.json({
    ok: true,
    message: 'Account and all associated repository data permanently deleted.',
  });
});
