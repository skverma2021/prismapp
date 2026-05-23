# Contribution Module — Vision

Status: Delivered (V1)
Owner: Product + Finance + Engineering
Date: 2026-01-15 (retrospective — documented after delivery)

> **Note on timing:** This vision document was written retrospectively after the contribution module was delivered. The domain rules, API spec, and report definitions were written during implementation and remain the authoritative references. This document captures the *why* — the product reasoning, the scope decisions, and the deferred items — which the implementation documents do not explain.

---

## Purpose

Enable the Managing Committee (MC) to record, track, and report on financial contributions from unit owners and residents.

The contribution module answers three questions for the MC:

1. **What is owed?** — Contribution heads and rates define the charges applicable to each unit.
2. **What has been paid?** — Payments are recorded with an immutable audit trail.
3. **What is outstanding?** — Reports show paid/unpaid status per unit, per head, per period.

The module does not handle payment collection itself — residents pay via UPI or bank transfer and the operator records the transaction reference. The app is a ledger, not a payment gateway.

---

## A. Charge Structure — Heads and Rates

### 1. Contribution Heads

A Contribution Head defines a type of charge. Examples: Maintenance, Swimming Pool membership, Gym membership, Common Hall rent.

Each head has a `payUnit` that determines how the amount is calculated:
- **Per sq ft** — the charge is multiplied by the unit's area. Used for maintenance.
- **Per person** — the charge is multiplied by the number of availing persons. Used for gym and pool memberships.
- **Lump sum** — a flat amount regardless of area or persons.

Each head also has a `period` — monthly or yearly — which controls how many contribution period rows a payment covers.

### 2. Contribution Rates

Rates are the historical record of what each head has charged over time. A rate row has a `fromDt` and a nullable `toDt`. A null `toDt` means "current rate."

Rates are **append-only**: the MC cannot edit a historical rate, only add a new one. This preserves the audit trail — every historical payment can be explained by the rate that was in effect at the time.

The applicable rate for a payment is resolved at `transactionDateTime`, not at the period start. If a resident pays in April for a January period, the April rate applies. This is accepted policy (see `vault/01-Domain/Domain-Rules.md`, rate-period coverage policy).

### 3. Contribution Periods

Periods are the calendar slots payments map to. They are pre-seeded: 13 rows per year (one for the full year at `refMonth = 0`, and twelve monthly rows for `refMonth = 1..12`).

Payments are restricted to the current year — no advance booking for future years, no retroactive payment for past years beyond what exists in the seeded data.

---

## B. Payment Capture

### 1. Recording a Payment

An operator records a payment by selecting:
- The unit
- The contribution head
- The period(s) — one or more months (for monthly heads) or one year (for yearly heads)
- The transaction reference (UPI ID, bank reference number) and transaction date
- The person who made the payment (`depositedBy`) — any Individual in the system

The amount is derived server-side from the applicable rate and quantity. The operator does not enter an amount.

### 2. Quantity Rules

Quantity is determined by `payUnit`:
- **Per sq ft**: quantity = `Units.sqFt`. No operator input.
- **Lump sum**: quantity = 1. No operator input.
- **Per person**: quantity = number of availing persons, entered by the operator. Requires at least one active resident on the transaction date.

> **Design note — the uniform formula:** All three charge bases resolve to the same calculation: `amount per period = quantity × applicable_rate`. The `quantity` field is the abstraction that normalises area-based, person-based, and lump-sum payments into a single formula. A consequence of this uniformity is that the Paid/Unpaid Matrix report (Section D) requires no branching logic on payment type — every cell is a straightforward lookup for `(unitId, headId, periodId)` across all heads.

### 3. Duplicate Protection

A unit cannot be charged twice for the same head and period. Before writing, the system checks for existing entries. If a duplicate is detected, the write is rejected.

Exception: if all existing entries for that unit + head + period have been fully compensated (net amount = 0), the slot is considered cleared and can be reposted. This is the *net-zero unlock* policy.

---

## C. Financial Immutability and Corrections

### 1. No Edit, No Delete

Once a contribution is recorded, it cannot be edited or deleted. This is not a technical limitation — it is a deliberate policy. Financial records must be immutable for audit, dispute resolution, and legal compliance.

### 2. Compensating Transactions

Corrections are made through a new transaction that offsets the original. A correction entry carries:
- A reference back to the original contribution
- The reason for the correction
- The identity of the operator who made it
- A negative amount that cancels the original

The original record is never modified. The audit trail shows both the original and the correction.

### 3. Correction Approval

In V1, a single operator with SOCIETY_ADMIN or MANAGER role can submit and apply a correction in one step. A maker-checker workflow (requiring a second approver) is planned for a hardening phase when transaction volume justifies the additional friction. See `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`.

---

## D. Reports

### 1. Paid/Unpaid Matrix

Shows payment coverage for a selected head and year across all units. One row per unit, one column per month. Each cell shows Paid, Unpaid, or N/A (for yearly heads).

Filters: year (required), head (required), block (optional).

Used by the MC at the end of each month to identify defaulters and issue reminders.

### 2. Transaction List

Shows individual payment records with full detail: unit, head, period, amount, transaction reference, date, deposited-by individual.

Filters: year, head, block, unit, date range.

Exportable to CSV with filter echo and generation timestamp.

### 3. Month Ledger (Capture Helper)

Not a report — a UI helper during payment capture. Shows, for a selected unit + head + year, which months are Paid and which are Unpaid, with transaction references for paid months.

Prevents the operator from accidentally recording a duplicate payment.

---

## E. What Was Delivered

| Feature | Status |
|---|---|
| Contribution heads CRUD | ✅ Delivered |
| Contribution rates — append-only history | ✅ Delivered |
| Contribution periods — seeded, current-year only | ✅ Delivered |
| Payment capture with server-side amount derivation | ✅ Delivered |
| Duplicate protection with net-zero unlock | ✅ Delivered |
| Per-sq-ft, per-person, and lump-sum pay unit logic | ✅ Delivered |
| Financial immutability — no edit/delete | ✅ Delivered |
| Compensating transaction flow with correction metadata | ✅ Delivered |
| Paid/Unpaid Matrix report with CSV export | ✅ Delivered |
| Transaction List report with CSV export | ✅ Delivered |
| Month ledger capture helper | ✅ Delivered |
| Rate-period coverage warning for late payments | ✅ Delivered |

---

## F. What Was Deferred

| Deferred feature | Reason |
|---|---|
| Payment gateway integration (Razorpay, PayU) | Scope: app is a ledger, not a payment processor; gateway adds compliance overhead |
| Automated payment reminders (SMS / WhatsApp) | Infrastructure: notification service not yet built |
| Multi-year advance payment booking | Policy: current-year restriction is deliberate; multi-year creates rate-resolution ambiguity |
| Direct debit / standing instruction support | Infrastructure: requires bank API partnership |
| Per-resident payment portal (resident self-service) | Scope: V1 is operator-only; resident self-service is a separate product surface |
| Invoice generation (PDF) | Infrastructure: PDF generation pipeline not yet available |
| Maker-checker for corrections at scale | Scope: deferred to hardening when volume justifies friction (see ADR-001) |
| Multi-society / multi-property support | Scope: MSH is a single-society deployment for now |

---

## G. Infrastructure Established for Dependent Modules

| Asset | Consumers |
|---|---|
| `ContributionHeads` | Contribution rates, payment capture, reports |
| `ContributionRates` (append-only) | Rate resolution at payment time |
| `ContributionPeriods` (seeded) | Period selection in payment capture and reports |
| `Contributions` + `ContributionDetails` | All reports, correction flow |
| Shared error envelope | Unchanged — reused by all subsequent modules |
| Audit log infrastructure | CMM (complaint lifecycle events), future modules |
| Role-based payment restriction (MANAGER/ADMIN only) | CMM note visibility model |

---

## Open Questions (Post-V1)

1. Should the current-year restriction be configurable per head, allowing some heads to accept advance payment for the following year?
2. Should `depositedBy` be constrained to active residents or owners, or remain open to any Individual (current policy)?
3. When does a correction become eligible for the maker-checker flow — above a threshold amount, or above a threshold frequency per operator?
4. Should yearly heads support partial-year proration (e.g. a resident who joins mid-year)?
