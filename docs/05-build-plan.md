# 05 · Build plan

Work through the phases in order. For each one, paste the prompt into Claude Code, review the plan it proposes, approve it, then check the "Done when" list yourself before moving on. Commit at the end of every phase.

Tip: start each phase in a fresh conversation (`/clear`) so Claude reads CLAUDE.md and the docs again with a clean context.

---

## Phase 0 · Repository setup
**Prompt**
> Read CLAUDE.md and all files in docs/. Then set up Phase 0: an npm-workspaces monorepo with apps/web (Vite + React 18 + TypeScript + React Router + TanStack Query), apps/api (Express + TypeScript + Prisma), packages/shared (zod schemas and types). Add docker-compose.yml with Postgres 16, .env.example files, ESLint + Prettier, Vitest in both apps, Playwright at the root, and the root scripts listed in CLAUDE.md. The api should expose GET /api/health, and the web app should show a page that calls it. Propose the file list first and wait for my approval.

**Done when**
- [x] `docker compose up -d db` starts Postgres
- [x] `npm run dev` serves the web app on :5173 and the api on :4000, and the page shows "API OK"
- [x] `npm run lint`, `npm run typecheck` and `npm test` pass
- [x] `.env` is in `.gitignore`

## Phase 1 · Database and seed
**Prompt**
> Phase 1: create the Prisma schema exactly as in docs/02-data-model.md, run the first migration, and write prisma/seed.ts that inserts the same demonstration data as reference/prototype.html (LOCATIONS_SEED, LANDLORDS, PROPERTIES_SEED, USERS_SEED, INQUIRIES_SEED, REPORTS_SEED, NOTIFS_SEED, ACTIVITY_SEED). Hash the demo password demo1234 with bcrypt. For photos, generate the same SVG demo images as the prototype's photo() function and save them to apps/api/uploads/demo/. Add db:migrate, db:seed and db:reset scripts.

**Done when**
- [x] `npm run db:reset` builds the database from scratch with 13 properties (11 approved, 2 pending)
- [x] Prisma Studio shows the three demo accounts

## Phase 2 · Authentication and roles
**Prompt**
> Phase 2: implement the Auth section of docs/03-api.md (register for student or landlord, login, logout, me, forgot/reset password with a console mailer, PATCH /me, password change, landlord contact preferences). JWT in an httpOnly SameSite=Lax cookie, bcrypt, zod validation from packages/shared, middleware requireAuth and requireRole, rate-limit login and forgot-password. Then build the Login, Registration (role step first) and Forgot/Reset screens in the web app to match the prototype, including the demo-account buttons and the exact validation messages. Add api tests with Supertest.

**Done when**
- [x] All three demo accounts can log in and land on the right home (student dashboard, landlord dashboard, admin dashboard)
- [x] A suspended user cannot log in and sees why
- [x] Wrong input shows the same messages as the prototype

## Phase 3 · Design system, layout and accessibility layer
**Prompt**
> Phase 3: port the design tokens and component styles from reference/prototype.html into apps/web/src/styles, and build the components listed in docs/04-design-system.md. Build PublicHeader (two rows, as on the prototype landing page), AppShell for landlord/admin, Trail, QuickFind (Ctrl+K), DisplayPanel with all preferences including dark mode, the useReader hook and ReaderBar, Toast with Undo, ConfirmDialog, and the route-change focus/announcement. Add a /design-system route that shows every component in every state, like the prototype's Design system page.

**Done when**
- [x] Every display preference changes every page and survives a reload
- [x] Listen reads the design-system page and highlights each block (order and highlight tested with a stand-in voice; the real voice still needs a check by ear)
- [x] Keyboard-only: you can reach and use every control and see where focus is

## Phase 4 · Student experience
**Prompt**
> Phase 4: implement the public Properties and Student endpoints from docs/03-api.md (filters, sorting, pagination, smart search parse, saved, history, inquiries, reports), then build the Landing, Search & filters, Property details, Saved, Compare, Recently viewed & history, Contact landlord, Student dashboard and Account screens to match the prototype. Guests keep saved and compare in localStorage, and they merge into the account at login. Write a Playwright test for Journey A from docs/01-product-spec.md.

**Done when**
- [x] Journey A passes in Playwright
- [x] Filter results and counts match the prototype for the same filters
- [x] Empty state buttons change the results

## Phase 5 · Landlord experience
**Prompt**
> Phase 5: implement the Landlord endpoints (summary, properties with draft autosave, photo upload/reorder/cover/delete, submit, availability with Undo, soft delete with restore, inquiries and replies) and build the Landlord dashboard, My properties, the 5-step Add/Edit wizard, Preview and Student inquiries screens to match the prototype. Show room availability and listing status as separate badges. Write a Playwright test for Journey B.

**Done when**
- [x] Journey B passes
- [x] Refreshing the page in the middle of the wizard keeps the draft
- [x] Undo restores availability and deleted listings

## Phase 6 · Administrator experience
**Prompt**
> Phase 6: implement the Admin endpoints and build the Admin dashboard, Listing review (tabs + detail with checklist), Users, Reported properties and Locations screens to match the prototype. All moderation actions need confirmation, required notes where the spec says so, notifications to the landlord and an ActivityLog row. Write a Playwright test for Journey C.

**Done when**
- [ ] Journey C passes
- [ ] An approved listing appears in student search immediately; a removed one disappears and is taken out of students' saved lists

## Phase 7 · Notifications and polish
**Prompt**
> Phase 7: implement the notifications endpoints and wire every event (inquiry received, reply, listing submitted/approved/changes requested/rejected/removed, availability changed on a saved listing, new report). Build the bell dropdown and Notifications page with unread dots, mark-as-read and links to the related item. Build the Help & support page (FAQ accordions, contact form with pick-a-topic chips) and the System states page.

## Phase 8 · Quality, accessibility and HCD review
**Prompt**
> Phase 8: run /hcd-review on every route. Add @axe-core/playwright checks for all routes in light and dark mode, and fix every serious or critical issue. Test at 390px and 1440px widths, so there is no sideways scrolling and no overlapping controls. Check loading, empty and error states on every data view. Then produce docs/hcd-evidence.md: a table of screen, user goal, components, interactions, HCD principle applied, and how it reduces difficulty (like the prototype's HCD notes page), plus screenshots.

## Phase 9 · Deployment
**Prompt**
> Phase 9: prepare for deployment with the web app on Vercel, the api on Render (or Railway) and Postgres on Neon. Add production environment variables, CORS for the web origin, secure cookies (SameSite=None; Secure when the domains differ), Prisma migrate deploy on release, a storage adapter for photos (Cloudinary), and a short DEPLOY.md with step-by-step instructions. Do not deploy anything yourself. Tell me what accounts and keys I need.

---

## Progress log
Claude: after each phase, add a line here with the date, what was done, and anything skipped or changed.

- **2026-11-06, Phase 0 done.** Monorepo (`apps/web`, `apps/api`, `packages/shared`), Docker Postgres 16, ESLint + Prettier, Vitest, Playwright and all root scripts. `GET /api/health` and a temporary home page with loading, "API OK" and error states; Landing replaces it in Phase 4. Lint, typecheck, 9 unit tests and 1 Playwright test pass on Node 22.16.0.
  - **Changed from the docs:** Node 22 instead of 20 (20 is out of support, pinned in `.nvmrc`). Docker Postgres on port 5433 instead of 5432, because a Windows PostgreSQL service uses 5432. CLAUDE.md and README updated.
  - **Version pins:** Prisma 6.19 (Prisma 7 moves the database URL out of `schema.prisma`, which would change docs/02), TypeScript 5.9 (`typescript-eslint` needs < 6.1), ESLint 9 (`eslint-plugin-jsx-a11y` does not support 10; npm marks 9.39 as unsupported, so upgrade when the plugin allows), jsdom 26 (31 needs a newer Node 22).
  - **Added to the proposal:** root `tsconfig.json` (typechecks `e2e`), `vitest` in `packages/shared`, a `format` script, and Prettier in `npm run lint`.
  - **Not verified:** `npm run db:reset`. Prisma blocks AI agents from running it without the user's explicit consent. `db:migrate` and `db:seed` were run and work, with nothing to migrate or seed until Phase 1. Check `db:reset` in Phase 1, where it is a "Done when" item.

- **2026-11-06, Phase 1 done.** Full schema and `init` migration, demo seed in one transaction, bcrypt password hash, and 52 SVG demo photos in `apps/api/uploads/demo/`. Lint, typecheck and 24 unit tests pass on Node 22.16.0. `data.test.ts` runs the prototype's own data block and compares every constant and photo with the seed.
  - **`db:reset`:** Prisma blocks AI agents from running it without explicit consent, so Claude ran it after the user sent the command. It rebuilt the local Docker database with 13 properties (11 approved, 2 pending), 12 users and 52 photos.
  - **Changed from the docs:** enums in `docs/02` are now multi-line, because Prisma rejected the one-line form (formatting only). Accounts total 12, not 11: the prototype's 11 users plus the administrator. That is 4 landlords, including suspended Demo Landlord D, against the spec's 3.
  - **Added beyond the listed constants:** the Demo Student's starting state from `freshState()` (p2 saved, p2 and p4 recently viewed, one search). Its saved filters use the query names from `docs/03-api.md`.
  - **Values not in the prototype:** Landlord D's phone, the administrator's registration date, who resolved report r3 and when, and the recently-viewed times. Approval dates equal submitted dates, except p1 (23 Oct), so the featured query gives p1, p8, p4 like the prototype's Landing page.
  - **Seed behaviour:** `db:seed` refuses to run if the database already has users, and only `db:reset` clears data. Every seeded account uses `demo1234`.

- **2026-11-06, Phase 2 done.** Auth and account API (register, login, logout, me, forgot and reset password, `PATCH /me`, password change, contact preferences), JWT cookie sessions, `requireAuth`, `requireRole`, rate limits, and the Login, Registration, Forgot and Reset screens. Lint, typecheck, 103 unit and API tests and 8 Playwright tests pass on Node 22.16.0. Wrong input was compared live with the prototype in 10 cases and every message matched.
  - **Changed from the docs:** `User.tokenVersion` added (see docs/02). `remember` on login and 429 responses added (see docs/03).
  - **Changed from the prototype:** removed its "Prototype" and "simulated" wording. The login error is now only "The email or password is not correct." Added messages for suspended accounts, expired reset links and too many attempts. Students go to `/student` after registering until Search exists in Phase 4. Terms and Privacy open as an inline notice until the Modal exists in Phase 3. The Terms link, checkbox row and toast buttons are 44px high, not the prototype's 32 to 40px.
  - **Temporary until later phases:** `TempHeader` (Phase 3) and the placeholder dashboards at `/student`, `/landlord` and `/admin` (Phases 4 to 6). `Toast` has no Undo yet, and `ChoiceCards` has no "Selected" state yet (Phase 3). The login form does not yet merge guest lists (Phase 4).
  - **Not built yet:** the Account screens, because Phase 2 only asks for their API. Phase 5 does not list the landlord Account screen (screen 18), so it needs adding there.
  - **Demo accounts:** the buttons appear in development only, unless a build sets `VITE_SHOW_DEMO_ACCOUNTS=true`. A production build was checked and contains neither the buttons nor the password.
  - **Testing:** `npm test` now needs Docker running and uses `urcst_housing_test`, and refuses any database whose name does not end in `_test`. `npm run e2e` needs the seeded demo data.
  - **Bugs found and fixed:** a failed session check caused an endless request loop that also kept removing the form (now a regression test). The API now connects to the database before it starts listening, because the first login otherwise took about 2.2 seconds and failed the browser tests after a cold start. After the fix, 6 cold runs passed 8 of 8 tests.
  - **Phase 9 reminder:** add `trust proxy` for the rate limits, a real mailer, and CSRF protection if cookies move to `SameSite=None`.

- **2026-11-06, Phase 3 built, with one "Done when" item open.** Ported the prototype's tokens, component, layout and accessibility styles, including dark mode. Built `PublicHeader`, `AppShell`, `Trail`, `Footer`, `QuickFind`, `DisplayPanel`, `A11yDock`, `useReader`, `ReaderBar`, `Toast` with Undo, `Modal`, `ConfirmDialog`, `PickGroup`, `ToggleTile`, `Button`, `Badge`, state blocks, `OnThisPage`, `PropertyCard`, route-change focus and announcements, and `/design-system`. Lint and typecheck pass, as do 168 unit tests (api 55, web 97, shared 16) and 35 Playwright tests, which include axe scans with no serious or critical problems on the pages listed below.
  - **Open item:** the Undo button on a toast can be used from the keyboard, but it sits at the end of the page and disappears after 7 seconds, so someone tabbing there may not reach it in time. The Playwright test moves focus to it directly. Needs a decision before Phase 5, which is where real Undo actions start.
  - **Not checked by ear:** headless Chrome has no voices, so tests use a stand-in speech engine. They cover reading order, highlight, controls, speed and pronunciation text, but not the sound itself.
  - **Axe coverage:** `/`, `/design-system` (light, dark, high contrast, dark high contrast), `/login`, `/register`, `/forgot-password`, `/search`, the landlord dashboard, the display panel and Quick find. The full route list is still Phase 8.
  - **Changed from the prototype (see docs/04):** chips and display cards use arrow keys with one Tab stop, and no longer put `aria-pressed` on radios. Header menus are plain open/close panels, not `role="menu"`. One focus trap covers every dialog. `html.dark.hc` is new, because the dark colours overrode high contrast. Each page has its own tab title. The skip link is visible on focus. Every target is at least 44px, including several the prototype made smaller. On phones under 430px the logo text is hidden from view but kept for screen readers, to make room for those targets. Fixed hard-coded colours in dark mode that failed contrast, and the double full stop in the prototype's "Read what I tap" toast.
  - **Changed from the docs:** the Design system page says Listen and Display are in the header on public pages and in a dock on workspace pages, because that is what the prototype does; `docs/04` now says so too. The Terms and Privacy text no longer says "Prototype text".
  - **Temporary until later phases:** `ComingSoonPage` stands in for pages not built yet. Quick find searches pages only until Phase 4 adds neighbourhoods and listings. The student dashboard keeps a Log out button until the Account page exists. The header search and Find Housing menu already link to `/search?...`, and Phase 4 must read those values (`q`, `types`, `maxDistance`, `maxRent` and `availableOnly`, the names in docs/03).
  - **Moved to later phases:** `LandingCard`, `Gallery`, `Lightbox`, `CompareTray` and `SchematicMap` (Phases 4 and 5), and `NotificationBell` with the sidebar and header counts (Phase 7), because they need real data.
  - **Testing:** Playwright's limits rose to 60 seconds per test and 10 seconds per check, because scans are slow while several browsers share one dev server. Added `@axe-core/playwright`.

- **2026-11-06, Phase 3 keyboard gap closed.** When an action taken from the keyboard shows a toast with Undo, focus now moves to Undo, and a screen reader hears what it undoes. The message stays up while focus is on it. Undo, Dismiss and Esc return focus to the control that led there, or to the page title if that control has gone. Focus stays put after mouse or touch actions, while someone is typing in a field, and while a dialog is open. This behaviour is new, not in the prototype.
  - **For Phase 5:** close a confirmation dialog before, or in the same update as, showing its toast with Undo, or focus will stay put. After a row is deleted, focus goes to the page title, so check that this feels right on My properties.
  - **Test stability:** two existing tests had started failing on the last commit too, so neither was caused by this change. `npm run e2e` now uses 3 browsers at once, because the default number timed out while loading pages. Testing Library's wait rose from 1 to 5 seconds, because the first render took longer than that when test files ran in parallel.

- **2026-11-06, Phase 4 done.** Public property and student endpoints, smart search, Landing, Search, Property details, Saved, Compare, Recently viewed, Contact landlord, Student dashboard and Account. Filters live in the address, so a search can be shared or reloaded. Lint, typecheck, 290 unit tests (API 145, web 114, shared 31), 47 Playwright tests and the web build pass.
  - **Done when:** Journey A runs in `e2e/student-journey.spec.ts`. `prototypeParity.test.ts` runs a copy of the prototype's `filterProps` against the API for 20 filter sets. The empty state buttons are covered in Playwright and in `SearchPage.test.tsx`.
  - **Added to docs/03:** `GET /properties?ids=`, `GET /me/saved/ids`, `POST /me/history/restore`.
  - **Agreed changes from the prototype:** the ends of the sliders mean "no limit" (30,000 to 250,000 RWF, 5 km). No "Demonstration" wording: a real "Message sent", Log in or Create an account returning to the same page, and a real prefilled WhatsApp link. Report reasons are chips; Compare's "Add a property…" stays a `<select>`. Notification choices stay off Account until Phase 7.
  - **Other changes from the prototype:** distances always show one decimal ("1.0 km", as CLAUDE.md asks; the prototype shows "1 km"). Filter chips are larger (16px text, 44px tall), so they wrap differently. Neighbourhoods are listed closest first, because `Location` has no display order.
  - **Stays on the device:** landlord and admin hearts, and the compare list for everyone (it clears at logout). A guest's saved list moves into their account when they log in. Guest history stays on the device and is not merged.
  - **For Phase 5:** landlords need an Account page; `/account` is student-only for now. `ContactPage` covers the student side of inquiries only.
  - **Test data:** the Playwright journeys write to the local database, so each run adds an inquiry and saved rows to the Demo Student. `npm run db:reset` puts the demo data back.
  - **Still open:** Read aloud has not been checked by ear (from Phase 3).

- **2026-11-06, Phase 5 done.** Landlord endpoints, draft autosave, photo upload, the 5-step Add/Edit wizard, Preview, Submitted, Dashboard, My properties, Student inquiries and the landlord side of Account. Lint and typecheck pass, as do 329 unit tests (api 178, web 115, shared 36), 53 Playwright tests and the web build.
  - **Done when:** all three items run in `e2e/landlord-journey.spec.ts`. The refresh test covers `/new` and a later step, and refreshes before the delayed autosave has fired.
  - **Added to docs/03:** `GET /landlord/properties/:id`, `POST /landlord/properties/:id/photos/:photoId/restore`, `GET /me/contact-preferences`, and `newInquiries` in the summary for the sidebar counts.
  - **Added to docs/02:** `type`, `locationId` and `distanceKm` can be empty on a draft. `Property.draft` holds unsubmitted answers, and `PropertyPhoto.pendingAdd` and `pendingRemove` hold unsubmitted photo changes. A live listing stays as students see it until Submit, then goes to PENDING.
  - **Changes from the proposal or the prototype:** Account is one role-aware page, not a separate landlord page. Chips replace `.seg` for availability, bathroom and facilities. The map pin also works from the keyboard. "Add 3 demo photos" and "replies are saved here only" are gone, and the server checks each photo's real file type. "5 or more" rooms is stored as 5. Draft rows show under All with a Draft badge and Continue. The trail shows "Edit accommodation" when editing, which the prototype does not cover.
  - **Left for Phase 7:** notifications are not sent, although the Submitted page already says "We'll notify you of the result". The bell, the Notifications count and the Account notification settings are also Phase 7.
  - **Bug found in Phase 4 and fixed:** two filters chosen quickly could lose the first one, which made Journey A fail now and then under load. `SearchPage` now keeps both, with a Playwright test that clicks twice before the page redraws.
  - **Saving on refresh:** the wizard also saves as the page closes. This needs a saved draft, so text typed within half a second of the very first autosave on `/new` can still be lost on refresh.
  - **Test data:** the Playwright journeys add listings, uploaded photos and replies to the demo data, so the demo landlord's screens fill up with test rows. `npm run db:reset` puts the demo data back. No new environment settings, so `.env.example` is unchanged.
  - **Still open:** focus after deleting a row (noted in Phase 3) has only been tested with the mouse, and Read aloud has not been checked by ear.

- **2026-11-07, UI refinement started (branch `ui-refinement`).** This pass deliberately moves away from the prototype's look. Features stay the same.
  - **Main navigation:** regular-weight text, Find Housing and For Landlords open on mouse hover, and hover gives a stronger background.
  - **"You are here" removed from the whole app, as the user decided.** The rule is gone from `CLAUDE.md`, `docs/01` and `docs/04`. The Back link and the workspace label in that row went with it. The prototype still shows the trail.
  - **All styling now goes through Tailwind CSS v4, as the user decided.** Layers run theme, base, components, utilities, and the theme points at `tokens.css`, so dark mode, high contrast and display settings still work. Preflight is left out because `base.css` sets the defaults.
  - **What is where:** the main navigation, landing page, buttons and badges use classes on the element. Patterns repeated across pages are `@utility` rules in `styles/patterns.css`. The other components keep their class names and selectors, with each rule rewritten as `@apply` by script. Those rules can move onto elements as each page is refined.
  - **How it was checked:** the compiled CSS for that scripted step was compared with the previous build, and all 978 selectors have the same values.
  - **Watch out:** a Tailwind class beats anything in the component layer, so an older rule that hides or restyles a converted element stops working. This is why the header buttons showed on phones until `hide-m` was fixed.
