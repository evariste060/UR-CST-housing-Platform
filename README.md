# UR-CST Student Housing Platform

Starter kit for building the real application with Claude Code. Right now it holds the project brief, the technical design and the approved prototype. The code is written phase by phase, following `docs/05-build-plan.md`.

## What is in here
```
CLAUDE.md                  Project memory that Claude Code reads automatically
docs/01-product-spec.md    Roles, scope, screens, journeys, seed data
docs/02-data-model.md      Prisma database schema
docs/03-api.md             REST endpoints and permissions
docs/04-design-system.md   Tokens, components, accessibility features, copy rules
docs/05-build-plan.md      Phases 0–9 with ready-to-paste prompts and checklists
reference/prototype.html   The approved clickable prototype (open in a browser)
.claude/commands/          Custom commands: /next-phase, /hcd-review, /match-prototype
```

## Before you start (one time)
1. Install **Node.js 20 LTS**, **Git** and **Docker Desktop** (for the local PostgreSQL database).
2. Install Claude Code. Use one of these:
   - macOS / Linux / WSL: `curl -fsSL https://claude.ai/install.sh | bash`
   - Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`
   - Or the VS Code extension "Claude Code" by Anthropic
3. You need a Claude Pro or Max plan, or a Claude Console account, to log in.

## Start building
```bash
cd ur-cst-housing
git init && git add . && git commit -m "Project brief and prototype"
claude
```
Inside Claude Code, type `/next-phase`. Claude reads the docs, tells you which phase is next, proposes the files it will create, and waits for your approval. Approve it, let it build, check the "Done when" list, commit, then run `/next-phase` again.

Useful commands while building:
- `/hcd-review search page`: checks a screen against the HCD and accessibility rules and fixes the issues
- `/match-prototype property details`: compares a built screen with the prototype using screenshots
- `/clear`: starts a fresh conversation before each new phase

## Demo accounts (after Phase 1)
`student@demo.ur`, `landlord@demo.ur`, `admin@demo.ur` with password `demo1234`.
