# Section E1 - Speaker Notes (Part 1)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

# E-Hardening — Assembled Speaker Notes

Presenter notes for Section E: Hardening.
Organized by topic file and slide number.

---

## E-01 — AuthN vs AuthZ: The Two-Layer Model

### E-01-1: Two Questions, Two Answers

Section E is Hardening. We are shifting from "how do I build it" to "how do I make it trustworthy."

Authentication and authorization are two separate concerns. Mixing them up causes problems.

A system may redirect to login when the user is already logged in. Or it may silently accept requests from the wrong user role.

[OPEN: auth.ts — show authorize() function]

Authentication happens once, at login. The `authorize()` function is the only place in the system that queries `db.appUser.findUnique`.

It compares the password hash. It returns a user object. That user object is encoded into a JWT.

[OPEN: authz.ts — show getAuthContext]

Authorization happens on every later request. `getToken` verifies the JWT signature cryptographically. There is no database hit.

If the signature is valid, `userId` and `role` are extracted directly from the token payload. The database is not consulted.

Here is the trade-off. If you deactivate a user account, their JWT remains valid until it expires.

For V1, this is acceptable. The token lifetime is short and the operator team is small.

If you need real-time revocation, you need a token denylist in Redis. That is a V2+ concern.

**Takeaway: Authentication hits the database once. Authorization never hits it. The JWT carries the identity for the session lifetime.**

---

### E-01-2: 401 vs 403

[SHOW: the decision tree diagram]

Two HTTP status codes. Two very different client responses.

401 means "I do not know who you are." The token is missing, expired, or tampered. The correct client action is to redirect to the login page.

403 means "I know who you are, and you cannot do this." The token is valid. The role is wrong.

The correct client action is to show an access-denied message. Do NOT redirect to login. The user is already logged in, and sending them back to the login page is confusing.

[OPEN: authz.ts — show requireRole throwing 401 vs 403]

The status code depends on where in the chain the failure occurs.

`getAuthContext` throws 401. That is the authentication check.

`requireRole` throws 403. That is the authorization check. It only runs after `getAuthContext` succeeds.

**Takeaway: The HTTP status tells the client what to do next. 401 → go log in. 403 → you're logged in, you just don't have access.**

---

### E-01-3: UI Gating Is Not Security

[OPEN: blocks/page.tsx — show canMutate flag]

`const canMutate = session.role !== "READ_ONLY"`. The Create Block button is disabled when this is false.

A Read-Only user sees the button but cannot click it.

[OPEN: app/api/blocks/route.ts — show requireMutationRole in POST]

`await requireMutationRole(request)`. This runs regardless of what the UI showed.

Open a browser console. Type:
```javascript
fetch("/api/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: "Hacked" }) })
```

If you are logged in as Read-Only, you get 403. The server rejects the request.

The button was already disabled. But that did not matter to the server.

The two layers serve different purposes. The UI layer is a courtesy. It prevents accidental clicks and gives visual feedback.

The server layer is the actual security boundary. Never rely on one without the other. And never confuse which one is doing the protecting.

**Takeaway: Server-side role checks are not optional. The UI can be bypassed by anyone with a terminal.**

---

## E-02 — Rate Limiting and Request Tracing

### E-02-1: Why Login Needs Rate Limiting

[OPEN: proxy.ts — show checkRateLimit function]

This is the OWASP A07 gap. It is a login endpoint that allows unlimited attempts.

The limit is 10 attempts per IP per 15-minute window. On the 11th attempt, 429 is returned with a `Retry-After` header.

Automated scripts are stopped. Manual brute force takes weeks, which is impractical.

Why only the login endpoint? Because it is the only endpoint in the system that can be used to gain access.

Brute-forcing `GET /api/blocks` returns block data for every guess. That is not a meaningful attack surface. Brute-forcing the login endpoint can yield a valid session.

The IP is read from `x-forwarded-for`. On the Vercel edge network, Vercel itself sets this header to the real client IP. The client cannot spoof it.

`request.ip` was removed in Next.js 16. Headers are the portable approach.

**Takeaway: Rate limit the login endpoint specifically. 10/15min per IP is enough to deter automated attacks without inconveniencing legitimate users.**

---

### E-02-2: `x-request-id`: Request Correlation

[OPEN: proxy.ts — show request ID injection]

Every API request gets a UUID. The proxy generates one if the caller did not provide one.

It is set on the request headers going in, and on the response headers coming out.

[OPEN: app/api/blocks/route.ts — show getRequestId usage in catch block]

`fromUnknownError(error, getRequestId(request))` passes the requestId into the error classifier. The classifier passes it into `logServerError`. That function includes it in the structured JSON log.

Here is the value.

A user reports an error at 14:34. You have ten thousand log lines.

Without a requestId, you search for the timestamp and the endpoint and hope for the best. With a requestId, you filter one field and get one log line.

The requestId is in the network panel of the browser. It is in the NoticeStack error message. It is in the Vercel log. All three show it at the same time.

**Takeaway: The request ID is one UUID. It saves hours of debugging. It costs nothing.**

---

### E-02-3: The Known Limitation of In-Memory Rate Limiting

[SHOW: two-diagram comparison]

The `rateLimitStore` is a JavaScript Map at module scope.

On Vercel, each serverless function invocation may be a different process with a different Map. Two concurrent login attempts on different instances both see count 1.

This is documented in the proxy.ts comment. We accept the limitation for V1 for three reasons.

First, the app is used by a small, known operator team. High-volume concurrent brute force is not the threat model.

Second, sequential brute force scripts are still stopped. They hit the same warm instance repeatedly.

Third, adding Redis to fix this requires an external dependency and a Vercel integration. The gain does not justify the complexity for V1.

If the threat model changes, upgrade to a shared counter. For example, the app may be exposed to the internet, or the operator team may grow significantly.

Upstash Redis has a Next.js integration that takes about 15 minutes to set up.

**Takeaway: Document the limitation when you make the trade-off. The in-memory approach is correct for V1. The upgrade path is known.**

---

## E-03 — Audit Logging

### E-03-1: What the Audit Log Records

[OPEN: src/lib/audit-log.ts — show AuditEntry type]

Five fields answer five questions.

Who did it? That is `actorUserId`. In what capacity? That is `actorRole`. What action? On which entity type? Which specific record?

The `payload` carries the data.

[OPEN: blocks.service.ts — show writeAuditLog call after updateBlock]

For an update, the payload is `{ before: { description: "Block A" }, after: { description: "Block G" } }`. That is auditable.

A compliance reviewer can see exactly what changed, not just that something changed.

For a create, the payload is the input. For a delete, it is the entity identifier and key fields.

For a financial correction, it is the reason code, the reason text, and the original contribution ID.

[OPEN: audit-log page — show a rendered row with payload expanded]

**Takeaway: The audit log answers: who, in what capacity, what action, on which record, what changed.**

---

### E-03-2: Why Audit Writes Are Outside the Transaction

[OPEN: ownerships.service.ts — show the structure: $transaction → resolve → writeAuditLog]

The business write is inside `$transaction`. The audit write is outside.

It runs after the transaction has already committed. It uses `db`, not `tx`.

The code comment explains why. Driver adapters do not guarantee atomicity for interactive transactions.

Suppose the audit write were inside the same transaction. A transient failure in the audit write could roll back the ownership record.

A committed business event would be undone because its log entry failed.

The audit log is secondary. The contribution or ownership row itself carries `actorUserId` and `actorRole`. If the audit log write fails, the entity table still has the identity data.

`writeAuditLog` catches its own errors and logs them to console. It never re-throws.

**Takeaway: Transaction boundary is around the business data. Audit writes are outside. An audit failure does not undo a valid business write.**

---

### E-03-3: Audit Log Indexes and Querying

[OPEN: prisma/schema.prisma — AuditLog @@index declarations]

Three indexes, three access patterns.

`[entityType, entityId]` answers "what happened to Block blk_xyz?" It is a composite index because both columns are always in the WHERE clause together.

`[actorUserId]` answers "what did user usr_abc do?" This is the user activity view.

`[createdAt]` answers "what happened between 09:00 and 17:00?" This is the time-range filter on the audit log page.

Notice what is missing. There is no `@@index([action])`. Why?

Action has about 20 distinct values. That is low cardinality, so an index on it is not very selective.

"All CONTRIBUTION_CREATED events" is usually combined with a time filter. That filter uses the `[createdAt]` index anyway.

A standalone `[action]` index would add write cost for little read gain.

**Takeaway: Design indexes for the queries you will run. Three indexes, three access patterns, no extras.**

---