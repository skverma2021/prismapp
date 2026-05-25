# Slide Script — B-05: The Header + Detail Financial Model

---

## Slide 1 — One Transfer, Multiple Periods

**Type:** `Concept`

**Headline:**
> One UPI payment ID. Three months of maintenance. The flat table cannot represent this.

**Visual / layout:**
A scenario panel at the top: "Ravi Kumar transfers ₹4,200 on 5 April 2026. Reference: UPI/HDFC/2026040500123. He wants to clear January, February, and March maintenance for flat V-101."

Below: two naive designs and their failures.

Design 1 — "One row per transaction":
`(unitId, headId, transactionId, amt=4200, months="Jan,Feb,Mar")` — Callout: "Duplicate check impossible. 'Jan' in a CSV string is not a FK. How do you prevent double payment for February?"

Design 2 — "Three rows, one per month, same transactionId":
`(V-101, Maintenance, UPI/001, Jan, 1400)`, `(V-101, Maintenance, UPI/001, Feb, 1400)`, `(V-101, Maintenance, UPI/001, Mar, 1400)` — Callout: "transactionId repeated three times. depositedBy repeated. quantity repeated. Redundant data, update anomalies."

**Narration:**
Here is the scenario that forced the header + detail design.

A resident makes a single bank transfer covering three months of maintenance. One transaction reference. One payment date. One person who paid. But three distinct period obligations, each of which needs independent duplicate protection.

The naive single-row design tries to pack everything into one row. The month list becomes a string, a JSON field, or a comma-separated value. The duplicate check for "has January been paid?" now requires parsing that field — which is not how a database constraint works.

The naive multi-row design repeats the transaction metadata three times. If you need to correct the transaction reference, you must UPDATE three rows. If only two of the three rows are updated, the data is inconsistent.

Neither design is satisfactory. The correct design separates the transaction metadata from the per-period entries.

**On-screen action / demo:**
Open `vault/01-Domain/Domain-Rules.md`. Navigate to Contribution Rules 4 — the `contributions` table description. Read the `periodCount` bullet: "it is a count of applicable periods... this will decide the number of rows to be created in contributionDetails table." Then read the `transactionId` bullet: "A user can make UPI or Bank transfer payment... in case of contribution head with period = month, the amount gets distributed among selected months."

**Key takeaway:**
When one real-world event has multiple per-item records, split it. The header carries the event metadata; the detail rows carry the per-item data.

---

## Slide 2 — The Split: Header and Detail

**Type:** `Diagram`

**Headline:**
> What goes on the header? What goes on the line?

**Visual / layout:**
Two annotated table definitions.

**Contributions (header):**
| Field | Value | Why it lives here |
|---|---|---|
| id | 501 | — |
| unitId | V-101 | One unit per transaction |
| contributionHeadId | Maintenance | One head per transaction |
| quantity | 1250 | sqFt of V-101 — same for all months |
| periodCount | 3 | Number of detail rows |
| transactionId | UPI/HDFC/001 | One reference per transfer |
| transactionDateTime | 2026-04-05 | One date per transfer |
| depositedBy | Ravi Kumar | One person per transfer |

**ContributionDetails (line items):**
| Field | Value | Why it lives here |
|---|---|---|
| id | 2001 | — |
| contributionId | 501 → header | Links back to header |
| contributionPeriodId | 146 (Jan 2026) | One period per line |
| amt | 1400 | Per-period amount (locked at write) |

| id | contributionId | contributionPeriodId | amt |
|---|---|---|---|
| 2001 | 501 | 146 (Jan 2026) | 1400 |
| 2002 | 501 | 147 (Feb 2026) | 1400 |
| 2003 | 501 | 148 (Mar 2026) | 1400 |

**Narration:**
The split is clean. Everything that is the same for all periods — the unit, the head, who paid, when, the transaction reference, the quantity — lives on the header. It is stored once.

Everything that varies per period — which month, how much for that month — lives on the detail row. Three months means three rows.

The duplicate protection constraint is on the detail row: UNIQUE on `(contributionId's unitId, contributionHeadId, contributionPeriodId)`. Or more precisely, there is a unique constraint on the `ContributionDetails` table scoped to unit + head + period. If January has already been paid, inserting a new detail row for January for the same unit and head violates the constraint.

The amount per period: for a per-sqft head, `amt = quantity × applicable_rate = 1250 × 1.12 = 1400`. This is calculated once, at write time, and stored. The rate row used for the calculation is the rate in effect at `transactionDateTime`. Once stored, it is never recalculated.

**Teaching callout — the uniform formula:**
Point out that maintenance (per sq ft), gym membership (per person), and common-hall rent (lump sum) all produce the same formula: `quantity × rate`. The `quantity` field is the abstraction that hides the measurement difference. A consequence students often miss: the Paid/Unpaid Matrix report needs no special-case logic per head type — every cell is a lookup for `(unitId, headId, periodId)`. The schema's uniformity is what keeps the reporting query simple.

**On-screen action / demo:**
Open `vault/01-Domain/ERD.md`. Navigate to Contributions then ContributionDetails. Read the field lists. Show the FK chain: `ContributionDetails.contributionId → Contributions.id` and `ContributionDetails.contributionPeriodId → ContributionPeriods.id`. Then open `prisma/schema.prisma` — show the `ContributionDetail` model and its relations.

**Key takeaway:**
The header stores event metadata once. The detail stores per-period amounts independently. The FK from detail to header is the link; the FK from detail to period is the duplicate-protection anchor.

---

## Slide 3 — The Self-Validating Constraint

**Type:** `Concept`

**Headline:**
> SUM(ContributionDetails.amt) WHERE contributionId = X must equal quantity × rate × periodCount.

**Visual / layout:**
A formula box:

```
For contribution id=501:
  quantity = 1250 sq ft
  rate = ₹1.12 / sq ft (at transactionDateTime)
  periodCount = 3

  Expected total = 1250 × 1.12 × 3 = ₹4,200

  SUM(ContributionDetails.amt) WHERE contributionId = 501
  = 1400 + 1400 + 1400 = ₹4,200  ✓
```

Below: a callout — "If these two numbers disagree, the transaction was written incorrectly. The formula is a test you can run on any record."

**Narration:**
The amount distribution rule in the domain says: the sum of all detail amounts for a contribution must equal the total payable. This is not just an accounting rule — it is a built-in correctness check.

Every time you write a contribution, you can verify it immediately: sum the detail amounts and compare to `quantity × rate × periodCount`. If they disagree, something went wrong in the write logic.

This is the self-validating property of the header + detail model. The rule is derived from the data, not stored separately. You cannot pass this check by accident — the amounts must be explicitly distributed across periods correctly.

It is also the basis for the financial integrity rule: if contributions are immutable, then the only way to correct an error is a compensating transaction. The compensating entry creates a new set of header + detail rows with negative amounts. The sum of original plus compensating equals zero. The correction is visible and auditable.

**On-screen action / demo:**
Open `vault/01-Domain/Domain-Rules.md` → Financial Integrity Rules 4 — "Amount Consistency Rule." Read it aloud. Then open `vault/V1/contribution-vision.md` → Section C.2 — Compensating Transactions. Show how the correction model extends naturally from the header+detail split.

**Key takeaway:**
The amount distribution formula is a built-in correctness test. If it fails for any record, the write logic has a bug. If it passes, the record is internally consistent.

---

## Transition note

Five table design patterns, five domain rules behind them. One more topic remains: putting it together in a structured exercise.
