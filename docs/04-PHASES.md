# Phases

## Phase 0: POC (this repo)
Token sync, repo list, status groups, 30-day strip, labels.
Done when: one account syncs and renders correctly.

## Phase 1: Usable
- Filters (status, label), search, sort
- Configurable thresholds (7/15/30)
- Archive/ignore a repo
- Sync progress + better error states

## Phase 2: Accounts
- GitHub OAuth, multi-user, encrypted token storage
- TypeScript migration, tests on status logic
- Org repos, commits by any email alias

## Phase 3: Insight
- Weekly digest: "3 repos went cold"
- Goal per repo ("ship by Nov 30")
- Branch and PR activity, not just commits
- NestJS migration if needed

## Phase 4: Beyond GitHub
GitLab, Bitbucket, local git folders via CLI agent.
