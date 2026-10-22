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
- If a record is wrong, you post a correction (a second, linked record that offsets all or part of the original). If the period must be billed again, you post a fresh contribution afterwards
- Reports always reflect the full history, not a silently modified state

This pattern is standard in accounting systems. It is worth understanding deeply — it will appear in every financial domain you work in.

---

## The Data Model

```
ContributionHead          ← what is being paid (Maintenance, Water, etc.)
  payUnit: 1 = per sq ft | 2 = per person | 3 = flat
  period: "MONTH" | "YEAR"

ContributionPeriod        ← when (Jan 2026, Feb 2026, etc. or full year)
  refYear, refMonth (0 = whole year, 1..12 = month)

ContributionRate          ← the price for a head over a date range (rate history)
  contributionHeadId, fromDt, toDt (null = current), amt, reference

Contribution              ← the main record (one per payment event)
  unitId, contributionHeadId, quantity, periodCount,
  transactionId, transactionDateTime, depositedBy,
  actorUserId, actorRole, inputComment,
  correctionOfContributionId, correctionReasonCode, correctionReasonText,
  correctionStatus (POSTED | PENDING | REJECTED, null on originals),
  correctionApprovedById/At, correctionRejectedById/At, correctionRejectionReason

ContributionDetail        ← one row per period paid within one Contribution
  contributionId, contributionPeriodId, contributionRateId,
  amt (signed), appliedRate, appliedRateReference
```

There is no separate correction table. A correction is simply a `Contribution` row whose `correctionOfContributionId` points at the original, whose detail rows carry negative `amt`, and whose `correctionStatus` tracks approval.

`Contribution` is the parent record. `ContributionDetail` holds one row per period paid in that transaction. A single payment event can cover multiple months in one POST — the breakdown is stored in `ContributionDetail`.

A correction (`correctionOfContributionId` set) offsets all or part of the original. Once its status is `POSTED` it counts in the duplicate check and in reports; while `PENDING` it does not.

---

## Amount Derivation

The amount is **never entered by the operator**. It is calculated server-side at the moment of recording and then locked.

The formula: `payable = quantity × rate × periodCount`, and each `ContributionDetail.amt` stores `quantity × rate` for one period.

`rate` comes from `ContributionRate.amt` — the rate row whose `fromDt` is on or before `transactionDateTime` (and whose `toDt` is null or not yet passed). This is the rate in effect on the **payment date**, not the period being paid for. If a period earlier than the rate's `fromDt` is selected, the API returns a non-blocking warning.

`quantity` depends on `payUnit` from `ContributionHead`:

| `payUnit` value | Quantity meaning | Source |
|---|---|---|
| `1` (per sq ft) | The unit's `sqFt` value | Fetched from `units` table |
| `2` (per person) | Number of persons availing the service | Entered by the operator (`availingPersonCount`); the unit must have at least one active resident on the transaction date |
| `3` (flat) | Always 1 | Hard-coded |

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
    // ...validation: at least one active resident, count provided...
    return availingPersonCount; // entered by the operator
  }
  return 1; // payUnit 3: flat
}
```

The `quantity` is stored on the `Contribution`; the resolved rate is stored on each `ContributionDetail` (`contributionRateId`, `appliedRate`, `appliedRateReference`). Even if the rate changes later, the historical record is preserved exactly as it was calculated.

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

A unit cannot pay the same head for the same period twice. The check adds up the signed amounts per period instead of just looking for rows, so a fully offset period can be billed again:

```ts
async function ensureNoDuplicateContribution(tx, unitId, contributionHeadId, periodIds) {
  const matchedDetails = await tx.contributionDetail.findMany({
    where: {
      contributionPeriodId: { in: periodIds },
      // originals (null status) and POSTED corrections only
      contribution: { unitId, contributionHeadId, ...EFFECTIVE_CONTRIBUTION_WHERE },
    },
    select: { contributionPeriodId: true, amt: true },
  });
  // net per period; any period with net > 0 is already paid
  // -> throw new HttpError(409, "CONFLICT", "Duplicate contribution exists ...")
}
```

Three consequences:
- **Net-zero unlock:** after an approved full reversal the net is 0, so the period can be billed again.
- **Partial adjustment:** the net is still above zero, so the period stays locked.
- **Pending correction:** a `PENDING` correction is not counted, so it does **not** free the period until a checker approves it.

The check runs inside the write transaction. That transaction uses `ReadCommitted` isolation and there is no database unique constraint on unit + head + period (the only unique key on details is contribution + period), so two truly simultaneous submissions could both pass the check. This is a known limitation worth knowing about; closing it would need a stricter isolation level or a locking strategy.

The error code `409 CONFLICT` is deliberate — it maps to "the state you are trying to create already exists", which is the correct HTTP semantics.

---

## The Write Transaction

The full `createContribution` function runs in a single `db.$transaction(async (tx) => { ... })` block. Inside:

1. Validate the head and the depositor (must be a real, non-system individual)
2. Validate all period IDs exist and belong to the current year, and the head's monthly/yearly rules
3. Check for duplicates (net per period, see above)
4. Derive quantity
5. Fetch the applicable rate (latest rate effective on the transaction date)
6. Compute the per-period amount and reject non-positive totals
7. Create the `Contribution`
8. Create the `ContributionDetail` rows (one per period, each with the applied rate)

The audit log entry is written right after the transaction commits.

If any step inside the transaction throws, the entire transaction rolls back. No partial records are possible.

---

## Immutability in Practice

There is no way to edit or delete a posted contribution. `PATCH /api/contributions/[id]` and `DELETE /api/contributions/[id]` exist only to refuse: both return `412 PRECONDITION_FAILED` ("Posted contributions are immutable. Use correction flow."). If a student tries to make them work, the domain rule from `vault/01-Domain/Domain-Rules.md` forbids it.

The API surface for contributions is:

```
POST   /api/contributions                          ← record a payment
GET    /api/contributions                          ← list with filters
GET    /api/contributions/[id]                     ← single record detail
PATCH  /api/contributions/[id]                     ← always 412 (immutable)
DELETE /api/contributions/[id]                     ← always 412 (immutable)
GET    /api/contributions/month-ledger             ← derived view (see below)
POST   /api/contributions/corrections              ← post a correction
GET    /api/contributions/corrections/pending      ← admin: corrections awaiting approval
POST   /api/contributions/corrections/[id]/approve ← admin: checker approval
POST   /api/contributions/corrections/[id]/reject  ← admin: checker rejection
```

No edit. No delete.

---

## The Correction Flow

If a payment was recorded incorrectly (wrong head, duplicate payment, wrong amount), you post a correction:

```ts
// POST /api/contributions/corrections
{
  "originalContributionId": 42,
  "transactionId": "TXN-CORR-001",
  "transactionDateTime": "2026-05-15T10:00:00Z",
  "reasonCode": "WRONG_HEAD",
  "reasonText": "Captured against the wrong contribution head.",
  "depositedBy": "individual-uuid"  // optional: defaults to the original depositor
}
```

The service (in one `Serializable` transaction):
1. Fetches the original `Contribution` with its details (a correction of a correction is refused)
2. Loads the active (POSTED or PENDING) corrections of that original
3. For `FULL_REVERSAL`: refuses if any active correction exists; otherwise negates every detail row
4. For `ADJUSTMENT`: validates each requested amount against what is still correctable (see below)
5. Creates a new `Contribution` linked by `correctionOfContributionId`, with `correctionStatus = PENDING` (or `POSTED` if maker-checker is disabled) and the negative `ContributionDetail` rows
6. Writes an audit log entry after the transaction commits

A correction never creates a replacement payment. If the period has to be billed again, post a normal contribution once the reversal is `POSTED` and the period nets to zero.

Reports sum `ContributionDetail.amt` over originals and `POSTED` corrections. A payment followed by a fully-posted reversal nets to zero.

### Full Reversal vs Partial Adjustment

A correction has a `correctionType`:

| Type | Posts | Use when |
|---|---|---|
| `FULL_REVERSAL` (default) | the negative of every period of the original | wrong unit, wrong head, duplicate payment |
| `ADJUSTMENT` | an explicit positive amount per period, stored as a negative detail | partial give-back, for example a rate concession |

```ts
// Give back Rs 450 of a Rs 2700 payment (original posted at the payment-date rate)
{
  "originalContributionId": 159,
  "transactionId": "TXN-ADJ-001",
  "transactionDateTime": "2026-10-23T10:00:00Z",
  "reasonCode": "RATE_CONCESSION",
  "reasonText": "Committee decision: Feb dues at the old rate. Minutes ref ...",
  "correctionType": "ADJUSTMENT",
  "adjustments": [{ "contributionPeriodId": 2, "amount": 450 }]
}
```

Rules worth remembering:
- An adjustment cannot exceed the remaining correctable amount for the period (the original minus every active correction), so a period never goes below zero.
- A full reversal is refused while the original has another active correction.
- The period stays **paid** after a partial adjustment (net 2250), so the duplicate lock is not released.
- The refund of real money happens outside the app; the ledger records that it was owed, why, and who approved it.
- Only originals and `POSTED` corrections count in the duplicate check and reports. A `PENDING` correction does not free the period; see `vault/00-Core/ADR-004-Partial-Adjustment-Corrections.md`.

### The Maker-Checker Flag

```ts
// In contributions.service.ts
const MAKER_CHECKER_ENABLED = true;
```

When `true`, corrections start as `PENDING` and require a second user to approve via `POST /api/contributions/corrections/[id]/approve`. The same user who created the correction cannot approve it — the service enforces this:

```ts
if (correction.actorUserId && correction.actorUserId === actor.actorUserId) {
  throw new HttpError(403, "FORBIDDEN",
    "The approver must be a different user than the one who submitted the correction.");
}
```

When `false`, corrections post immediately as `POSTED` (single-step flow for low-volume deployments).

This is a **feature flag**, not a configuration setting. Flipping it in production requires a deployment. The intent is to start simple and add process when volume justifies it.

---

## The Month Ledger

`GET /api/contributions/month-ledger?unitId=...&headId=...&refYear=2026`

This is a read-only derived view, not a stored entity. Given a unit, a head and a year (current year only), it returns the paid/unpaid status for every month, counting originals and `POSTED` corrections only:

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

This creates one `Contribution` (`periodCount = 3`) and three `ContributionDetail` rows, each holding the per-period amount. The payable total is `quantity × rate × periodCount`, which equals the sum of the detail amounts.

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

**`roundTo2(rate * quantity)`.** Currency values are rounded to two decimal places at derivation time, not at display time. Stored as `Decimal` in Prisma (maps to PostgreSQL `DECIMAL(12,2)`). Rounding errors on display are a common source of subtle report discrepancies — storing the rounded value prevents them.

**Corrections are always linked.** `Contribution.correctionOfContributionId` points at the original. There is no stand-alone correction — every correction is traceable to a specific original record.

**`actorUserId` and `actorRole` are stored on every entry.** When a correction is reviewed months later, the record shows exactly which user (and in what role) posted the original. This is the audit trail that makes financial immutability meaningful.

---

## What to Read Next

- **`src/modules/contributions/contributions.helpers.ts`** — all pure functions (no DB, no HTTP) extracted for unit testing. Read these first if you want to understand the derivation logic without the transaction noise.
- **`src/modules/contributions/__tests__/`** — unit tests for the helpers. Shows how to test financial logic in isolation.
- **`src/modules/reports/contributions-reports.service.ts`** — the paid/unpaid matrix and transaction list. Shows how contribution data is aggregated for reporting.
- **`vault/01-Domain/Domain-Rules.md`** — the authoritative rules that drove every decision above.
- **`vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`** — the architectural decision record explaining why this approach was chosen over simpler alternatives.
- **`course/walkthrough/reports.md`** — the reporting module walkthrough.
