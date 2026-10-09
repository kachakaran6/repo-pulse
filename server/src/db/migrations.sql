-- =====================================================================
-- RepoPulse SaaS PostgreSQL Schema & Row-Level Security (RLS)
-- Target: OWASP ASVS Level 2, Full Tenant Isolation
-- =====================================================================

-- Create tenant application role if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'repopulse_app') THEN
    CREATE ROLE repopulse_app;
  END IF;
END
$$;

-- Drop any legacy tables
DROP TABLE IF EXISTS legacy_v1_repos CASCADE;
DROP TABLE IF EXISTS legacy_v1_settings CASCADE;
DROP TABLE IF EXISTS legacy_v1_users CASCADE;

-- 1. Users Table (Strictly GitHub-authenticated users only)
CREATE TABLE IF NOT EXISTS users (
  id              BIGSERIAL PRIMARY KEY,
  github_user_id  BIGINT UNIQUE NOT NULL,
  github_token    TEXT,
  login           TEXT NOT NULL,
  name            TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- Remove legacy password & email columns if they existed
DO $$
BEGIN
  ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
  ALTER TABLE users DROP COLUMN IF EXISTS email;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Sessions Table (Stores SHA-256 hash of random session token)
CREATE TABLE IF NOT EXISTS sessions (
  id_hash         TEXT PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  ip_hash         TEXT,
  ua              TEXT
);

-- 3. GitHub App Installations Table
CREATE TABLE IF NOT EXISTS installations (
  id                      BIGSERIAL PRIMARY KEY,
  user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_installation_id  BIGINT UNIQUE NOT NULL,
  account_login           TEXT NOT NULL,
  account_type            TEXT NOT NULL DEFAULT 'User',
  selection               TEXT NOT NULL DEFAULT 'all',
  repo_count              INTEGER NOT NULL DEFAULT 0,
  private_repo_count      INTEGER NOT NULL DEFAULT 0,
  public_repo_count       INTEGER NOT NULL DEFAULT 0,
  suspended_at            TIMESTAMPTZ,
  last_synced_at          TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing installation columns for existing tables
DO $$
BEGIN
  ALTER TABLE installations ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'User';
  ALTER TABLE installations ADD COLUMN IF NOT EXISTS selection TEXT NOT NULL DEFAULT 'all';
  ALTER TABLE installations ADD COLUMN IF NOT EXISTS repo_count INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE installations ADD COLUMN IF NOT EXISTS private_repo_count INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE installations ADD COLUMN IF NOT EXISTS public_repo_count INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE installations ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Repositories Table
CREATE TABLE IF NOT EXISTS repos (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  installation_id     BIGINT REFERENCES installations(id) ON DELETE SET NULL,
  github_repo_id      BIGINT NOT NULL,
  full_name           TEXT NOT NULL,
  is_private          BOOLEAN NOT NULL DEFAULT false,
  is_fork             BOOLEAN NOT NULL DEFAULT false,
  is_archived         BOOLEAN NOT NULL DEFAULT false,
  owner_login         TEXT NOT NULL DEFAULT '',
  owner_type          TEXT NOT NULL DEFAULT 'User',
  relationship        TEXT NOT NULL DEFAULT 'owner',
  permission          TEXT NOT NULL DEFAULT 'admin',
  default_branch      TEXT NOT NULL DEFAULT 'main',
  last_commit_at      TIMESTAMPTZ,
  pushed_at           TIMESTAMPTZ,
  created_at_github   TIMESTAMPTZ,
  language            TEXT,
  archived_on_github  BOOLEAN NOT NULL DEFAULT false,
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT repos_user_github_repo_unique UNIQUE (user_id, github_repo_id)
);

-- Add missing repo columns for existing tables
DO $$
BEGIN
  ALTER TABLE repos ADD COLUMN IF NOT EXISTS is_fork BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE repos ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE repos ADD COLUMN IF NOT EXISTS owner_login TEXT NOT NULL DEFAULT '';
  ALTER TABLE repos ADD COLUMN IF NOT EXISTS owner_type TEXT NOT NULL DEFAULT 'User';
  ALTER TABLE repos ADD COLUMN IF NOT EXISTS relationship TEXT NOT NULL DEFAULT 'owner';
  ALTER TABLE repos ADD COLUMN IF NOT EXISTS permission TEXT NOT NULL DEFAULT 'admin';
  ALTER TABLE repos ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;
  ALTER TABLE repos ADD COLUMN IF NOT EXISTS created_at_github TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Repository Daily Activity Table (Composite PK: repo_id, day)
CREATE TABLE IF NOT EXISTS repo_activity (
  repo_id             BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day                 DATE NOT NULL,
  commits_mine        INTEGER NOT NULL DEFAULT 0,
  commits_all         INTEGER NOT NULL DEFAULT 0,
  commits             INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (repo_id, day)
);

DO $$
BEGIN
  ALTER TABLE repo_activity ADD COLUMN IF NOT EXISTS commits_mine INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE repo_activity ADD COLUMN IF NOT EXISTS commits_all INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. Top Contributors per Repo (Top 10)
CREATE TABLE IF NOT EXISTS repo_contributors (
  id                  BIGSERIAL PRIMARY KEY,
  repo_id             BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login               TEXT NOT NULL,
  avatar_url          TEXT,
  commits_30d         INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT repo_contributors_unique UNIQUE (repo_id, login)
);

-- 7. Status Changes Audit Table
CREATE TABLE IF NOT EXISTS status_changes (
  id                  BIGSERIAL PRIMARY KEY,
  repo_id             BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL,
  since               TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Repository Metadata Table (Custom labels, notes, triage decisions, goal dates)
CREATE TABLE IF NOT EXISTS repo_meta (
  repo_id             BIGINT PRIMARY KEY REFERENCES repos(id) ON DELETE CASCADE,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label               TEXT,
  goal_date           DATE,
  note                TEXT,
  decision            TEXT CHECK (decision IN ('keep', 'pause', 'retire')),
  paused_until        DATE,
  decided_at          TIMESTAMPTZ
);

-- 9. User Settings Table
CREATE TABLE IF NOT EXISTS settings (
  user_id             BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_days         INTEGER NOT NULL DEFAULT 7,
  cooling_days        INTEGER NOT NULL DEFAULT 14,
  stale_days          INTEGER NOT NULL DEFAULT 30,
  theme               TEXT NOT NULL DEFAULT 'system',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Saved Views Table
CREATE TABLE IF NOT EXISTS saved_views (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  query               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Share Card Snapshots Table
CREATE TABLE IF NOT EXISTS snapshots (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug                TEXT UNIQUE NOT NULL,
  title               TEXT,
  template            TEXT NOT NULL DEFAULT 'summary',
  config              JSONB NOT NULL DEFAULT '{}'::jsonb,
  data                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at          TIMESTAMPTZ
);

-- 12. User Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key                 TEXT NOT NULL,
  earned_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta                JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT achievements_user_key UNIQUE (user_id, key)
);

-- 13. Sync Runs Tracking Table
CREATE TABLE IF NOT EXISTS sync_runs (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at         TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'rate_limited')),
  repos_read          INTEGER NOT NULL DEFAULT 0,
  error               TEXT
);

-- 14. Tenant Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event               TEXT NOT NULL,
  meta                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- Indexes
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_users_github_user_id ON users(github_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_installations_user_id ON installations(user_id);
CREATE INDEX IF NOT EXISTS idx_repos_user_id ON repos(user_id);
CREATE INDEX IF NOT EXISTS idx_repos_last_commit ON repos(user_id, last_commit_at DESC);
CREATE INDEX IF NOT EXISTS idx_repo_activity_repo ON repo_activity(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_activity_user_day ON repo_activity(user_id, day);
CREATE INDEX IF NOT EXISTS idx_repo_contributors_repo ON repo_contributors(repo_id);
CREATE INDEX IF NOT EXISTS idx_status_changes_repo ON status_changes(repo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_changes_user ON status_changes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repo_meta_user ON repo_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_user ON saved_views(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_slug ON snapshots(slug);
CREATE INDEX IF NOT EXISTS idx_snapshots_user ON snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_runs_user ON sync_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);

-- =====================================================================
-- Grant Permissions to Restricted Tenant Application Role
-- =====================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO repopulse_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO repopulse_app;
GRANT ALL ON SCHEMA public TO repopulse_app;

-- =====================================================================
-- Row-Level Security (RLS) with FORCE for Tenant Isolation
-- =====================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations FORCE ROW LEVEL SECURITY;
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repos FORCE ROW LEVEL SECURITY;
ALTER TABLE repo_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_activity FORCE ROW LEVEL SECURITY;
ALTER TABLE repo_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_contributors FORCE ROW LEVEL SECURITY;
ALTER TABLE status_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_changes FORCE ROW LEVEL SECURITY;
ALTER TABLE repo_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_meta FORCE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings FORCE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views FORCE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements FORCE ROW LEVEL SECURITY;
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- Drop existing policies if rerun
DO $$
BEGIN
  DROP POLICY IF EXISTS users_tenant_isolation ON users;
  DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;
  DROP POLICY IF EXISTS installations_tenant_isolation ON installations;
  DROP POLICY IF EXISTS repos_tenant_isolation ON repos;
  DROP POLICY IF EXISTS repo_activity_tenant_isolation ON repo_activity;
  DROP POLICY IF EXISTS repo_contributors_tenant_isolation ON repo_contributors;
  DROP POLICY IF EXISTS status_changes_tenant_isolation ON status_changes;
  DROP POLICY IF EXISTS repo_meta_tenant_isolation ON repo_meta;
  DROP POLICY IF EXISTS settings_tenant_isolation ON settings;
  DROP POLICY IF EXISTS saved_views_tenant_isolation ON saved_views;
  DROP POLICY IF EXISTS snapshots_tenant_isolation ON snapshots;
  DROP POLICY IF EXISTS achievements_tenant_isolation ON achievements;
  DROP POLICY IF EXISTS sync_runs_tenant_isolation ON sync_runs;
  DROP POLICY IF EXISTS audit_log_tenant_isolation ON audit_log;
END
$$;

-- Create Strict Tenant Isolation Policies (USING app.user_id)
CREATE POLICY installations_tenant_isolation ON installations FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY repos_tenant_isolation ON repos FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY repo_activity_tenant_isolation ON repo_activity FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY repo_contributors_tenant_isolation ON repo_contributors FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY status_changes_tenant_isolation ON status_changes FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY repo_meta_tenant_isolation ON repo_meta FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY settings_tenant_isolation ON settings FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY saved_views_tenant_isolation ON saved_views FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY snapshots_tenant_isolation ON snapshots FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY achievements_tenant_isolation ON achievements FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY sync_runs_tenant_isolation ON sync_runs FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY audit_log_tenant_isolation ON audit_log FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);
