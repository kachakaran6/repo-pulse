# GitPulse Design System — Fixed Visual Rules

## 1. Design intent
Build a calm, precise developer tool that feels like a polished productivity product—not a generic AI dashboard, gaming UI, crypto dashboard, or neon terminal. The interface should help users understand their work at a glance.

## 2. Non-negotiable rules
- Do not invent colors at runtime or ask an AI to choose colors.
- Do not use neon, glow, rainbow gradients, glassmorphism, blurred blobs, or decorative gradient backgrounds.
- Do not mix component libraries. Use shadcn/ui for all common UI primitives and Tailwind design tokens for styling.
- Use Lucide icons consistently. No emoji as UI icons.
- Status must be conveyed with text and icon/shape as well as color.
- Avoid excessive rounded cards, oversized headings, pointless charts, and decorative empty space.
- Use one spacing scale, one radius scale, one typography system, and one set of interaction states.
- Reuse components. Do not build a new visual treatment for every screen.
- Do not claim an inaccessible contrast ratio; verify key text/status combinations during implementation.

## 3. Fixed palette
Use this palette as the single source of truth. Do not add extra accent colors without a documented design review.

### Light theme
| Token | Hex | Usage |
|---|---|---|
| `--background` | `#F8FAFC` | App canvas |
| `--surface` | `#FFFFFF` | Main panels, table, dialogs |
| `--surface-muted` | `#F2F5F8` | Subtle grouping, hover backgrounds |
| `--text` | `#151B22` | Primary text |
| `--text-muted` | `#6C7885` | Secondary text |
| `--primary` | `#3B91D9` | Primary action, selected state |
| `--primary-hover` | `#2679BC` | Hover/active action |
| `--border` | `#E0E6EB` | Dividers, borders |
| `--success` | `#247A55` | Confirmed success only |
| `--warning` | `#95620D` | Attention / sync warning |
| `--danger` | `#B42332` | Destructive/error |
| `--info` | `#2679BC` | Informational state |

### Dark theme
| Token | Hex | Usage |
|---|---|---|
| `--background` | `#0B1015` | App canvas |
| `--surface` | `#131A21` | Main panels, table, dialogs |
| `--surface-muted` | `#192129` | Subtle grouping, hover backgrounds |
| `--text` | `#F1F5F8` | Primary text |
| `--text-muted` | `#929DA8` | Secondary text |
| `--primary` | `#63AEDE` | Primary action, selected state |
| `--primary-hover` | `#4796C8` | Hover/active action |
| `--border` | `#27313A` | Dividers, borders |
| `--success` | `#65B98D` | Confirmed success only |
| `--warning` | `#E2B35C` | Attention / sync warning |
| `--danger` | `#F07882` | Destructive/error |
| `--info` | `#63AEDE` | Informational state |

The palette is intentionally restrained. Semantic colors are only for meaning, not decoration.

## 4. Typography
- Use Inter or the existing project sans-serif; do not load multiple font families.
- Body: 14px–15px; metadata: 12px–13px; page title: 24px–28px desktop, 22px mobile.
- Use a compact hierarchy: page title, one-line explanation, section label, body, metadata.
- Use tabular numerals for counts, dates, and durations where supported.
- Avoid all-caps labels except tiny, rare metadata.

## 5. Spacing, geometry, and layout
- Base spacing unit: 4px.
- Common gaps: 8, 12, 16, 20, 24, 32px.
- Panel radius: 10px; controls: 8px; pills: fully rounded only for compact tags/statuses.
- Border: 1px solid token border; shadows should be subtle and reserved for overlays.
- Desktop sidebar: 232px fixed/collapsible; main content min-width 0.
- Header: 56–64px; page content max width around 1440px with consistent horizontal padding.
- Main page should not scroll due to a fixed desktop shell; the content pane owns vertical scrolling. Tables with large datasets should scroll within the table region where practical.
- Mobile: sidebar becomes a drawer; filters wrap or move into a filter sheet; tables become readable compact rows/cards.

## 6. App shell and navigation
Primary navigation:
- Overview
- Repositories
- Activity
- Project types & tags
- Settings

Shell elements:
- GitPulse wordmark (simple text/icon; no elaborate logo required for POC).
- Current GitHub account switch/identity.
- Last sync status and manual sync action.
- Theme toggle.
- User menu with disconnect/account controls.

## 7. Dashboard layout
1. Header: “Your projects” plus concise supporting text and sync action.
2. Compact KPI row: Total repositories, Active, Quiet/Stale, Needs review. KPIs are navigational filters, not giant marketing cards.
3. Activity overview: a small, meaningful trend or activity timeline only when real data supports it.
4. Repository table/list: name and description, project type, stack tags, observed activity age, lifecycle status, priority, last sync.
5. “Review next” panel or compact list for old, high-priority projects.

Do not fill the page with charts. The repository inventory is the primary product.

## 8. Repository table
Columns (desktop): Repository, Project type, Tech stack, Activity, Status, Priority, row actions.
- Repository cell: name, owner, optional private/fork/archive indicator, short description.
- Activity cell: relative age plus exact date on hover/detail; show `Unknown` when absent.
- Observed activity and lifecycle status must be separate concepts.
- Keep row height approximately 56–68px.
- Provide column sorting, search, filters, pagination or virtualized rendering only if dataset size warrants it.
- Use skeleton rows while loading; never show fake live data in production mode.
- Use a clear empty state with a primary next action.

## 9. Status vocabulary
Observed activity labels:
- Active
- Quiet
- Stale
- Dormant
- Unknown

User lifecycle labels:
- Active
- Paused
- Completed
- Archived
- Needs review

Never use “Dead” as an automatically calculated status. If the user wants a personal label “Dead,” it must be an explicit custom lifecycle label and must not be confused with observed activity.

Suggested visual semantics:
- Active: subtle green semantic treatment
- Quiet: neutral gray
- Stale: amber
- Dormant: muted red/amber, never alarmist
- Unknown: neutral
Use semantic token styles and text labels; do not add a color for each arbitrary custom category.

## 10. Component standards
Build reusable components for:
- `AppShell`, `Sidebar`, `Topbar`, `PageHeader`
- `MetricTile`
- `RepositoryTable`, `RepositoryRow`, `RepositoryMobileCard`
- `ActivityBadge`, `LifecycleBadge`, `PriorityBadge`
- `TechnologyTag`, `ProjectTypeSelect`
- `RepositoryFilters`, `SearchInput`
- `SyncStatus`, `SyncButton`
- `EmptyState`, `ErrorState`, `LoadingSkeleton`
- `ConfirmDialog`, `FormField`, `SettingsSection`
- `Toast` and accessible tooltips

Use shadcn/ui primitives (Button, Badge, Card, Table, DropdownMenu, Dialog, Sheet, Select, Command, Tooltip, Skeleton, Tabs, Switch, Input, Textarea, Checkbox, Popover) where suitable. Extend via tokens, not one-off inline styling.

## 11. Motion and interaction
- Motion should be brief and functional: 120–180ms for hover/focus/open states.
- Respect `prefers-reduced-motion`.
- No parallax, animated backgrounds, bouncing cards, or continuous decorative motion.
- Show clear pending, success, and failure feedback for sync and save actions.
- Confirm destructive actions and preserve unsaved form changes.
- Keyboard navigation and visible focus ring are required.

## 12. Accessibility and responsive QA
- Use semantic landmarks and correct heading order.
- Every icon-only button has an accessible name.
- Forms have labels, inline validation, and error summaries when needed.
- Maintain visible focus states and keyboard-operable menus/dialogs.
- Do not rely on color alone.
- Test at 360px, 768px, 1024px, 1440px widths.
- Test both themes and reduced-motion mode.
- Check contrast for text, borders, badges, focus indicators, and disabled controls.
