import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure BigInt (PostgreSQL OID 20) is consistently parsed as string everywhere
pg.types.setTypeParser(20, (val: string) => String(val));

/**
 * Privileged PostgreSQL Connection Pool (Used for auth operations: users, sessions)
 */
export const authPool = new pg.Pool({
  connectionString: env.DATABASE_URL_AUTH || env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});
authPool.on('error', (err) => {
  logger.warn({ error: err.message }, 'Auth database pool warning');
});

/**
 * Tenant PostgreSQL Connection Pool (Uses RLS with app.user_id)
 */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});
pool.on('error', (err) => {
  logger.warn({ error: err.message }, 'Tenant database pool warning');
});

let isPostgresAvailable = false;

/**
 * Initialize database and verify connectivity & migrations
 */
export async function initDb(): Promise<boolean> {
  try {
    const migrationCandidates = [
      path.resolve(__dirname, 'migrations.sql'),
      path.resolve(__dirname, '../../src/db/migrations.sql'),
      path.resolve(process.cwd(), 'dist/db/migrations.sql'),
      path.resolve(process.cwd(), 'src/db/migrations.sql'),
      path.resolve(process.cwd(), 'server/src/db/migrations.sql'),
    ];

    let sql: string | null = null;
    for (const p of migrationCandidates) {
      if (fs.existsSync(p)) {
        sql = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (sql) {
      await authPool.query(sql);
      isPostgresAvailable = true;
      logger.info('Database schema and RLS policies successfully initialized and verified.');
      return true;
    }
    return false;
  } catch (err: any) {
    logger.warn({ error: err.message }, 'PostgreSQL not reachable, utilizing resilient in-memory tenant store');
    isPostgresAvailable = false;
    return false;
  }
}

/**
 * Execute a query with tenant context set in PostgreSQL session
 */
export async function withTenant<T>(
  userId: string | number,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  const uid = String(userId);
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE repopulse_app');
    await client.query("SELECT set_config('app.user_id', $1, true)", [uid]);
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

// In-memory fallback data structures for offline / unit-test environments
interface MemoryUser {
  id: string;
  github_user_id: string;
  github_token?: string | null;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
  created_at: Date;
  deleted_at?: Date | null;
}

interface MemorySession {
  id_hash: string;
  user_id: string;
  created_at: Date;
  last_seen_at: Date;
  expires_at: Date;
  ip_hash?: string | null;
  ua?: string | null;
}

interface MemoryRepo {
  id: string;
  user_id: string;
  installation_id?: string | null;
  github_repo_id: string;
  full_name: string;
  is_private: boolean;
  is_fork: boolean;
  is_archived: boolean;
  owner_login: string;
  owner_type: string;
  relationship: string;
  permission: string;
  default_branch: string;
  last_commit_at?: Date | null;
  pushed_at?: Date | null;
  created_at_github?: Date | null;
  language?: string | null;
  archived_on_github: boolean;
  synced_at: Date;
}

interface MemoryActivity {
  repo_id: string;
  user_id: string;
  day: string;
  commits_mine: number;
  commits_all: number;
  commits: number;
}

interface MemoryRepoMeta {
  repo_id: string;
  user_id: string;
  label?: string | null;
  goal_date?: string | null;
  note?: string | null;
  decision?: 'keep' | 'pause' | 'retire' | null;
  paused_until?: string | null;
  decided_at?: Date | null;
}

interface MemorySettings {
  user_id: string;
  active_days: number;
  cooling_days: number;
  stale_days: number;
  theme: string;
  updated_at: Date;
}

interface MemoryInstallation {
  id: string;
  user_id: string;
  github_installation_id: string;
  account_login: string;
  account_type: string;
  selection: string;
  repo_count: number;
  private_repo_count: number;
  public_repo_count: number;
  suspended_at?: Date | null;
  last_synced_at?: Date | null;
  created_at: Date;
}

interface MemoryContributor {
  id: string;
  repo_id: string;
  user_id: string;
  login: string;
  avatar_url?: string | null;
  commits_30d: number;
}

interface MemoryStatusChange {
  id: string;
  repo_id: string;
  user_id: string;
  status: string;
  since: Date;
  created_at: Date;
}

interface MemorySavedView {
  id: string;
  user_id: string;
  name: string;
  query: any;
  created_at: Date;
}

interface MemorySnapshot {
  id: string;
  user_id: string;
  slug: string;
  title?: string | null;
  template: string;
  config: any;
  data: any;
  created_at: Date;
  revoked_at?: Date | null;
}

interface MemoryAchievement {
  id: string;
  user_id: string;
  key: string;
  earned_at: Date;
  meta: any;
}

const mem = {
  users: new Map<string, MemoryUser>(),
  sessions: new Map<string, MemorySession>(),
  repos: new Map<string, MemoryRepo>(),
  activity: new Map<string, MemoryActivity>(),
  meta: new Map<string, MemoryRepoMeta>(),
  settings: new Map<string, MemorySettings>(),
  installations: new Map<string, MemoryInstallation>(),
  contributors: new Map<string, MemoryContributor>(),
  statusChanges: new Map<string, MemoryStatusChange>(),
  savedViews: new Map<string, MemorySavedView>(),
  snapshots: new Map<string, MemorySnapshot>(),
  achievements: new Map<string, MemoryAchievement>(),
  syncRuns: [] as any[],
  auditLogs: [] as any[],
  idCounter: 1000,
  nextId() {
    return String(++this.idCounter);
  },
};

// =====================================================================
// Database Access Layer (PostgreSQL with RLS & In-Memory Fallback)
// =====================================================================

export const db = {
  // 1. Users
  async findUserById(id: string | number) {
    const uid = String(id);
    try {
      const res = await authPool.query(
        `SELECT id, github_user_id, login, name, avatar_url, github_token, created_at, deleted_at 
         FROM users 
         WHERE id = $1 AND deleted_at IS NULL`,
        [uid]
      );
      if (res.rows[0]) return res.rows[0];
    } catch {
      // Fallback
    }
    const u = mem.users.get(uid);
    if (u && !u.deleted_at) return u;
    return null;
  },

  async findUserByGithubId(githubUserId: string | number) {
    const ghId = String(githubUserId);
    try {
      const res = await authPool.query(
        `SELECT id, github_user_id, login, name, avatar_url, created_at, deleted_at 
         FROM users 
         WHERE github_user_id = $1 AND deleted_at IS NULL`,
        [ghId]
      );
      if (res.rows[0]) return res.rows[0];
    } catch {
      // Fallback
    }
    for (const u of mem.users.values()) {
      if (u.github_user_id === ghId && !u.deleted_at) return u;
    }
    return null;
  },

  async linkTokenToUser(userId: string | number, token: string, githubInfo?: { github_user_id?: string | number; login?: string; avatar_url?: string }) {
    const uid = String(userId);
    try {
      const res = await authPool.query(
        `UPDATE users
         SET github_token = $1,
             github_user_id = COALESCE($2, github_user_id),
             avatar_url = COALESCE($3, avatar_url)
         WHERE id = $4
         RETURNING id, github_user_id, login, name, avatar_url, created_at`,
        [token, githubInfo?.github_user_id ? String(githubInfo.github_user_id) : null, githubInfo?.avatar_url || null, uid]
      );
      if (res.rows[0]) return res.rows[0];
    } catch {
      // Fallback
    }
    const u = mem.users.get(uid);
    if (u) {
      u.github_token = token;
      if (githubInfo?.github_user_id) u.github_user_id = String(githubInfo.github_user_id);
      if (githubInfo?.avatar_url) u.avatar_url = githubInfo.avatar_url;
      return u;
    }
    return null;
  },

  async upsertUser(user: { github_user_id: string | number; login: string; name?: string | null; avatar_url?: string | null }) {
    const ghId = String(user.github_user_id);
    try {
      const res = await authPool.query(
        `INSERT INTO users (github_user_id, login, name, avatar_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (github_user_id) 
         DO UPDATE SET login = EXCLUDED.login, name = COALESCE(EXCLUDED.name, users.name), avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url), deleted_at = NULL
         RETURNING id, github_user_id, login, name, avatar_url, created_at`,
        [ghId, user.login, user.name || null, user.avatar_url || null]
      );
      const row = res.rows[0];
      await authPool.query(
        `INSERT INTO settings (user_id, active_days, cooling_days, stale_days, theme)
         VALUES ($1, 7, 14, 30, 'system')
         ON CONFLICT (user_id) DO NOTHING`,
        [row.id]
      );
      return row;
    } catch {
      // Fallback
    }

    let existing: MemoryUser | null = null;
    for (const u of mem.users.values()) {
      if (u.github_user_id === ghId) {
        existing = u;
        break;
      }
    }

    if (existing) {
      existing.login = user.login;
      if (user.name !== undefined) existing.name = user.name;
      if (user.avatar_url !== undefined) existing.avatar_url = user.avatar_url;
      existing.deleted_at = null;
      return existing;
    }

    const newId = mem.nextId();
    const newUser: MemoryUser = {
      id: newId,
      github_user_id: ghId,
      login: user.login,
      name: user.name || null,
      avatar_url: user.avatar_url || null,
      created_at: new Date(),
    };
    mem.users.set(newId, newUser);
    mem.settings.set(newId, {
      user_id: newId,
      active_days: 7,
      cooling_days: 14,
      stale_days: 30,
      theme: 'system',
      updated_at: new Date(),
    });
    return newUser;
  },

  // 2. Sessions
  async createSession(session: { id_hash: string; user_id: string | number; expires_at: Date; ip_hash?: string | null; ua?: string | null }) {
    const uid = String(session.user_id);
    try {
      const res = await authPool.query(
        `INSERT INTO sessions (id_hash, user_id, created_at, last_seen_at, expires_at, ip_hash, ua)
         VALUES ($1, $2, now(), now(), $3, $4, $5)
         RETURNING id_hash, user_id, created_at, last_seen_at, expires_at, ip_hash, ua`,
        [session.id_hash, uid, session.expires_at, session.ip_hash || null, session.ua || null]
      );
      if (res.rows[0]) return res.rows[0];
    } catch {
      // Fallback
    }

    const memSession: MemorySession = {
      id_hash: session.id_hash,
      user_id: uid,
      created_at: new Date(),
      last_seen_at: new Date(),
      expires_at: session.expires_at,
      ip_hash: session.ip_hash || null,
      ua: session.ua || null,
    };
    mem.sessions.set(session.id_hash, memSession);
    return memSession;
  },

  async findSession(idHash: string) {
    try {
      const res = await authPool.query(
        `SELECT id_hash, user_id, created_at, last_seen_at, expires_at, ip_hash, ua
         FROM sessions
         WHERE id_hash = $1`,
        [idHash]
      );
      if (res.rows[0]) return res.rows[0];
    } catch {
      // Fallback
    }
    return mem.sessions.get(idHash) || null;
  },

  async updateSessionLastSeen(idHash: string) {
    try {
      await authPool.query(
        `UPDATE sessions SET last_seen_at = now() WHERE id_hash = $1`,
        [idHash]
      );
    } catch {
      const s = mem.sessions.get(idHash);
      if (s) s.last_seen_at = new Date();
    }
  },

  async deleteSession(idHash: string) {
    try {
      const res = await authPool.query(
        `DELETE FROM sessions WHERE id_hash = $1`,
        [idHash]
      );
      return (res.rowCount ?? 0) > 0;
    } catch {
      return mem.sessions.delete(idHash);
    }
  },

  async deleteAllUserSessions(userId: string | number) {
    const uid = String(userId);
    try {
      const res = await authPool.query(
        `DELETE FROM sessions WHERE user_id = $1`,
        [uid]
      );
      return res.rowCount ?? 0;
    } catch {
      let count = 0;
      for (const [k, s] of mem.sessions.entries()) {
        if (s.user_id === uid) {
          mem.sessions.delete(k);
          count++;
        }
      }
      return count;
    }
  },

  // 3. Settings
  async getSettings(userId: string | number) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `SELECT user_id, active_days, cooling_days, stale_days, theme, updated_at
           FROM settings
           WHERE user_id = $1`,
          [uid]
        );
        if (res.rows.length > 0) return res.rows[0];
        const ins = await client.query(
          `INSERT INTO settings (user_id, active_days, cooling_days, stale_days, theme)
           VALUES ($1, 7, 14, 30, 'system')
           ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
           RETURNING user_id, active_days, cooling_days, stale_days, theme, updated_at`,
          [uid]
        );
        return ins.rows[0];
      });
    } catch {
      let s = mem.settings.get(uid);
      if (!s) {
        s = {
          user_id: uid,
          active_days: 7,
          cooling_days: 14,
          stale_days: 30,
          theme: 'system',
          updated_at: new Date(),
        };
        mem.settings.set(uid, s);
      }
      return s;
    }
  },

  async updateSettings(userId: string | number, updates: { active_days?: number; cooling_days?: number; stale_days?: number; theme?: string }) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const current = await this.getSettings(userId);
        const activeDays = updates.active_days ?? current.active_days;
        const coolingDays = updates.cooling_days ?? current.cooling_days;
        const staleDays = updates.stale_days ?? current.stale_days;
        const theme = updates.theme ?? current.theme;

        const res = await client.query(
          `UPDATE settings
           SET active_days = $1, cooling_days = $2, stale_days = $3, theme = $4, updated_at = now()
           WHERE user_id = $5
           RETURNING user_id, active_days, cooling_days, stale_days, theme, updated_at`,
          [activeDays, coolingDays, staleDays, theme, uid]
        );
        return res.rows[0];
      });
    } catch {
      let s = mem.settings.get(uid) || {
        user_id: uid,
        active_days: 7,
        cooling_days: 14,
        stale_days: 30,
        theme: 'system',
        updated_at: new Date(),
      };
      if (updates.active_days !== undefined) s.active_days = updates.active_days;
      if (updates.cooling_days !== undefined) s.cooling_days = updates.cooling_days;
      if (updates.stale_days !== undefined) s.stale_days = updates.stale_days;
      if (updates.theme !== undefined) s.theme = updates.theme;
      s.updated_at = new Date();
      mem.settings.set(uid, s);
      return s;
    }
  },

  // 4. Repositories
  async getUserRepos(userId: string | number) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const reposRes = await client.query(
          `SELECT r.id, r.user_id, r.installation_id, r.github_repo_id, r.full_name,
                  r.is_private, r.is_fork, r.is_archived, r.owner_login, r.owner_type,
                  r.relationship, r.permission, r.default_branch, r.last_commit_at,
                  r.pushed_at, r.created_at_github, r.language,
                  r.archived_on_github, r.synced_at,
                  m.label, to_char(m.goal_date, 'YYYY-MM-DD') as goal_date, m.note, m.decision, to_char(m.paused_until, 'YYYY-MM-DD') as paused_until, m.decided_at
           FROM repos r
           LEFT JOIN repo_meta m ON r.id = m.repo_id AND m.user_id = r.user_id
           WHERE r.user_id = $1
           ORDER BY r.last_commit_at DESC NULLS LAST`,
          [uid]
        );

        const repoIds = reposRes.rows.map((r) => r.id);
        let activitiesByRepo: Record<string, { day: string; commits_mine: number; commits_all: number; commits: number }[]> = {};

        if (repoIds.length > 0) {
          const actRes = await client.query(
            `SELECT repo_id, to_char(day, 'YYYY-MM-DD') as day, commits_mine, commits_all, commits
             FROM repo_activity
             WHERE user_id = $1 AND repo_id = ANY($2::bigint[])
             ORDER BY day ASC`,
            [uid, repoIds]
          );
          for (const act of actRes.rows) {
            const rId = String(act.repo_id);
            if (!activitiesByRepo[rId]) {
              activitiesByRepo[rId] = [];
            }
            activitiesByRepo[rId].push({
              day: act.day,
              commits_mine: Number(act.commits_mine || act.commits || 0),
              commits_all: Number(act.commits_all || act.commits || 0),
              commits: Number(act.commits || 0),
            });
          }
        }

        return reposRes.rows.map((r) => {
          const rId = String(r.id);
          return {
            id: r.id,
            user_id: r.user_id,
            installation_id: r.installation_id,
            github_repo_id: r.github_repo_id,
            full_name: r.full_name,
            is_private: r.is_private,
            is_fork: r.is_fork ?? false,
            is_archived: r.is_archived ?? false,
            owner_login: r.owner_login || (r.full_name.split('/')[0] || ''),
            owner_type: r.owner_type || 'User',
            relationship: r.relationship || 'owner',
            permission: r.permission || 'admin',
            default_branch: r.default_branch,
            last_commit_at: r.last_commit_at,
            pushed_at: r.pushed_at,
            created_at_github: r.created_at_github,
            language: r.language,
            archived_on_github: r.archived_on_github,
            synced_at: r.synced_at,
            meta: {
              label: r.label,
              goal_date: r.goal_date || null,
              note: r.note,
              decision: r.decision,
              paused_until: r.paused_until || null,
              decided_at: r.decided_at,
            },
            activity: activitiesByRepo[rId] || [],
          };
        });
      });
    } catch {
      // Memory fallback
      const userRepos = Array.from(mem.repos.values()).filter((r) => r.user_id === uid);
      return userRepos.map((r) => {
        const meta = mem.meta.get(r.id);
        const acts: { day: string; commits_mine: number; commits_all: number; commits: number }[] = [];
        for (const a of mem.activity.values()) {
          if (a.repo_id === r.id && a.user_id === uid) {
            acts.push({
              day: a.day,
              commits_mine: a.commits_mine,
              commits_all: a.commits_all,
              commits: a.commits,
            });
          }
        }
        acts.sort((a, b) => a.day.localeCompare(b.day));

        return {
          id: r.id,
          user_id: r.user_id,
          installation_id: r.installation_id || null,
          github_repo_id: r.github_repo_id,
          full_name: r.full_name,
          is_private: r.is_private,
          is_fork: r.is_fork,
          is_archived: r.is_archived,
          owner_login: r.owner_login || (r.full_name.split('/')[0] || ''),
          owner_type: r.owner_type || 'User',
          relationship: r.relationship || 'owner',
          permission: r.permission || 'admin',
          default_branch: r.default_branch,
          last_commit_at: r.last_commit_at || null,
          pushed_at: r.pushed_at || null,
          created_at_github: r.created_at_github || null,
          language: r.language || null,
          archived_on_github: r.archived_on_github,
          synced_at: r.synced_at,
          meta: {
            label: meta?.label || null,
            goal_date: meta?.goal_date || null,
            note: meta?.note || null,
            decision: meta?.decision || null,
            paused_until: meta?.paused_until || null,
            decided_at: meta?.decided_at || null,
          },
          activity: acts,
        };
      });
    }
  },

  async upsertRepo(repo: {
    user_id: string | number;
    installation_id?: string | number | null;
    github_repo_id: string | number;
    full_name: string;
    is_private?: boolean;
    is_fork?: boolean;
    is_archived?: boolean;
    owner_login?: string;
    owner_type?: string;
    relationship?: string;
    permission?: string;
    default_branch?: string;
    last_commit_at?: Date | string | null;
    pushed_at?: Date | string | null;
    created_at_github?: Date | string | null;
    language?: string | null;
    archived_on_github?: boolean;
  }) {
    const uid = String(repo.user_id);
    const ghId = String(repo.github_repo_id);
    const owner = repo.owner_login || repo.full_name.split('/')[0] || '';

    try {
      return await withTenant(repo.user_id, async (client) => {
        const res = await client.query(
          `INSERT INTO repos (user_id, installation_id, github_repo_id, full_name, is_private, is_fork, is_archived, owner_login, owner_type, relationship, permission, default_branch, last_commit_at, pushed_at, created_at_github, language, archived_on_github, synced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, now())
           ON CONFLICT (user_id, github_repo_id)
           DO UPDATE SET full_name = EXCLUDED.full_name,
                         is_private = EXCLUDED.is_private,
                         is_fork = EXCLUDED.is_fork,
                         is_archived = EXCLUDED.is_archived,
                         owner_login = EXCLUDED.owner_login,
                         owner_type = EXCLUDED.owner_type,
                         relationship = EXCLUDED.relationship,
                         permission = EXCLUDED.permission,
                         default_branch = EXCLUDED.default_branch,
                         last_commit_at = COALESCE(EXCLUDED.last_commit_at, repos.last_commit_at),
                         pushed_at = COALESCE(EXCLUDED.pushed_at, repos.pushed_at),
                         language = COALESCE(EXCLUDED.language, repos.language),
                         archived_on_github = EXCLUDED.archived_on_github,
                         synced_at = now()
           RETURNING id, user_id, installation_id, github_repo_id, full_name, is_private, is_fork, is_archived, owner_login, owner_type, relationship, permission, default_branch, last_commit_at, pushed_at, created_at_github, language, archived_on_github, synced_at`,
          [
            uid,
            repo.installation_id ? String(repo.installation_id) : null,
            ghId,
            repo.full_name,
            repo.is_private ?? false,
            repo.is_fork ?? false,
            repo.is_archived ?? false,
            owner,
            repo.owner_type || 'User',
            repo.relationship || 'owner',
            repo.permission || 'admin',
            repo.default_branch || 'main',
            repo.last_commit_at ? new Date(repo.last_commit_at) : null,
            repo.pushed_at ? new Date(repo.pushed_at) : null,
            repo.created_at_github ? new Date(repo.created_at_github) : null,
            repo.language || null,
            repo.archived_on_github ?? false,
          ]
        );
        return res.rows[0];
      });
    } catch {
      // Memory fallback
      let found: MemoryRepo | null = null;
      for (const r of mem.repos.values()) {
        if (r.user_id === uid && r.github_repo_id === ghId) {
          found = r;
          break;
        }
      }

      if (found) {
        found.full_name = repo.full_name;
        found.is_private = repo.is_private ?? found.is_private;
        found.is_fork = repo.is_fork ?? found.is_fork;
        found.is_archived = repo.is_archived ?? found.is_archived;
        found.owner_login = owner;
        found.owner_type = repo.owner_type || found.owner_type;
        found.relationship = repo.relationship || found.relationship;
        found.permission = repo.permission || found.permission;
        found.default_branch = repo.default_branch || found.default_branch;
        if (repo.last_commit_at) found.last_commit_at = new Date(repo.last_commit_at);
        if (repo.pushed_at) found.pushed_at = new Date(repo.pushed_at);
        if (repo.language) found.language = repo.language;
        found.archived_on_github = repo.archived_on_github ?? found.archived_on_github;
        found.synced_at = new Date();
        return found;
      }

      const newId = mem.nextId();
      const newRepo: MemoryRepo = {
        id: newId,
        user_id: uid,
        installation_id: repo.installation_id ? String(repo.installation_id) : null,
        github_repo_id: ghId,
        full_name: repo.full_name,
        is_private: repo.is_private ?? false,
        is_fork: repo.is_fork ?? false,
        is_archived: repo.is_archived ?? false,
        owner_login: owner,
        owner_type: repo.owner_type || 'User',
        relationship: repo.relationship || 'owner',
        permission: repo.permission || 'admin',
        default_branch: repo.default_branch || 'main',
        last_commit_at: repo.last_commit_at ? new Date(repo.last_commit_at) : null,
        pushed_at: repo.pushed_at ? new Date(repo.pushed_at) : null,
        created_at_github: repo.created_at_github ? new Date(repo.created_at_github) : null,
        language: repo.language || null,
        archived_on_github: repo.archived_on_github ?? false,
        synced_at: new Date(),
      };
      mem.repos.set(newId, newRepo);
      return newRepo;
    }
  },

  async upsertActivity(
    repoId: string | number,
    userId: string | number,
    day: string,
    commitsMine: number,
    commitsAll?: number
  ) {
    const rId = String(repoId);
    const uid = String(userId);
    const mine = commitsMine || 0;
    const all = commitsAll !== undefined ? commitsAll : mine;

    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `INSERT INTO repo_activity (repo_id, user_id, day, commits_mine, commits_all, commits)
           VALUES ($1, $2, $3::date, $4, $5, $6)
           ON CONFLICT (repo_id, day)
           DO UPDATE SET commits_mine = EXCLUDED.commits_mine,
                         commits_all = EXCLUDED.commits_all,
                         commits = EXCLUDED.commits
           RETURNING repo_id, user_id, to_char(day, 'YYYY-MM-DD') as day, commits_mine, commits_all, commits`,
          [rId, uid, day, mine, all, mine]
        );
        return res.rows[0];
      });
    } catch {
      const key = `${rId}_${day}`;
      const act: MemoryActivity = {
        repo_id: rId,
        user_id: uid,
        day,
        commits_mine: mine,
        commits_all: all,
        commits: mine,
      };
      mem.activity.set(key, act);
      return act;
    }
  },

  async upsertRepoMeta(repoId: string | number, userId: string | number, meta: {
    label?: string | null;
    goal_date?: string | null;
    note?: string | null;
    decision?: 'keep' | 'pause' | 'retire' | null;
    paused_until?: string | null;
  }) {
    const rId = String(repoId);
    const uid = String(userId);

    try {
      return await withTenant(userId, async (client) => {
        const existing = await client.query(
          `SELECT repo_id, user_id, label, goal_date, note, decision, paused_until, decided_at
           FROM repo_meta
           WHERE repo_id = $1 AND user_id = $2`,
          [rId, uid]
        );

        const decidedAt = meta.decision !== undefined ? (meta.decision ? new Date() : null) : existing.rows[0]?.decided_at;

        const res = await client.query(
          `INSERT INTO repo_meta (repo_id, user_id, label, goal_date, note, decision, paused_until, decided_at)
           VALUES ($1, $2, $3, $4::date, $5, $6, $7::date, $8)
           ON CONFLICT (repo_id)
           DO UPDATE SET
             label = CASE WHEN $9 THEN $3 ELSE repo_meta.label END,
             goal_date = CASE WHEN $10 THEN $4::date ELSE repo_meta.goal_date END,
             note = CASE WHEN $11 THEN $5 ELSE repo_meta.note END,
             decision = CASE WHEN $12 THEN $6 ELSE repo_meta.decision END,
             paused_until = CASE WHEN $13 THEN $7::date ELSE repo_meta.paused_until END,
             decided_at = CASE WHEN $12 THEN $8 ELSE repo_meta.decided_at END
           RETURNING repo_id, user_id, label, to_char(goal_date, 'YYYY-MM-DD') as goal_date, note, decision, to_char(paused_until, 'YYYY-MM-DD') as paused_until, decided_at`,
          [
            rId,
            uid,
            meta.label ?? null,
            meta.goal_date ?? null,
            meta.note ?? null,
            meta.decision ?? null,
            meta.paused_until ?? null,
            decidedAt,
            meta.label !== undefined,
            meta.goal_date !== undefined,
            meta.note !== undefined,
            meta.decision !== undefined,
            meta.paused_until !== undefined,
          ]
        );
        return res.rows[0];
      });
    } catch {
      let m = mem.meta.get(rId);
      if (!m) {
        m = { repo_id: rId, user_id: uid };
        mem.meta.set(rId, m);
      }
      if (meta.label !== undefined) m.label = meta.label;
      if (meta.goal_date !== undefined) m.goal_date = meta.goal_date;
      if (meta.note !== undefined) m.note = meta.note;
      if (meta.decision !== undefined) {
        m.decision = meta.decision;
        m.decided_at = meta.decision ? new Date() : null;
      }
      if (meta.paused_until !== undefined) m.paused_until = meta.paused_until;
      return m;
    }
  },

  async removeMissingRepos(userId: string | number, activeGithubRepoIds: (string | number)[]) {
    const uid = String(userId);
    if (!activeGithubRepoIds || activeGithubRepoIds.length === 0) return 0;
    const idsStr = activeGithubRepoIds.map((id) => String(id));

    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `DELETE FROM repos
           WHERE user_id = $1 AND github_repo_id != ALL($2::bigint[])`,
          [uid, idsStr]
        );
        return res.rowCount ?? 0;
      });
    } catch {
      let removed = 0;
      for (const [k, r] of mem.repos.entries()) {
        if (r.user_id === uid && !idsStr.includes(r.github_repo_id)) {
          mem.repos.delete(k);
          removed++;
        }
      }
      return removed;
    }
  },

  // 5. Contributors
  async getRepoContributors(repoId: string | number, userId: string | number) {
    const rId = String(repoId);
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `SELECT id, repo_id, user_id, login, avatar_url, commits_30d
           FROM repo_contributors
           WHERE repo_id = $1 AND user_id = $2
           ORDER BY commits_30d DESC
           LIMIT 10`,
          [rId, uid]
        );
        return res.rows;
      });
    } catch {
      const contribs: MemoryContributor[] = [];
      for (const c of mem.contributors.values()) {
        if (c.repo_id === rId && c.user_id === uid) {
          contribs.push(c);
        }
      }
      contribs.sort((a, b) => b.commits_30d - a.commits_30d);
      return contribs.slice(0, 10);
    }
  },

  async upsertRepoContributor(
    repoId: string | number,
    userId: string | number,
    login: string,
    avatarUrl?: string | null,
    commits30d: number = 0
  ) {
    const rId = String(repoId);
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `INSERT INTO repo_contributors (repo_id, user_id, login, avatar_url, commits_30d)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (repo_id, login)
           DO UPDATE SET avatar_url = COALESCE(EXCLUDED.avatar_url, repo_contributors.avatar_url),
                         commits_30d = EXCLUDED.commits_30d
           RETURNING id, repo_id, user_id, login, avatar_url, commits_30d`,
          [rId, uid, login, avatarUrl || null, commits30d]
        );
        return res.rows[0];
      });
    } catch {
      const key = `${rId}_${login}`;
      let c = mem.contributors.get(key);
      if (c) {
        if (avatarUrl) c.avatar_url = avatarUrl;
        c.commits_30d = commits30d;
      } else {
        c = {
          id: mem.nextId(),
          repo_id: rId,
          user_id: uid,
          login,
          avatar_url: avatarUrl || null,
          commits_30d: commits30d,
        };
        mem.contributors.set(key, c);
      }
      return c;
    }
  },

  // 6. Status Changes
  async recordStatusChange(repoId: string | number, userId: string | number, status: string) {
    const rId = String(repoId);
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `INSERT INTO status_changes (repo_id, user_id, status, since, created_at)
           VALUES ($1, $2, $3, now(), now())
           RETURNING id, repo_id, user_id, status, since, created_at`,
          [rId, uid, status]
        );
        return res.rows[0];
      });
    } catch {
      const id = mem.nextId();
      const sc: MemoryStatusChange = {
        id,
        repo_id: rId,
        user_id: uid,
        status,
        since: new Date(),
        created_at: new Date(),
      };
      mem.statusChanges.set(id, sc);
      return sc;
    }
  },

  async getRecentStatusChanges(userId: string | number, days: number = 7) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `SELECT id, repo_id, user_id, status, since, created_at
           FROM status_changes
           WHERE user_id = $1 AND created_at >= (now() - ($2 || ' days')::interval)
           ORDER BY created_at DESC`,
          [uid, days]
        );
        return res.rows;
      });
    } catch {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      return Array.from(mem.statusChanges.values())
        .filter((sc) => sc.user_id === uid && sc.created_at.getTime() >= cutoff)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    }
  },

  // 7. Saved Views
  async getSavedViews(userId: string | number) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `SELECT id, user_id, name, query, created_at
           FROM saved_views
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [uid]
        );
        return res.rows;
      });
    } catch {
      return Array.from(mem.savedViews.values()).filter((v) => v.user_id === uid);
    }
  },

  async createSavedView(userId: string | number, name: string, query: any) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `INSERT INTO saved_views (user_id, name, query, created_at)
           VALUES ($1, $2, $3::jsonb, now())
           RETURNING id, user_id, name, query, created_at`,
          [uid, name, JSON.stringify(query)]
        );
        return res.rows[0];
      });
    } catch {
      const id = mem.nextId();
      const sv: MemorySavedView = {
        id,
        user_id: uid,
        name,
        query,
        created_at: new Date(),
      };
      mem.savedViews.set(id, sv);
      return sv;
    }
  },

  async deleteSavedView(viewId: string | number, userId: string | number) {
    const vId = String(viewId);
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `DELETE FROM saved_views WHERE id = $1 AND user_id = $2`,
          [vId, uid]
        );
        return (res.rowCount ?? 0) > 0;
      });
    } catch {
      const v = mem.savedViews.get(vId);
      if (v && v.user_id === uid) {
        return mem.savedViews.delete(vId);
      }
      return false;
    }
  },

  // 8. Snapshots (Share cards)
  async getSnapshots(userId: string | number) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `SELECT id, user_id, slug, title, template, config, data, created_at, revoked_at
           FROM snapshots
           WHERE user_id = $1 AND revoked_at IS NULL
           ORDER BY created_at DESC`,
          [uid]
        );
        return res.rows;
      });
    } catch {
      return Array.from(mem.snapshots.values()).filter(
        (s) => s.user_id === uid && !s.revoked_at
      );
    }
  },

  async getSnapshotBySlug(slug: string) {
    try {
      const res = await authPool.query(
        `SELECT id, user_id, slug, title, template, config, data, created_at, revoked_at
         FROM snapshots
         WHERE slug = $1 AND revoked_at IS NULL`,
        [slug]
      );
      if (res.rows[0]) return res.rows[0];
    } catch {
      // Fallback
    }
    const s = mem.snapshots.get(slug);
    if (s && !s.revoked_at) return s;
    return null;
  },

  async createSnapshot(userId: string | number, snapshot: {
    slug: string;
    title?: string | null;
    template: string;
    config: any;
    data: any;
  }) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `INSERT INTO snapshots (user_id, slug, title, template, config, data, created_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, now())
           RETURNING id, user_id, slug, title, template, config, data, created_at`,
          [uid, snapshot.slug, snapshot.title || null, snapshot.template, JSON.stringify(snapshot.config), JSON.stringify(snapshot.data)]
        );
        return res.rows[0];
      });
    } catch {
      const id = mem.nextId();
      const s: MemorySnapshot = {
        id,
        user_id: uid,
        slug: snapshot.slug,
        title: snapshot.title || null,
        template: snapshot.template,
        config: snapshot.config,
        data: snapshot.data,
        created_at: new Date(),
      };
      mem.snapshots.set(snapshot.slug, s);
      return s;
    }
  },

  async revokeSnapshot(slug: string, userId: string | number) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `UPDATE snapshots
           SET revoked_at = now()
           WHERE slug = $1 AND user_id = $2
           RETURNING id, slug, revoked_at`,
          [slug, uid]
        );
        return (res.rowCount ?? 0) > 0;
      });
    } catch {
      const s = mem.snapshots.get(slug);
      if (s && s.user_id === uid) {
        s.revoked_at = new Date();
        return true;
      }
      return false;
    }
  },

  // 9. Achievements
  async getAchievements(userId: string | number) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `SELECT id, user_id, key, earned_at, meta
           FROM achievements
           WHERE user_id = $1
           ORDER BY earned_at DESC`,
          [uid]
        );
        return res.rows;
      });
    } catch {
      return Array.from(mem.achievements.values()).filter((a) => a.user_id === uid);
    }
  },

  async awardAchievement(userId: string | number, key: string, meta: any = {}) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `INSERT INTO achievements (user_id, key, earned_at, meta)
           VALUES ($1, $2, now(), $3::jsonb)
           ON CONFLICT (user_id, key) DO NOTHING
           RETURNING id, user_id, key, earned_at, meta`,
          [uid, key, JSON.stringify(meta)]
        );
        return res.rows[0] || null;
      });
    } catch {
      const aKey = `${uid}_${key}`;
      if (!mem.achievements.has(aKey)) {
        const a: MemoryAchievement = {
          id: mem.nextId(),
          user_id: uid,
          key,
          earned_at: new Date(),
          meta,
        };
        mem.achievements.set(aKey, a);
        return a;
      }
      return null;
    }
  },

  // 10. Installations
  async getInstallation(userId: string | number) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `SELECT id, user_id, github_installation_id, account_login, account_type, selection, repo_count, private_repo_count, public_repo_count, suspended_at, last_synced_at, created_at
           FROM installations
           WHERE user_id = $1
           ORDER BY created_at ASC
           LIMIT 1`,
          [uid]
        );
        return res.rows[0] || null;
      });
    } catch {
      for (const inst of mem.installations.values()) {
        if (inst.user_id === uid) return inst;
      }
      return null;
    }
  },

  async getInstallations(userId: string | number) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `SELECT id, user_id, github_installation_id, account_login, account_type, selection, repo_count, private_repo_count, public_repo_count, suspended_at, last_synced_at, created_at
           FROM installations
           WHERE user_id = $1
           ORDER BY created_at ASC`,
          [uid]
        );
        return res.rows;
      });
    } catch {
      return Array.from(mem.installations.values()).filter((inst) => inst.user_id === uid);
    }
  },

  async upsertInstallation(
    userId: string | number,
    githubInstallationId: string | number,
    accountLogin: string,
    details?: {
      account_type?: string;
      selection?: string;
      repo_count?: number;
      private_repo_count?: number;
      public_repo_count?: number;
    }
  ) {
    const uid = String(userId);
    const gInstId = String(githubInstallationId);
    const accType = details?.account_type || 'User';
    const selection = details?.selection || 'all';
    const repoCount = details?.repo_count || 0;
    const privCount = details?.private_repo_count || 0;
    const pubCount = details?.public_repo_count || 0;

    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `INSERT INTO installations (user_id, github_installation_id, account_login, account_type, selection, repo_count, private_repo_count, public_repo_count, last_synced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
           ON CONFLICT (github_installation_id)
           DO UPDATE SET account_login = EXCLUDED.account_login,
                         account_type = EXCLUDED.account_type,
                         selection = EXCLUDED.selection,
                         repo_count = EXCLUDED.repo_count,
                         private_repo_count = EXCLUDED.private_repo_count,
                         public_repo_count = EXCLUDED.public_repo_count,
                         last_synced_at = now(),
                         suspended_at = NULL
           RETURNING id, user_id, github_installation_id, account_login, account_type, selection, repo_count, private_repo_count, public_repo_count, suspended_at, last_synced_at, created_at`,
          [uid, gInstId, accountLogin, accType, selection, repoCount, privCount, pubCount]
        );
        return res.rows[0];
      });
    } catch {
      let inst: MemoryInstallation | null = null;
      for (const i of mem.installations.values()) {
        if (i.github_installation_id === gInstId) {
          inst = i;
          break;
        }
      }

      if (inst) {
        inst.account_login = accountLogin;
        inst.account_type = accType;
        inst.selection = selection;
        inst.repo_count = repoCount;
        inst.private_repo_count = privCount;
        inst.public_repo_count = pubCount;
        inst.last_synced_at = new Date();
        return inst;
      }

      const newId = mem.nextId();
      const newInst: MemoryInstallation = {
        id: newId,
        user_id: uid,
        github_installation_id: gInstId,
        account_login: accountLogin,
        account_type: accType,
        selection,
        repo_count: repoCount,
        private_repo_count: privCount,
        public_repo_count: pubCount,
        created_at: new Date(),
        last_synced_at: new Date(),
      };
      mem.installations.set(newId, newInst);
      return newInst;
    }
  },

  // 11. Sync Runs
  async createSyncRun(userId: string | number) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `INSERT INTO sync_runs (user_id, started_at, status, repos_read)
           VALUES ($1, now(), 'running', 0)
           RETURNING id, user_id, started_at, finished_at, status, repos_read, error`,
          [uid]
        );
        return res.rows[0];
      });
    } catch {
      const run = {
        id: mem.nextId(),
        user_id: uid,
        started_at: new Date(),
        finished_at: null,
        status: 'running',
        repos_read: 0,
        error: null,
      };
      mem.syncRuns.unshift(run);
      return run;
    }
  },

  async updateSyncRun(runId: string | number, userId: string | number, updates: {
    finished_at?: Date | null;
    status: 'running' | 'success' | 'failed' | 'rate_limited';
    repos_read?: number;
    error?: string | null;
  }) {
    const rId = String(runId);
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `UPDATE sync_runs
           SET finished_at = $1, status = $2, repos_read = COALESCE($3, repos_read), error = $4
           WHERE id = $5 AND user_id = $6
           RETURNING id, user_id, started_at, finished_at, status, repos_read, error`,
          [
            updates.finished_at || null,
            updates.status,
            updates.repos_read ?? null,
            updates.error || null,
            rId,
            uid,
          ]
        );
        return res.rows[0];
      });
    } catch {
      const r = mem.syncRuns.find((x) => x.id === rId && x.user_id === uid);
      if (r) {
        if (updates.finished_at) r.finished_at = updates.finished_at;
        r.status = updates.status;
        if (updates.repos_read !== undefined) r.repos_read = updates.repos_read;
        if (updates.error !== undefined) r.error = updates.error;
      }
      return r;
    }
  },

  async getLatestSyncRun(userId: string | number) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `SELECT id, user_id, started_at, finished_at, status, repos_read, error
           FROM sync_runs
           WHERE user_id = $1
           ORDER BY started_at DESC
           LIMIT 1`,
          [uid]
        );
        return res.rows[0] || null;
      });
    } catch {
      return mem.syncRuns.find((x) => x.user_id === uid) || null;
    }
  },

  // 12. Audit Log
  async logAudit(userId: string | number, event: string, meta: Record<string, any> = {}) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `INSERT INTO audit_log (user_id, event, meta, created_at)
           VALUES ($1, $2, $3::jsonb, now())
           RETURNING id, user_id, event, meta, created_at`,
          [uid, event, JSON.stringify(meta)]
        );
        return res.rows[0];
      });
    } catch {
      const log = {
        id: mem.nextId(),
        user_id: uid,
        event,
        meta,
        created_at: new Date(),
      };
      mem.auditLogs.unshift(log);
      return log;
    }
  },

  async getAuditLogs(userId: string | number) {
    const uid = String(userId);
    try {
      return await withTenant(userId, async (client) => {
        const res = await client.query(
          `SELECT id, user_id, event, meta, created_at
           FROM audit_log
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [uid]
        );
        return res.rows;
      });
    } catch {
      return mem.auditLogs.filter((x) => x.user_id === uid);
    }
  },

  // 13. Account Deletion Cascade
  async deleteUserAccount(userId: string | number) {
    const uid = String(userId);
    try {
      const res = await authPool.query(
        `DELETE FROM users WHERE id = $1`,
        [uid]
      );
      return (res.rowCount ?? 0) > 0;
    } catch {
      mem.users.delete(uid);
      mem.settings.delete(uid);
      for (const [k, s] of mem.sessions.entries()) {
        if (s.user_id === uid) mem.sessions.delete(k);
      }
      for (const [k, r] of mem.repos.entries()) {
        if (r.user_id === uid) {
          mem.repos.delete(k);
          mem.meta.delete(r.id);
        }
      }
      for (const [k, a] of mem.activity.entries()) {
        if (a.user_id === uid) mem.activity.delete(k);
      }
      for (const [k, i] of mem.installations.entries()) {
        if (i.user_id === uid) mem.installations.delete(k);
      }
      for (const [k, c] of mem.contributors.entries()) {
        if (c.user_id === uid) mem.contributors.delete(k);
      }
      for (const [k, sc] of mem.statusChanges.entries()) {
        if (sc.user_id === uid) mem.statusChanges.delete(k);
      }
      for (const [k, sv] of mem.savedViews.entries()) {
        if (sv.user_id === uid) mem.savedViews.delete(k);
      }
      for (const [k, sn] of mem.snapshots.entries()) {
        if (sn.user_id === uid) mem.snapshots.delete(k);
      }
      for (const [k, ac] of mem.achievements.entries()) {
        if (ac.user_id === uid) mem.achievements.delete(k);
      }
      return true;
    }
  },
};
