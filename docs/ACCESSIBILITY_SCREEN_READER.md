# RepoPulse Accessibility & Screen Reader Specification (WCAG 2.1 AA)

## 1. Overview & Compliance Standard

RepoPulse is engineered to meet **WCAG 2.1 Level AA** standards across all supported devices and screen sizes:
- **Mobile (360px)**: Compact phones (e.g. iPhone SE, Galaxy S-series)
- **Tablet (768px)**: Portrait tablets (e.g. iPad Mini / Air)
- **Desktop (1024px)**: Small laptops and split-screen desktop windows
- **Wide Desktop (1440px+)**: Standard and high-resolution monitors

---

## 2. Landmark Structure & Document Outline

RepoPulse uses semantic HTML5 landmarks and WAI-ARIA landmark roles so screen reader users (NVDA, JAWS, VoiceOver, Orca) can jump directly to regions:

| Landmark | Selector / Role | Purpose |
|---|---|---|
| **Header** | `header[role="banner"]` | Top application bar containing branding, global search trigger, sync status, theme toggle, and user profile |
| **Sidebar Navigation** | `nav[role="navigation"]` | Desktop collapsible sidebar for main app views (Ledger, Triage, Decisions, Digest, Analytics, Settings) |
| **Bottom Navigation** | `nav[role="tablist"]` | Mobile bottom bar for quick switching between the 4 primary views |
| **Main Content** | `main[role="main"]` | Central page view area |
| **Section Groups** | `section[aria-labelledby="..."]` | Activity groups (This week, This month, Last 3 months, Dormant) |
| **Detail Drawer** | `div[role="dialog"][aria-modal="true"]` | Slide-over inspector for deep-dive repo inspection |
| **Bulk Actions** | `div[role="region"][aria-label="Bulk repository actions"]` | Floating multi-select action bar |
| **Live Region** | `#app-live-region[aria-live="polite"]` | Dynamic updates, verdict announcements, and status notices |

---

## 3. Keyboard Navigation & Shortcuts

RepoPulse is fully operable without a mouse. Tab order is strictly linear and logical.

### Global Shortcuts
- <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd>: Opens the global Command Palette with immediate search focus.
- <kbd>/</kbd>: Focuses the Ledger filter search bar (when not inside an input).
- <kbd>Esc</kbd>: Closes active modals, drawers, or command palette, restoring focus to the triggering element.

### Ledger & Detail View Shortcuts
- <kbd>J</kbd> / <kbd>K</kbd>: Navigates to Next / Previous repository in the list and updates the open detail drawer.
- <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd>: Moves sequentially through repository rows, verdict segmented controls, and action buttons.
- <kbd>Space</kbd> / <kbd>Enter</kbd>: Selects/activates the focused item.

### Triage Mode Shortcuts
- <kbd>K</kbd>: Mark focused repository as **Keep**.
- <kbd>P</kbd>: Mark focused repository as **Pause**.
- <kbd>R</kbd>: Mark focused repository as **Retire**.
- <kbd>S</kbd>: **Skip** current repository.
- <kbd>Z</kbd> / <kbd>Ctrl</kbd> + <kbd>Z</kbd>: **Undo** last decision.

---

## 4. Live Regions & Dynamic Announcements

Screen readers are notified of asynchronous state transitions without interrupting speech flow:

1. **Sync Status (`role="status" aria-live="polite"`)**:
   - Announces background repository sync state ("Syncing repository changes...", "Synced 4 minutes ago", or "Sync failed").
2. **Inline Verdict Updates**:
   - When a verdict is applied via segmented control, a polite confirmation announces: `"Repository <name> updated to <verdict>."`
3. **Triage Progress**:
   - Announces progress counters: `"Repository 12 of 48: <repo_name>"`.
4. **Toast Notifications (`role="status" aria-live="polite"`)**:
   - Toasts render with action buttons (such as "Undo") and are announced via the polite live region.

---

## 5. Focus Management & Dialog Trapping

- **Repo Detail Drawer & Modals**:
  - Upon opening, focus automatically moves to the first interactive element.
  - While open, `Tab` and `Shift+Tab` are trapped within the dialog container (`drawerRef`), preventing focus from leaking to background content.
  - Upon closing (via Close button, `Escape`, or backdrop tap), focus returns to the exact element that initiated the drawer.
- **Visible Focus Rings**:
  - All interactive elements employ high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-neutral-12 focus-visible:outline-none`).

---

## 6. Touch Targets & Mobile Ergonomics (360px Viewport)

- **Minimum Hit Target**: All buttons, links, toggles, and form controls maintain a minimum interactive hit area of **44×44px** on touch devices.
- **Compact Hit Expansion (`.touch-target-expand`)**: In high-density views (such as dense ledger rows), pseudo-elements (`::after`) expand the tap boundary to ≥ 44px without distorting the visual density of the row.
- **Sticky Element Coordinate Collision Avoidance**:
  - Header: Sticky at `top-0` (`z-30`).
  - Section Headers: Sticky at `top-14` (`z-10`).
  - Bottom Tab Bar: Fixed at `bottom-0` (`z-40`, height 56px).
  - Floating Bulk Action Bar: Fixed at `bottom-20` on mobile (`z-30`) to stay 24px above the bottom tab bar.
  - Floating Search Button: Fixed at `bottom-20 right-4` (`z-30`).
  - Toast Container: Fixed at `top-4 right-4` (`z-50`).

---

## 7. Color Contrast & Visual Design Tokens

All color combinations in light and dark modes adhere to WCAG 2.1 AA requirements:
- **Body Text**: Contrast ratio ≥ 4.5:1 against surrounding background.
- **Large Text & Headings**: Contrast ratio ≥ 3.0:1.
- **UI Components & Icons**: Contrast ratio ≥ 3.0:1 against adjacent colors.
- **Non-Color Dependent Indicators**: Verdict states (Keep, Pause, Retire) are distinguished by explicit textual labels and distinct geometric icons, never by color alone.
- **Reduced Motion**: Respects the user's OS preference (`prefers-reduced-motion: reduce`) by disabling non-essential transitions and spring physics.

---

## 8. Automated Testing

Automated accessibility verification is performed using `@axe-core/playwright` across all viewports (360px, 768px, 1024px, 1440px).

To execute the accessibility test suite:
```bash
npm run test:a11y
```
