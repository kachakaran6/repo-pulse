CREATE TABLE IF NOT EXISTS repos (
  github_id          BIGINT PRIMARY KEY,
  full_name          TEXT NOT NULL,
  html_url           TEXT NOT NULL,
  description        TEXT,
  language           TEXT,
  last_commit_at     TIMESTAMPTZ,
  commit_days        JSONB NOT NULL DEFAULT '[]',
  label              TEXT,
  lifecycle_status   TEXT NOT NULL DEFAULT 'active',
  priority           TEXT NOT NULL DEFAULT 'normal',
  tech_stack         JSONB NOT NULL DEFAULT '[]',
  notes              TEXT,
  is_favorite        BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived        BOOLEAN NOT NULL DEFAULT FALSE,
  threshold_days     INTEGER,
  synced_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column migrations for existing instances
ALTER TABLE repos ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE repos ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE repos ADD COLUMN IF NOT EXISTS tech_stack JSONB NOT NULL DEFAULT '[]';
ALTER TABLE repos ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE repos ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE repos ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE repos ADD COLUMN IF NOT EXISTS threshold_days INTEGER;

CREATE TABLE IF NOT EXISTS settings (
  id               INTEGER PRIMARY KEY DEFAULT 1,
  active_max_days  INTEGER NOT NULL DEFAULT 7,
  cooling_max_days INTEGER NOT NULL DEFAULT 14,
  stale_max_days   INTEGER NOT NULL DEFAULT 30,
  github_token     TEXT,
  github_username  TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS github_token TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS github_username TEXT;

INSERT INTO settings (id, active_max_days, cooling_max_days, stale_max_days)
VALUES (1, 7, 14, 30)
ON CONFLICT (id) DO NOTHING;
