# UR-CST Student Housing Platform

A web app that helps University of Rwanda, College of Science and Technology (UR-CST) students find accommodation near campus in Kigali. Students search, filter, save, compare and contact landlords. Landlords publish and manage listings. Administrators review listings, handle reports and manage users and locations.

This is a Human-Centered Design (HCD) university project by NKURUNZIZA Evariste. Usability and accessibility matter as much as features.

## Read these first
- `docs/01-product-spec.md`: roles, MVP scope, screens, user journeys, acceptance criteria
- `docs/02-data-model.md`: Prisma schema (source of truth for the database)
- `docs/03-api.md`: REST endpoints, request/response shapes, permissions
- `docs/04-design-system.md`: tokens, components, accessibility features, UX copy rules
- `docs/05-build-plan.md`: phases in order; build one phase at a time
- `reference/prototype.html`: the approved, fully clickable prototype. Open it in a browser. **Match its layout, wording, states and behaviour.** When the docs and the prototype disagree, follow the docs and mention the difference.

## Stack
- Monorepo with npm workspaces
  - `apps/web`: React 18 + TypeScript + Vite, React Router, TanStack Query, Tailwind CSS v4 on top of the CSS variables in `apps/web/src/styles/tokens.css`. No component library.
  - `apps/api`: Node.js 22 + Express + TypeScript, Prisma ORM, PostgreSQL 16
  - `packages/shared`: zod schemas and TypeScript types shared by web and api (filters, DTOs, enums)
- Auth: email + password (bcrypt), session as a signed JWT in an httpOnly, SameSite=Lax cookie. Roles: STUDENT, LANDLORD, ADMIN.
- Photos: multer upload to `apps/api/uploads` in development, behind a small `storage` interface so it can move to Cloudinary or S3 later.
- Email: `mailer` interface that logs to the console in development (password reset links).
- Tests: Vitest (+ Supertest for api, Testing Library for web), Playwright for end-to-end journeys, `@axe-core/playwright` for accessibility.
- Local database: `docker compose up -d db` (Postgres on port 5433, set by `DB_PORT`, because a Windows PostgreSQL service may already use 5432).

## Commands (create them in Phase 0 and keep them working)
- `npm run dev`: api on :4000 and web on :5173 together
- `npm run db:migrate` / `npm run db:seed` / `npm run db:reset`
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run e2e`

## Rules for working in this repo
- Build **one phase at a time** from `docs/05-build-plan.md`. Before coding a phase, list the files you will create or change and wait for approval.
- After each phase: run lint, typecheck and tests, fix failures, then update the phase checklist in `docs/05-build-plan.md` (tick what is done, note anything skipped).
- Validate all input on the server with the zod schemas from `packages/shared`. Never trust the client for role or ownership checks.
- Every list endpoint is paginated (`?page=&pageSize=`, default 20, max 50).
- Money is whole RWF stored as `Int`. Distances are km with one decimal.
- Keep secrets in `.env` (never commit it). Keep `.env.example` up to date.
- Small, focused commits with clear messages.
- Style with Tailwind classes. The older CSS in `apps/web/src/styles` is being replaced page by page: when a page moves to Tailwind, delete its old rules. Do not add new rules to those files. Use theme colours from `styles/index.css`, not Tailwind's default palette, so dark mode and high contrast keep working.

## Product rules that must never break
- **Availability and admin approval are different things.** `availability` (AVAILABLE / OCCUPIED) is set by the landlord. `reviewStatus` (PENDING / APPROVED / CHANGES_REQUESTED / REJECTED / REMOVED) is set by an admin. Always show them as two separate badges.
- Students only ever see listings with `reviewStatus = APPROVED` and not soft-deleted.
- Never label a listing "verified". Use "Approved by admin" and explain it does not confirm today's availability.
- Saving a property never reserves it. Say so: "Saved to your list. This does not reserve the room."
- No rent payment, booking confirmation or contracts in the MVP.
- Compare: 2 to 4 properties. At 5, show "You can compare up to four properties at a time."
- Editing an approved listing sends it back to PENDING.
- A location cannot be removed while listings use it.
- Every important action gives feedback (toast or inline message). Destructive or moderation actions ask for confirmation. Availability changes and deletions offer Undo.

## Accessibility and HCD requirements (apply on every screen)
- Body text at least 16px; text contrast at least 4.5:1; never show status with colour alone (icon + word).
- Touch targets at least 44 × 44px; visible keyboard focus; every control has a label.
- The active nav item is highlighted on every page.
- Prefer visible pick-one chips and cards over dropdowns and free typing. The selected option looks clearly different (solid blue + tick) and each group shows "Selected: …".
- Display settings (font, text size, line spacing, contrast, highlight, light/dark) and Read aloud (Web Speech API) work on every page. See `docs/04-design-system.md`.
- Empty, loading, error and success states exist for every data view.
- Write UI text in plain English from the user's side. Errors say what went wrong and how to fix it.
