# Product Requirements Document — GitPulse

## 1. Product summary
GitPulse is a personal repository activity dashboard for developers who lose track of side projects, client work, experiments, and long-running applications. It connects to GitHub with OAuth, imports repositories the user is authorized to view, calculates transparent activity signals, and provides a customizable project inventory.

## 2. Problem
Developers may have dozens of repositories and cannot quickly answer:
- Which projects have I worked on recently?
- Which repositories have been quiet for 7, 15, 30, or more days?
- Which projects are active, paused, archived, or candidates for a restart?
- What is each repository for, and what stack does it use?
- What should I resume next?

## 3. Goals
1. Give the user an accurate, explainable view of repository activity.
2. Make it easy to categorize repositories and add personal context.
3. Make inactivity thresholds configurable.
4. Keep the experience fast, calm, responsive, and understandable.
5. Treat GitHub data and credentials securely.

## 4. Non-goals for the POC
- Automatically deciding that a project is truly dead.
- Replacing GitHub Issues, Projects, or project-management tools.
- Reading local working-tree state or detecting unpushed commits.
- Supporting every Git provider in the first release.
- AI-generated project summaries or AI-generated stack guesses.
- Team billing, paid plans, or enterprise analytics.

## 5. Target user and primary journey
**Target:** an individual developer with multiple personal, learning, freelance, or experimental repositories.

1. User signs in with GitHub OAuth.
2. User grants the minimum required access.
3. GitPulse syncs accessible repository metadata and recent activity.
4. User sees a dashboard grouped into Active, Quiet, Paused, Archived, and Needs review.
5. User filters/searches repositories, opens a repository detail view, and edits its type, stack, status, notes, and inactivity thresholds.
6. User marks a quiet project as paused, active, archived, or “review later.”
7. The dashboard reflects those choices without overwriting the observed GitHub activity.

## 6. Core features

### 6.1 Authentication and connection
- GitHub OAuth login; use the supported authorization flow and secure server-side token handling.
- Show the connected GitHub username/avatar and a clear disconnect action.
- Do not ask users to paste a personal access token as the default flow.
- If a PAT is ever offered for local development, label it as an advanced alternative and never log or expose it.
- Explain which repository scopes are requested and why.
- Support token revocation/disconnection and deletion of locally stored account data.

### 6.2 Repository inventory
- List repositories visible to the authenticated user, including private repositories only when the granted access permits them.
- Show name, owner, description, visibility, default branch, archived/fork flags, primary language when available, GitHub URL, and latest observed activity.
- Include search, sorting, filters, pagination, and an explicit sync/refresh action.
- Handle renamed, deleted, inaccessible, archived, and forked repositories gracefully.
- Clearly distinguish GitHub's repository metadata from GitPulse's own user annotations.

### 6.3 Activity and inactivity
- Display latest known activity date and a human-readable age (e.g. “4 days ago”).
- Use commit activity as the primary signal for “last worked on,” while optionally displaying separate signals such as latest push, issue/PR activity, and latest GitHub event when available.
- Never pretend GitHub activity proves local work. Local commits not pushed to GitHub are not visible.
- Use a transparent precedence rule, document it in the UI, and expose the underlying dates in the detail view.
- Make thresholds customizable globally and per repository. Defaults: Active 0–6 days, Quiet 7–14 days, Stale 15–29 days, Dormant 30+ days. These are product labels, not claims that a project is dead.
- Let the user override the status manually: Active, Paused, Archived, Completed, or Needs review.
- Show a “Review suggested” indicator for inactivity, not a destructive or definitive “Dead” label.
- Provide a “Why this status?” explanation, e.g. “No qualifying GitHub activity observed for 18 days; your Quiet threshold is 7 days.”

### 6.4 Project organization
User-defined fields per repository:
- Project type/category (editable list): Web app, Mobile app, API/service, Full ERP, SaaS, Library/package, CLI/tool, Learning/experiment, Client project, Infrastructure, Other.
- Lifecycle status: Active, Paused, Completed, Archived, Needs review.
- Tech stack: multi-select custom tags (e.g. React, Flutter, NestJS, PostgreSQL, Redis, Docker).
- Priority: Low, Normal, High.
- Optional target/review date, short notes, and pinned/favorite flag.
- User can create, rename, reorder, and remove their own categories and stack tags.
- Custom labels must be user data, not hard-coded one-off UI branches.

### 6.5 Dashboard
- Summary metrics: total repositories, active by observed activity, quiet/stale, manually paused, and needs review.
- Sections or filters for “Recently active,” “Quiet for 7+ days,” “Stale for 15+ days,” “Dormant for 30+ days,” and “Manually paused.”
- Recent activity timeline.
- “Next to review” list ordered by inactivity, priority, and user-selected review date; explain the ordering.
- Empty, loading, partial-sync, rate-limited, and error states.
- Dashboard must not imply a project is dead solely due to inactivity.

### 6.6 Repository detail
- Repository identity and direct GitHub link.
- Activity timeline/chart with a selectable 30/90/180-day range when enough data is available.
- Activity signal breakdown and last sync time.
- User-managed project type, lifecycle status, stack, priority, notes, and thresholds.
- Sync history/error detail where useful.

### 6.7 Preferences
- Global inactivity thresholds and per-repository overrides.
- Default view, date display, timezone-aware rendering, compact/comfortable density.
- Manage custom categories and technology tags.
- Disconnect GitHub and request account/data deletion.

## 7. Activity classification rules
- Keep two concepts separate:
  1. **Observed activity state** — derived from available GitHub timestamps and the configured threshold.
  2. **User lifecycle status** — the user's explicit decision (Paused, Completed, etc.).
- User lifecycle status takes precedence for grouping when manually set, but never erases the observed activity state.
- If the activity timestamp is missing, show “Activity unknown,” not “Dormant.”
- If sync is stale or incomplete, show that caveat.
- Use UTC for stored timestamps and render in the user's selected/local timezone.
- Do not count repository creation time as recent work.
- Be explicit that GitHub signals do not include unpushed local changes and may not represent all collaboration activity.

## 8. UX requirements
- One consistent design system across every page.
- Responsive at 360px and above; desktop dashboard should use space efficiently.
- Keyboard-accessible navigation, dialogs, filters, and forms.
- Visible focus states, semantic HTML, sufficient contrast, reduced-motion support.
- Prefer compact tables on desktop and clear cards/list rows on mobile.
- Avoid overwhelming charts; every chart must answer a specific question.
- Every important status includes a text label and must not rely on color alone.

## 9. Privacy and security
- OAuth tokens are server-only, encrypted at rest where supported, and never returned to the browser.
- Never log authorization headers, OAuth codes, tokens, or sensitive repository payloads.
- Use HttpOnly, Secure, SameSite cookies for sessions; CSRF protection for state-changing cookie-authenticated requests.
- Validate OAuth `state`, use PKCE when supported by the chosen flow, validate redirect URLs, and use exact callback URLs.
- Enforce per-user authorization on every repository and annotation API.
- Apply rate limits, input validation, safe error messages, secure headers, and dependency auditing.
- Store only the GitHub data required for the experience; document retention and deletion behavior.
- Do not make private repository names/descriptions public or expose them in analytics.
- Provide account disconnect and data deletion.
- Use a least-privilege GitHub OAuth scope strategy, verified against current GitHub documentation during implementation.

## 10. Success criteria for POC
- User can authenticate with GitHub and see permitted repositories.
- Sync handles pagination and rate-limit responses.
- Activity age and inactivity bucket are correct for known test fixtures.
- User can edit project type, stack tags, priority, lifecycle status, notes, and thresholds.
- Settings survive refresh and are scoped to the correct account.
- No secrets are present in browser bundles, API responses, logs, or committed files.
- Core screens have loading, empty, error, and responsive states.
- Automated tests cover classification, authorization boundaries, and annotation CRUD.
- Setup instructions work from a clean checkout.

## 11. Acceptance criteria
- A repository inactive for 8 days falls into Quiet with default thresholds.
- A repository inactive for 18 days falls into Stale with default thresholds.
- A repository inactive for 45 days falls into Dormant, but is never automatically marked “dead.”
- A manually Paused repository remains Paused even if its observed activity bucket changes.
- A missing timestamp yields Activity unknown.
- Changing the global threshold updates derived buckets without rewriting source activity timestamps.
- A user cannot read or edit another user's annotations by changing an ID in the URL.
- Rate-limit and upstream failures are shown as recoverable sync states, not fabricated zero-activity results.
