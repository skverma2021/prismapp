# Section E2 - Speaker Notes (Part 2)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

## E-04 — Error Firewall and Observability

### E-04-1: `fromUnknownError`: The Classification Firewall

[OPEN: src/lib/api-response.ts — show fromUnknownError]

Everything in a route handler's catch block flows through one function. Read it as a classifier with seven branches.

Branch 1: already an HttpError — pass through unchanged. The domain logic already decided what the error is.

Branch 2: P2002 unique constraint → 409 CONFLICT. Without this mapping, a duplicate block description would return a Prisma error message that exposes the internal schema.

Branch 3: P2003 referential integrity → 409 CONFLICT. Trying to delete a block that has units — Prisma throws P2003, the firewall maps it to a clean "Operation violates a related data constraint."

Branch 4: P2025 record not found → 404. An update or delete targeting a nonexistent ID.

Branches 5-6: connectivity/transaction failures → 503 SERVICE_UNAVAILABLE with `retryable: true`. The client can retry automatically.

Branch 7: anything else → 500 INTERNAL_ERROR. Always logged. Never the raw error.

The consequence: the client never sees a raw Prisma error, never a stack trace, never "Could not perform query because of a constraint violation on constraint: unique_blocks_description_key".

**Takeaway: One function. Seven branches. The client always gets `ApiEnvelope`. The server's internals are never leaked.**

---

### E-04-2: Structured Logging

[OPEN: api-response.ts — show logServerError]

When `fromUnknownError` reaches the 500 branch, it calls `logServerError`. The function writes structured JSON to stdout:

```json
{"level":"error","requestId":"abc-123","status":500,"code":"INTERNAL_ERROR","message":"..."}
```

Why JSON? Vercel's log dashboard can filter on individual fields. `level = "error"`. `requestId = "abc-123"`. These are first-class queries, not regex on plain text.

What is NOT logged: 400-level errors. Auth failures, validation errors, not-found responses — these are expected outcomes. Logging every 400 would flood the log dashboard with noise. Only 500+ errors and database errors are server-side failures worth logging.

**Takeaway: Log 500s as structured JSON. Use the requestId field. Do not log 400s — they're expected domain outcomes.**

---

### E-04-3: Sentry Integration

[OPEN: instrumentation.ts — show register() and onRequestError]

[OPEN: sentry.server.config.ts — show tracesSampleRate]

`onRequestError = Sentry.captureRequestError` — this is a Next.js 15+ instrumentation hook. Any unhandled request error is automatically sent to Sentry. No manual `Sentry.captureException` calls inside route handlers.

`tracesSampleRate: 0.1` in production. Ten percent. Sentry charges by transaction volume. 10% captures enough for latency analysis without a large bill. In development, 100% — trace everything.

The DSN is from `NEXT_PUBLIC_SENTRY_DSN`. If it's not set, `Sentry.init(dsn: undefined)` does nothing silently. No crashes, no errors.

What structured logs cannot do: aggregate. If the same error occurs 200 times across 200 different requestIds, your logs show 200 separate entries. Sentry groups them into one issue, shows the frequency, shows the stack trace once, and can alert you when it exceeds a threshold.

Three layers of observability. Console logs: the raw events. Request ID: the correlation key. Sentry: the aggregation and alerting layer.

**Takeaway: Structured logs, request correlation, and Sentry are all present from day one. Each adds something the others cannot provide.**

---

## E-05 — Database Indexes: From Slow to Fast

### E-05-1: Why Indexes Exist

[SHOW: bar chart — query time with and without index on 10,000 rows]

Without an index: full table scan. Read every row. Compare. Discard.

With an index: B-tree lookup. O(log n). On 10,000 rows, about 14 comparisons instead of 10,000.

[OPEN: prisma/schema.prisma — Unit model]

`@@unique([blockId, description])` — uniqueness constraint. Also an implicit index.

`@@index([blockId])` — the units list page filter: "show me all units in Block A." Without this index, that query scans every unit in the system.

The cost: every index slows INSERT, UPDATE, and DELETE — the B-tree must be updated. A table with 10 indexes takes roughly 10× longer to write to. Choose indexes based on query patterns.

**Takeaway: Indexes make reads fast. They cost writes. Add them for filter and sort columns that are queried frequently.**

---

### E-05-2: Temporal Indexes

[OPEN: schema.prisma — UnitOwner @@index declarations]

`@@index([unitId, fromDt, toDt])` — supports the overlap check query: `WHERE unitId = ? AND (toDt IS NULL OR toDt >= startDate) AND fromDt <= endDate`. Composite because all three columns are in the WHERE clause together.

[OPEN: schema.prisma — Contribution @@index declarations]

Five indexes on the Contribution table. Walk through each one and name the query it enables.

`[unitId, contributionHeadId]` — the month ledger query. The contribution capture page fetches all contributions for one unit+head pair. This is the most-used query in the system.

`[transactionDateTime]` — the transactions report date range filter.

`[correctionOfContributionId]` — when viewing a contribution, look up whether it has been corrected. Without this index, that lookup scans the entire contributions table.

**Takeaway: Trace every `@@index` to the query pattern it supports. If you can't name the query, question whether the index belongs.**

---

### E-05-3: The Index You Don't Add

[OPEN: schema.prisma — AuditLog — show absence of @@index([action])]

The audit log has three indexes. It deliberately does not have `@@index([action])`.

Why not? Action has about 20 distinct values. Low cardinality. An index is most effective when it narrows the result set significantly — high selectivity. `unitId` with 200 units is highly selective — filtering by unit returns 0.5% of records. `action` with 20 values returns 5% per value. The B-tree lookup is less effective; PostgreSQL might decide a sequential scan is faster.

The action filter on the audit log page is always combined with a time range — the `[createdAt]` index does the heavy lifting. Filtering by action on the already-reduced time-range result set is cheap.

Adding the index would penalize every audit log write for minimal read benefit.

And the composite vs separate distinction: `@@index([unitId, fromDt, toDt])` is NOT three indexes. Three separate indexes cannot serve a query that filters all three columns together. Composite column order matters: equality columns first, range columns last.

**Takeaway: High-selectivity columns make good indexes. Low-selectivity columns usually don't. Composite index column order matches your WHERE clause order.**

---

## E-06 — Exercise: The Hardening Checklist

### E-06-1: The Five-Point Security Checklist

[SHOW: checklist card]

Work through this on the parking space module from Section D, or any new module you've built.

Five items. Each one is binary — present or not. No partial credit.

Read the items aloud and prompt students to check their own code.

1. `requireReadRole` on every GET.
2. `requireMutationRole` on every POST/PATCH/DELETE. The returned `actor` is passed to the service.
3. `writeAuditLog` after every mutation. Outside the transaction.
4. Every catch block uses `fromUnknownError`.
5. Input is parsed from `unknown`, not trusted directly.

Any blank is a production gap, not a style issue. Each one represents a class of vulnerability or a compliance requirement.

**Takeaway: The checklist takes five minutes. It catches the gaps that code review misses under time pressure.**

---

### E-06-2: The Missing-Index Exercise

[OPEN: schema.prisma — Complaint model]

The Complaint model has `@@index([unitId])` and `@@index([status])`. A new report is needed: complaints for a block, newest first.

The query filters by `unit.blockId` (a join condition) and sorts by `createdAt DESC`. The sort is the bottleneck — without a `[createdAt]` index, PostgreSQL sorts all matching rows in memory before applying the page limit.

Walk through the fix: add `@@index([createdAt])` to the Complaint model, run `npx prisma migrate dev --name add_complaint_created_at_index`.

Now the harder question: if the most common query is "complaints for a specific unit, newest first," would `@@index([unitId, createdAt])` be better than separate indexes? Yes — a composite index on `[unitId, createdAt]` allows PostgreSQL to use one index for both the filter (equality on unitId) and the sort (range/order on createdAt). Separate indexes would require a merge step.

**Takeaway: Trace the slow query to its missing index. Know when a composite index beats two separate ones.**

---

### E-06-3: The Hardening Layer: Course Wrap-Up

[SHOW: the eight-row hardening summary table]

Read through the table. Every row maps a production property to the specific code that implements it.

Identity verification — `getToken`, no DB hit per request.
Role enforcement — `requireMutationRole` at the top of every handler.
Structured errors — `fromUnknownError` classification firewall.
Request correlation — `proxy.ts`, `x-request-id`.
Brute-force protection — rate limit on the credentials endpoint.
Audit trail — `writeAuditLog`, before/after diff.
Error alerting — Sentry, `onRequestError`.
Query performance — `@@index` declarations, composite strategy.

[SHOW: course arc timeline]

Section A: scope. B: data model. C: technology choices. D: CRUD patterns. E: hardening.

You started from a blank project. You now understand every layer of a production application — the requirements that drove the decisions, the data model that encodes the domain rules, the technology choices and why they were made, the repeatable implementation patterns, and the hardening layer that makes the difference between a demo and a system you can trust with financial data.

Apply the hardening checklist to your next project. Audit the one you're already working on. The gaps will be obvious.

**Course complete.**
