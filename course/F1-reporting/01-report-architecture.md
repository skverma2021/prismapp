# Slide Script — F-01: Report Architecture

---

## Slide 1 — Why Two Reports?

**Type:** `Concept`

**Headline:**
> One report answers "who has paid". The other answers "what exactly happened and when".

**Visual / layout:**
Two columns. Left: "Paid/Unpaid Matrix" — grid icon, subtitle "Coverage view". Right: "Transactions Report" — table icon, subtitle "Audit view". Below each: 3 bullet use cases.

**Narration:**
PrismApp has two contribution reports. They answer different questions for different audiences.

**The Paid/Unpaid Matrix** is a management view. It shows, for a selected year and contribution head, which units have paid for which months. The society treasurer runs this to answer: "Which flats still owe January maintenance?" or "What is our collection rate this year?"

**The Transactions Report** is an audit view. It shows every individual contribution detail row — the actual records in the database — with full traceability: who deposited, who recorded, when, for which period, at what rate. The accountant runs this to reconcile records or answer: "Show me all payments deposited by Mr. Sharma in March."

Both reports require the same authentication (any of the three roles). Neither requires write access.

**On-screen action / demo:**
Open the app. Navigate to the dashboard home page. Show both report cards in the Reporting section. Click into each report briefly.

**Key takeaway:**
Matrix = management coverage view. Transactions = audit trail.

---

## Slide 2 — How Reporting Fits the App Architecture

**Type:** `Diagram`

**Headline:**
> Reports are read-only route handlers backed by a single service file.

**Visual / layout:**
Two parallel flows, side by side:

```
Browser → /reports/contributions/paid-unpaid-matrix (Client Component page)
                ↓  fetch
         /api/reports/contributions/paid-unpaid-matrix (Route Handler)
                ↓  calls
         contributions-reports.service.ts → getPaidUnpaidMatrixReport()
                ↓  queries
         PostgreSQL (ContributionDetail, Unit, ContributionRate, ...)
```

Same structure for transactions.

**Narration:**
Each report follows the same three-layer flow.

The **UI page** is a Client Component. It holds filter state, sends a `fetch` request to the API, and renders the results. All state management and filtering is in the browser — none of it is server state.

The **route handler** is minimal. It calls `requireReadRole` to enforce authentication, calls a param-parser from the service, calls the service function, and wraps the result in the standard `ok()` envelope.

The **service function** is where all the work is. It validates parameters, builds the Prisma `where` clause, runs the queries (often multiple in parallel via `db.$transaction`), and assembles the response shape.

This separation means: if you need to add a new filter, you change the service (and the UI). The route handler is untouched.

**On-screen action / demo:**
Open the four files in VS Code: `paid-unpaid-matrix/route.ts`, `contributions-reports.service.ts` (top), `paid-unpaid-matrix/page.tsx` (briefly). Show how thin the route handler is.

**Key takeaway:**
Route handler is thin. Service does the work. UI fetches and renders. Same pattern as every other module.

---

## Slide 3 — The `ContributionDetail` Grain

**Type:** `Concept`

**Headline:**
> Reports are built at the `ContributionDetail` level — one row per period payment — not the `Contribution` level.

**Visual / layout:**
ERD fragment showing `Contribution` (1) → (many) `ContributionDetail`. Table showing: one `Contribution` with three `ContributionDetail` rows (Jan, Feb, Mar). Column: `amt`, `refYear`, `refMonth`, `appliedRate`.

**Narration:**
This is the most important data model fact for understanding reports.

When a payment is captured, two things are created:
- One `Contribution` record — the transaction header (who paid, when, how much total, at what rate).
- One or more `ContributionDetail` records — one per period covered by that payment.

A single payment can cover multiple months. If a resident pays three months of maintenance at once, there is one `Contribution` and three `ContributionDetail` rows.

Reports are built from `ContributionDetail`, not `Contribution`, because:
- The matrix needs to know "is month X paid for unit Y?" — that is a detail-level question.
- The transaction list shows per-period rows, not per-payment rows.
- Totals (`sumAmount`) are sums over detail amounts, not contribution amounts.

This is why `getContributionTransactionsReport` queries `db.contributionDetail.findMany`, not `db.contribution.findMany`.

**On-screen action / demo:**
Open `src/modules/reports/contributions-reports.service.ts`. Show the `TransactionsReportParams` type and the first line of `getContributionTransactionsReport` — `db.contributionDetail.findMany(...)`.

**Key takeaway:**
`ContributionDetail` is the grain for all contribution reports. Each row is one period's payment, not one transaction.
