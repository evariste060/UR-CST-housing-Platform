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
- [ ] `npm run db:reset` builds the database from scratch with 13 properties (11 approved, 2 pending)
- [ ] Prisma Studio shows the three demo accounts

## Phase 2 · Authentication and roles
**Prompt**
> Phase 2: implement the Auth section of docs/03-api.md (register for student or landlord, login, logout, me, forgot/reset password with a console mailer, PATCH /me, password change, landlord contact preferences). JWT in an httpOnly SameSite=Lax cookie, bcrypt, zod validation from packages/shared, middleware requireAuth and requireRole, rate-limit login and forgot-password. Then build the Login, Registration (role step first) and Forgot/Reset screens in the web app to match the prototype, including the demo-account buttons and the exact validation messages. Add api tests with Supertest.

**Done when**
- [ ] All three demo accounts can log in and land on the right home (student dashboard, landlord dashboard, admin dashboard)
- [ ] A suspended user cannot log in and sees why
- [ ] Wrong input shows the same messages as the prototype

## Phase 3 · Design system, layout and accessibility layer
**Prompt**
> Phase 3: port the design tokens and component styles from reference/prototype.html into apps/web/src/styles, and build the components listed in docs/04-design-system.md. Build PublicHeader (two rows, as on the prototype landing page), AppShell for landlord/admin, Trail, QuickFind (Ctrl+K), DisplayPanel with all preferences including dark mode, the useReader hook and ReaderBar, Toast with Undo, ConfirmDialog, and the route-change focus/announcement. Add a /design-system route that shows every component in every state, like the prototype's Design system page.

**Done when**
- [ ] Every display preference changes every page and survives a reload
- [ ] Listen reads the design-system page and highlights each block
- [ ] Keyboard-only: you can reach and use every control and see where focus is

## Phase 4 · Student experience
**Prompt**
> Phase 4: implement the public Properties and Student endpoints from docs/03-api.md (filters, sorting, pagination, smart search parse, saved, history, inquiries, reports), then build the Landing, Search & filters, Property details, Saved, Compare, Recently viewed & history, Contact landlord, Student dashboard and Account screens to match the prototype. Guests keep saved and compare in localStorage, and they merge into the account at login. Write a Playwright test for Journey A from docs/01-product-spec.md.

**Done when**
- [ ] Journey A passes in Playwright
- [ ] Filter results and counts match the prototype for the same filters
- [ ] Empty state buttons change the results

## Phase 5 · Landlord experience
**Prompt**
> Phase 5: implement the Landlord endpoints (summary, properties with draft autosave, photo upload/reorder/cover/delete, submit, availability with Undo, soft delete with restore, inquiries and replies) and build the Landlord dashboard, My properties, the 5-step Add/Edit wizard, Preview and Student inquiries screens to match the prototype. Show room availability and listing status as separate badges. Write a Playwright test for Journey B.

**Done when**
- [ ] Journey B passes
- [ ] Refreshing the page in the middle of the wizard keeps the draft
- [ ] Undo restores availability and deleted listings

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
