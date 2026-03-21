# AGENTS.md - AI Delivery Roadmap for PrismApp

## 1) Mission
Build a working, production-ready Society Management app for the current scope:
- Block management
- Unit management
- Owner management
- Resident management
- Contribution management (heads, rates, periods, payments, reports)

The app must remain simple now, but should be structured so future modules can be added without rework:
- Security
- Safety
- Events and common-space bookings

Stack target:
- Next.js App Router (current project version)
- Prisma ORM
- PostgreSQL
- Vercel deployment

## 2) Non-Negotiable AI Rules
1. This project uses modern Next.js. Do not assume old patterns.
2. Before changing framework-sensitive code, read relevant local docs in `node_modules/next/dist/docs/`.
3. Prefer App Router, Server Components, Route Handlers, and Server Actions where appropriate.
4. Keep business rules server-side and deterministic.
5. Never bypass domain constraints defined in [`vault/01-Domain/Domain-Rules.md`](vault/01-Domain/Domain-Rules.md).
6. Keep the implementation simple: no speculative abstractions, no premature microservices.

## 3) Source of Truth Priority
When specs conflict, use this order:
1. [`vault/01-Domain/Domain-Rules.md`](vault/01-Domain/Domain-Rules.md)
2. [`vault/01-Domain/ERD.md`](vault/01-Domain/ERD.md)
3. [`vault/01-Domain/Entities.md.md`](vault/01-Domain/Entities.md.md)
4. [`vault/03-API/API-Spec.md`](vault/03-API/API-Spec.md)
5. [`vault/00-Core/System-Overview.md`](vault/00-Core/System-Overview.md)

If unresolved ambiguity remains, write an ADR note in [`vault/00-Core/`](vault/00-Core/) and proceed with the smallest reversible decision.

## 4) Current Vault Status (Read This First)
The vault is a strong domain baseline, but not sufficient by itself for full delivery.

What is already good:
- Core entities are defined in [`vault/01-Domain/Entities.md.md`](vault/01-Domain/Entities.md.md) and [`vault/01-Domain/ERD.md`](vault/01-Domain/ERD.md).
- Temporal ownership and residency rules are defined in [`vault/01-Domain/Domain-Rules.md`](vault/01-Domain/Domain-Rules.md).
- Contribution rules and immutability expectations are clear in [`vault/01-Domain/Domain-Rules.md`](vault/01-Domain/Domain-Rules.md).
- Basic API direction exists in [`vault/03-API/API-Spec.md`](vault/03-API/API-Spec.md).

What is missing for implementation readiness:
- Explicit user roles and permissions (admin, manager, read-only, etc.). Reference: [`vault/00-Core/Roles-and-Permissions.md`](vault/00-Core/Roles-and-Permissions.md).
- Authentication and authorization approach.
- Final API contracts (request and response DTOs, error model, pagination, sorting). References: [`vault/03-API/Error-Model.md`](vault/03-API/Error-Model.md), [`vault/03-API/Pagination-and-Filtering.md`](vault/03-API/Pagination-and-Filtering.md).
- Reporting definitions (exact columns, filters, totals). Reference: [`vault/04-Reports/Contribution-Reports.md`](vault/04-Reports/Contribution-Reports.md).
- Seed strategy for master data and sample records.
- NFRs: auditability, performance targets, retention, backup expectations.
- Multi-user concurrency behavior for conflicting edits.

Conclusion: enough to start and deliver V1, but missing details must be captured during sprint 0 and sprint 1.

## 5) Architecture Baseline (Simple + Scalable)
Use a modular monolith with clean boundaries. Avoid distributed complexity.

Suggested folder direction:
- `app/(dashboard)/*` for UI routes
- `app/api/*` for route handlers
- `src/modules/<domain>/` for domain services and validators
- `src/lib/db.ts` for Prisma singleton
- `prisma/schema.prisma` and `prisma/seed.mjs`

Horizontal scaling principles:
- Stateless application servers (required on Vercel)
- PostgreSQL as shared durable state
- No in-memory session/state assumptions
- Use idempotent write patterns for financial mutations
- Add unique constraints for duplicate-payment protection

## 6) Delivery Roadmap

### Phase 0 - Foundation
1. Configure Prisma + PostgreSQL.
2. Implement schema from ERD with constraints and indexes.
3. Add seed data for blocks, genders, contribution heads, periods.
4. Add shared validation (Zod) and error utilities.
5. Stand up Vercel preview deployment.

References:
- [`vault/01-Domain/ERD.md`](vault/01-Domain/ERD.md)
- [`vault/01-Domain/Domain-Rules.md`](vault/01-Domain/Domain-Rules.md)
- [`vault/03-API/Error-Model.md`](vault/03-API/Error-Model.md)

Definition of done:
- `npm run lint` passes.
- `npm run build` passes.
- `prisma migrate` and `prisma db seed` are reproducible.

### Phase 1 - Core Master Data
1. CRUD for blocks and units.
2. CRUD for individuals.
3. Ownership timeline management with overlap prevention.
4. Residency timeline management with overlap prevention.

References:
- [`vault/01-Domain/Entities.md.md`](vault/01-Domain/Entities.md.md)
- [`vault/01-Domain/Domain-Rules.md`](vault/01-Domain/Domain-Rules.md)
- [`vault/00-Core/Roles-and-Permissions.md`](vault/00-Core/Roles-and-Permissions.md)

Definition of done:
- Domain constraints enforced server-side.
- Basic list/filter/search available.
- E2E happy-path checks for each module.

### Phase 2 - Contributions
1. Contribution heads and rates management (rate history).
2. Contribution period handling (current-year constraints).
3. Record contribution with immutable details.
4. Duplicate payment prevention by unit + head + period.
5. Reports: paid/unpaid matrix and transaction list.

References:
- [`vault/01-Domain/Domain-Rules.md`](vault/01-Domain/Domain-Rules.md)
- [`vault/03-API/API-Spec.md`](vault/03-API/API-Spec.md)
- [`vault/03-API/Pagination-and-Filtering.md`](vault/03-API/Pagination-and-Filtering.md)
- [`vault/04-Reports/Contribution-Reports.md`](vault/04-Reports/Contribution-Reports.md)
- [`vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`](vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md)

Definition of done:
- Amount derivation is deterministic.
- No direct edit/delete of finalized contribution entries.
- Compensating transaction flow exists for correction.

### Phase 3 - Hardening
1. AuthN/AuthZ integration.
2. Audit logging for financial writes.
3. Performance pass (query indexes, pagination).
4. Observability baseline (error tracking and request tracing).

References:
- [`vault/00-Core/Roles-and-Permissions.md`](vault/00-Core/Roles-and-Permissions.md)
- [`vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`](vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md)

## 7) Data Integrity Requirements
Implement all of the following in Prisma schema and service logic:
1. Unique: individual email, individual mobile.
2. Unique-within-block: unit description + block.
3. Ownership overlap prevention per unit.
4. Residency overlap prevention per unit.
5. Contribution duplicate prevention per unit/head/period.
6. Financial immutability (no in-place mutation of posted contributions).

Where database-native constraints are hard (temporal overlap), enforce in serializable transaction logic with explicit checks.

## 8) Coding Process for AI Agents
For every task:
1. Read relevant `vault/*` documents.
Key references:
- [`vault/01-Domain/Domain-Rules.md`](vault/01-Domain/Domain-Rules.md)
- [`vault/01-Domain/ERD.md`](vault/01-Domain/ERD.md)
- [`vault/01-Domain/Entities.md.md`](vault/01-Domain/Entities.md.md)
- [`vault/03-API/API-Spec.md`](vault/03-API/API-Spec.md)
- [`vault/03-API/Error-Model.md`](vault/03-API/Error-Model.md)
- [`vault/03-API/Pagination-and-Filtering.md`](vault/03-API/Pagination-and-Filtering.md)
- [`vault/04-Reports/Contribution-Reports.md`](vault/04-Reports/Contribution-Reports.md)
- [`vault/00-Core/Roles-and-Permissions.md`](vault/00-Core/Roles-and-Permissions.md)
- [`vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`](vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md)
2. Read relevant Next.js local docs in `node_modules/next/dist/docs/`.
3. Propose smallest change that satisfies the requirement.
4. Implement with tests where feasible.
5. Run lint and build.
6. Summarize what changed, what assumptions were made, and what remains.

Do not introduce new dependencies unless the gain is clear and immediate.

## 9) Quality Gates
Minimum checks before considering a task complete:
1. `npm run lint`
2. `npm run build`
3. Prisma migration applies cleanly to an empty database
4. Seed script runs successfully
5. Manual smoke test of modified user flow

## 10) Scope Control
In current implementation cycles, reject or defer:
- Event workflows
- Security incident workflows
- Safety checklist workflows
- Complex notification engines

Capture these as backlog items in `vault/` without polluting V1 architecture.

Suggested backlog anchors:
- [`vault/00-Core/System-Overview.md`](vault/00-Core/System-Overview.md)
- [`vault/00-Core/Glossary.md`](vault/00-Core/Glossary.md)

## 11) Follow-Up Specs in Vault (Now Available)
Use these documents as active references:
1. [`vault/00-Core/Roles-and-Permissions.md`](vault/00-Core/Roles-and-Permissions.md)
2. [`vault/03-API/Error-Model.md`](vault/03-API/Error-Model.md)
3. [`vault/03-API/Pagination-and-Filtering.md`](vault/03-API/Pagination-and-Filtering.md)
4. [`vault/04-Reports/Contribution-Reports.md`](vault/04-Reports/Contribution-Reports.md)
5. [`vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`](vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md)
6. [`vault/00-Core/Template-Usage-Guide.md`](vault/00-Core/Template-Usage-Guide.md)

Canonical policy notes (V1):
1. Authorization and role behavior, including payment actor model and payment capture flow, are defined in [`vault/00-Core/Roles-and-Permissions.md`](vault/00-Core/Roles-and-Permissions.md).
2. Authorization error mapping (`401` vs `403`) and PII masking/visibility behavior are defined in [`vault/03-API/Error-Model.md`](vault/03-API/Error-Model.md).
3. Financial correction approval policy is phased: V1 single-step; maker-checker in hardening based on risk/volume triggers, defined in [`vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`](vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md).

These close the largest delivery gaps without over-documenting and can be reused as templates in future projects.

## 12) Implementation Checklist (Policy to Code)
Use this checklist during implementation and code review.

### AuthN/AuthZ and Roles
References:
- [`vault/00-Core/Roles-and-Permissions.md`](vault/00-Core/Roles-and-Permissions.md)
- [`vault/03-API/Error-Model.md`](vault/03-API/Error-Model.md)

Checklist:
1. Add server-side role guard utility used by all mutations.
2. Enforce role checks in Server Actions and Route Handlers before business logic.
3. Ensure direct API calls without auth return `401` and insufficient role returns `403`.
4. Keep UI gating aligned with backend rules, but never rely on UI-only enforcement.

### Payment Capture and Domain Validation
References:
- [`vault/00-Core/Roles-and-Permissions.md`](vault/00-Core/Roles-and-Permissions.md)
- [`vault/01-Domain/Domain-Rules.md`](vault/01-Domain/Domain-Rules.md)

Checklist:
1. Record payer identity in `depositedBy` (must reference a valid individual).
2. Record operator identity (`actorUserId`, `actorRole`) via audit logging.
3. Validate duplicate protection for unit + head + period before write.
4. Validate period constraints (current-year and monthly/yearly rules).
5. Lock rate at payment time and persist derived values.

### Error Handling and API Contract
References:
- [`vault/03-API/Error-Model.md`](vault/03-API/Error-Model.md)
- [`vault/03-API/Pagination-and-Filtering.md`](vault/03-API/Pagination-and-Filtering.md)

Checklist:
1. Use one shared error envelope for all APIs/actions.
2. Map domain violations to stable codes (`CONFLICT`, `PRECONDITION_FAILED`, etc.).
3. Implement consistent pagination/filter/sort parsing with validation.
4. Mask PII for allowed read-only views; do not leak unmasked sensitive fields.

### Financial Immutability and Corrections
References:
- [`vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`](vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md)
- [`vault/01-Domain/Domain-Rules.md`](vault/01-Domain/Domain-Rules.md)

Checklist:
1. Prevent in-place update/delete of posted contribution records.
2. Implement compensating transaction flow with linkage to original record.
3. Persist correction metadata (reason, actor, timestamps).
4. Keep writes append-only and transaction-safe.
5. Plan maker-checker workflow flags as hardening-ready extension points.

### Reporting and Data Access
References:
- [`vault/04-Reports/Contribution-Reports.md`](vault/04-Reports/Contribution-Reports.md)
- [`vault/03-API/Pagination-and-Filtering.md`](vault/03-API/Pagination-and-Filtering.md)

Checklist:
1. Implement paid/unpaid matrix and transaction list with required filters.
2. Ensure totals are deterministic and testable.
3. Add CSV export with filter echo and generation metadata.
4. Add indexes for common report filters and sort fields.

## 13) Definition of Success for V1
V1 is successful when:
1. A society admin can manage blocks, units, individuals, owners, and residents.
2. Contributions can be recorded safely and reported accurately.
3. Financial records are immutable and auditable.
4. The app deploys and runs on Vercel with PostgreSQL.
5. The architecture remains simple, modular, and ready for future modules.
