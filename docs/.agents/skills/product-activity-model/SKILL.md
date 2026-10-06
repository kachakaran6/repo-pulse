---
name: product-activity-model
description: Model repository activity and lifecycle labels transparently, with configurable thresholds and no unsupported dead-project claims.
---

# Product Activity Model Skill

## Domain concepts
Keep separate fields and UI labels for:
1. Observed activity bucket: Active, Quiet, Stale, Dormant, Unknown.
2. User lifecycle status: Active, Paused, Completed, Archived, Needs review.
3. Data freshness/sync state: Synced, Pending, Partial, Rate limited, Failed, Stale data.

Never collapse these into one status field.

## Default boundaries
Use the defaults defined in `PRD.md` and `TECH_STACK.md`. Implement boundaries in one pure function and document whether values are inclusive. Validate that configured thresholds are monotonic and positive.

## Correctness
- Calculate elapsed days using a consistent UTC/date-only rule and render relative dates in the selected timezone.
- Missing timestamps return Unknown.
- Stale or failed sync must be visible and must not masquerade as no activity.
- A manual lifecycle choice is never overwritten by computed activity.
- Explain the activity source and reason for a bucket in plain language.
- Do not claim local unpushed work is observable.
- Do not label a repository “dead” automatically.
- Do not show a chart if its historical data was never collected.

## Tests
Cover exact threshold boundaries, just below/above boundaries, future timestamps/clock skew, missing timestamp, per-repository override, invalid settings, stale sync, and manual lifecycle overrides.
