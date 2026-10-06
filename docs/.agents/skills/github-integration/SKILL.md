---
name: github-integration
description: Implement secure GitHub OAuth, repository inventory sync, activity signal handling, pagination, and rate-limit recovery.
---

# GitHub Integration Skill

## Source of truth
Read `TECH_STACK.md` and `PRD.md`. Verify OAuth scopes, API endpoint behavior, pagination, rate limits, and retention limits against current official GitHub documentation before implementation.

## OAuth safety
- Keep OAuth code exchange and access tokens on the server.
- Validate `state`; use PKCE where supported by the selected flow.
- Allowlist callback/redirect URLs.
- Use secure HttpOnly SameSite cookies and CSRF defenses for mutations.
- Never expose tokens in browser code, URLs, logs, traces, error messages, or analytics.
- Encrypt stored tokens at rest with a key stored outside the database.
- Implement logout/disconnect and token/session invalidation.
- Request the minimum access needed and explain why it is needed.

## Repository sync
- Use an injectable API client so all upstream behavior can be mocked.
- Implement pagination and stable de-duplication by GitHub repository ID.
- Use bounded concurrency, timeouts, and cancellation.
- Respect rate-limit headers and `Retry-After`; use capped backoff.
- Track sync timestamps and sanitized status/error codes.
- Preserve previous good data on failure; represent partial sync explicitly.
- Handle renamed, deleted, inaccessible, forked, and archived repositories.
- Avoid unbounded per-repository requests and N+1 request patterns.
- Never synthesize historical activity.

## Activity semantics
- Label the exact source for each timestamp.
- A repository `pushed_at` value is not necessarily the user's last personal contribution.
- GitHub event history may be limited; don't treat it as complete long-term history.
- Missing data means Unknown.
- Local unpushed commits are invisible to the remote API.
- Separate observed activity bucket from manual lifecycle status.

## Tests
- Pagination and duplicate repositories.
- Rate limiting, transient 5xx, timeout, revoked token, and partial sync.
- Empty repository list versus upstream failure.
- Private repository access boundaries.
- No secrets in response bodies or logs.
