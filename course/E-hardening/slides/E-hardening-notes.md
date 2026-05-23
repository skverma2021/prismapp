# E-Hardening — Assembled Speaker Notes

Presenter notes for Section E: Hardening.
Organized by topic file and slide number.

---

## E-01 — AuthN vs AuthZ: The Two-Layer Model

### E-01-1: Two Questions, Two Answers

Section E — Hardening. We're shifting from "how do I build it" to "how do I make it trustworthy."

Authentication and authorization are two separate concerns. Mixing them up produces systems that redirect to login when the user is already logged in, or silently accept requests from the wrong user role.

[OPEN: auth.ts — show authorize() function]

Authentication happens once — at login. The `authorize()` function is the only place in the system that queries `db.appUser.findUnique`. It compares the password hash. It returns a user object. That user object is encoded into a JWT.

[OPEN: authz.ts — show getAuthContext]

Authorization happens on every subsequent request. `getToken` verifies the JWT signature cryptographically. No database hit. If the signature is valid, `userId` and `role` are extracted directly from the token payload. The database is not consulted.

The trade-off: if you deactivate a user account, their JWT remains valid until it expires. For V1, with a short token lifetime and a small operator team, this is acceptable. If you need real-time revocation — a token denylist in Redis — that is a V2+ concern.

**Takeaway: Authentication hits the database once. Authorization never hits it. The JWT carries the identity for the session lifetime.**

---

### E-01-2: 401 vs 403

[SHOW: the decision tree diagram]

Two HTTP status codes. Two very different client responses.

401 means "I don't know who you are." The token is missing, expired, or tampered. The correct client action is: redirect to the login page.

403 means "I know who you are, and you can't do this." The token is valid. The role is wrong. The correct client action is: show an access-denied message. Do NOT redirect to login — the user is already logged in. Sending them back to the login page when they're already authenticated is confusing.

[OPEN: authz.ts — show requireRole throwing 401 vs 403]

The status code is determined by where in the chain the failure occurs. `getAuthContext` throws 401 — that's the authentication check. `requireRole` throws 403 — that's the authorization check, and it only runs after `getAuthContext` succeeds.

**Takeaway: The HTTP status tells the client what to do next. 401 → go log in. 403 → you're logged in, you just don't have access.**

---

### E-01-3: UI Gating Is Not Security

[OPEN: blocks/page.tsx — show canMutate flag]

`const canMutate = session.role !== "READ_ONLY"`. The Create Block button is disabled when this is false. A Read-Only user sees the button but cannot click it.

[OPEN: app/api/blocks/route.ts — show requireMutationRole in POST]

`await requireMutationRole(request)`. This runs regardless of what the UI showed.

Open a browser console. Type:
```javascript
fetch("/api/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: "Hacked" }) })
```

If you're logged in as Read-Only, you get 403. The server rejects it. The button was already disabled — but that didn't matter for the server.

The two layers serve different purposes. The UI layer is courtesy — it prevents accidental clicks and provides visual feedback. The server layer is the actual security boundary. Never rely on one without the other, and never confuse which one is doing the protecting.

**Takeaway: Server-side role checks are not optional. The UI can be bypassed by anyone with a terminal.**

---

## E-02 — Rate Limiting and Request Tracing

### E-02-1: Why Login Needs Rate Limiting

[OPEN: proxy.ts — show checkRateLimit function]

This is the OWASP A07 gap: a login endpoint that allows unlimited attempts.

10 attempts per IP per 15-minute window. On the 11th attempt, 429 is returned with a `Retry-After` header. Automated scripts are stopped. Manual brute force takes weeks — impractical.

Why only the login endpoint? Because it's the only endpoint in the system that can be used to gain access. Brute-forcing `GET /api/blocks` returns block data for every guess — that's not a meaningful attack surface. Brute-forcing the login endpoint can yield a valid session.

The IP is read from `x-forwarded-for`. On Vercel's edge network, this header is set by Vercel itself to the real client IP — it cannot be spoofed by the client. `request.ip` was removed in Next.js 16; headers are the portable approach.

**Takeaway: Rate limit the login endpoint specifically. 10/15min per IP is enough to deter automated attacks without inconveniencing legitimate users.**

---

### E-02-2: `x-request-id`: Request Correlation

[OPEN: proxy.ts — show request ID injection]

Every API request gets a UUID. The proxy generates one if the caller didn't provide one. It's set on the request headers going in, and on the response headers coming out.

[OPEN: app/api/blocks/route.ts — show getRequestId usage in catch block]

`fromUnknownError(error, getRequestId(request))` passes the requestId into the error classifier, which passes it into `logServerError`, which includes it in the structured JSON log.

Here's the value: a user reports an error at 14:34. You have ten thousand log lines. Without a requestId, you grep for the timestamp and the endpoint and hope for the best. With a requestId, you filter one field and get one log line. The requestId is in the browser's network panel, in the NoticeStack error message, and in the Vercel log — all three, simultaneously.

**Takeaway: The request ID is one UUID. It saves hours of debugging. It costs nothing.**

---

### E-02-3: The Known Limitation of In-Memory Rate Limiting

[SHOW: two-diagram comparison]

The `rateLimitStore` is a JavaScript Map at module scope. On Vercel, each serverless function invocation may be a different process with a different Map. Two concurrent login attempts on different instances — both see count 1.

This is documented in the proxy.ts comment. The limitation is accepted for V1 because:
1. The app is used by a small, known operator team. High-volume concurrent brute force is not the threat model.
2. Sequential brute force scripts are still stopped — they hit the same warm instance repeatedly.
3. Adding Redis to fix this requires an external dependency and a Vercel integration. The gain does not justify the complexity for V1.

If the threat model changes — the app is exposed to the internet, or the operator team grows significantly — upgrade to a shared counter (Upstash Redis has a Next.js integration that takes about 15 minutes to set up).

**Takeaway: Document the limitation when you make the trade-off. The in-memory approach is correct for V1. The upgrade path is known.**

---

## E-03 — Audit Logging

### E-03-1: What the Audit Log Records

[OPEN: src/lib/audit-log.ts — show AuditEntry type]

Five fields answer five questions: who (`actorUserId`), in what capacity (`actorRole`), what action, on which entity type, which specific record. The `payload` carries the data.

[OPEN: blocks.service.ts — show writeAuditLog call after updateBlock]

For an update, the payload is `{ before: { description: "Block A" }, after: { description: "Block G" } }`. That is auditable. A compliance reviewer can see exactly what changed, not just that something changed.

For a create, the payload is the input. For a delete, it's the entity identifier and key fields. For a financial correction, it's the reason code, reason text, and the original contribution ID.

[OPEN: audit-log page — show a rendered row with payload expanded]

**Takeaway: The audit log answers: who, in what capacity, what action, on which record, what changed.**

---

### E-03-2: Why Audit Writes Are Outside the Transaction

[OPEN: ownerships.service.ts — show the structure: $transaction → resolve → writeAuditLog]

The business write is inside `$transaction`. The audit write is outside — after the transaction has already committed, using `db`, not `tx`.

The code comment explains: driver adapters don't guarantee atomicity for interactive transactions. If the audit write were inside the same transaction, a transient failure in the audit write could roll back the ownership record — a committed business event would be undone because its log entry failed.

The audit log is secondary. The contribution/ownership row itself carries `actorUserId` and `actorRole`. If the audit log write fails, the entity table still has the identity data. `writeAuditLog` catches its own errors and logs them to console — it never re-throws.

**Takeaway: Transaction boundary is around the business data. Audit writes are outside. An audit failure does not undo a valid business write.**

---

### E-03-3: Audit Log Indexes and Querying

[OPEN: prisma/schema.prisma — AuditLog @@index declarations]

Three indexes, three access patterns.

`[entityType, entityId]` — "what happened to Block blk_xyz?" Composite because both columns are always in the WHERE clause together.

`[actorUserId]` — "what did user usr_abc do?" The user activity view.

`[createdAt]` — "what happened between 09:00 and 17:00?" The time-range filter on the audit log page.

Notice what's missing: `@@index([action])`. Why? Action has about 20 distinct values — low cardinality. An index on a low-cardinality column isn't very selective. "All CONTRIBUTION_CREATED events" is typically combined with a time filter, which uses the `[createdAt]` index anyway. Adding a standalone `[action]` index would cost write overhead for minimal read gain.

**Takeaway: Design indexes for the queries you will run. Three indexes, three access patterns, no extras.**

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
