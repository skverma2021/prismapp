# PrismApp Product Delivery Strategy

Status: Draft for execution
Date: 2026-03-30
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

## 4) Suggested Timeline

### Week 1 (Current)
- Contribution backend and capture UX baseline.
- Month-ledger integration.
- Seed and data baseline stabilization.
- Contract and flow documentation.

### Week 2
- Finish contribution correction UI.
- Finish reports UI + CSV flows.
- Contribution UAT and sign-off pack.
- Hardening: retries, messaging, and edge-case handling.

### Week 3
- App shell: home page + navigation + role-aware menus.
- Layout and routing conventions for all modules.
- Design baseline and reusable components.

### Week 4
- Auth Phase 1: credentials login.
- Session management, protected routes, sign-out.
- Role assignment and guard enforcement.

### Week 5
- Master data UI completion and cross-linking.
- Search/filter/pagination consistency.
- Basic audit metadata visibility in UI.

### Week 6
- Auth Phase 2: OAuth and account linking.
- Security hardening pass.
- Maker-checker extension hooks for financial corrections.

### Week 7
- Safety module MVP (checklists + incidents baseline).
- Security module MVP (visitor/incident baseline).

### Week 8
- Events module MVP.
- AI read-only assistant MVP.
- End-to-end regression and release preparation.

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
