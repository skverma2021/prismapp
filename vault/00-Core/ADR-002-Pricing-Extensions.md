# ADR-002: Non-Linear Pricing Extension Model

Status: Proposed (Phase-2, not implemented)
Date: 2026-03-26

## Context
V1 pricing is linear and deterministic:
- per-period amount = quantity x applicableRate
- total payable = per-period amount x periodCount

This works for current heads, but future requirements may include:
- tiered pricing
- discounts
- waivers
- surcharges

We want these capabilities without breaking V1 reports, audit trails, or immutability.

## Decision
Keep contribution posting grain at `contribution_details` and add pricing extensions at detail level.

### Contribution-level additions (optional metadata)
1. `pricingModelVersion` (integer, nullable): pricing policy version used at posting time.
2. `pricingNotes` (text, nullable): optional human summary for finance/audit context.

### ContributionDetail-level additions (authoritative amounts)
1. `baseAmount` decimal(12,2), nullable
- amount before adjustments for this period row.

2. `discountAmount` decimal(12,2), nullable default 0
- total discount applied to this row.

3. `waiverAmount` decimal(12,2), nullable default 0
- waived amount applied to this row.

4. `surchargeAmount` decimal(12,2), nullable default 0
- extra charges applied to this row.

5. `netAmount` decimal(12,2), nullable
- final payable amount for this row after adjustments.

6. `pricingMode` varchar(32), nullable
- expected values: `LINEAR`, `TIERED`, `DISCOUNTED`, `WAIVED`, `CUSTOM`.

7. `pricingBreakdownJson` jsonb, nullable
- machine-readable detail of how the row amount was computed.

## Amount Semantics
- V1 existing field `amt` remains the posted row amount used by reports.
- During transition, write both:
  - `amt` (authoritative posted amount)
  - extension fields (`baseAmount`, adjustments, `netAmount`)
- If `netAmount` is present, it must equal `amt`.

Formula invariant per row:

`netAmount = baseAmount - discountAmount - waiverAmount + surchargeAmount`

and

`amt = netAmount`

## Why Detail-Level (not only parent Contribution)
1. Posting grain is period-based today.
2. Different months may need different adjustments.
3. Reports and audit are deterministic without reverse allocation.
4. Corrections can reverse exactly the same row economics.

## JSON Shape (pricingBreakdownJson)
Example:

```json
{
  "mode": "TIERED",
  "version": 2,
  "inputs": {
    "quantity": 7,
    "appliedRate": 120.0
  },
  "tiers": [
    { "upto": 4, "rate": 120.0, "amount": 480.0 },
    { "from": 5, "to": 7, "rate": 100.0, "amount": 300.0 }
  ],
  "adjustments": {
    "discount": 50.0,
    "waiver": 0.0,
    "surcharge": 25.0
  },
  "computed": {
    "baseAmount": 780.0,
    "netAmount": 755.0
  }
}
```

## Correction Behavior
- No in-place edits to financial rows.
- Correction creates compensating rows.
- For extension fields, correction row mirrors original economics with sign-reversed monetary values where applicable.

## Rollout Plan
1. Schema rollout with nullable fields.
2. Backward-compatible service writes for V1 (`amt`) unchanged.
3. Enable extension writers for selected heads behind feature flag.
4. Add validation and reconciliation checks (`netAmount == amt`).
5. Extend reports to optionally expose adjustment columns.

## Consequences
Positive:
- Future pricing flexibility with auditability.
- No rewrite of current linear flow.
- Better analytics for discounts/waivers/surcharges.

Trade-offs:
- More columns and validation rules.
- Slightly more verbose correction logic.

## Out of Scope (This ADR)
- UI for pricing authoring.
- Role-based approval flow for large waivers/discounts.
- Historical backfill of old rows.
