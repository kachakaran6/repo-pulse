# Prompts for v2

Always start a session with the Master prompt, then add one task prompt. Agents must read docs/01 to 06 and docs/v2/10 to 14 first.

## Master prompt
```
You are building RepoPulse v2, a public SaaS. Before changing anything, read:
docs/01-PRD, 03-DESIGN-SYSTEM, 06-SKILLS, docs/v2/10-SAAS-PRD, 11-ARCHITECTURE,
12-SECURITY, 13-UI-V2, 14-ROADMAP-AND-LAUNCH.

Rules:
- Work only on the current roadmap stage (ask me which if unclear).
- Security rules in 12-SECURITY.md are not optional. If a task conflicts with them, stop and say so.
- Every table has user_id and RLS. Every query filters by the session user.
- Never log, store or return GitHub tokens, keys or secrets.
- UI uses tokens only. No item from the banned list in 13-UI-V2.md.
- Smallest working change, with tests. Say which files you touched.

After each task: run tests, list what changed, list what you skipped, name the next task.
```

## P1: Foundation
```
Stage S1. Convert the POC to TypeScript. Set up: Drizzle with migrations, Docker
Compose Postgres, zod env validation (fail fast on missing env), pino logging with
redaction, /healthz, Vitest, ESLint, GitHub Actions running lint, test, npm audit,
gitleaks. Move statusOf into a pure tested module with user-configurable thresholds.
Acceptance: fresh clone runs with one command; CI green.
```

## P2: Auth and tenancy
```
Stage S2. Implement Sign in with GitHub using a GitHub App user authorization flow.
Requirements: state + PKCE, new session ID on login, hashed session IDs in Postgres,
__Host-sid cookie (HttpOnly, Secure, SameSite=Lax), idle 7 days / absolute 30 days,
logout and logout-all, CSRF protection (Origin check + custom header), rate limits on /auth/*.
Add RLS policies on all tables and tests proving cross-tenant isolation.
Do not store the user's GitHub token.
Acceptance: all auth items in 12-SECURITY.md sections 1 and 2 pass tests.
```

## P3: Sync engine
```
Stage S3. Build installation handling and sync. Mint short-lived installation tokens
from the App private key (read from env/secret manager). Use one paginated GraphQL
query for repos plus commit history since 90 days filtered by the user's author ID.
Upsert repos and repo_activity daily counts; never overwrite repo_meta. Run in pg-boss.
Add POST /api/sync (1 per 5 min per user), GET /api/sync/status, and a verified
POST /webhooks/github (HMAC on raw body, constant-time, idempotent by delivery ID,
handles push, installation, installation_repositories events).
Handle rate limits by rescheduling. Acceptance: 30 repos in under 60 seconds; tests with mocked GitHub.
```

## P4: Frontend foundation and Overview
```
Stage S4. Build the app shell (top bar with tabs) and Overview per 13-UI-V2.md.
Tokens in tokens.css with light and dark themes. Rule-based summary sentence at the
top. Repo rows with 30-day strip, label chip editor, status always as word + color.
Skeleton, empty and error states. 375px and keyboard checks.
No component library. No banned items. Acceptance: matches the design doc; Lighthouse accessibility 95+.
```

## P5: Triage
```
Stage S4. Build Triage and Archive. Triage shows one cooling/stale repo at a time with a
90-day strip; actions Keep going (optional goal date), Pause (return date), Retire.
Keyboard K / P / R, progress "n of m decided", undo for the last action. Paused repos
resurface on their date. Retired repos live in Archive with "Bring back".
Acceptance: a user can clear 10 repos in under 2 minutes with the keyboard only.
```

## P6: Settings, export, delete
```
Stage S4. Settings page: thresholds (validated, ordered), theme, connected installation,
export all data as JSON, delete account. Delete removes all user rows and calls GitHub
to remove the installation, then signs out. Confirm dialog states exactly what will be deleted.
Acceptance: end-to-end test of delete leaves zero rows for the user.
```

## P7: Security review (run before beta and before launch)
```
Act as a security reviewer. Read 12-SECURITY.md, then audit the code in this repo.
For each section, mark Pass / Fail / Not applicable with file and line evidence.
Check specifically: tenancy filters and RLS, session handling, CSRF, CSP and headers,
webhook verification, secret handling and logging redaction, input validation,
dependency and secret scanning, delete and export. Output a prioritized list of
findings (Critical, High, Medium, Low) with a concrete fix for each. Do not change code.
```

## P8: UI review
```
Review every screen against docs/03 and docs/v2/13. List every color, font, radius,
shadow or animation not in the tokens, every banned item, every missing state
(loading, empty, error, offline), every control without keyboard access or visible
focus, and every layout break at 375px. Output a fix list ordered by severity. Do not restyle anything not on the list.
```

## P9: Deploy
```
Prepare production deployment. Dockerfile for the API, migration step on release,
separate production GitHub App, secrets from the host secret manager, HTTPS and HSTS,
Postgres backups, Sentry, uptime check on /healthz, and a written rollback procedure.
Acceptance: the Launch checklist in docs/v2/14 is fully checked.
```
