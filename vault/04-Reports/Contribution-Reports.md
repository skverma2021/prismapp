# Contribution Reports

Status: Draft (V1)
Owner: Product + Finance + Engineering
Last Updated: 2026-03-19

## Purpose
Define V1 contribution reports with exact filters, columns, totals, and output behavior.

## Capture Helper: Month Ledger (V1)

### Goal
Assist contribution capture by showing current-year monthly payment state for selected head + unit.

### Required Filters
- `unitId`
- `headId`
- `refYear` (must be current year)

### Row Grain
One row per month (Jan..Dec).

### Columns
- Month
- Status (`Paid` / `Unpaid`)
- Amount (net posted amount for that month)
- Transaction refs (id/date/amount list)

### Convenience Field
- `latestPaidMonth`: highest month number with `Paid` status.

## Report 1: Paid/Unpaid Matrix

### Goal
Show payment status by Unit vs Period for a selected contribution head and year.

### Required Filters
- `refYear` (required)
- `headId` (required)
- `blockId` (optional)

### Row Grain
One row per unit.

### Columns
- Unit description
- Block description
- Owner name (active owner)
- Resident name (active resident, if any)
- Jan to Dec status columns (`Paid` / `Unpaid` / `N/A`)
- `paidMonthsCount`
- `unpaidMonthsCount`

### Totals
- Total units in result
- Total paid cells
- Total unpaid cells
- Collection amount (sum of paid detail amounts)
- Expected amount (derived from active rate and quantity assumptions for selected months)

### Rules
1. For monthly heads, evaluate months 1..12.
2. For yearly heads, use refMonth = 0 semantics.
3. Duplicate payments must not appear; if found, flag data integrity issue.
4. For payUnit = 2 heads, quantity is operator-entered at payment time; expected amount in matrix uses configured system assumption and should be interpreted as indicative.

## Report 2: Contribution Transaction List

### Goal
Provide auditable list of contribution transactions and details.

### Required Filters
- `refYear` (required)

### Optional Filters
- `refMonth`
- `headId`
- `unitId`
- `blockId`
- `depositedBy`
- `transactionDateFrom`
- `transactionDateTo`

### Row Grain
One row per contribution detail (period-level breakdown).

### Columns
- Contribution ID
- Transaction ID
- Transaction Date/Time
- Block
- Unit
- Head
- Period (Month/Year)
- Quantity
- Applied Rate
- Amount
- Deposited By
- Recorded By (user)
- Recorded At

### Totals
- Row count
- Sum(amount)
- Distinct units count
- Distinct payers count

## Export Requirements (V1)
1. CSV export for both reports.
2. Export must preserve applied filters.
3. Export must include generation timestamp and actor ID.

## SLA and Freshness
1. Data freshness: real-time from transactional DB in V1.
2. Large report generation may be asynchronous in future versions.

## Reusable Template Notes
For other projects:
- Keep Goal, Filters, Grain, Columns, Totals structure.
- This structure is generic enough for any financial reporting module.
