# Walkthrough — Contributions (Complex Financial Module)

The Contributions module is the most complex in PrismApp. Unlike every other module, it is **not CRUD**. Records are immutable once posted. Amounts are derived, not entered. Corrections are handled through a compensating transaction pattern, not an edit. Read this walkthrough after you understand Units.

---

## Why Contributions Are Different

A contribution record answers the question: *"Did unit X pay contribution head Y for period Z?"*

Once that answer is recorded, it must not change retroactively. Changing a financial record in-place would:
- Break the audit trail
- Allow backdating or concealment of errors
- Make reports non-reproducible (the same query today and tomorrow could return different totals)

The solution is **immutability + corrections**:
- You cannot edit or delete a contribution record
- If a record is wrong, you post a correction (a second, linked record that reverses the original and optionally replaces it with a new value)
- Reports always reflect the full history, not a silently modified state

This pattern is standard in accounting systems. It is worth understanding deeply — it will appear in every financial domain you work in.

---

## The Data Model

```
ContributionHead          ← what is being paid (Maintenance, Water, etc.)
  ↓ payUnit: FLAT | PER_SQFT | PER_PERSON
  ↓ period: MONTH | YEAR

ContributionPeriod        ← when (Jan 2026, Feb 2026, etc. or full year)
  refYear, refMonth (0 = annual)

ContributionRate          ← how much per unit at a point in time
  contributionHeadId, fromDt, rate (versioned history)

ContributionEntry         ← the main record (one per payment event)
  unitId, contributionHeadId, transactionId, transactionDateTime,
  depositedBy, actorUserId, actorRole, totalAmt

ContributionDetail        ← the per-period breakdown within one entry
  contributionEntryId, contributionPeriodId, rate, quantity, amt

ContributionCorrection    ← compensating transaction linked to an entry
  originalContributionId, status (POSTED|PENDING|REJECTED),
  reasonCode, reasonText, reversalEntry → ContributionEntry
```

`ContributionEntry` is the parent record. `ContributionDetail` holds one row per period paid in that transaction. A single payment event can cover multiple months in one POST — the breakdown is stored in `ContributionDetail`.

`ContributionCorrection` is linked to a `ContributionEntry`. When approved, it creates a reversal entry that negates the original and optionally records a replacement.

---

## Amount Derivation

The amount is **never entered by the operator**. It is calculated server-side at the moment of recording and then locked.

The formula: `amount = rate × quantity`

`rate` comes from `ContributionRate` — the rate row whose `fromDt` is on or before `transactionDateTime`. This is the rate in effect at the time of the transaction.

`quantity` depends on `payUnit` from `ContributionHead`:

| `payUnit` value | Quantity meaning | Source |
|---|---|---|
| `0` (FLAT) | Always 1 | Hard-coded |
| `1` (PER_SQFT) | The unit's `sqFt` value | Fetched from `units` table |
| `2` (PER_PERSON) | Number of active residents at transaction time | Count of active `UnitResident` rows |

The service function that does this:

```ts
async function deriveQuantity(tx, payUnit, unitId, transactionDateTime, availingPersonCount) {
  if (payUnit === 1) {
    const unit = await tx.unit.findUnique({ where: { id: unitId }, select: { sqFt: true } });
    return unit.sqFt;
  }
  if (payUnit === 2) {
    const residentCount = await tx.unitResident.count({
      where: {
        unitId,
        fromDt: { lte: transactionDateTime },
        OR: [{ toDt: null }, { toDt: { gte: transactionDateTime } }],
      },
    });
    // ...validation...
    return availingPersonCount; // operator confirms the head-count
  }
  return 1; // FLAT
}
```

The derived `rate` and `quantity` are stored on `ContributionDetail`. Even if the rate changes later, the historical record is preserved exactly as it was calculated.

---

## Period Validation

Contributions are only allowed for the **current calendar year**. This is a domain rule, not a technical constraint.

```ts
const currentYear = new Date().getUTCFullYear();
const invalidYear = periods.some((p) => p.refYear !== currentYear);
if (invalidYear) {
  throw new HttpError(412, "PRECONDITION_FAILED",
    "Payments are allowed only for periods in current year.");
}
```

Additionally, a `MONTH`-period contribution head cannot use an annual period (`refMonth === 0`), and a `YEAR`-period head must use exactly one annual period:

```ts
if (headPeriod === "MONTH" && periods.some((p) => p.refMonth === 0)) {
  throw new HttpError(412, "PRECONDITION_FAILED",
    "Monthly contribution cannot use yearly period.");
}
if (headPeriod === "YEAR" && (periods.length !== 1 || periods[0].refMonth !== 0)) {
  throw new HttpError(412, "PRECONDITION_FAILED",
    "Yearly contribution must use exactly one yearly period.");
}
```

---

## Duplicate Prevention

A unit cannot pay the same head for the same period twice:

```ts
async function ensureNoDuplicateContribution(tx, unitId, contributionHeadId, periodIds) {
  const matchedDetails = await tx.contributionDetail.findMany({
    where: {
      contributionPeriodId: { in: periodIds },
      contribution: { unitId, contributionHeadId },
    },
  });
  if (matchedDetails.length > 0) {
    throw new HttpError(409, "CONFLICT",
      `Duplicate payment detected for period(s): ...`);
  }
}
```

This check runs inside the write transaction, not before it. Running it before the transaction and then inside it would be more defensive but redundant for a serialised write path. Running it only outside the transaction would create a TOCTOU race condition.

The error code `409 CONFLICT` is deliberate — it maps to "the state you are trying to create already exists", which is the correct HTTP semantics.

---

## The Write Transaction

The full `createContribution` function runs in a single `db.$transaction(async (tx) => { ... })` block. Inside:

1. Validate all period IDs exist and belong to the current year
2. Validate head period rules (monthly vs. yearly)
3. Check for duplicates
4. Fetch the applicable rate (most recent rate on or before transaction date)
5. Derive quantity
6. Create `ContributionEntry`
7. Create `ContributionDetail` rows (one per period)
8. Write audit log

If any step throws, the entire transaction rolls back. No partial records are possible.

---

## Immutability in Practice

There is no `PUT /api/contributions/[id]` and no `DELETE /api/contributions/[id]`. These routes simply do not exist. If a student tries to add them, the domain rule from `vault/01-Domain/Domain-Rules.md` forbids it.

The API surface for contributions is:

```
POST   /api/contributions              ← record a payment
GET    /api/contributions              ← list with filters
GET    /api/contributions/[id]         ← single record detail
GET    /api/contributions/month-ledger ← derived view (see below)
POST   /api/contributions/corrections  ← post a correction
GET    /api/contributions/corrections/[id]         ← correction detail
POST   /api/contributions/corrections/[id]/approve ← checker approval
POST   /api/contributions/corrections/[id]/reject  ← checker rejection
```

No edit. No delete.

---

## The Correction Flow

If a payment was recorded incorrectly (wrong unit, wrong head, wrong amount because the rate was wrong), you post a correction:

```ts
// POST /api/contributions/corrections
{
  "originalContributionId": 42,
  "transactionId": "TXN-CORR-001",
  "transactionDateTime": "2026-05-15T10:00:00Z",
  "reasonCode": "WRONG_UNIT",
  "reasonText": "Payment was recorded against Unit A-101, should be A-102.",
  "depositedBy": "individual-uuid"  // optional: re-record for correct unit
}
```

The service:
1. Fetches the original `ContributionEntry`
2. Creates a `ContributionCorrection` record with `status = PENDING` (or `POSTED` if maker-checker is disabled)
3. Creates a reversal `ContributionEntry` with `totalAmt = -(original.totalAmt)` and matching negative `ContributionDetail` rows
4. If `depositedBy` is provided, creates a replacement entry at the same time

Reports sum `ContributionDetail.amt` across all entries including corrections. A correct payment followed by a correctly-posted correction nets to zero.

### The Maker-Checker Flag

```ts
// In contributions.service.ts
const MAKER_CHECKER_ENABLED = true;
```

When `true`, corrections start as `PENDING` and require a second user to approve via `POST /api/contributions/corrections/[id]/approve`. The same user who created the correction cannot approve it — the service enforces this:

```ts
if (correction.createdByUserId === actor.actorUserId) {
  throw new HttpError(403, "FORBIDDEN",
    "The maker cannot also be the checker for this correction.");
}
```

When `false`, corrections post immediately as `POSTED` (single-step flow for low-volume deployments).

This is a **feature flag**, not a configuration setting. Flipping it in production requires a deployment. The intent is to start simple and add process when volume justifies it.

---

## The Month Ledger

`GET /api/contributions/month-ledger?unitId=...&headId=...`

This is a read-only derived view, not a stored entity. Given a unit and a head, it returns the paid/unpaid status for every month in the current year:

```json
{
  "latestPaidMonth": 5,
  "rows": [
    { "refYear": 2026, "refMonth": 1, "monthLabel": "Jan", "status": "Paid", "amount": 450.00, "transactionRefs": [...] },
    { "refYear": 2026, "refMonth": 2, "monthLabel": "Feb", "status": "Paid", "amount": 450.00, "transactionRefs": [...] },
    ...
  ]
}
```

The UI uses this to render a calendar grid showing which months are paid (green) and which are unpaid (red/yellow). The operator clicks unpaid months to select them, then submits the payment for all selected months in one POST.

`latestPaidMonth` drives the default "pay up to here" selection in the UI — a UX shortcut that reduces the number of clicks for the most common case (paying all arrears in one go).

---

## Multi-Period Payment

A single `POST /api/contributions` can cover multiple months:

```ts
{
  "unitId": "unit-uuid",
  "contributionHeadId": 1,
  "contributionPeriodIds": [3, 4, 5],   // Jan, Feb, Mar periods
  "transactionId": "TXN-2026-001",
  "transactionDateTime": "2026-05-31T09:00:00Z",
  "depositedBy": "individual-uuid"
}
```

This creates one `ContributionEntry` and three `ContributionDetail` rows. The `totalAmt` on the entry is the sum of all detail amounts.

The duplicate check scans for any pre-existing details for the same `unitId + headId + periodId` combinations before writing.

---

## The UI

`app/contributions/page.tsx` (note: outside `(dashboard)`, its own layout)

The contribution capture page is the most complex UI component in the project. It:

1. Loads four lookups in parallel: units, contribution heads, active residencies, individuals
2. Shows a month selector when a unit + head are chosen (driven by the month-ledger endpoint)
3. Derives the expected amount client-side for preview, then confirms server-side on submit
4. Multi-selects months via toggle clicks
5. Shows a warning if the applicable rate's `fromDt` is later than the earliest selected period start (the `checkRatePeriodCoverage` helper)
6. Requires `depositedBy` — the individual who physically handed over the payment

The lookups are cached in module-level variables (`src/lib/master-data-lookups.ts`) so navigating back to the form does not re-fetch them. The cache is invalidated on unit or individual mutations.

---

## Things Worth Noticing

**Rate is fetched inside the transaction, not before.** The rate lookup happens at the moment of write to avoid a race condition where the rate could change between a "check the rate" call and the actual write.

**`transactionId` is caller-supplied.** The operator or the calling system provides the transaction reference (bank slip number, receipt number, etc.). This is an external identifier, not an auto-generated one. The service validates it is a non-empty string but does not generate it.

**`roundTo2(rate * quantity)`.** Currency values are rounded to two decimal places at derivation time, not at display time. Stored as `Decimal` in Prisma (maps to PostgreSQL `DECIMAL(10,2)`). Rounding errors on display are a common source of subtle report discrepancies — storing the rounded value prevents them.

**Corrections are always linked.** `ContributionCorrection.originalContributionId` is a required FK. There is no stand-alone correction — every correction is traceable to a specific original record.

**`actorUserId` and `actorRole` are stored on every entry.** When a correction is reviewed months later, the record shows exactly which user (and in what role) posted the original. This is the audit trail that makes financial immutability meaningful.

---

## What to Read Next

- **`src/modules/contributions/contributions.helpers.ts`** — all pure functions (no DB, no HTTP) extracted for unit testing. Read these first if you want to understand the derivation logic without the transaction noise.
- **`src/modules/contributions/__tests__/`** — unit tests for the helpers. Shows how to test financial logic in isolation.
- **`src/modules/reports/contributions-reports.service.ts`** — the paid/unpaid matrix and transaction list. Shows how contribution data is aggregated for reporting.
- **`vault/01-Domain/Domain-Rules.md`** — the authoritative rules that drove every decision above.
- **`vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`** — the architectural decision record explaining why this approach was chosen over simpler alternatives.
- **`course/walkthrough/reports.md`** — the reporting module walkthrough.
