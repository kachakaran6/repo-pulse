---
name: loop-engineering-qa
description: Deliver GitPulse incrementally through inspect-plan-implement-test-review loops without hiding failures or damaging existing work.
---

# Loop Engineering and QA Skill

## Loop
1. Inspect git status, project tree, conventions, dependencies, and current tests.
2. Select one small task tied to a phase acceptance criterion.
3. Plan files, risks, and verification commands.
4. Implement the smallest complete change.
5. Run relevant tests, lint, typecheck, and build.
6. Review the diff and responsive/accessibility/security behavior.
7. Update documentation when actual behavior or decisions change.
8. Continue to the next task if the current one passes.

## Guardrails
- Preserve user changes and uncommitted files.
- Never reset, clean, force-push, or rewrite git history.
- Do not report success without actual command output.
- Do not hide failing tests; fix them or report exact blockers.
- Do not make a static mock appear connected to GitHub.
- Keep fixtures deterministic and visibly demo-only.
- Avoid unnecessary dependencies and broad refactors.
- If credentials are unavailable, complete independent tasks with mocked clients and state the live integration limitation.
- Prefer small commits with clear messages when asked to commit; do not commit automatically unless requested.

## Definition of done
- Acceptance criteria are met.
- Tests cover relevant behavior and edge cases.
- Types, lint, and build pass where configured.
- No secrets or unrelated changes in the diff.
- UX includes loading/empty/error states.
- Docs and setup commands are accurate.
- The final summary distinguishes implemented, mocked, unverified, and blocked work.
