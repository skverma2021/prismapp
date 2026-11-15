# Slide Script — B-04: The Append-Only Rate Pattern

---

## Slide 1 — Why In-Place Update Destroys the Audit Trail

**Type:** `Concept`

**Headline:**
> UPDATE rate SET amt = 4.00 WHERE id = 1 — three words that silently break historical reporting.

**Visual / layout:**
A before/after table. Before (labelled "After naïve UPDATE"):

| id | contributionHeadId | amt | fromDt | toDt |
|---|---|---|---|---|
| 1 | Maintenance | 4.00 | 2024-01-01 | NULL |

A payment record from February 2024 shown below, referencing rate id=1. Callout: "What rate applied in February 2024? 4.00? Or the original 3.50? The table cannot answer."

After (labelled "After append-only INSERT"):

| id | contributionHeadId | amt | fromDt | toDt |
|---|---|---|---|---|
| 1 | Maintenance | 3.50 | 2024-01-01 | 2026-03-31 |
| 2 | Maintenance | 4.00 | 2026-04-01 | NULL |

Callout: "Payment in February 2024 → rate id=1 → 3.50. Unambiguous."

**Narration:**
The financial integrity rules state: contribution rates must be determined at the time of payment, and once applied, the rate must not change even if future rates are updated.

If you store rates with a single `amt` field and UPDATE it when the MC votes for a new rate, the previous value is gone. Any payment recorded before the update now points to a rate row that shows the new amount, not the amount that was in effect when the payment was made.

This is not a hypothetical edge case. It happens the first time the MC raises the maintenance rate — and it happens silently. The reports will show incorrect historical amounts with no error message. You will only discover the problem when a resident disputes their payment.

The fix is to never use UPDATE on a rate row. Instead, close the old row by setting its `toDt` to yesterday and insert a new row with the new amount and `fromDt` set to today. The old row is preserved. Every historical payment has an unambiguous rate reference.

**On-screen action / demo:**
Open `vault/01-Domain/Domain-Rules.md`. Navigate to Financial Integrity Rules 5 — "Rate Locking Rule." Read both bullet points aloud. Then navigate to Contribution Rules 2 — "revised rates are forward effective only; historical posted entries are not recalculated."

**Key takeaway:**
In-place UPDATE on a rate table silently corrupts historical records. Append-only with a closed `toDt` is the only design that preserves the audit trail.

---

## Slide 2 — Closing and Opening: The Two-Write Pattern

**Type:** `Diagram`

**Headline:**
> A rate change is two writes: close the old row, open a new one.

**Visual / layout:**
A sequence diagram showing the MC decision flow:
1. MC votes on April 1st to raise maintenance from ₹3.50 to ₹4.00 effective April 1st
2. Service writes: `UPDATE ContributionRates SET toDt = '2026-03-31' WHERE id = 1`
3. Service writes: `INSERT INTO ContributionRates (headId, amt, fromDt, toDt) VALUES (Maintenance, 4.00, '2026-04-01', NULL)`
4. Result: two rows, full history preserved

Below: rate resolution query: `WHERE contributionHeadId = X AND fromDt <= transactionDt AND (toDt IS NULL OR toDt >= transactionDt)` — labelled "resolves to exactly one row."

**Narration:**
Here is the concrete operation. When the MC votes to raise the maintenance rate on April 1st, the service executes exactly two writes — atomically, in a transaction.

First: close the existing active row. Set `toDt` to March 31st. This is the one and only UPDATE ever permitted on a rate row — closing it.

Second: insert a new row with the new amount and `fromDt` set to April 1st. Leave `toDt` NULL.

The rate resolution query is deterministic: find the one row for this head where `fromDt` is on or before the transaction date and `toDt` is either NULL or on or after the transaction date. Because the closing-and-opening writes are atomic, exactly one row will always match for any transaction date.

Notice that this is the same timeline pattern we saw in topic 2 for ownership. The rows are different, the domain is different, but the structure is identical: fromDt + nullable toDt, NULL = current, append only.

**On-screen action / demo:**
Open `vault/01-Domain/ERD.md` → ContributionRates table. Read the field list. Then open `prisma/schema.prisma` → find the `ContributionRate` model. Point to `fromDt`, `toDt` (nullable), and `amt`. Then open `src/modules/contribution-rates/contribution-rates.service.ts` — show the rate-resolution query.

**Key takeaway:**
A rate change is always two writes: close the previous active row, insert the new one. Never a single UPDATE on `amt`.

---

## Slide 3 — Rate-Period Coverage: The Policy That Surprises Developers

**Type:** `Concept`

**Headline:**
> The rate that applies is the rate at payment time — not the rate at period start.

**Visual / layout:**
A timeline diagram. Three events on a horizontal line:
- January 1st: Period January starts. Rate = ₹3.50 (active since last year)
- February 1st: New rate ₹4.00 takes effect
- April 5th: Resident pays for January

Two paths marked with question marks: "Rate at period start (₹3.50)?" vs "Rate at payment time (₹4.00)?"

Callout box: "PrismApp policy: rate at transactionDateTime applies. Non-blocking warning shown if rate.fromDt > period.start. Contribution is posted normally."

**Narration:**
Here is a policy decision that is easy to miss. A resident pays for January in April. Two rates existed — ₹3.50 was in effect in January, ₹4.00 became effective in February.

Which rate should apply?

You might expect: the rate active when the period started. But that requires the system to look back at what the rate was on January 1st. For periods far in the past, this adds complexity and can produce surprising results when a previous rate row has been audited or corrected.

PrismApp chooses: the rate at `transactionDateTime`. The rate in effect when the operator records the payment is the rate that applies. This is accepted policy, documented in `vault/01-Domain/Domain-Rules.md` as the rate-period coverage policy.

The trade-off: a late payment incurs the current rate, not the historical one. When this happens — when the resolved rate's `fromDt` is later than the selected period's start — the API returns a non-blocking warning and the UI shows an amber notice. The operator is informed; the contribution is posted normally.

The schema design consequence: there is no field on `ContributionDetails` storing "the rate that was in effect at period start." There is only the resolved rate, determined at `transactionDateTime`. The rate is locked at write time.

**On-screen action / demo:**
Open `vault/01-Domain/Domain-Rules.md` → Contribution Rules 2. Read the "rate-period coverage policy (Track-A 1.9)" bullet. Then open `src/modules/contributions/contributions.service.ts` — find the warning logic for late rate application (the check of `rate.fromDt` against `period.start`).

**Key takeaway:**
Rate-period coverage is a policy decision, not a technical default. Document it explicitly — in domain rules and in the service comment — so every future developer knows it is intentional.

---

## Transition note

Temporal tables and append-only rates handle master data. Next: the pattern that handles financial transactions — the header + detail split.
