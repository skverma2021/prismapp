# ADR-004: Partial Adjustment Corrections and PENDING Lock Semantics

Status: Accepted (V1 hardening)
Date: 2026-10-23
Owners: Engineering + Product + Finance
Extends: [ADR-001](ADR-001-Data-Immutability-and-Corrections.md)

## Context
1. ADR-001 allows only compensating transactions, and the first implementation could only reverse an original contribution in full (every period negated).
2. A real case exposed the limit: a payment captured after a rate revision was priced at the payment-date rate (accepted policy in Domain-Rules). If the society decides to give part of that amount back, a full reversal and re-post is the only option, and the re-post resolves to the same payment-date rate.
3. Separately, a correction in `PENDING` state already counted in net calculations, so the unit + head + period could be re-posted before a checker approved the reversal (see the Known Gap in ADR-001).

## Decision
1. A correction has a type:
   - `FULL_REVERSAL` (default, previous behavior): negates every detail row of the original.
   - `ADJUSTMENT`: negates an explicit positive amount per period (`adjustments: [{ contributionPeriodId, amount }]`).
2. No new head and no new table. An adjustment is a normal correction row linked by `correctionOfContributionId`, with signed `ContributionDetail.amt`, reason, actor and maker-checker status. `appliedRate` and `appliedRateReference` are copied from the original detail; the original rate lock is not altered.
3. Limits:
   - `amount > 0`, at most 2 decimals, unique per period, period must belong to the original.
   - `amount <=` remaining correctable amount for that period = original amount + all active (POSTED and PENDING) corrections for that original and period.
   - A `FULL_REVERSAL` is allowed only when the original has no active correction. Several adjustments are allowed while the remaining amount stays at or above zero.
   - Correction-of-correction stays forbidden.
4. Two different views of the ledger:
   - Effective (duplicate lock, paid/unpaid matrix, month ledger, report totals): originals and `POSTED` corrections only.
   - Reserved (correction limit): effective plus `PENDING`. `REJECTED` never counts.
5. A PENDING correction does not release the duplicate lock. Only an approved (POSTED) correction that brings the period net to zero allows a re-post. A partial adjustment never releases the lock because the period stays paid for the remaining amount.
6. The correction transaction and the other overlap/duplicate writes run at Serializable isolation through `runSerializable` (ADR-005); the loser of a concurrent conflict is retried automatically and, if conflicts persist, receives a retryable 503.
7. Transaction report: rows still list PENDING and REJECTED corrections (with `correctionStatus`), but `sumAmount` counts effective rows only.

## Why
1. Partial give-backs (rate concessions, partial refunds) are common and must not force a reverse-and-repost at a different rate.
2. A negative contribution head was rejected: it mixes "what is paid for" with "direction", breaks the head-level duplicate rule and reports, and duplicates the correction linkage.
3. Maker-checker is meaningless if the maker can free the period before approval.

## Invariants
1. Net per period (effective rows) is never negative.
2. Original rows are never updated or deleted; all changes are appended.
3. Every adjustment is linked to its original and carries reason, actor and timestamps; creation is audit-logged with `correctionType` and the adjusted amount.

## Consequences
### Positive
- Partial adjustments without schema change or a new head.
- Maker-checker cannot be bypassed through the duplicate lock.

### Trade-offs
- `correctionType` is not stored as a column; it is recorded in the audit payload and inferable from amounts. Add a column only if reporting needs to filter on it.
- Reads that sum details must apply the effective filter (`EFFECTIVE_CONTRIBUTION_WHERE` in `contributions.helpers.ts`).
- The money refund itself happens outside the app; the ledger records that it was owed and why.

## Alternatives Considered
1. Negative contribution head: rejected (see Why).
2. Full reversal plus backdated re-post at the old rate: rejected; it misstates the payment date and bypasses the rate-at-payment policy.
3. Counting PENDING corrections in the lock (previous behavior): rejected; it defeats maker-checker.

## Follow-up
1. If late fees are introduced, model them as a separate positive head, not as an adjustment.
2. Consider a `correctionType` column if reports need filtering by type.
