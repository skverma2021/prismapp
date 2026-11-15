# Module Outline — F: Contribution Reporting

## Identity

| Field | Value |
|---|---|
| Section | F — Contribution Reporting |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | Sections A–E (scope, ERD, technology, CRUD, hardening) |
| Estimated duration | 50–60 minutes |
| Companion project | PrismApp — Society Management System |

---

## Purpose

The CRUD operations in Section D created records. Section F explains how to read those records back in a form that answers real questions:

- Which units have paid their maintenance for every month this year?
- How much has been collected against the expected amount?
- Show me every transaction for Unit A-104, sorted by date.

Reporting is not just SELECT *. It requires: multi-table joins, temporal lookups (active owner at time of report run), aggregate totals, deterministic pagination, and safe CSV export.

---

## Learning Objectives

By the end of this module, the student will be able to:

1. Explain the difference between a transaction list report and a matrix report, and when each is appropriate.
2. Describe the `ContributionDetail` grain and why reports are built at that level rather than the `Contribution` level.
3. Read the `getContributionTransactionsReport` service function and identify each of the five parallel database queries and what each returns.
4. Explain how the paid/unpaid matrix computes `Paid`, `Unpaid`, and `N/A` for each cell, and handle the MONTH vs YEAR period type difference.
5. Describe how CSV export reuses the service functions with `pageSize: Number.MAX_SAFE_INTEGER` and prepends filter-echo metadata rows.
6. Explain why totals (`sumAmount`, `distinctUnitsCount`, `expectedAmount`) must be computed across all pages, not just the current page.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 1 | `01-report-architecture.md` | Why two reports, how reporting fits the app | 7 min |
| 2 | `02-transactions-report.md` | The transaction list — filters, grain, totals | 10 min |
| 3 | `03-paid-unpaid-matrix.md` | The matrix — units × periods, status cells, totals | 12 min |
| 4 | `04-service-layer.md` | Inside the service — param parsing, batched queries, rounding | 10 min |
| 5 | `05-csv-export.md` | CSV export — reuse, metadata, filter echo, safety | 7 min |
| 6 | `06-reporting-exercise.md` | Hands-on: run reports, read the service, write a filter | 8 min |

---

## Key Files

| File | Role |
|------|------|
| `src/modules/reports/contributions-reports.service.ts` | All report logic: param parsing, queries, CSV generation |
| `app/api/reports/contributions/transactions/route.ts` | Route handler for JSON transactions report |
| `app/api/reports/contributions/transactions.csv/route.ts` | Route handler for CSV transactions export |
| `app/api/reports/contributions/paid-unpaid-matrix/route.ts` | Route handler for JSON matrix report |
| `app/api/reports/contributions/paid-unpaid-matrix.csv/route.ts` | Route handler for CSV matrix export |
| `app/reports/contributions/paid-unpaid-matrix/page.tsx` | UI page for the paid/unpaid matrix |
| `app/reports/contributions/transactions/page.tsx` | UI page for the transactions report |
| `vault/04-Reports/Contribution-Reports.md` | The authoritative spec: filters, grain, columns, totals |

---

## Key Concepts

| Concept | Where it appears |
|---------|----------------|
| `ContributionDetail` grain | Each detail row represents one period's portion of a contribution payment |
| `MONTH` vs `YEAR` period type | Drives whether the matrix shows 12 month columns or a single year column |
| `payUnit` (1=sqft, 2=resident count, 3=flat) | Affects quantity in expected amount calculation |
| `roundTo2()` | All monetary totals are rounded to 2 decimal places — never trust floating-point sums |
| `db.$transaction([...])` | Parallel read queries in one Prisma transaction for consistency and performance |
| `pageSize: Number.MAX_SAFE_INTEGER` | CSV export fetches all rows in a single call, bypassing pagination |
| Filter echo in CSV | Every active filter is written as a metadata row before the data header row |

---

## Definition of Done for This Module

1. Student can explain what each total in the matrix represents.
2. Student can trace a paid cell computation from `ContributionDetail` through `paidByUnitMonth` to the matrix row.
3. Student can read the CSV export function and identify the metadata section and the data section.
4. Student can describe what happens when `pageSize: Number.MAX_SAFE_INTEGER` is passed to the service.
