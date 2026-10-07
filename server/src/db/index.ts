import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pool = env.DATABASE_URL
  ? new pg.Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : null;

/**
 * Initialize database and execute RLS migrations
 */
export async function initDb(): Promise<boolean> {
  if (!pool) {
    logger.info('DATABASE_URL not configured. Operating with high-performance in-memory tenant store.');
    return false;
  }

  try {
    const migrationPath = path.resolve(__dirname, 'migrations.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
    logger.info('Database schema and RLS policies successfully initialized and verified.');
    return true;
  } catch (err: any) {
    logger.warn({ error: err.message }, 'PostgreSQL connection failed. Falling back to memory store.');
    return false;
  }
}

/**
 * Execute a query with tenant context set in PostgreSQL session
 */
export async function withTenant<T>(
  userId: number,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.user_id = '${userId}'`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * In-memory fallback repository for development/testing without PostgreSQL
 */
class MemoryTenantStore {
  users: Map<number, any> = new Map();
  sessions: Map<string, any> = new Map();
  installations: Map<number, any> = new Map();
  repos: Map<number, any> = new Map();
  repoActivity: Map<string, any> = new Map(); // `${repo_id}_${day}` -> activity
  repoMeta: Map<number, any> = new Map();
  settings: Map<number, any> = new Map();
  syncRuns: Map<number, any> = new Map();
  auditLog: any[] = [];
  nextId = 1000;

  clear() {
    this.users.clear();
    this.sessions.clear();
    this.installations.clear();
    this.repos.clear();
    this.repoActivity.clear();
    this.repoMeta.clear();
    this.settings.clear();
    this.syncRuns.clear();
    this.auditLog = [];
    this.nextId = 1000;
  }

  findUserById(id: number) {
    const u = this.users.get(id);
    return u && !u.deleted_at ? { ...u } : null;
  }

  findUserByGithubId(githubUserId: number) {
    for (const u of this.users.values()) {
      if (u.github_user_id === githubUserId && !u.deleted_at) {
        return { ...u };
      }
    }
    return null;
  }

  createUser(user: { github_user_id: number; login: string; name?: string; avatar_url?: string }) {
    const id = ++this.nextId;
    const record = {
      id,
      github_user_id: user.github_user_id,
      login: user.login,
      name: user.name || user.login,
      avatar_url: user.avatar_url || `https://avatars.githubusercontent.com/u/${user.github_user_id}`,
      created_at: new Date(),
      deleted_at: null,
    };
    this.users.set(id, record);

    // Default settings
    this.settings.set(id, {
      user_id: id,
      active_days: 7,
      cooling_days: 14,
      stale_days: 30,
      theme: 'system',
      updated_at: new Date(),
    });

    return { ...record };
  }

  createSession(session: { id_hash: string; user_id: number; expires_at: Date; ip_hash?: string; ua?: string }) {
    const record = {
      ...session,
      created_at: new Date(),
      last_seen_at: new Date(),
    };
    this.sessions.set(session.id_hash, record);
    return record;
  }

  findSession(idHash: string) {
    const s = this.sessions.get(idHash);
    return s ? { ...s } : null;
  }

  updateSessionLastSeen(idHash: string) {
    const s = this.sessions.get(idHash);
    if (s) {
      s.last_seen_at = new Date();
      this.sessions.set(idHash, s);
    }
  }

  deleteSession(idHash: string) {
    return this.sessions.delete(idHash);
  }

  deleteAllUserSessions(userId: number) {
    let count = 0;
    for (const [hash, s] of this.sessions.entries()) {
      if (s.user_id === userId) {
        this.sessions.delete(hash);
        count++;
      }
    }
    return count;
  }

  getSettings(userId: number) {
    let s = this.settings.get(userId);
    if (!s) {
      s = {
        user_id: userId,
        active_days: 7,
        cooling_days: 14,
        stale_days: 30,
        theme: 'system',
        updated_at: new Date(),
      };
      this.settings.set(userId, s);
    }
    return { ...s };
  }

  updateSettings(userId: number, updates: Partial<{ active_days: number; cooling_days: number; stale_days: number; theme: string }>) {
    const current = this.getSettings(userId);
    const updated = {
      ...current,
      ...updates,
      updated_at: new Date(),
    };
    this.settings.set(userId, updated);
    return { ...updated };
  }

  getUserRepos(userId: number) {
    const result: any[] = [];
    for (const repo of this.repos.values()) {
      if (repo.user_id === userId) {
        const meta = this.repoMeta.get(repo.id) || null;
        // Collect activities
        const activity: any[] = [];
        for (const act of this.repoActivity.values()) {
          if (act.repo_id === repo.id) {
            activity.push({ day: act.day, commits: act.commits });
          }
        }
        activity.sort((a, b) => a.day.localeCompare(b.day));

        result.push({
          ...repo,
          meta,
          activity,
        });
      }
    }
    return result;
  }

  upsertRepo(repo: {
    user_id: number;
    installation_id?: number | null;
    github_repo_id: number;
    full_name: string;
    is_private?: boolean;
    default_branch?: string;
    last_commit_at?: Date | string | null;
    language?: string | null;
    archived_on_github?: boolean;
  }) {
    // Check existing
    let existingId: number | null = null;
    for (const r of this.repos.values()) {
      if (r.user_id === repo.user_id && r.github_repo_id === repo.github_repo_id) {
        existingId = r.id;
        break;
      }
    }

    const id = existingId || ++this.nextId;
    const record = {
      id,
      user_id: repo.user_id,
      installation_id: repo.installation_id || null,
      github_repo_id: repo.github_repo_id,
      full_name: repo.full_name,
      is_private: repo.is_private ?? false,
      default_branch: repo.default_branch || 'main',
      last_commit_at: repo.last_commit_at ? new Date(repo.last_commit_at) : null,
      language: repo.language || null,
      archived_on_github: repo.archived_on_github ?? false,
      synced_at: new Date(),
    };

    this.repos.set(id, record);
    return { ...record };
  }

  upsertActivity(repoId: number, userId: number, day: string, commits: number) {
    const key = `${repoId}_${day}`;
    const record = { repo_id: repoId, user_id: userId, day, commits };
    this.repoActivity.set(key, record);
    return record;
  }

  upsertRepoMeta(repoId: number, userId: number, meta: {
    label?: string | null;
    goal_date?: string | null;
    note?: string | null;
    decision?: 'keep' | 'pause' | 'retire' | null;
    paused_until?: string | null;
  }) {
    const existing = this.repoMeta.get(repoId) || { repo_id: repoId, user_id: userId };
    const updated = {
      ...existing,
      ...meta,
      decided_at: meta.decision ? new Date() : existing.decided_at,
    };
    this.repoMeta.set(repoId, updated);
    return { ...updated };
  }

  logAudit(userId: number, event: string, meta: Record<string, any> = {}) {
    const entry = {
      id: ++this.nextId,
      user_id: userId,
      event,
      meta,
      created_at: new Date(),
    };
    this.auditLog.push(entry);
    return entry;
  }

  getAuditLogs(userId: number) {
    return this.auditLog.filter(a => a.user_id === userId);
  }

  createSyncRun(userId: number) {
    const id = ++this.nextId;
    const run = {
      id,
      user_id: userId,
      started_at: new Date(),
      finished_at: null,
      status: 'running' as const,
      repos_read: 0,
      error: null,
    };
    this.syncRuns.set(id, run);
    return run;
  }

  updateSyncRun(id: number, updates: Partial<{ finished_at: Date; status: 'running' | 'success' | 'failed' | 'rate_limited'; repos_read: number; error: string | null }>) {
    const run = this.syncRuns.get(id);
    if (run) {
      Object.assign(run, updates);
      this.syncRuns.set(id, run);
    }
    return run;
  }

  getLatestSyncRun(userId: number) {
    let latest: any = null;
    for (const run of this.syncRuns.values()) {
      if (run.user_id === userId) {
        if (!latest || new Date(run.started_at) > new Date(latest.started_at)) {
          latest = run;
        }
      }
    }
    return latest ? { ...latest } : null;
  }

  getInstallation(userId: number) {
    for (const inst of this.installations.values()) {
      if (inst.user_id === userId) {
        return { ...inst };
      }
    }
    return null;
  }

  setInstallation(userId: number, githubInstallationId: number, accountLogin: string) {
    const id = ++this.nextId;
    const inst = {
      id,
      user_id: userId,
      github_installation_id: githubInstallationId,
      account_login: accountLogin,
      suspended_at: null,
      created_at: new Date(),
    };
    this.installations.set(id, inst);
    return inst;
  }

  deleteUserAccount(userId: number) {
    // Strict multi-tenant cascade wipe
    for (const [id, r] of this.repos.entries()) {
      if (r.user_id === userId) {
        this.repos.delete(id);
        this.repoMeta.delete(id);
      }
    }
    for (const [key, act] of this.repoActivity.entries()) {
      if (act.user_id === userId) {
        this.repoActivity.delete(key);
      }
    }
    for (const [hash, s] of this.sessions.entries()) {
      if (s.user_id === userId) {
        this.sessions.delete(hash);
      }
    }
    for (const [id, inst] of this.installations.entries()) {
      if (inst.user_id === userId) {
        this.installations.delete(id);
      }
    }
    for (const [id, run] of this.syncRuns.entries()) {
      if (run.user_id === userId) {
        this.syncRuns.delete(id);
      }
    }
    this.settings.delete(userId);
    this.users.delete(userId);
    this.auditLog = this.auditLog.filter(a => a.user_id !== userId);
    return true;
  }
}

export const memoryDb = new MemoryTenantStore();
