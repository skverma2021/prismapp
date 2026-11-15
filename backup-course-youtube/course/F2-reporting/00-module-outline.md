# Module Outline — F2: Contribution Reporting (Part 2 — CSV Export, URL State, Exercise)

> **This is Part 2 of Section F.** Part 1 is in [`../F1-reporting/00-module-outline.md`](../F1-reporting/00-module-outline.md).
> Read Part 1 first for prerequisites and the full learning-objectives list.

## Identity

| Field | Value |
|---|---|
| Section | F2 — Contribution Reporting (Part 2 of 2) |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | F1 — Reporting Part 1 (Architecture + Transactions Report + Paid/Unpaid Matrix + Service Layer) |
| Estimated duration | 20–24 minutes |
| Companion project | PrismApp — Society Management System |

---

## Learning Objectives (Part 2)

By the end of this part, the student will be able to:

1. Describe how CSV export reuses service functions with `pageSize: Number.MAX_SAFE_INTEGER` and prepends filter-echo metadata rows.
2. Explain the URL-state pattern for report filters and implement it using `useSearchParams` and `router.replace`.
3. Apply the full reporting architecture from design to implementation to a new reporting scenario.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 5 | `05-csv-export.md` | CSV Export — Reuse, Metadata, Safety | 7 min |
| 5b | `05b-url-state.md` | URL State for Report Filters | 7 min |
| 7 | `07-reporting-exercise.md` | Exercise: Read, Filter, and Export | 7 min |

> **Note on slide numbering:** Topic 5b (`05b-url-state.md`) was added after the original section outline was drafted.
> The `F2-reporting-notes.md` speaker notes file uses the heading `## F-06-01` through `## F-06-03` for URL state content.
> The exercise file is numbered `07` (not `06`) because `06-reporting-exercise.md` was renumbered when 05b was inserted.

---

## Key Takeaways (Part 2)

1. CSV export is not a separate code path — it calls the same service function with `pageSize: Number.MAX_SAFE_INTEGER` and streams the result. This guarantees CSV and JSON data are always identical.
2. Filter-echo metadata rows at the top of the CSV tell the recipient exactly what filters produced the data — critical when CSV files are forwarded by email.
3. Storing report filters in the URL means the user can bookmark a specific report view, share it, and reload it without re-entering filters. The URL is the state.

---

## Vault References

| Vault file | Used in topic # | What to show |
|---|---|---|
| `vault/04-Reports/Contribution-Reports.md` | 5, 7 | CSV format spec; filter-echo metadata rows |
| `vault/03-API/Pagination-and-Filtering.md` | 5b | Filter and sort param contract |

## Code References

| File | Used in topic # | What to show |
|---|---|---|
| `app/api/reports/contributions/transactions.csv/route.ts` | 5 | CSV route handler; `pageSize: Number.MAX_SAFE_INTEGER` |
| `app/api/reports/contributions/paid-unpaid-matrix.csv/route.ts` | 5 | CSV matrix export |
| `src/modules/reports/contributions-reports.service.ts` | 5 | `generateTransactionsCsv`, filter-echo metadata prepend |
| `app/reports/contributions/transactions/page.tsx` | 5b | `useSearchParams`, `router.replace`, filter-to-URL sync |
| `app/reports/contributions/paid-unpaid-matrix/page.tsx` | 5b | URL state for matrix filters |

---

## Assessment / Discussion Questions

1. The CSV export function calls the service with `pageSize: Number.MAX_SAFE_INTEGER`. What is the risk of this approach at very large data volumes, and what should be done in that case?
2. A user bookmarks a report URL with `?blockId=2&periodId=5`. They return next month and the period is now different. Should the URL state be considered durable? Why or why not?
3. The filter-echo rows appear at the top of the CSV. A teammate says "remove them — they break Excel auto-import." How do you respond?
4. *Stretch:* You need to add a new filter (e.g., `contributionHeadId`) to the transactions report. List every file that must change.

---

## Production Notes

| Item | Note |
|---|---|
| Screen recordings needed | `app/api/reports/contributions/transactions.csv/route.ts`; `app/reports/contributions/transactions/page.tsx`; sample CSV output in browser/Excel |
| Diagrams needed | URL state flow: user types → URL updates → page re-renders (topic 5b) |
| Talking-head segments | Intro to Part 2 (30s); exercise intro (60s); wrap-up for full Section F (90s) |

---
