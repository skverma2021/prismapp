# Section E2 - Speaker Notes (Part 2)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

## E-04 — Error Firewall and Observability

### E-04-1: `fromUnknownError`: The Classification Firewall

[OPEN: src/lib/api-response.ts — show fromUnknownError]

Everything in the catch block of a route handler flows through one function. Read it as a classifier with seven branches.

Branch 1. The error is already an HttpError. It passes through unchanged. The domain logic already decided what the error is.

Branch 2. P2002, a unique constraint, becomes 409 CONFLICT. Without this mapping, a duplicate block description would return a Prisma error message. That message exposes the internal schema.

Branch 3. P2003, referential integrity, becomes 409 CONFLICT. Suppose you try to delete a block that has units. Prisma throws P2003. The firewall maps it to a clean "Operation violates a related data constraint."

Branch 4. P2025, record not found, becomes 404. This happens when an update or delete targets an ID that does not exist.

Branches 5 and 6. Connectivity and transaction failures become 503 SERVICE_UNAVAILABLE with `retryable: true`. The client can retry automatically.

Branch 7. Anything else becomes 500 INTERNAL_ERROR. It is always logged. The raw error is never returned.

The consequence is clear. The client never sees a raw Prisma error. It never sees a stack trace.

It never sees a message like "Could not perform query because of a constraint violation on constraint: unique_blocks_description_key".

**Takeaway: One function. Seven branches. The client always gets `ApiEnvelope`. The server's internals are never leaked.**

---

### E-04-2: Structured Logging

[OPEN: api-response.ts — show logServerError]

When `fromUnknownError` reaches the 500 branch, it calls `logServerError`. The function writes structured JSON to stdout:

```json
{"level":"error","requestId":"abc-123","status":500,"code":"INTERNAL_ERROR","message":"..."}
```

Why JSON? The Vercel log dashboard can filter on individual fields. `level = "error"`. `requestId = "abc-123"`.

These are first-class queries. They are not regex searches on plain text.

What is NOT logged? 400-level errors.

Auth failures, validation errors, and not-found responses are expected outcomes. Logging every 400 would flood the log dashboard with noise.

Only 500+ errors and database errors are server-side failures worth logging.

**Takeaway: Log 500s as structured JSON. Use the requestId field. Do not log 400s — they're expected domain outcomes.**

---

### E-04-3: Sentry Integration

[OPEN: instrumentation.ts — show register() and onRequestError]

[OPEN: sentry.server.config.ts — show tracesSampleRate]

`onRequestError = Sentry.captureRequestError`. This is a Next.js 15+ instrumentation hook.

Any unhandled request error is sent to Sentry automatically. We need no manual `Sentry.captureException` calls inside route handlers.

`tracesSampleRate: 0.1` in production. That is ten percent.

Sentry charges by transaction volume. 10% captures enough data for latency analysis without a large bill. In development, the rate is 100%, so we trace everything.

The DSN comes from `NEXT_PUBLIC_SENTRY_DSN`. If it is not set, `Sentry.init(dsn: undefined)` does nothing, silently. There are no crashes and no errors.

Here is what structured logs cannot do. They cannot aggregate.

Suppose the same error occurs 200 times across 200 different requestIds. Your logs show 200 separate entries.

Sentry groups them into one issue. It shows the frequency. It shows the stack trace once. And it can alert you when the count exceeds a threshold.

There are three layers of observability. Console logs are the raw events. The request ID is the correlation key. Sentry is the aggregation and alerting layer.

**Takeaway: Structured logs, request correlation, and Sentry are all present from day one. Each adds something the others cannot provide.**

---

## E-05 — Database Indexes: From Slow to Fast

### E-05-1: Why Indexes Exist

[SHOW: bar chart — query time with and without index on 10,000 rows]

Without an index, the database does a full table scan. It reads every row. It compares. It discards.

With an index, it does a B-tree lookup. That is O(log n). On 10,000 rows, it needs about 14 comparisons instead of 10,000.

[OPEN: prisma/schema.prisma — Unit model]

`@@unique([blockId, description])` is a uniqueness constraint. It is also an implicit index.

`@@index([blockId])` supports the filter on the units list page: "show me all units in Block A." Without this index, that query scans every unit in the system.

Now the cost. Every index slows INSERT, UPDATE, and DELETE, because the B-tree must be updated.

A table with 10 indexes takes roughly 10 times longer to write to. So choose indexes based on query patterns.

**Takeaway: Indexes make reads fast. They cost writes. Add them for filter and sort columns that are queried frequently.**

---

### E-05-2: Temporal Indexes

[OPEN: schema.prisma — UnitOwner @@index declarations]

`@@index([unitId, fromDt, toDt])` supports the overlap check query: `WHERE unitId = ? AND (toDt IS NULL OR toDt >= startDate) AND fromDt <= endDate`.

It is a composite index because all three columns are in the WHERE clause together.

[OPEN: schema.prisma — Contribution @@index declarations]

The Contribution table has five indexes. Walk through each one and name the query it enables.

`[unitId, contributionHeadId]` is for the month ledger query. The contribution capture page fetches all contributions for one unit and head pair. This is the most used query in the system.

`[transactionDateTime]` is for the date range filter of the transactions report.

`[correctionOfContributionId]` is for corrections. When you view a contribution, you look up whether it has been corrected. Without this index, that lookup scans the entire contributions table.

**Takeaway: Trace every `@@index` to the query pattern it supports. If you can't name the query, question whether the index belongs.**

---

### E-05-3: The Index You Don't Add

[OPEN: schema.prisma — AuditLog — show absence of @@index([action])]

The audit log has three indexes. It deliberately does not have `@@index([action])`.

Why not? Action has about 20 distinct values. That is low cardinality.

An index is most effective when it narrows the result set a lot. That is high selectivity.

`unitId` with 200 units is highly selective. Filtering by unit returns 0.5% of records.

`action` with 20 values returns 5% per value. The B-tree lookup is less effective. PostgreSQL might decide that a sequential scan is faster.

The action filter on the audit log page is always combined with a time range. The `[createdAt]` index does the heavy work. Filtering by action on the already reduced result set is cheap.

Adding the index would slow every audit log write for minimal read benefit.

Now the difference between composite and separate indexes. `@@index([unitId, fromDt, toDt])` is NOT three indexes.

Three separate indexes cannot serve a query that filters all three columns together.

Column order in a composite index matters. Put equality columns first and range columns last.

**Takeaway: High-selectivity columns make good indexes. Low-selectivity columns usually don't. Composite index column order matches your WHERE clause order.**

---

## E-06 — Exercise: The Hardening Checklist

### E-06-1: The Five-Point Security Checklist

[SHOW: checklist card]

Work through this on the parking space module from Section D, or on any new module you have built.

There are five items. Each one is binary. It is present or it is not. There is no partial credit.

Read the items aloud and prompt students to check their own code.

1. `requireReadRole` on every GET.
2. `requireMutationRole` on every POST/PATCH/DELETE. The returned `actor` is passed to the service.
3. `writeAuditLog` after every mutation. Outside the transaction.
4. Every catch block uses `fromUnknownError`.
5. Input is parsed from `unknown`, not trusted directly.

Any blank is a production gap, not a style issue.

Each one represents a class of vulnerability or a compliance requirement.

**Takeaway: The checklist takes five minutes. It catches the gaps that code review misses under time pressure.**

---

### E-06-2: The Missing-Index Exercise

[OPEN: schema.prisma — Complaint model]

The Complaint model has `@@index([unitId])` and `@@index([status])`. A new report is needed: complaints for a block, newest first.

The query filters by `unit.blockId`, which is a join condition. It sorts by `createdAt DESC`.

The sort is the bottleneck. Without a `[createdAt]` index, PostgreSQL sorts all matching rows in memory before it applies the page limit.

Walk through the fix. Add `@@index([createdAt])` to the Complaint model. Then run `npx prisma migrate dev --name add_complaint_created_at_index`.

Now the harder question. Suppose the most common query is "complaints for a specific unit, newest first." Would `@@index([unitId, createdAt])` be better than separate indexes?

Yes. A composite index on `[unitId, createdAt]` lets PostgreSQL use one index for both steps. It serves the filter, which is equality on unitId. It also serves the sort, which is order on createdAt.

Separate indexes would require a merge step.

**Takeaway: Trace the slow query to its missing index. Know when a composite index beats two separate ones.**

---

### E-06-3: The Hardening Layer: Course Wrap-Up

[SHOW: the eight-row hardening summary table]

Read through the table. Every row maps a production property to the specific code that implements it.

Identity verification uses `getToken`. There is no DB hit per request.
Role enforcement uses `requireMutationRole`. It sits at the top of every handler.
Structured errors use the `fromUnknownError` classification firewall.
Request correlation uses `proxy.ts` and `x-request-id`.
Brute-force protection is a rate limit on the credentials endpoint.
The audit trail uses `writeAuditLog` with a before and after diff.
Error alerting uses Sentry and `onRequestError`.
Query performance uses `@@index` declarations and a composite strategy.

[SHOW: course arc timeline]

Section A: scope. Section B: data model. Section C: technology choices. Section D: CRUD patterns. Section E: hardening.

You started from a blank project. Now you understand every layer of a production application.

You know the requirements that drove the decisions. You know the data model that encodes the domain rules. You know the technology choices and why they were made. You know the repeatable implementation patterns.

And you know the hardening layer. It makes the difference between a demo and a system you can trust with financial data.

Apply the hardening checklist to your next project. Audit the one you are already working on. The gaps will be obvious.

**Course complete.**
