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
  connectionTimeoutMillis: 5000,
});
authPool.on('error', (err) => {
  logger.error({ error: err.message }, 'Unexpected error on idle auth database client');
});

/**
 * Tenant PostgreSQL Connection Pool (Uses RLS with app.user_id)
 */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
pool.on('error', (err) => {
  logger.error({ error: err.message }, 'Unexpected error on idle tenant database client');
});

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
      logger.info('Database schema and RLS policies successfully initialized and verified.');
      return true;
    }
    return false;
  } catch (err: any) {
    logger.error({ error: err.message }, 'Database initialization error');
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

// =====================================================================
// Database Access Layer (PostgreSQL with RLS & Type Safety)
// =====================================================================

export const db = {
  // 1. Users (via authPool)
  async findUserById(id: string | number) {
    const res = await authPool.query(
      `SELECT id, github_user_id, login, name, avatar_url, email, password_hash, github_token, created_at, deleted_at 
       FROM users 
       WHERE id = $1 AND deleted_at IS NULL`,
      [String(id)]
    );
    return res.rows[0] || null;
  },

  async findUserByGithubId(githubUserId: string | number) {
    const res = await authPool.query(
      `SELECT id, github_user_id, login, name, avatar_url, email, password_hash, github_token, created_at, deleted_at 
       FROM users 
       WHERE github_user_id = $1 AND deleted_at IS NULL`,
      [String(githubUserId)]
    );
    return res.rows[0] || null;
  },

  async findUserByLoginOrEmail(identifier: string) {
    const clean = identifier.trim().toLowerCase();
    const res = await authPool.query(
      `SELECT id, github_user_id, login, name, avatar_url, email, password_hash, github_token, created_at, deleted_at
       FROM users
       WHERE (LOWER(login) = $1 OR LOWER(email) = $1) AND deleted_at IS NULL
       LIMIT 1`,
      [clean]
    );
    return res.rows[0] || null;
  },

  async createUserWithPassword(params: {
    login: string;
    email?: string | null;
    password_hash: string;
    name?: string | null;
    avatar_url?: string | null;
  }) {
    const cleanLogin = params.login.trim();
    const cleanEmail = params.email ? params.email.trim().toLowerCase() : null;
    const defaultAvatar = params.avatar_url || `https://avatars.githubusercontent.com/u/0?v=4`;

    const res = await authPool.query(
      `INSERT INTO users (login, email, password_hash, name, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, github_user_id, login, name, avatar_url, email, created_at`,
      [cleanLogin, cleanEmail, params.password_hash, params.name || cleanLogin, defaultAvatar]
    );
    const row = res.rows[0];

    // Ensure default settings exist
    await authPool.query(
      `INSERT INTO settings (user_id, active_days, cooling_days, stale_days, theme)
       VALUES ($1, 7, 14, 30, 'system')
       ON CONFLICT (user_id) DO NOTHING`,
      [row.id]
    );

    return row;
  },

  async linkGithubToUser(userId: string | number, githubProfile: {
    github_user_id: string | number;
    login?: string;
    avatar_url?: string;
  }) {
    const ghId = String(githubProfile.github_user_id);
    const res = await authPool.query(
      `UPDATE users 
       SET github_user_id = $1, 
           avatar_url = COALESCE($2, avatar_url),
           deleted_at = NULL
       WHERE id = $3
       RETURNING id, github_user_id, login, name, avatar_url, email, created_at`,
      [ghId, githubProfile.avatar_url || null, String(userId)]
    );
    return res.rows[0] || null;
  },

  async linkTokenToUser(userId: string | number, token: string, githubInfo?: { github_user_id?: string | number; login?: string; avatar_url?: string }) {
    const res = await authPool.query(
      `UPDATE users
       SET github_token = $1,
           github_user_id = COALESCE($2, github_user_id),
           avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4
       RETURNING id, github_user_id, login, name, avatar_url, email, created_at`,
      [token, githubInfo?.github_user_id ? String(githubInfo.github_user_id) : null, githubInfo?.avatar_url || null, String(userId)]
    );
    return res.rows[0] || null;
  },

  async upsertUser(user: { github_user_id: string | number; login: string; name?: string | null; avatar_url?: string | null }) {
    const ghId = String(user.github_user_id);
    const res = await authPool.query(
      `INSERT INTO users (github_user_id, login, name, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (github_user_id) 
       DO UPDATE SET login = EXCLUDED.login, name = COALESCE(EXCLUDED.name, users.name), avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url), deleted_at = NULL
       RETURNING id, github_user_id, login, name, avatar_url, created_at`,
      [ghId, user.login, user.name || null, user.avatar_url || null]
    );
    const row = res.rows[0];

    // Ensure default settings exist
    await authPool.query(
      `INSERT INTO settings (user_id, active_days, cooling_days, stale_days, theme)
       VALUES ($1, 7, 14, 30, 'system')
       ON CONFLICT (user_id) DO NOTHING`,
      [row.id]
    );

    return row;
  },

  // 2. Sessions (via authPool)
  async createSession(session: { id_hash: string; user_id: string | number; expires_at: Date; ip_hash?: string | null; ua?: string | null }) {
    const res = await authPool.query(
      `INSERT INTO sessions (id_hash, user_id, created_at, last_seen_at, expires_at, ip_hash, ua)
       VALUES ($1, $2, now(), now(), $3, $4, $5)
       RETURNING id_hash, user_id, created_at, last_seen_at, expires_at, ip_hash, ua`,
      [session.id_hash, String(session.user_id), session.expires_at, session.ip_hash || null, session.ua || null]
    );
    return res.rows[0];
  },

  async findSession(idHash: string) {
    const res = await authPool.query(
      `SELECT id_hash, user_id, created_at, last_seen_at, expires_at, ip_hash, ua
       FROM sessions
       WHERE id_hash = $1`,
      [idHash]
    );
    return res.rows[0] || null;
  },

  async updateSessionLastSeen(idHash: string) {
    await authPool.query(
      `UPDATE sessions SET last_seen_at = now() WHERE id_hash = $1`,
      [idHash]
    );
  },

  async deleteSession(idHash: string) {
    const res = await authPool.query(
      `DELETE FROM sessions WHERE id_hash = $1`,
      [idHash]
    );
    return (res.rowCount ?? 0) > 0;
  },

  async deleteAllUserSessions(userId: string | number) {
    const res = await authPool.query(
      `DELETE FROM sessions WHERE user_id = $1`,
      [String(userId)]
    );
    return res.rowCount ?? 0;
  },

  // 3. Settings (withTenant)
  async getSettings(userId: string | number) {
    return withTenant(userId, async (client) => {
      const res = await client.query(
        `SELECT user_id, active_days, cooling_days, stale_days, theme, updated_at
         FROM settings
         WHERE user_id = $1`,
        [String(userId)]
      );
      if (res.rows.length > 0) {
        return res.rows[0];
      }
      // Insert default settings
      const ins = await client.query(
        `INSERT INTO settings (user_id, active_days, cooling_days, stale_days, theme)
         VALUES ($1, 7, 14, 30, 'system')
         ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
         RETURNING user_id, active_days, cooling_days, stale_days, theme, updated_at`,
        [String(userId)]
      );
      return ins.rows[0];
    });
  },

  async updateSettings(userId: string | number, updates: { active_days?: number; cooling_days?: number; stale_days?: number; theme?: string }) {
    return withTenant(userId, async (client) => {
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
        [activeDays, coolingDays, staleDays, theme, String(userId)]
      );
      return res.rows[0];
    });
  },

  // 4. Repositories & Activity & Metadata (withTenant)
  async getUserRepos(userId: string | number) {
    return withTenant(userId, async (client) => {
      const reposRes = await client.query(
        `SELECT r.id, r.user_id, r.installation_id, r.github_repo_id, r.full_name,
                r.is_private, r.default_branch, r.last_commit_at, r.language,
                r.archived_on_github, r.synced_at,
                m.label, to_char(m.goal_date, 'YYYY-MM-DD') as goal_date, m.note, m.decision, to_char(m.paused_until, 'YYYY-MM-DD') as paused_until, m.decided_at
         FROM repos r
         LEFT JOIN repo_meta m ON r.id = m.repo_id AND m.user_id = r.user_id
         WHERE r.user_id = $1
         ORDER BY r.last_commit_at DESC NULLS LAST`,
        [String(userId)]
      );

      const repoIds = reposRes.rows.map((r) => r.id);
      let activitiesByRepo: Record<string, { day: string; commits: number }[]> = {};

      if (repoIds.length > 0) {
        const actRes = await client.query(
          `SELECT repo_id, to_char(day, 'YYYY-MM-DD') as day, commits
           FROM repo_activity
           WHERE user_id = $1 AND repo_id = ANY($2::bigint[])
           ORDER BY day ASC`,
          [String(userId), repoIds]
        );
        for (const act of actRes.rows) {
          const rId = String(act.repo_id);
          if (!activitiesByRepo[rId]) {
            activitiesByRepo[rId] = [];
          }
          activitiesByRepo[rId].push({ day: act.day, commits: Number(act.commits) });
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
          default_branch: r.default_branch,
          last_commit_at: r.last_commit_at,
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
  },

  async upsertRepo(repo: {
    user_id: string | number;
    installation_id?: string | number | null;
    github_repo_id: string | number;
    full_name: string;
    is_private?: boolean;
    default_branch?: string;
    last_commit_at?: Date | string | null;
    language?: string | null;
    archived_on_github?: boolean;
  }) {
    return withTenant(repo.user_id, async (client) => {
      const res = await client.query(
        `INSERT INTO repos (user_id, installation_id, github_repo_id, full_name, is_private, default_branch, last_commit_at, language, archived_on_github, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
         ON CONFLICT (user_id, github_repo_id)
         DO UPDATE SET full_name = EXCLUDED.full_name,
                       is_private = EXCLUDED.is_private,
                       default_branch = EXCLUDED.default_branch,
                       last_commit_at = COALESCE(EXCLUDED.last_commit_at, repos.last_commit_at),
                       language = COALESCE(EXCLUDED.language, repos.language),
                       archived_on_github = EXCLUDED.archived_on_github,
                       synced_at = now()
         RETURNING id, user_id, installation_id, github_repo_id, full_name, is_private, default_branch, last_commit_at, language, archived_on_github, synced_at`,
        [
          String(repo.user_id),
          repo.installation_id ? String(repo.installation_id) : null,
          String(repo.github_repo_id),
          repo.full_name,
          repo.is_private ?? false,
          repo.default_branch || 'main',
          repo.last_commit_at || null,
          repo.language || null,
          repo.archived_on_github ?? false,
        ]
      );
      return res.rows[0];
    });
  },

  async upsertActivity(repoId: string | number, userId: string | number, day: string, commits: number) {
    return withTenant(userId, async (client) => {
      const res = await client.query(
        `INSERT INTO repo_activity (repo_id, user_id, day, commits)
         VALUES ($1, $2, $3::date, $4)
         ON CONFLICT (repo_id, day)
         DO UPDATE SET commits = EXCLUDED.commits
         RETURNING repo_id, user_id, to_char(day, 'YYYY-MM-DD') as day, commits`,
        [String(repoId), String(userId), day, commits]
      );
      return res.rows[0];
    });
  },

  async upsertRepoMeta(repoId: string | number, userId: string | number, meta: {
    label?: string | null;
    goal_date?: string | null;
    note?: string | null;
    decision?: 'keep' | 'pause' | 'retire' | null;
    paused_until?: string | null;
  }) {
    return withTenant(userId, async (client) => {
      const existing = await client.query(
        `SELECT repo_id, user_id, label, goal_date, note, decision, paused_until, decided_at
         FROM repo_meta
         WHERE repo_id = $1 AND user_id = $2`,
        [String(repoId), String(userId)]
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
          String(repoId),
          String(userId),
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
  },

  async removeMissingRepos(userId: string | number, activeGithubRepoIds: (string | number)[]) {
    return withTenant(userId, async (client) => {
      if (!activeGithubRepoIds || activeGithubRepoIds.length === 0) return 0;
      const idsStr = activeGithubRepoIds.map((id) => String(id));
      const res = await client.query(
        `DELETE FROM repos
         WHERE user_id = $1 AND github_repo_id != ALL($2::bigint[])`,
        [String(userId), idsStr]
      );
      return res.rowCount ?? 0;
    });
  },

  // 5. GitHub App Installations (withTenant)
  async getInstallation(userId: string | number) {
    return withTenant(userId, async (client) => {
      const res = await client.query(
        `SELECT id, user_id, github_installation_id, account_login, suspended_at, created_at
         FROM installations
         WHERE user_id = $1
         LIMIT 1`,
        [String(userId)]
      );
      return res.rows[0] || null;
    });
  },

  async upsertInstallation(userId: string | number, githubInstallationId: string | number, accountLogin: string) {
    return withTenant(userId, async (client) => {
      const res = await client.query(
        `INSERT INTO installations (user_id, github_installation_id, account_login)
         VALUES ($1, $2, $3)
         ON CONFLICT (github_installation_id)
         DO UPDATE SET account_login = EXCLUDED.account_login, suspended_at = NULL
         RETURNING id, user_id, github_installation_id, account_login, suspended_at, created_at`,
        [String(userId), String(githubInstallationId), accountLogin]
      );
      return res.rows[0];
    });
  },

  // 6. Sync Runs (withTenant)
  async createSyncRun(userId: string | number) {
    return withTenant(userId, async (client) => {
      const res = await client.query(
        `INSERT INTO sync_runs (user_id, started_at, status, repos_read)
         VALUES ($1, now(), 'running', 0)
         RETURNING id, user_id, started_at, finished_at, status, repos_read, error`,
        [String(userId)]
      );
      return res.rows[0];
    });
  },

  async updateSyncRun(runId: string | number, userId: string | number, updates: {
    finished_at?: Date | null;
    status: 'running' | 'success' | 'failed' | 'rate_limited';
    repos_read?: number;
    error?: string | null;
  }) {
    return withTenant(userId, async (client) => {
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
          String(runId),
          String(userId),
        ]
      );
      return res.rows[0];
    });
  },

  async getLatestSyncRun(userId: string | number) {
    return withTenant(userId, async (client) => {
      const res = await client.query(
        `SELECT id, user_id, started_at, finished_at, status, repos_read, error
         FROM sync_runs
         WHERE user_id = $1
         ORDER BY started_at DESC
         LIMIT 1`,
        [String(userId)]
      );
      return res.rows[0] || null;
    });
  },

  // 7. Audit Log (withTenant)
  async logAudit(userId: string | number, event: string, meta: Record<string, any> = {}) {
    return withTenant(userId, async (client) => {
      const res = await client.query(
        `INSERT INTO audit_log (user_id, event, meta, created_at)
         VALUES ($1, $2, $3::jsonb, now())
         RETURNING id, user_id, event, meta, created_at`,
        [String(userId), event, JSON.stringify(meta)]
      );
      return res.rows[0];
    });
  },

  async getAuditLogs(userId: string | number) {
    return withTenant(userId, async (client) => {
      const res = await client.query(
        `SELECT id, user_id, event, meta, created_at
         FROM audit_log
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [String(userId)]
      );
      return res.rows;
    });
  },

  // 8. Delete Account Cascade (via authPool for full cleanup)
  async deleteUserAccount(userId: string | number) {
    const uid = String(userId);
    // Foreign key CASCADE will automatically delete sessions, repos, repo_activity, repo_meta, settings, installations, sync_runs, audit_log
    const res = await authPool.query(
      `DELETE FROM users WHERE id = $1`,
      [uid]
    );
    return (res.rowCount ?? 0) > 0;
  },
};
