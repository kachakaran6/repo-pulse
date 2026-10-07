# RepoPulse v2 PRD (SaaS)

## What changes
v1 had one user and a token in `.env`. v2 is a public product: anyone signs in with GitHub, chooses which repos RepoPulse may read, and sees only their own data.

## Principles
1. **Least access.** Read-only. The user picks the repos.
2. **Store little.** Commit counts and dates only. No code, no diffs, no commit messages by default.
3. **Help decide, not just display.** The product's value is moving each repo to Keep, Pause or Retire.
4. **Plain and quiet.** No dashboards full of decoration.

## User flow
1. Landing page, then "Sign in with GitHub".
2. Install the RepoPulse GitHub App and select repos (all or some).
3. First sync with visible progress.
4. Overview: repos grouped Active / Cooling / Stale / Dead with strips.
5. Triage: decide on each cooling or stale repo.
6. Weekly summary (in app first, email optional).

## Features
| Area | Included in v2 |
|---|---|
| Auth | Sign in with GitHub, sessions, sign out everywhere |
| Data | GitHub App installation, user and org repos, webhooks for live updates |
| Views | Overview, Triage, Archive, Repo detail (90-day strip), Settings |
| Custom | Labels, goals (target date), notes, pause until a date |
| Settings | Thresholds (default 7/15/30), light/dark, export data (JSON), delete account |
| Trust | Public "what we read and store" page, privacy policy, terms |

## Not in v2
GitLab/Bitbucket, team dashboards, AI summaries, mobile app.

## Open decisions (decide before launch)
- Pricing: free tier limit (for example repo count) and paid plan, or free beta first.
- Email provider for the weekly summary.
- Support channel and response time promise.

## Success measures
- First sync shows results in under 60 seconds for 30 repos.
- 7-day return rate and triage decisions per user per week.
- Zero security incidents; zero stored secrets that a leak could abuse.
