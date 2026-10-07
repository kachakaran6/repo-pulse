# Architecture (v2)

Verify GitHub details against current GitHub docs before building; limits and settings change.

## Key decision: GitHub App, not OAuth App
| | OAuth App | **GitHub App (chosen)** |
|---|---|---|
| Private repo access | `repo` scope = read AND write | Read-only Contents + Metadata |
| User control | All repos or none | User selects repos at install |
| Tokens | Long-lived | Installation tokens last 1 hour; user tokens expire |
| Webhooks | Per repo setup | Built in, one URL |

**Credential model:** log the user in with the App's user authorization (identity only), then do all syncing with short-lived installation tokens minted from the App's private key. We never store a user's long-lived GitHub token. The App private key is the one crown-jewel secret.

## Stack
- Frontend: React 18 + Vite + TypeScript, plain CSS tokens (see 13-UI-V2.md)
- API: Node 20 + NestJS (modules: auth, github, sync, repos, settings) or Express + TS if you prefer fewer abstractions
- DB: PostgreSQL 15+, Drizzle ORM (SQL-first) with versioned migrations
- Jobs: pg-boss (queue inside Postgres, no Redis to run)
- Validation: zod on every request body
- Logging: pino with token redaction. Errors: Sentry
- Tests: Vitest (unit), Playwright (e2e), supertest (API)
- Hosting (options): static frontend on Cloudflare Pages or Vercel; API on Fly.io, Railway or Render; managed Postgres (Neon, Supabase or RDS); secrets in the host's secret manager

## Data model (all tables carry `user_id`)
```
users            id, github_user_id UNIQUE, login, avatar_url, created_at, deleted_at
sessions         id_hash, user_id, created_at, last_seen_at, expires_at, ip_hash, ua
installations    id, user_id, github_installation_id UNIQUE, account_login, suspended_at
repos            id, user_id, installation_id, github_repo_id, full_name, is_private,
                 default_branch, last_commit_at, language, archived_on_github
repo_activity    repo_id, day (date), commits (int)   -- PK (repo_id, day)
repo_meta        repo_id, label, goal_date, note, decision (keep|pause|retire),
                 paused_until, decided_at
settings         user_id, active_days, cooling_days, stale_days, theme
sync_runs        id, user_id, started_at, finished_at, status, repos_read, error
audit_log        id, user_id, event, meta (no secrets), created_at
```
Postgres Row-Level Security on every table: `USING (user_id = current_setting('app.user_id')::bigint)`. The API sets it per request. This is defense in depth on top of `WHERE user_id = $1` in code.

## Sync engine
1. Trigger: first install, "Sync" button (limit 1 per 5 minutes per user), nightly catch-up, GitHub `push` webhook.
2. Use the GraphQL API: one paginated query lists repos with `defaultBranchRef.target.history(since, author)` instead of hundreds of REST calls.
3. Mint an installation token (valid 1 hour), run, discard.
4. Upsert `repos` and `repo_activity` (daily counts). Never overwrite `repo_meta`.
5. Respect rate limit headers. On limit: reschedule job, show "Paused until HH:MM" in the UI.
6. Webhooks: verify `X-Hub-Signature-256` (HMAC SHA-256, constant-time compare), then enqueue. Return 200 fast. Idempotent on delivery ID.

## API surface
```
GET  /auth/github/start        POST /auth/logout        POST /auth/logout-all
GET  /auth/github/callback     GET  /api/me
GET  /api/repos                PATCH /api/repos/:id/meta   (label, goal, note, decision)
POST /api/sync                 GET  /api/sync/status
GET  /api/export               DELETE /api/account
POST /webhooks/github
```
Status (active/cooling/stale/dead) is computed at read time from `last_commit_at` and the user's thresholds.
