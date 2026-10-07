# Roadmap and launch checklist

## S1: Foundation (week 1)
TypeScript, folder structure, Drizzle migrations, Docker Compose for local Postgres, CI (lint, test, audit, gitleaks), `.env.example`, `/healthz`.
Done when: CI is green and a fresh clone runs with one command.

## S2: Accounts (weeks 2-3)
Register the GitHub App. Sign in with GitHub, sessions, logout-all, RLS, tenancy tests.
Done when: two test users cannot see each other's data and security tests in 12-SECURITY.md section 8 (auth part) pass.

## S3: Sync engine (weeks 3-4)
Installation flow, GraphQL sync, pg-boss jobs, webhooks, rate-limit handling, sync status UI.
Done when: 30 repos sync in under 60 seconds and a push shows up within a minute.

## S4: Product screens (weeks 4-6)
Overview, Triage, Archive, Repo detail, Settings, light and dark, all states from 13-UI-V2.md. Export and delete account.
Done when: a new user goes from sign-in to first triage decision without help.

## S5: Hardening and beta (weeks 6-7)
Security checklist complete, Sentry, alerts, backup restore test, load test with 100 simulated users, privacy policy and terms, "what we read and store" page. Invite 10-20 beta users.

## S6: Launch
Landing page live (see 07-LANDING-PAGE-PROMPT.md), custom domain, status page, support email, pricing decision applied, changelog.

## Launch checklist
- [ ] Production GitHub App separate from the dev one
- [ ] All secrets in the secret manager; dev keys rotated out
- [ ] DB backups on, restore tested
- [ ] Rate limits and security headers verified in production
- [ ] Error alerts reach a real person
- [ ] Privacy policy, terms, data page reviewed
- [ ] Delete account tested end to end including GitHub installation removal
- [ ] Accessibility pass (keyboard, contrast, 375px)
- [ ] Rollback plan written
