---
name: postgres-api-security
description: Build the NestJS/PostgreSQL API with safe sessions, validation, migrations, and strict per-user authorization.
---

# PostgreSQL and API Security Skill

## Architecture
- Use NestJS modules, injectable services, DTOs, guards, and explicit API response types.
- Use PostgreSQL + Prisma migrations as the only database path.
- Validate environment variables at startup and fail fast for missing production secrets.
- Use database constraints, foreign keys, indexes, and transactions where consistency requires them.
- Avoid raw SQL unless necessary; parameterize all raw queries.

## Authorization
- Require a valid session on all user-specific routes.
- Derive user identity from the authenticated session, never from an untrusted request body.
- Check ownership on every repository annotation, custom type, tag, setting, and deletion route.
- Ensure a user cannot attach another user's tag to their repository.
- Return safe 401/403/404 errors without leaking another user's record existence unnecessarily.
- Add automated tests that attempt cross-user access by changing resource IDs.

## Input and output
- Validate DTOs, allowlist fields, enforce string/array lengths, and reject unknown fields.
- Sanitize upstream errors; do not return stack traces.
- Use consistent error codes and request IDs.
- Apply rate limits to OAuth, sync, and expensive endpoints.
- Configure CORS for the exact web origin.
- Use secure headers, cookie protections, and CSRF defenses for cookie-authenticated mutations.
- Redact tokens, cookies, OAuth codes, and secrets in structured logs.

## Database lifecycle
- Commit migrations; never rely on schema push for production.
- Test migration from an empty database.
- Add deterministic seed data for local development.
- Document deletion and retention behavior.
- Keep `.env` out of version control and use placeholder-only `.env.example`.

## Done checklist
- [ ] Migrations apply cleanly from scratch.
- [ ] Foreign keys and unique constraints match the data model.
- [ ] Per-user access checks are tested.
- [ ] Validation rejects malformed and unexpected fields.
- [ ] Secrets are not logged or returned.
- [ ] Health checks distinguish liveness from readiness.
