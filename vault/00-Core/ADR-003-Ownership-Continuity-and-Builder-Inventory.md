# ADR-003: Ownership Continuity and Builder Inventory

Status: In Implementation on `preview/ownership-continuity`
Date: 2026-04-07
Owners: Engineering + Product

## Context
The current ownership model prevents overlap and keeps one active owner, but it does not fully encode the real-world rule that a unit must never be ownerless once it comes into existence. In practice, each unit begins in builder inventory and then moves through a continuous chain of owners without gaps.

Today the model has two missing anchors:
1. Units do not have a business-effective inception date.
2. The initial builder-held ownership is not represented explicitly.

Without those anchors, the app can satisfy "one active owner" while still allowing historical gaps before the current owner or between prior owners.

## Decision
Adopt a builder-based ownership continuity invariant for all units.

### Domain Additions
1. Add `Units.inceptionDt` as the business-effective date from which ownership continuity is enforced.
2. Represent unsold builder inventory using one system-generated Individual identity tagged as `BUILDER_INVENTORY`.
3. Extend Individuals with:
   - `isSystemIdentity` boolean
   - `systemTag` nullable unique string

### Ownership Invariant
For every Unit:
1. Ownership history must begin on `Units.inceptionDt`.
2. The first ownership row must start exactly on `Units.inceptionDt`.
3. If no natural person owned the unit on `Units.inceptionDt`, the first row belongs to `BUILDER_INVENTORY`.
4. Ownership rows may not overlap.
5. Ownership rows may not have gaps.
6. Under current date-only UI semantics, continuity means:
   - `next.fromDt = previous.toDt + 1 day`
7. Exactly one ownership row must remain active at all times, represented by `toDt = NULL`.

### Operational Model
1. Creating a Unit automatically creates its initial active ownership row for `BUILDER_INVENTORY` starting on `inceptionDt`.
2. Normal ownership change uses the transfer flow, which closes the prior active row on the day before the next row starts.
3. Direct ownership create, edit, and delete actions are no longer the primary operator workflow once continuity is enforced.
4. Historical repair or backfill remains a controlled admin-only or script-driven operation and must still satisfy the continuity invariant.

## Why
1. Matches the actual society lifecycle: every unit is owned from inception onward.
2. Removes ambiguous ownerless periods from reports and downstream logic.
3. Makes transfer semantics deterministic.
4. Keeps contribution logic future-safe if ownership-linked rules are added later.

## Consequences

### Positive
1. Ownership history becomes complete and auditable.
2. Unit creation has a deterministic initial state.
3. Active-owner lookup remains simple while historical correctness improves.

### Trade-offs
1. Unit creation requires an inception date.
2. Existing data needs backfill and repair.
3. Ownership UI becomes more constrained because unrestricted CRUD conflicts with continuity.

## Rollout Plan

### 1. Schema
1. Add `Unit.inceptionDt`.
2. Add `Individual.isSystemIdentity` with default `false`.
3. Add `Individual.systemTag` nullable unique.

### 2. Seed + Backfill
1. Seed one `BUILDER_INVENTORY` individual.
2. Backfill `Unit.inceptionDt`:
   - use earliest ownership `fromDt` where available
   - otherwise use the unit creation date for V1 fallback
3. For units with no ownership rows, create one builder ownership starting on `inceptionDt`.
4. For units whose first ownership starts after `inceptionDt`, insert a builder ownership row covering the missing opening span.
5. Current branch implementation also fills trailing uncovered ownership spans with builder inventory so every unit retains one active owner after backfill.
6. For units with broken overlaps, stop rollout and repair explicitly before enabling the invariant in operator flows.

### 3. Service Layer
1. Add a shared ownership continuity validator that checks:
   - first row starts on `inceptionDt`
   - no overlaps
   - no gaps
   - one active row
2. Update unit creation to create builder ownership in the same transaction.
3. Update transfer service to preserve continuity using adjacent dates.
4. Restrict direct ownership mutations or route them through continuity validation.

### 4. API + UI
1. Units create API must accept `inceptionDt`.
2. Units UI must collect `inceptionDt`.
3. Ownership UI should pivot toward:
   - timeline viewing
   - transfer flow
   - limited admin repair only if still exposed
4. System identities must be hidden from resident and payer pickers, and hidden from normal individual browsing unless an admin maintenance view is added.

### 5. Tests
1. Unit creation seeds builder ownership automatically.
2. Transfer preserves continuity with no gap.
3. Overlap attempts fail.
4. Gap-creating edits fail.
5. Builder identity is excluded from ordinary people pickers.
6. Backfill script produces one active owner for every unit.

## Branch Scope for Next Implementation
1. Prisma schema + migration for `inceptionDt`, `isSystemIdentity`, and `systemTag`.
2. Seed/backfill script for builder ownership bootstrap.
3. Ownership continuity validator in the ownership module.
4. Unit create flow update to capture `inceptionDt` and auto-create builder ownership.
5. Ownership UI simplification toward transfer-first behavior.
6. Regression coverage for ownership continuity and builder identity filtering.

## Out of Scope for This Slice
1. Multi-builder or developer-company modeling.
2. Joint ownership.
3. Legal-entity owner master beyond the builder inventory identity.