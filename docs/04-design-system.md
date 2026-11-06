# 04 · Design system & accessibility

The reference implementation of everything below is in `reference/prototype.html` (look at its `<style>` block and the `a11y.js` / `landing.js` sections of its script). Port the CSS tokens and component styles from there instead of inventing new ones.

## Tokens (`apps/web/src/styles/tokens.css`)
| Token | Light | Use |
|---|---|---|
| `--blue` | #1D4ED8 | Primary actions, links, focus |
| `--blue-700` | #1E40AF | Hover, text on tinted blue |
| `--blue-50` / `--blue-100` | #EFF4FF / #DBE6FE | Tints |
| `--ink` | #0F172A | Text |
| `--surface` | #F8FAFC | Page background |
| `--white` | #FFFFFF | Cards |
| `--green` / `--green-text` | #16A34A / #15803D | Success fill / success text |
| `--muted` | #475569 | Supporting text |
| `--line` / `--line-strong` | #E2E8F0 / #CBD5E1 | Borders |
| warning | text #92400E on #FEF6E0 | Pending review |
| error | #B91C1C on #FEF2F2 | Errors, destructive |

Dark theme (`html.dark`) redefines the same tokens; values are in the prototype CSS under "Dark mode". Dark surfaces that must stay dark in both themes (prototype bar, footer, toasts) use `--night: #0F172A`.

Type: Inter (400–800). Page heading 32/700, section 22/700, card title 17/600, price 22/700, body 16/400, label 15/600, helper 14/400. Spacing on an 8px scale. Radius 8/12/16.

## Components to build in `apps/web/src/components`
`Button` (primary, secondary, outline, ghost, success, danger, danger-outline; sm/lg; ≥ 44px) · `Badge` (AvailabilityBadge, ReviewBadge, always icon + word) · `Icon` (inline SVG set copied from the prototype `ICONS`) · `Field` (label, helper, error with `aria-describedby`) · `PasswordField` (show/hide) · `PickGroup` (chips, role="radiogroup", "Selected: …" echo) · `ChoiceCards` (large cards with a "Selected" label) · `ToggleTile` · `PropertyCard` + `LandingCard` · `Gallery` + `Lightbox` · `Modal` / `ConfirmDialog` (focus trap, Esc, optional required note field) · `Toast` (with Undo) · `EmptyState` / `ErrorState` / `Skeleton` · `Trail` ("You are here") · `OnThisPage` (scroll-spy chips) · `PublicHeader` (two rows) · `AppShell` (landlord/admin sidebar) · `NotificationBell` · `CompareTray` · `QuickFind` (Ctrl + K) · `DisplayPanel` · `ReaderBar` · `SchematicMap`.

## Accessibility features (all must work on every page)
1. **Wayfinding**: `Trail` under the header showing the full path, with the current page as a solid pill, and a Back link on deep pages; the active nav item is filled blue; on route change, focus moves to the `<h1>` and a polite live region says "Now on: …"; `QuickFind` searches pages, neighbourhoods and listings; long pages get `OnThisPage` chips.
2. **Display preferences** (React context + localStorage key `urcst-prefs`), applied as classes and attributes on `<html>`:
   - font: inter | atkinson (Atkinson Hyperlegible) | lexend | merriweather | system → `data-font`
   - size: normal | large (112.5%) | xl (125%)
   - spacing: normal | relaxed
   - contrast: standard | high
   - highlight: off | on (thick yellow outline on focus and hover)
   - theme: light | dark
3. **Read aloud** (`useReader` hook over `window.speechSynthesis`): Listen to the whole page (splits `<main>` into readable blocks, outlines the current block in yellow and scrolls it into view), Listen on each property card (spoken summary: "85,000 Rwandan francs per month, 0.8 kilometres from UR-CST, available…"), Read what I tap (opt-in), player bar with previous / pause / next / stop and speed Slow 0.8, Normal 1, Fast 1.25. Show a clear message if the browser has no speech support. Stop reading on route change.
4. **Pick, don't type**: use `PickGroup` / `ChoiceCards` / `ToggleTile` for location, budget, room type, distance, facilities, sort, wizard type, neighbourhood, rooms, quick rent amounts and help topic. Free text stays only for the search box, names, emails, phone, messages and exact rent.
5. Keyboard: everything reachable, visible focus ring (`0 0 0 3px #fff, 0 0 0 5px var(--blue)`), Esc closes menus and dialogs, focus trap in dialogs, Enter/Space on custom buttons.
6. Respect `prefers-reduced-motion`.
7. Target: zero serious or critical axe violations on every route (checked in Phase 8).

## Decisions made while building (Phase 3)
- **Preferences:** `urcst-prefs` also stores `rate` (0.8, 1, 1.25) and `clickRead` (off, on).
- **Where the controls are:** public pages have Listen, Text and dark mode in the header. Landlord and admin pages have the Listen and Display dock at the bottom left.
- **High contrast in dark mode:** `html.dark.hc` has its own colours, because the dark theme would otherwise override `html.hc`.
- **Chips and display cards:** `role="radio"` with `aria-checked` only. The group is one Tab stop and the arrow keys change the choice (`useRovingRadio`).
- **Header menus:** plain open/close panels, not `role="menu"`, because they hold chips and links. Esc and clicking elsewhere close them.
- **Dialogs:** `Modal`, `DisplayPanel`, `QuickFind` and the mobile menu share `useFocusTrap`, which also returns focus on close.
- **Touch targets:** the 44px minimum applies to small buttons, chips and footer and trail links too.
- **Toast with Undo:** after a keyboard action, focus moves to Undo and the toast stays up until focus leaves it. Undo, Dismiss and Esc return focus. Focus stays put after mouse or touch actions, in text fields and while a dialog is open.

## UX copy rules
- From the user's side, short and specific. Buttons say what happens ("Submit Listing", "Mark as occupied").
- Errors say what is wrong and how to fix it ("Enter an amount between 10,000 and 1,000,000 RWF.").
- Honest system messages: "Saved to your list. This does not reserve the room." · "Approved by admin" (never "verified") · languages other than English are labelled "Planned".
