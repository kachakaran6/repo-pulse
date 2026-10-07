# Security plan (v2)

Target: OWASP ASVS Level 2 for the parts that apply. This is an engineering checklist, not a legal or compliance certification. Get an independent review before public launch.

## 1. Authentication
- GitHub sign-in with `state` (random, single use, stored server-side or signed cookie) and PKCE where supported. Reject callback if state mismatches.
- On login create a new session ID (256-bit random). Store only its SHA-256 hash.
- Cookie: name `__Host-sid`, `HttpOnly; Secure; SameSite=Lax; Path=/`. Absolute lifetime 30 days, idle timeout 7 days.
- "Sign out everywhere" deletes all of a user's sessions.

## 2. Authorization and tenancy
- Every query filtered by the session's `user_id`.
- Postgres RLS enabled and tested: a test must prove user A cannot read user B's rows even with a buggy query.
- Never trust IDs from the client. Use `WHERE id = $1 AND user_id = $2`.

## 3. Secrets and data
- GitHub App private key, webhook secret, client secret, DB URL: in the host's secret manager, never in the repo, never in logs.
- No long-lived user tokens stored. If any token must be stored later: AES-256-GCM, unique nonce per row, key ID for rotation, key kept outside the DB.
- Store minimal data (counts, dates, repo names). Commit messages only as an explicit opt-in.
- Encrypted backups, tested restore, retention stated in the privacy policy.

## 4. Web layer
- HTTPS only, HSTS.
- CSP: `default-src 'self'`; no inline scripts; `frame-ancestors 'none'`. Also `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, restrictive `Permissions-Policy`.
- CORS: allow only the app origin, with credentials.
- CSRF: SameSite=Lax plus Origin header check and a custom header on all mutating requests.
- Input validation with zod; parameterized SQL only; React escapes output; never `dangerouslySetInnerHTML`.
- Rate limits: per IP and per user; stricter on `/auth/*` and `/api/sync`.
- Request size limit (for example 100 KB).

## 5. Webhooks
HMAC verify on the raw body, constant-time compare, reject stale or duplicate delivery IDs, no secrets in error messages.

## 6. Privacy and user rights
- Public page: exactly what we read and store, and what we do not.
- Export (JSON) and Delete account. Delete removes all rows, then calls GitHub to remove the installation, within a stated time.
- Privacy policy and terms written or reviewed by a qualified person. Use only essential cookies, which usually need no banner (verify for your regions).

## 7. Operations
- Dependabot or Renovate, `npm audit` in CI, `gitleaks` secret scan in CI, lockfile committed.
- Structured logs with redaction of `authorization`, `cookie`, `token`, `secret`.
- Audit log: login, logout-all, sync, decision changes, export, delete.
- Alerts: error rate, failed syncs, webhook failures. Uptime check on `/healthz`.
- Incident plan: who rotates keys, how users are told, within what time.

## 8. Pre-launch security tests
- [ ] Cross-tenant read/write tests pass
- [ ] State/CSRF tests pass; forged callback rejected
- [ ] Session fixation test: ID changes on login
- [ ] Webhook with bad signature rejected
- [ ] Rate limits trigger
- [ ] Headers verified with an online scanner
- [ ] Secrets scan clean across full git history
- [ ] Backup restore rehearsed
