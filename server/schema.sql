CREATE TABLE IF NOT EXISTS repos (
  github_id      BIGINT PRIMARY KEY,
  full_name      TEXT NOT NULL,
  html_url       TEXT NOT NULL,
  description    TEXT,
  language       TEXT,
  last_commit_at TIMESTAMPTZ,
  commit_days    JSONB NOT NULL DEFAULT '[]',
  label          TEXT,
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
