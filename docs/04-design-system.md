# 04 · Design system & accessibility

The reference implementation of everything below is in `reference/prototype.html` (look at its `<style>` block and the `a11y.js` / `landing.js` sections of its script). Port the CSS tokens and component styles from there instead of inventing new ones.

## Tokens (`apps/web/src/styles/tokens.css`)
| Token | Light | Use |
|---|---|---|
| `--blue` | #2563EB (dark mode #3D6BE0) | Primary actions, links, focus. The same blue for guests and signed-in people |
| `--blue-700` | #1E40AF | Hover, text on tinted blue |
| `--blue-50` / `--blue-100` | #EFF4FF / #DBE6FE | Tints |
| `--ink` | #0F172A | Text |
| `--surface` | #F8FAFC | Page background |
| `--white` | #FFFFFF | Cards |
| `--green` / `--green-text` | #16A34A / #15803D | Success fill / success text |
| `--muted` | #475569 | Supporting text |
| `--line` / `--line-strong` | #E2E8F0 / #CBD5E1 | Borders |
| warning | text #92400E on #FEF6E0 | Pending review |
| `--side-from` → `--side-via` → `--side-to` | #0A2463 → #103A91 → #1D4ED8 | Dark-blue sidebar and the dashboard number cards, white text |
| `--side-active-from` → `--side-active-to` | #2563EB → #4F46E5 | Current page in the sidebar |
| error | #B91C1C on #FEF2F2 | Errors, destructive |

Dark theme (`html.dark`) redefines the same tokens; values are in the prototype CSS under "Dark mode". Dark surfaces that must stay dark in both themes (prototype bar, footer, toasts) use `--night: #0F172A`.

Type: Inter (400–800). Page heading 32/700, section 22/700, card title 17/600, price 22/700, body 16/400, label 15/600, helper 14/400. Spacing on an 8px scale. Radius 8/12/16.

## Components to build in `apps/web/src/components`
`Button` (primary, secondary, outline, ghost, success, danger, danger-outline; sm/lg; ≥ 44px) · `Badge` (AvailabilityBadge, ReviewBadge, always icon + word) · `Icon` (inline SVG set copied from the prototype `ICONS`) · `Field` (label, helper, error with `aria-describedby`) · `PasswordField` (show/hide) · `PickGroup` (chips, role="radiogroup", "Selected: …" echo) · `ChoiceCards` (large cards with a "Selected" label) · `ToggleTile` · `PropertyCard` + `LandingCard` · `Gallery` + `Lightbox` · `Modal` / `ConfirmDialog` (focus trap, Esc, optional required note field) · `Toast` (with Undo) · `EmptyState` / `ErrorState` / `Skeleton` · `OnThisPage` (scroll-spy chips) · `PublicHeader` (two rows) · `AppShell` (landlord/admin sidebar) · `LandlordNav` (landlord header controls and small-screen menu) · `NotificationBell` · `CompareTray` · `QuickFind` (Ctrl + K) · `DisplayPanel` · `ReaderBar` · `SchematicMap`.

## Accessibility features (all must work on every page)
1. **Wayfinding**: the active nav item is filled blue; on route change, focus moves to the `<h1>` and a polite live region says "Now on: …"; `QuickFind` searches pages, neighbourhoods and listings; long pages get `OnThisPage` chips.
2. **Display preferences** (React context + localStorage key `urcst-prefs`), applied as classes and attributes on `<html>`:
   - font: inter | atkinson (Atkinson Hyperlegible) | lexend | merriweather | system → `data-font`
   - size: small (93.75%, 15px body text; only when the person chooses it, the default stays 16px) | normal | large (112.5%) | xl (125%)
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
- **Where the controls are:** public pages have Listen, Text and dark mode in the header. Landlord pages have Dark Mode, Listen, Text and Language in the header instead. Admin pages have the Listen and Display dock at the bottom left.
- **High contrast in dark mode:** `html.dark.hc` has its own colours, because the dark theme would otherwise override `html.hc`.
- **Chips and display cards:** `role="radio"` with `aria-checked` only. The group is one Tab stop and the arrow keys change the choice (`useRovingRadio`).
- **Header menus:** plain open/close panels, not `role="menu"`, because they hold chips and links. Esc and clicking elsewhere close them.
- **Dialogs:** `Modal`, `DisplayPanel`, `QuickFind` and the mobile menu share `useFocusTrap`, which also returns focus on close.
- **Touch targets:** the 44px minimum applies to small buttons, chips and footer and trail links too.
- **Toast with Undo:** after a keyboard action, focus moves to Undo and the toast stays up until focus leaves it. Undo, Dismiss and Esc return focus. Focus stays put after mouse or touch actions, in text fields and while a dialog is open.

## Languages
- **English, Kinyarwanda and French.** Chosen in the header Language menu (public and landlord pages), on Account, and in the Display panel, so it works on every page, admin pages included. It is saved in `urcst-prefs` as `lang` and sets `<html lang>`, dates and numbers, and the read-aloud voice. Resetting the display settings keeps the language.
- **How text is translated:** interface text is written in English in the code inside `t()` (`apps/web/src/i18n`). The English is the key; `rw.ts` and `fr.ts` hold the translations, and anything missing shows in English. Variables shown as text go through `tNode()`. Messages from the server and stored notifications are translated when shown, by matching them to a sentence with `{placeholders}` (`tr()`), so the API stays in English.
- **What stays as written:** listing titles and descriptions, people's names and messages, and the password-reset email.
- **New text needs both translations.** `i18n.test.ts` fails when a `t()` string has neither. Keep the screen-reader label containing the visible words in every language (axe `label-content-name-mismatch`).
- **Kinyarwanda is a first translation.** A fluent speaker should review `rw.ts` before the pilot reaches students.

## UX copy rules
- From the user's side, short and specific. Buttons say what happens ("Submit Listing", "Mark as occupied").
- Errors say what is wrong and how to fix it ("Enter an amount between 10,000 and 1,000,000 RWF.").
- Honest system messages: "Saved to your list. This does not reserve the room." · never call a listing "verified".
