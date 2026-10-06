---
name: ui-design-system
description: Implement and review GitPulse UI while enforcing the fixed palette, shadcn/ui consistency, accessibility, and responsive behavior.
---

# UI Design System Skill

## Before implementation
- Read `DESIGN_SYSTEM.md`.
- Inspect existing components and tokens before creating anything.
- Confirm the app uses only shadcn/ui primitives plus the existing Tailwind setup.
- Use the exact fixed light/dark palette; never ask a model to generate or improvise colors.

## Rules
- No neon, glow, glassmorphism, decorative gradients, blurred blobs, or emoji icons.
- Use Lucide icons with accessible names for icon-only controls.
- Use semantic tokens; do not hard-code one-off colors in components.
- Reuse existing buttons, badges, form fields, tables, dialogs, sheets, and skeletons.
- Distinguish observed activity from manual lifecycle status in both copy and component names.
- Build loading, empty, error, partial-sync, and success states.
- Ensure controls are functional and keyboard accessible.
- Support 360px, 768px, 1024px, and 1440px; test light and dark themes.
- Respect reduced-motion preferences.
- Avoid color-only meaning and verify text/badge/focus contrast.

## Review checklist
- [ ] No unapproved palette values or mixed component libraries.
- [ ] Consistent spacing, radius, typography, border, and interaction states.
- [ ] Navigation and content scrolling behave correctly.
- [ ] Table/list is readable on narrow screens.
- [ ] Every action has a real handler and feedback.
- [ ] Focus order, labels, dialog semantics, and focus rings work.
- [ ] Empty and error states explain what the user can do next.
- [ ] No fake live metrics or fabricated activity.
