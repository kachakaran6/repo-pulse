# Technical Architecture — GitPulse

## 1. Recommended stack
Choose one coherent stack; do not mix component libraries or duplicate frameworks.

| Layer | Choice | Reason |
|---|---|---|
| Web | React + Vite + TypeScript | Fast POC feedback, simple client app |
| Styling/components | Tailwind CSS + shadcn/ui | Consistent primitives and accessible patterns |
| Icons | Lucide | Modern, consistent icon family |
| Server state | TanStack Query | Cache, loading/error states, refetch and invalidation |
| Forms/schema | React Hook Form + Zod | Typed forms and shared validation patterns |
| API | NestJS + TypeScript | Modules, guards, DTO validation, testable structure |
| Database | PostgreSQL | Relational data, constraints, reliable migrations |
| ORM/migrations | Prisma | Typed queries and versioned schema migrations |
| Git provider | GitHub OAuth + REST API | Repository and activity metadata |
| Tests | Vitest, React Testing Library, Jest/Supertest, Playwright | Unit, integration, and end-to-end coverage |
| Local services | Docker Compose | Repeatable Postgres/API development |
| Deployment | Vercel for web; any Node-compatible host for API | Simple frontend deployment; API and DB remain independently deployable |

Use current stable compatible versions at implementation time and commit the lockfile. Do not add Redux, a second ORM, a second UI kit, or a charting library without a demonstrated requirement.

## 2. High-level architecture
```text
Browser (React)
  └── HTTPS API requests (session cookie; no GitHub token)
        └── NestJS API
              ├── AuthModule (OAuth callback, session, disconnect)
              ├── GitHubModule (API client, pagination, rate limits)
              ├── RepositoriesModule (sync, metadata, activity)
              ├── ProjectsModule (user annotations and custom tags)
              ├── SettingsModule (thresholds/preferences)
              └── PostgreSQL (Prisma migrations)
```

The API is the only component that can access GitHub credentials. The browser receives sanitized repository DTOs, never the raw token or token-bearing session data.

## 3. Authentication design
- Prefer GitHub OAuth App web flow with server-side callback, state validation, and PKCE where supported by the selected flow.
- Verify the current GitHub OAuth scopes and API behavior from official docs before coding; do not assume scopes from memory.
- Exchange authorization code on the server.
- Store access tokens encrypted at rest using an application encryption key held outside the database, or use a managed secret mechanism.
- Store session identifiers in secure cookies; store only a hash of opaque session IDs in the database if using database-backed sessions.
- Rotate/invalidate sessions on disconnect and sensitive auth changes.
- Never put tokens in localStorage, sessionStorage, URLs, client-side environment variables, logs, error traces, or analytics.
- Validate redirect destinations against an allowlist.
- Include a development-only mock auth mode with unmistakable safeguards; never enable it in production.

## 4. Data model (initial proposal)
Use UUID primary keys unless a stable external identifier is more appropriate. Add `created_at` and `updated_at` to mutable records. Use database constraints and indexes.

### users
- `id UUID PK`
- `github_user_id BIGINT UNIQUE NOT NULL`
- `github_login TEXT NOT NULL`
- `avatar_url TEXT NULL`
- `timezone TEXT NULL`
- `created_at`, `updated_at`

### oauth_credentials
- `user_id UUID PK FK users`
- `access_token_ciphertext TEXT NOT NULL`
- `scopes TEXT[]`
- `expires_at TIMESTAMPTZ NULL` (if applicable)
- `updated_at TIMESTAMPTZ`
- Strictly server-only access; encryption key is not stored in this table.

### sessions
- `id UUID PK`
- `user_id UUID FK users`
- `session_token_hash TEXT UNIQUE NOT NULL`
- `expires_at TIMESTAMPTZ NOT NULL`
- `created_at TIMESTAMPTZ`
- Index `(user_id, expires_at)`.

### repositories
- `id UUID PK`
- `github_repo_id BIGINT UNIQUE NOT NULL`
- `owner_login TEXT NOT NULL`
- `name TEXT NOT NULL`
- `full_name TEXT NOT NULL`
- `html_url TEXT NOT NULL`
- `description TEXT NULL`
- `visibility TEXT NOT NULL`
- `default_branch TEXT NULL`
- `primary_language TEXT NULL`
- `is_fork BOOLEAN NOT NULL DEFAULT FALSE`
- `is_archived BOOLEAN NOT NULL DEFAULT FALSE`
- `github_created_at TIMESTAMPTZ NULL`
- `github_pushed_at TIMESTAMPTZ NULL`
- `github_updated_at TIMESTAMPTZ NULL`
- `last_commit_at TIMESTAMPTZ NULL`
- `last_observed_activity_at TIMESTAMPTZ NULL`
- `last_synced_at TIMESTAMPTZ NULL`
- `sync_status TEXT NOT NULL DEFAULT 'pending'`
- `sync_error_code TEXT NULL` (sanitized code, not raw secrets/errors)
- `created_at`, `updated_at`

### user_repositories
Join/ownership visibility table, because a repository may be visible to multiple connected users:
- `user_id UUID FK users`
- `repository_id UUID FK repositories`
- `is_favorite BOOLEAN NOT NULL DEFAULT FALSE`
- `project_type_id UUID NULL`
- `lifecycle_status TEXT NOT NULL DEFAULT 'needs_review'`
- `priority TEXT NOT NULL DEFAULT 'normal'`
- `notes TEXT NULL`
- `inactivity_threshold_days INTEGER NULL`
- `review_at TIMESTAMPTZ NULL`
- `created_at`, `updated_at`
- Composite PK `(user_id, repository_id)`.

### activity_snapshots (optional but useful)
- `id UUID PK`
- `repository_id UUID FK repositories`
- `activity_date DATE NOT NULL`
- `commits_count INTEGER NOT NULL DEFAULT 0`
- `pull_requests_count INTEGER NOT NULL DEFAULT 0`
- `issues_count INTEGER NOT NULL DEFAULT 0`
- `source TEXT NOT NULL`
- Unique `(repository_id, activity_date, source)`.
Only store signals actually fetched and validated. Do not fabricate historical activity.

### project_types
- `id UUID PK`
- `user_id UUID FK users`
- `name TEXT NOT NULL`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- Unique `(user_id, name)`.

### technology_tags
- `id UUID PK`
- `user_id UUID FK users`
- `name TEXT NOT NULL`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- Unique `(user_id, name)`.

### user_repository_technology_tags
- `user_id UUID FK users`
- `repository_id UUID FK repositories`
- `technology_tag_id UUID FK technology_tags`
- Composite PK `(user_id, repository_id, technology_tag_id)`.
Add composite constraints/validation so a user cannot attach another user's tag to a repository.

### user_settings
- `user_id UUID PK FK users`
- `active_max_days INTEGER NOT NULL DEFAULT 6`
- `quiet_max_days INTEGER NOT NULL DEFAULT 14`
- `stale_max_days INTEGER NOT NULL DEFAULT 29`
- `default_view TEXT NOT NULL DEFAULT 'all'`
- `density TEXT NOT NULL DEFAULT 'comfortable'`
- `updated_at TIMESTAMPTZ`
Validate monotonic thresholds: active < quiet < stale; define boundary behavior in one shared function.

## 5. Activity semantics
- Fetch repository list using paginated GitHub endpoints.
- Treat `pushed_at` as a useful repository-level signal, not a perfect “last commit by this user” value.
- If the product claims “your last work,” use commit metadata attributable to the authenticated user when API access permits; otherwise label the signal “latest repository push/activity.”
- GitHub Events API has retention/availability limits and must not be the sole source of long-term history.
- For POC, store the best available timestamps and show their source. Do not infer local unpushed commits.
- Define activity classification in one pure shared function with tests.
- Missing activity is `unknown`, never zero days or dormant.
- Preserve observed status and manual lifecycle status separately.

## 6. API outline
All routes require an authenticated session except OAuth initiation/callback and health checks.

- `GET /api/v1/me`
- `GET /api/v1/repositories?query=&activity=&type=&stack=&status=&sort=&cursor=`
- `POST /api/v1/repositories/sync`
- `GET /api/v1/repositories/:id`
- `PATCH /api/v1/repositories/:id/annotation`
- `GET /api/v1/settings`
- `PATCH /api/v1/settings`
- `GET /api/v1/project-types`
- `POST /api/v1/project-types`
- `PATCH /api/v1/project-types/:id`
- `DELETE /api/v1/project-types/:id`
- `GET /api/v1/technology-tags`
- `POST /api/v1/technology-tags`
- `PATCH /api/v1/technology-tags/:id`
- `DELETE /api/v1/technology-tags/:id`
- `POST /api/v1/auth/logout`
- `DELETE /api/v1/account` (confirm intent; remove credentials/session and personal annotations according to documented policy)
- `GET /health/live`, `GET /health/ready`

Return consistent error shapes with a stable error code, readable message, request ID, and optional field errors. Never leak stack traces or upstream secrets.

## 7. GitHub sync strategy
- Start with a manual “Sync repositories” action; avoid a background job system until needed.
- Sync repository metadata with pagination and conditional requests where supported.
- Store `last_synced_at`, sync state, and sanitized error category.
- Respect rate-limit headers and `Retry-After`; back off instead of spinning.
- Use bounded concurrency and cancellation/timeouts.
- Partial success must remain visible. Never replace valid data with an empty list when GitHub is rate-limited or unavailable.
- Avoid N+1 calls for every repository. Use a documented bounded strategy for detailed activity.
- Keep the API client behind an interface so it can be mocked in tests.
- Add periodic/background sync only after the manual POC is reliable.

## 8. Security baseline
- DTO validation and whitelist unknown fields.
- Per-user authorization on every user-specific resource.
- Parameterized ORM queries; no raw SQL concatenation.
- CORS allowlist; secure headers; rate limits for auth and sync.
- CSRF defenses for cookie-authenticated mutations.
- Secure, HttpOnly, SameSite cookies and HTTPS in production.
- Request IDs and structured logs, with token/secret redaction.
- Secrets only through environment/secret manager; `.env.example` contains placeholders only.
- Account deletion, token revocation/disconnection, and privacy documentation.
- Dependency lockfile and automated dependency/security checks.
- Do not store full raw GitHub responses unless strictly needed.

## 9. Environment variables
Document and validate at startup:
- `NODE_ENV`
- `WEB_ORIGIN`
- `API_BASE_URL`
- `DATABASE_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`
- `SESSION_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `LOG_LEVEL`

Provide `.env.example` with dummy values. Fail fast if required production secrets are missing or weak.

## 10. Repository scripts and quality gates
- `lint`, `typecheck`, `test`, `test:e2e`, `build`, `db:migrate`, `db:seed`.
- CI must run lint, typecheck, unit tests, and build.
- Include deterministic seed data for local UI development without GitHub credentials.
- Provide Docker Compose for local PostgreSQL and optionally API/web.
