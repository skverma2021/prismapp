# ADR-001: Data Immutability and Corrections

Status: Accepted (V1)
Date: 2026-03-19
Owners: Engineering + Product + Finance

## Context
Contribution records are financial events and must remain auditable. Domain rules require immutability after posting.

## Decision
1. Posted contribution records are immutable.
2. Contribution details are immutable.
3. Corrections are done only via compensating transactions.
4. Original and compensating records must be linkable for audit.
5. Maker-checker approval is optional in V1 and enabled in a later hardening phase when risk/volume thresholds are met.

## Why
1. Prevent hidden financial changes.
2. Preserve legal and audit trail integrity.
3. Simplify reconciliation and reporting trust.

## Correction Model (V1)

### Allowed
- Add a compensating transaction with negative or positive amount allocation.
- Mark correction reason and reference to original contribution.

### Not Allowed
- In-place update of posted contribution fields.
- Hard delete of posted contribution rows.

## Minimal Data Requirements for Correction
- `originalContributionId`
- `correctionContributionId`
- `reasonCode`
- `reasonText`
- `createdBy`
- `createdAt`

## Invariants
1. Sum of details for each contribution remains internally consistent.
2. Net effect is computed by aggregation; original rows are preserved.
3. Reports must include both original and compensating entries unless explicitly filtered.

## Operational Notes
1. Use server-side transactions for correction creation.
2. Authorization check required before correction action.
3. All correction actions are audit-logged.

## Approval Model (Phased)

### V1 (Current)
1. Single-step correction is allowed for authorized Society Admin/Manager users.
2. Every correction must capture reason code/text and full audit metadata.

### V2+ (Hardening)
1. Introduce maker-checker workflow for selected or all correction scenarios.
2. Maker submits correction request; checker approves/rejects before posting.
3. Maker and checker must be different users.

## Maker-Checker Rollout Triggers
Enable maker-checker when one or more of the following is true:
1. Monthly correction count crosses agreed threshold.
2. Per-correction amount crosses agreed financial threshold.
3. Compliance/audit policy explicitly requires dual approval.
4. Fraud-risk incidents indicate need for separation of duties.

## Implementation Notes for Maker-Checker
1. Keep correction records append-only; approvals change request status, not posted financial history.
2. Maintain explicit status lifecycle: `PENDING`, `APPROVED`, `REJECTED`, `POSTED`.
3. Persist maker/checker identity and timestamps.
4. Reports should show approval status for transparency.

## Known Gap: PENDING Corrections Release the Duplicate Lock (Resolved by ADR-004)

Observed: 2026-10-22 (Nalanda / unit 1001, maintenance). Resolved: 2026-10-23, see [ADR-004](ADR-004-Partial-Adjustment-Corrections.md).

Behavior (before the fix):
1. A correction is created with its negative detail rows immediately, even when `correctionStatus = PENDING`.
2. `ensureNoDuplicateContribution` netted all detail rows for unit + head + period without looking at `correctionStatus`.
3. Result: a PENDING (not yet approved) correction already made the net zero, so the same periods could be re-posted before a checker approved the reversal.

Risks:
1. If the correction is later REJECTED, the original and the re-post both remain, so the period is double-charged.
2. The maker can reverse and re-post without the checker's approval, which defeats the purpose of maker-checker.

Reporting had the same exposure: net/paid-unpaid aggregations treated PENDING reversals as effective.

Decision (implemented in ADR-004):
1. Duplicate check, month ledger, paid/unpaid matrix and transaction-report totals count a correction's detail rows only when `correctionStatus` is `POSTED` (originals have a null status).
2. PENDING corrections do not release the lock; REJECTED corrections never count.
3. The transactions report still lists PENDING and REJECTED corrections and shows their status.
4. Tests: PENDING correction on period X, then re-post of X returns `409 CONFLICT`; after approval, re-post succeeds (`scripts/test-contributions-api.mjs`).

Partial `ADJUSTMENT` corrections are also allowed; see ADR-004. In the Correction Model above, "Allowed" therefore includes both full reversal and partial adjustment.

## Consequences

### Positive
- Strong auditability.
- Safer horizontal scaling because writes are append-oriented.
- Easier forensic analysis and rollback reasoning.

### Trade-offs
- More records to manage.
- Reporting must handle net calculations.

## Alternatives Considered
1. Allow updates with history table: rejected for higher complexity and higher risk of accidental mutation.
2. Soft delete and reinsert: rejected because it obscures transaction truth.

## Follow-up Tasks
1. Add DB relation for correction linkage.
2. Add API endpoint/server action for compensating transaction.
3. Add report column indicating correction status and linked original ID.

## Reusable Template Notes
For other projects, ADR format can stay the same:
- Context
- Decision
- Why
- Invariants
- Consequences
- Alternatives
- Follow-up
