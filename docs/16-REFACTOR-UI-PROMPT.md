# UI refactor prompt (v3)

Supersedes the color tokens in docs/03 and docs/v2/13. Tokens file: `docs/v2/tokens-v3.css`.
Scope: presentation only. Do not change API routes, data model, auth, or business logic.

## Audit of the current build (from screenshots)

**Color**
- Navy-slate background + teal + white buttons is the stock "developer dashboard" palette. Nothing about it says RepoPulse.
- Status color barely appears: teal is the only hue, so Active/Cooling/Stale/Dead cannot be told apart at a glance.
- The Triage badge is amber, which collides with the Cooling status color.
- Strips are small and low-contrast, so the signature element gets lost.

**Layout and components**
- Box inside box inside box: panel, then bordered row, then bordered chip, then bordered "Details" button. Everything has equal visual weight.
- Four different pill/badge styles (filters, labels, Private, Triage count).
- "developer/" is repeated on every repo name. It adds noise.
- Username in monospace in the nav; avatar is the default green circle.
- Overview filters are a pill row that repeats the group headers below it.
- Settings: three full-width boxed sections with full-width inputs for a 2-digit number.
- Sign-in: three numbered bordered boxes (a generic onboarding template) and a visible "Instant Preview & Testing Mode" box.

**Check these two things**
1. **Security:** demo login ("Launch Demo") must not exist in production. Gate it on `NODE_ENV !== 'production'` on the SERVER, not just hide it in the UI. A demo bypass in a public SaaS is an account takeover path.
2. **Logic:** "You committed to 8 repos this week. 7 went cold." appears to reuse the Cooling count (7). Define "went cold" as repos whose status got worse within the last 7 days, and compute it that way, or reword the sentence.

## New direction: heat

The status names are already a temperature scale (Active, Cooling, Stale, Dead), so color is a heat ramp from ember to ash. This is the only chromatic color in the product. Everything else is neutral ink on paper.

| Status | Light | Dark | Meaning |
|---|---|---|---|
| Active | #D2382A | #F2664F | ember |
| Cooling | #B87400 | #F2B14C | amber |
| Stale | #4A7BA3 | #86AED0 | steel |
| Dead | #7B858D | #8B9399 | ash |

Neutrals are true neutral grey (no navy, no cream): paper #F2F3F1, surface #FFFFFF, ink #14181B, line #DADDDA. Dark: #131413 / #1C1D1B / #EDEEEA / #2E302D.

Contrast checked: heat colors are at least 3:1 against paper and surface in both themes (fine for bars and swatches). Body text always uses ink or ink-2, never a heat color. Status is always shown as a word as well as a color.

Primary button = ink fill (inverted in dark). Focus ring 2px ink. Links ink + underline. Light is the default; dark follows the system with a manual override.

## Screen changes

**Global shell**
- Tabs: plain text; active tab has a 2px ink underline. No boxed tab.
- Triage count: small ink pill, not amber.
- "Sync" becomes a quiet text button with "Synced 12 min ago" beside it. Spinner replaced by the text "Syncing 14 of 31".
- Avatar = real GitHub avatar, 28px. Username lives inside the avatar menu, in normal font.

**Overview**
- Summary sentence: 28px text, no box.
- **Heat bar** (new): one 12px-tall segmented bar showing the share of repos per status in heat colors, with name + count under each segment. Clicking a segment filters the list (`aria-pressed`). Replaces the pill filters. Keep the text search input, no box shadow, 1px line.
- One container per group, rows separated by 1px hairlines. No per-row borders or card backgrounds.
- Group header: 10px square swatch, name, count, rule text on the right ("Committed within 7 days").
- Row grid: `[repo 1fr] [strip 360px]`. Repo line: name (mono, 14px, 500) without owner prefix when owner is the user. Meta line: "Last commit 3 days ago", then language, then label, all plain ink-2 text separated by spacing, not pills. Private = small lock icon (inline SVG, aria-label "Private").
- Whole row is the link to the detail page. Remove the "Details" button. Hover = surface-2 background.
- **Strip**: 90 days, 3px bars with 1px gap (360px), 32px tall, bar height scales with commits (min 3px), bar color = the repo's status color, empty days = 1px line color. A faint week tick every 7 days. At 375px width the strip moves under the name and stretches to full width.

**Triage / Archive / Repo detail** (not in screenshots): apply the same rules. Triage name at 40px, strip at full content width, three buttons in a row: Keep going and Retire as outline, Pause as outline, none filled. Show shortcuts K / P / R as plain text under each button.

**Settings**
- No boxes. Each setting is a row: label + one-line description on the left, control on the right, hairline between rows.
- Thresholds as one sentence with inline 64px number inputs: "Active up to [7] days, Cooling up to [14], Stale up to [30]. After that: Dead." Live validation that values increase. Save button disabled until something changes.
- Theme: segmented control with three options (System, Light, Dark).
- Danger zone (export, delete account): same rows, delete is outline in ember with a confirm dialog.

**Sign-in**
- Left-aligned, two columns. Left: headline, one sentence, the "Sign in with GitHub" button, one short paragraph: "Read-only access to the repos you choose. We store commit counts and dates, never code." Right: a static preview of the Overview with sample repos, labelled "Sample data".
- Remove the three numbered boxes.
- Demo mode: dev builds only (see audit).

**Toast**: ink background, paper text, bottom-left, auto-dismiss 4s. Avoid for routine events like sign-in.

## Rules
- Tokens only (`tokens-v3.css`). A new value requires a new token and a doc update.
- Max radius 4px (pills only for the segmented theme control if needed). No shadows. No gradients. No glow.
- One chip style total: none. Labels are text. If a label must stand out, use ink text at weight 500.
- Weights: 400 body, 500 emphasis, 700 page and section headings only.
- Keep banned list from docs/v2/13 plus: navy backgrounds, teal as brand color, white buttons on dark, boxed tabs.

## Paste this prompt

```
Refactor the RepoPulse frontend UI. Presentation only: do not change API calls,
auth, data model or business logic (except the two fixes listed under "Check these
two things" in docs/v2/16-REFACTOR-UI-PROMPT.md).

Read docs/v2/16-REFACTOR-UI-PROMPT.md fully. Use docs/v2/tokens-v3.css as the only
source of colors, spacing and radii. Replace the existing tokens file with it.

Do in this order, committing after each step:
1. Tokens and global styles (theme: system default, manual override).
2. App shell: tabs, Triage count, Sync with last-synced text, avatar menu.
3. Overview: summary sentence, heat bar filter, grouped ledger rows, 90-day strip.
4. Settings: row layout, inline threshold sentence, theme segmented control.
5. Sign-in page with sample preview; remove demo mode from production (server-side check).
6. Triage, Archive, Repo detail brought into the same system.

After each step: run the app in light and dark, check 375px width, keyboard focus,
and list any color/size/radius not from tokens. Fix before moving on.
Final report: files changed, anything skipped, screenshots of every screen in both themes.
```

## Acceptance
- [ ] Only heat colors are chromatic; no navy, no teal brand color
- [ ] Zero bordered row cards, zero "Details" buttons, one chip style (none)
- [ ] Heat bar filters the list; strips are 90 days and readable
- [ ] Settings has no boxes; thresholds validate and save only when changed
- [ ] Demo login impossible in a production build
- [ ] Light and dark both pass contrast; 375px works; keyboard focus visible everywhere
