# Implementation Plan — GitPulse POC

## Working agreement
Implement in small, verifiable increments. First inspect the repository, existing scripts, conventions, and installed dependencies. Preserve working code. Do not rewrite the whole app just to impose a preferred structure. Before changing files, report a short plan; then execute, test, and summarize. Never claim tests passed unless they were actually run.

## Phase 0 — Repository audit and plan
- Inspect source tree, package manifests, git status, environment configuration, and current UI.
- Identify existing frameworks, conventions, linting, tests, and deployment constraints.
- Compare current project against the five project documents and skills.
- Produce a short gap list and implementation sequence.
**Exit criteria:** no code changes before the audit; existing uncommitted work is preserved.

## Phase 1 — Foundation
- Create a coherent TypeScript workspace or clearly separated `apps/web` and `apps/api` applications.
- Configure formatting, linting, type checking, test scripts, environment validation, and `.env.example`.
- Set up PostgreSQL, Prisma, migrations, and local Docker Compose.
- Add health endpoints and deterministic seed data.
**Exit criteria:** clean install, DB migration, seed, lint, typecheck, and build work from documented commands.

## Phase 2 — Design system and UI shell
- Implement fixed palette as CSS variables for light/dark themes.
- Configure shadcn/ui and Lucide once.
- Build responsive app shell, navigation, page header, buttons, fields, badges, tables, skeletons, empty/error states.
- Create dashboard and repository inventory using clearly labeled local fixture data.
- Make filters and theme toggle functional, not decorative.
**Exit criteria:** all screens share tokens/components; 360px to desktop works; no invented palette, neon, gradients, or mixed component libraries.

## Phase 3 — Authentication and security
- Implement GitHub OAuth server-side flow, state validation, callback, secure sessions, logout, and account disconnect.
- Validate required secrets on startup; keep credentials out of browser code.
- Add auth guards, per-user authorization, rate limiting, CSRF protection where needed, and redacted logs.
- Add security tests for unauthorized cross-user access.
**Exit criteria:** login/logout works in a configured environment; no token appears in browser storage, API payloads, logs, or bundles.

## Phase 4 — Repository sync
- Add GitHub API client abstraction and mocked implementation for tests.
- Fetch repository metadata with pagination and bounded concurrency.
- Persist repository records and user-repository associations transactionally.
- Handle rate limits, retries/backoff, partial sync, timeouts, renamed/deleted repositories, and revoked authorization.
- Show sync time, progress/status, and useful errors in UI.
**Exit criteria:** sync does not wipe valid data on upstream errors; pagination and rate-limit behavior have tests.

## Phase 5 — Activity classification
- Define the exact activity signal source and its label in UI.
- Implement a pure classification function with configurable thresholds and explicit boundary behavior.
- Handle missing/stale data as Unknown or Sync needed, not Dormant.
- Keep observed activity bucket separate from manual lifecycle status.
- Add unit tests for boundary days, timezone/date handling, missing timestamps, overrides, and stale sync.
**Exit criteria:** every status has an explanation; no automatic “dead” claim.

## Phase 6 — Project organization
- CRUD for project type categories and technology tags.
- Edit per-repository type, stack, lifecycle status, priority, notes, favorite, review date, and threshold override.
- Persist all annotations per user with authorization and validation.
- Add settings for global thresholds and preferences.
**Exit criteria:** values survive refresh; one user cannot read/write another user's records or tags.

## Phase 7 — Dashboard polish
- Wire summary metrics, sorting, filtering, search, pagination, and repository detail view to real API data.
- Add activity timeline only when supported by actual stored data.
- Implement loading, empty, offline, error, rate-limit, and partial-sync states.
- Check table scrolling, responsive navigation, focus behavior, and accessible labels.
**Exit criteria:** no fake live metrics; key journeys work with real data and with deterministic test fixtures.

## Phase 8 — Verification and hardening
- Run lint, typecheck, unit, integration, and build tests.
- Add Playwright coverage for login/mock mode, inventory filters, annotation editing, and settings.
- Verify migration from empty DB and repeatable seed.
- Audit secrets, authorization boundaries, logs, CORS, cookies, input validation, and deletion flow.
- Test 360px, 768px, 1024px, 1440px, light/dark, keyboard-only, reduced motion.
- Update README with environment setup, OAuth app setup, migrations, test commands, known limitations, and deployment steps.
**Exit criteria:** all required checks pass or are reported with exact failures; no unsupported success claims.

## POC scope guardrails
- Do not build billing, teams, AI summaries, provider abstraction for multiple Git services, or complex background queues.
- Prefer manual sync first.
- Avoid overengineering: one API, one relational database, one component library.
- Keep UI fixture mode visibly labeled and separate from production data.
- Do not silently invent commit history. Historical charts require real collected data.
- Keep commits small and meaningful; do not run destructive git commands or rewrite history.
