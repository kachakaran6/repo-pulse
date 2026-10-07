import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { memoryDb } from '../db/index.js';
import { destroyAllUserSessions, COOKIE_NAME } from '../auth/session.js';
import { thresholdsSchema } from '../core/status.js';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

/**
 * GET /api/me
 * Returns authenticated user details, settings, and installation state
 */
settingsRouter.get('/me', async (req, res) => {
  const userId = req.user!.id;
  const user = memoryDb.findUserById(userId);
  const settings = memoryDb.getSettings(userId);
  const installation = memoryDb.getInstallation(userId);
  const lastSync = memoryDb.getLatestSyncRun(userId);

  res.json({
    user: {
      id: user.id,
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
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
          github_installation_id: installation.github_installation_id,
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

  const current = memoryDb.getSettings(userId);
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

  const updated = memoryDb.updateSettings(userId, {
    active_days: newActive,
    cooling_days: newCooling,
    stale_days: newStale,
    theme: parsed.data.theme ?? current.theme,
  });

  memoryDb.logAudit(userId, 'settings_updated', parsed.data);

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
  const user = memoryDb.findUserById(userId);
  const settings = memoryDb.getSettings(userId);
  const repos = memoryDb.getUserRepos(userId);
  const audit = memoryDb.getAuditLogs(userId);

  const exportData = {
    version: '2.0.0',
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    },
    settings,
    repositories: repos.map((r) => ({
      id: r.id,
      github_repo_id: r.github_repo_id,
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

  memoryDb.logAudit(userId, 'data_exported');

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="repopulse-export-${user.login}-${new Date().toISOString().split('T')[0]}.json"`);
  res.send(JSON.stringify(exportData, null, 2));
});

/**
 * DELETE /api/account
 * Completely deletes user account, all repositories, activities, settings, sessions, and audit logs
 */
settingsRouter.delete('/account', async (req, res) => {
  const userId = req.user!.id;

  // Log audit before wipe
  memoryDb.logAudit(userId, 'account_deleted');

  // Cascade wipe all tenant data
  memoryDb.deleteUserAccount(userId);
  await destroyAllUserSessions(userId, res);

  res.clearCookie(COOKIE_NAME);
  res.clearCookie('sid');

  res.json({
    ok: true,
    message: 'Account and all associated repository data permanently deleted.',
  });
});
