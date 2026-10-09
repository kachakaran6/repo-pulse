# RepoPulse Audit Report (W0)
**Date:** 2026-10-09  
**Auditor:** Lead Engineer & Product Designer  
**Scope:** Root-cause analysis of data discrepancies, UX defects, multi-auth remnants, and stats engine inconsistencies.

---

## 1. Investigation: Why Repositories / Private Repos Were Missing

### a. Authentication & Credential Path
- **Finding:** [server/src/routes/auth.ts](file:///k:/repo-pulse/server/src/routes/auth.ts#L66-L84)
- **Status:** FAIL (Legacy Flow)
- **Proof:** Previously, the user authorization flow initiated at `/auth/github/start` requested standard GitHub user identity OAuth. If using a personal token without the full `repo` scope or an OAuth App without organization grants, private and organizational repositories were omitted by GitHub's API. Under the GitHub App model, access is granted via installations.

### b. GitHub App `repository_selection`
- **Finding:** [server/src/sync/engine.ts](file:///k:/repo-pulse/server/src/sync/engine.ts#L110-L125)
- **Status:** PASS (Identified)
- **Proof:** When a GitHub App is installed, `repository_selection` can be either `all` or `selected`. If the user selects specific repositories during GitHub App onboarding, GitHub returns *only* those selected repositories via `GET /installation/repositories`. The application did not surface the `repository_selection` status to the user in the UI, leading to confusion when unselected repositories were omitted.

### c. API Filtering & Pagination Flaws
- **Finding:** [server/src/sync/engine.ts](file:///k:/repo-pulse/server/src/sync/engine.ts#L58-L88)
- **Status:** FAIL (Fixed in W0/W2)
- **Proof:** The legacy GraphQL query used `viewer.repositories(first: 50, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], orderBy: {field: PUSHED_AT, direction: DESC})`.
  1. Repositories with `pushed_at = null` (e.g. empty or newly initialized repositories) were omitted or sorted inconsistently.
  2. Page size of 50 led to premature pagination cutoff on certain GraphQL edge cases.
  3. Single-user scope missed repositories across secondary organizational installations.

### d. Personal Account vs. Organizations & SAML SSO
- **Finding:** [server/src/routes/settings.ts](file:///k:/repo-pulse/server/src/routes/settings.ts#L25-L65)
- **Status:** FAIL
- **Proof:** Only a single `installation` row was queried per user (`db.getInstallation(userId)`). Users belonging to multiple organizations or with separate organization installations could not view or sync organizational repositories independently.

### e. GitHub App Permissions & Commit History
- **Finding:** [server/src/sync/engine.ts](file:///k:/repo-pulse/server/src/sync/engine.ts#L160-L195)
- **Status:** FAIL
- **Proof:** Commit history query queried only commits within the 90-day window (`history(since: $since)`). For inactive repositories (>90 days without commits), `history.nodes` returned empty, and `last_commit_at` was erroneously parsed as `null` instead of using the repository's `pushedAt` / `defaultBranchRef.target.committedDate`.

### f. Database Schema for Private Repositories
- **Finding:** [server/src/db/migrations.sql](file:///k:/repo-pulse/server/src/db/migrations.sql#L103-L116)
- **Status:** PASS
- **Proof:** `repos` table includes `is_private BOOLEAN NOT NULL DEFAULT false`.
```sql
SELECT is_private, count(*) FROM repos WHERE user_id = $1 GROUP BY 1;
```

---

## 2. Investigation: Stat Calculation Inconsistencies ("Wrong Numbers")

- **Finding:** [server/src/core/status.ts](file:///k:/repo-pulse/server/src/core/status.ts#L124-L164), [server/src/routes/repos.ts](file:///k:/repo-pulse/server/src/routes/repos.ts#L35-L100)
- **Defects:**
  1. **"Went cold" logic:** In [repos.ts:L49](file:///k:/repo-pulse/server/src/routes/repos.ts#L49), `wentColdCount` was computed as `explanation.days > thresholds.active && explanation.days <= thresholds.active + 7`. This simply counted repos currently in the first 7 days of the "Cooling" status, rather than tracking actual historical status degradations over the past 7 days.
  2. **Duplicated math:** Summary sentence stats, analytics endpoint stats, and overview stats were computed with ad-hoc logic across different files instead of a single authoritative stats engine.
  3. **Retired repository confusion:** Retired repos were counted in total database counts (162) but omitted from active tab lists (129), producing perceived count mismatches.

---

## 3. Legacy Multi-Auth Artifacts to Purge (W1 Target)

| Type | Path / Symbol | Action |
|---|---|---|
| Server Route | `POST /auth/register` | Delete |
| Server Route | `POST /auth/login` | Delete |
| Server Route | `POST /auth/connect-token` | Delete |
| Server Route | `POST /auth/demo-login` | Delete |
| Server Route | `DELETE /auth/disconnect-github` | Delete |
| Auth Utility | `server/src/auth/password.ts` | Delete |
| Database Column | `users.password_hash` | Drop in migration |
| Database Column | `users.github_token` | Drop in migration |
| Database Method | `db.createUserWithPassword` | Delete |
| Database Method | `db.findUserByLoginOrEmail` | Delete |
| Database Method | `db.linkTokenToUser` | Delete |
| Frontend Component | `OnboardingView.tsx` (Tabs, forms, PAT inputs) | Rebuild strictly to 3-step GitHub App flow |
| Frontend Component | `SettingsView.tsx` (PAT connect form) | Remove |
| Frontend API | `api.registerUser`, `api.loginWithPassword`, `api.connectGitHubToken` | Delete |

---

## 4. UX & Usability Audit (133+ Repositories Experience)

1. **Massive Uncollapsed Lists:** 114 dead/archived repositories render in an endless scroll list without grouping collapse, creating immense scroll fatigue.
2. **Visual Gap:** In [RepoRow.tsx](file:///k:/repo-pulse/client/src/components/RepoRow.tsx), there is a wide dead gap between the repository name and the 90-day activity strip on desktop viewports.
3. **Missing Filters & Facets:** No ability to filter by language, ownership/collaboration, visibility (private/public), triage decision status, or goal dates.
4. **No Sorting Controls:** Repositories are locked to default ordering; no sorting by 30-day velocity, name, creation date, or status.
5. **No Inline Triage Actions:** Triage decisions (Keep / Pause / Retire) require navigating away from the list or opening modal popups instead of inline 1-click keyboard / hover actions.
6. **No Collaboration Metadata:** Shared, organization, and collaborator repos look identical to personal projects without contributor counts or team activity indicators.
