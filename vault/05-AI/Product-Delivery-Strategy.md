# PrismApp Product Delivery Strategy

Status: Active — Contribution Module Hardening
Date: 2026-05-07
Owner: Product + Engineering

## 1) Objective

Deliver a production-ready modular society management app from zero baseline with these near-term priorities:
- Complete Contribution Module by end of Week 2.
- Establish platform shell: home page, navigation, authentication, and master data CRUD baseline.
- Keep architecture ready for Safety, Security, Events, and AI features without rework.

## 2) Guiding Principles

1. Modular monolith first.
2. Business rules server-side and deterministic.
3. Financial writes append-only and auditable.
4. Scope control: finish one vertical slice before broad expansion.
5. Contract-first delivery for every new module.

## 3) Workstreams (Parallel Tracks)

### A) Platform Foundation
- Home page with role-aware entry cards.
- Dashboard layout with top nav + left menu.
- Global error/loading/empty states.
- Shared table, filter bar, and form shell components.

### B) Authentication and Authorization
- Phase 1: Auth.js (NextAuth) email + password credentials flow.
- Phase 2: OAuth providers (Google/Microsoft) and account linking.
- Role mapping to SOCIETY_ADMIN / MANAGER / READ_ONLY.
- Route-level and action-level guards.

### C) Master Data CRUD
- Blocks
- Units
- Individuals
- Ownerships
- Residencies
- Contribution Heads / Rates / Periods

### D) Contributions Domain
- Capture UI + correction UI + reports UI.
- Month ledger UX and deterministic amount derivation.
- Duplicate prevention and immutability enforcement.

### E) Future Modules Foundation
- Shared policy and audit middleware reusable by Safety/Security/Events.
- Shared notification hooks (deferred implementation).
- Shared feature flags for phased rollouts.

### F) AI Feature Track (Post Core Modules)
- Start with read-only assistant for FAQ and report explanations.
- Phase into user-action suggestions after audit and guardrails mature.

## 4) Delivery Status (as of 2026-05-07)

> The original Week 1–8 timeline is retired. Phases below map to `AGENTS.md` §6 and `Track-A-TODO.md`.

### Phase 0 — Foundation ✅ Complete
- Prisma schema, PostgreSQL, migrations, seed data (Nalanda / Vaishali / Rajgir blocks, ~3,958 units).
- Zod validation utilities, shared error envelope (`ApiEnvelope<T>`), pagination helpers.
- Vercel preview + production deployments established.

### Phase 1 — Core Master Data ✅ Complete
- CRUD for Blocks, Units, Individuals, Ownerships, Residencies.
- Temporal overlap prevention for ownership and residency.
- Auth Phase 1: credentials login, JWT session, role guards (`SOCIETY_ADMIN` / `MANAGER` / `READ_ONLY`).
- Home page, dashboard shell, navigation, shared UI components.

### Phase 2 — Contributions ✅ Complete (Hardening in Progress)
- Contribution heads, rates, periods, payment capture.
- Duplicate prevention per unit + head + period.
- Financial immutability; correction flow with compensating transactions.
- Month-ledger UX, paid/unpaid matrix, CSV export.
- Reports: contribution reports with filters, pagination, and totals.
- Maker-checker extension hooks: schema fields, `MAKER_CHECKER_ENABLED` flag, migration. Approval UI deferred to hardening trigger.

### Phase 3 — Hardening 🔄 In Progress
Key remaining items (from `vault/06-Tracks/Track-A-TODO.md`):
1. **5.6** — Fix `/api/units/lookups` performance (3.1s regression — `include: { block: true }` on 3,958 rows).
2. **1.9** — Rate-period coverage policy: decide and document or guard.
3. **7.4 / 7.3 / 7.5** — Testing infrastructure: Vitest unit tests, seed-independent regression scripts, CI pipeline.
4. **2.7 / 8.9** — Security: OWASP Top 10 gap review, rate limiting on `/api/auth/*`.
5. **4.6 / 3.6** — Observability: Sentry integration, audit log admin view.
6. **8.5** — Resolve `DATABASE_URL` SSL warning semantics.
7. **2.6** — Auth Phase 2: OAuth providers (Google/Microsoft). Deferred; still not started.

**Hardening definition of done:** All Phase 3 checklist gates in `AGENTS.md` §9 pass.

### Phase 4 — CMM ⬜ Planned
Starts only after Phase 3 production-grade gate.
- Domain: fully specced — `vault/CMM/cmm-vision.md`, `vault/01-Domain/Domain-Rules.md` §CM rules, `vault/01-Domain/ERD.md`, `vault/01-Domain/Entities.md`.
- Sprint 0: Prisma schema (CMM entities), seed data (categories + priorities), API skeleton.
- Ref: `AGENTS.md` §10 Scope Control.

## 5) Authentication Strategy (Two-Phase)

### Phase 1: Credentials (Email + Password)
1. Auth.js credentials provider.
2. Password hashing and reset flow baseline.
3. User-role table and role claims in session token.
4. Route groups protected by role guards.

### Phase 2: OAuth
1. Add Google and/or Microsoft provider.
2. Account linking with existing credential accounts.
3. Enforce role mapping post first login.
4. Keep existing credentials flow as fallback.

## 6) Architecture and Repo Conventions

1. app/(dashboard)/... for UI modules.
2. app/api/... for route handlers.
3. src/modules/<domain>/... for domain services and schema parsing.
4. src/lib/... for shared infra (db, authz, response envelope).
5. vault/... as canonical planning and policy source.

## 7) Quality Gates per Increment

1. npm run lint
2. npm run build
3. API sanity tests for changed endpoints
4. Seed reproducibility check for master defaults
5. Manual smoke test notes in vault

## 8) Risks and Mitigations

1. Data clutter in seeded/test heads can confuse operators.
   - Mitigation: default operational filtering in UI.
2. Auth retrofitting late can cause route churn.
   - Mitigation: install app shell + guard contract before broad UI expansion.
3. Financial rule regressions.
   - Mitigation: maintain contract docs and targeted API regression scripts.
4. Scope creep from future modules.
   - Mitigation: strict stage gates; no cross-module implementation before prior sign-off.

## 9) Definition of Ready (New Module)

1. Domain rules documented.
2. API contract documented.
3. Role behavior documented.
4. Seed/test data strategy documented.
5. Acceptance checklist defined.

## 10) Definition of Done (Module)

1. API + UI complete for agreed scope.
2. Validation and error handling aligned with shared envelope.
3. Lint/build/tests pass.
4. UAT checklist completed.
5. Vault docs updated.
