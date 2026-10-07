-- RepoPulse v2 SaaS Postgres Schema with Row-Level Security (RLS)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id              BIGSERIAL PRIMARY KEY,
  github_user_id  BIGINT UNIQUE NOT NULL,
  login           TEXT NOT NULL,
  name            TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- Sessions table (stores SHA-256 hash of random session token)
CREATE TABLE IF NOT EXISTS sessions (
  id_hash         TEXT PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  ip_hash         TEXT,
  ua              TEXT
);

-- GitHub App Installations
CREATE TABLE IF NOT EXISTS installations (
  id                      BIGSERIAL PRIMARY KEY,
  user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_installation_id  BIGINT UNIQUE NOT NULL,
  account_login           TEXT NOT NULL,
  suspended_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Repositories
CREATE TABLE IF NOT EXISTS repos (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  installation_id     BIGINT REFERENCES installations(id) ON DELETE SET NULL,
  github_repo_id      BIGINT NOT NULL,
  full_name           TEXT NOT NULL,
  is_private          BOOLEAN NOT NULL DEFAULT false,
  default_branch      TEXT NOT NULL DEFAULT 'main',
  last_commit_at      TIMESTAMPTZ,
  language            TEXT,
  archived_on_github  BOOLEAN NOT NULL DEFAULT false,
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Repo Daily Activity (PK repo_id, day)
CREATE TABLE IF NOT EXISTS repo_activity (
  repo_id             BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day                 DATE NOT NULL,
  commits             INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (repo_id, day)
);

-- Repo Metadata (Custom labels, triage decisions, goal dates, notes)
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

-- User Settings
CREATE TABLE IF NOT EXISTS settings (
  user_id             BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_days         INTEGER NOT NULL DEFAULT 7,
  cooling_days        INTEGER NOT NULL DEFAULT 14,
  stale_days          INTEGER NOT NULL DEFAULT 30,
  theme               TEXT NOT NULL DEFAULT 'system',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync Runs Tracking
CREATE TABLE IF NOT EXISTS sync_runs (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at         TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'rate_limited')),
  repos_read          INTEGER NOT NULL DEFAULT 0,
  error               TEXT
);

-- Audit Log (Tenant-isolated compliance and security event trail)
CREATE TABLE IF NOT EXISTS audit_log (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event               TEXT NOT NULL,
  meta                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_repos_user_id ON repos(user_id);
CREATE INDEX IF NOT EXISTS idx_repos_last_commit ON repos(user_id, last_commit_at DESC);
CREATE INDEX IF NOT EXISTS idx_repo_activity_repo ON repo_activity(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_activity_user_day ON repo_activity(user_id, day);
CREATE INDEX IF NOT EXISTS idx_repo_meta_user ON repo_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_runs_user ON sync_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);

-- Enable Row-Level Security (RLS) on all tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if rerun
DO $$
BEGIN
  DROP POLICY IF EXISTS users_isolation ON users;
  DROP POLICY IF EXISTS sessions_isolation ON sessions;
  DROP POLICY IF EXISTS installations_isolation ON installations;
  DROP POLICY IF EXISTS repos_isolation ON repos;
  DROP POLICY IF EXISTS repo_activity_isolation ON repo_activity;
  DROP POLICY IF EXISTS repo_meta_isolation ON repo_meta;
  DROP POLICY IF EXISTS settings_isolation ON settings;
  DROP POLICY IF EXISTS sync_runs_isolation ON sync_runs;
  DROP POLICY IF EXISTS audit_log_isolation ON audit_log;
END
$$;

-- Create RLS Policies using app.user_id session variable
CREATE POLICY users_isolation ON users FOR ALL
  USING (id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY sessions_isolation ON sessions FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY installations_isolation ON installations FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY repos_isolation ON repos FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY repo_activity_isolation ON repo_activity FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY repo_meta_isolation ON repo_meta FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY settings_isolation ON settings FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY sync_runs_isolation ON sync_runs FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);

CREATE POLICY audit_log_isolation ON audit_log FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::bigint);
