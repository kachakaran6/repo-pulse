# Design System

**Concept:** a ledger of work with a pulse. The one memorable element is the 30-day commit strip on every row. Everything else stays quiet.

## Color (hand-picked, do not substitute)
| Token | Hex | Use |
|---|---|---|
| `--chalk` | #ECEFF2 | page background |
| `--surface` | #F8F9FA | rows, panels |
| `--ink` | #17212B | text, primary button |
| `--ink-soft` | #5B6672 | secondary text |
| `--line` | #CDD3DA | borders |
| `--active` | #0E7C7B | active status, strip bars |
| `--cooling` | #B7852F | cooling |
| `--stale` | #A8603A | stale |
| `--dead` | #8B94A0 | dead |

Rules: no gradients, no cream + terracotta, no neon on black, no glow, no drop shadows. Status color is the only color on the page.

## Type
- One family: **Schibsted Grotesk** (400, 500, 700). Fallback: system-ui.
- Code (repo names only): ui-monospace stack.
- Scale: 13 / 15 / 18 / 28 px. Line-height 1.5 body. Sentence case everywhere.
- No ALL-CAPS labels, no eyebrows, no one-word-accent headlines.

## Layout
- Left-aligned. Max width 960px. Single column list grouped by status.
- Group header: status name, count, one-line meaning ("No commits in 15-30 days").
- Row: repo name, last commit text, label chip, 30-day strip on the right.
- Radius: 3px rows, 999px chips only. Spacing scale 4 / 8 / 16 / 32.

## Motion
None on load. Only in response to user actions.

## Quality floor
Mobile-first (strip drops below the name under 640px), visible focus ring (2px `--ink`), `prefers-reduced-motion` respected, contrast 4.5:1 minimum.
