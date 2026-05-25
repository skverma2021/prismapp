# C-06 — Exercise: Trace a Request

---

## Slide 1 of 3 — The Exercise: Follow a POST

**Headline:** Trace `POST /api/blocks` from the browser click to the database row and back.

**Talking points:**
- This is a narrated live-trace exercise. Walk through the exact sequence of events when a user with the `MANAGER` role fills in the "Add Block" form and clicks Submit.
- Before starting, give students 3 minutes to write their own sequence on paper. They should name every layer from click to database and back. Then compare with the live trace.

**Starting conditions:**
```
User:       id = "usr-42", role = MANAGER
Action:     Creates a new block with description "Block G"
Tab:        app/(dashboard)/blocks/page.tsx is open
Network:    fetch('/api/blocks', { method: 'POST', body: JSON.stringify({ description: "Block G" }) })
Cookie:     next-auth.session-token → signed JWT { userId: "usr-42", role: "MANAGER" }
```

**The full sequence:**

```
1. Browser
   └─ User clicks Submit
   └─ useCrudActions calls fetchJsonWithRetry('POST', '/api/blocks', { description: "Block G" })

2. proxy.ts (edge middleware)
   └─ Request is not POST /api/auth/callback/credentials → skip rate limit
   └─ x-request-id header is generated: "req-abc-123"
   └─ Header is forwarded to Route Handler

3. app/api/blocks/route.ts → POST handler
   └─ Step 1 (Auth):    requireMutationRole(request)
       └─ getAuthContext → getToken → reads JWT cookie → { userId: "usr-42", role: "MANAGER" }
       └─ MANAGER ∈ MUTATION_ROLES → auth passes → actor = { userId: "usr-42", role: "MANAGER" }
   └─ Step 2 (Parse):   request.json() → { description: "Block G" }
                         parseCreateBlockInput({ description: "Block G" }) → { description: "Block G" }
   └─ Step 3 (Service): createBlock({ description: "Block G" }, actor)

4. src/modules/blocks/blocks.service.ts → createBlock()
   └─ db.block.create({ data: { description: "Block G" } })
   └─ Prisma generates SQL: INSERT INTO "Block" (id, description, createdAt) VALUES (...)
   └─ PostgreSQL writes the row; returns the new record
   └─ writeAuditLog({ entity: "Block", action: "CREATE", actorId: "usr-42", ... })
   └─ Returns { id: "blk-99", description: "Block G", createdAt: "2026-03-25T10:00:00Z" }

5. app/api/blocks/route.ts → POST handler (continued)
   └─ return ok(data, 201)
   └─ Response.json({ ok: true, data: { id: "blk-99", ... } }, { status: 201 })

6. Browser
   └─ fetchJsonWithRetry receives { ok: true, data: { ... } }
   └─ useCrudActions updates UI state → new row appears in the table
```

**Visual:** Vertical swimlane diagram showing layers: Browser → proxy.ts → Route Handler → Service → Prisma → PostgreSQL → response back up. Each step is numbered and annotated with the function name.

**Takeaway:** A full round-trip crosses six distinct layers. Each layer has exactly one responsibility. None of them duplicate each other's work.

---

## Slide 2 of 3 — What Happens When It Goes Wrong

**Headline:** Now trace the failure paths.

**Talking points:**
- The happy path is easy. The test of a good architecture is whether the failure paths are equally predictable.
- Walk through three failure scenarios for the same `POST /api/blocks` request.

**Failure 1 — Duplicate block**
```
Attempt: { description: "Block A" }  ← already exists

PostgreSQL → throws unique constraint violation
Prisma → throws PrismaClientKnownRequestError { code: "P2002", meta: { target: ["description"] } }
blocks.service.ts → exception propagates up
Route Handler catch block → fromUnknownError(error)
  └─ sees P2002 → new HttpError(409, "CONFLICT", "Unique constraint violated.")
  └─ fail(error)
Response → { ok: false, error: { code: "CONFLICT", message: "...", retryable: false } }
Browser → useCrudActions reads error.code === "CONFLICT" → shows "This block already exists"
```

**Failure 2 — Wrong role**
```
User: role = READ_ONLY

Route Handler → requireMutationRole(request)
  └─ READ_ONLY ∉ MUTATION_ROLES
  └─ throw new HttpError(403, "FORBIDDEN", "...")
  └─ falls through to catch → fail(fromUnknownError(error))
Response → { ok: false, error: { code: "FORBIDDEN", ... } }
Browser → HTTP 403 → useCrudActions shows permission error notice
```

**Failure 3 — Bad input**
```
Attempt: { description: "" }  ← empty string

parseCreateBlockInput → requireString("", "description") throws
  └─ new HttpError(400, "VALIDATION_ERROR", "description is required.")
  └─ Never reaches the service or database
Response → { ok: false, error: { code: "VALIDATION_ERROR", ... } }
Browser → useCrudActions shows field-level error
```

- Point out: in all three cases, the client receives the same `{ ok: false, error: { code, message } }` shape. The client code is simple: check `ok`, then handle `error.code`.
- No raw database errors are ever exposed. No stack traces. No Prisma field names.

**Visual:** Three parallel failure-path diagrams, each showing where in the stack the error is caught and how it's converted before reaching the browser.

---

## Slide 3 of 3 — Module Wrap-Up: What You Can Take to Your Next Project

**Headline:** Six patterns from PrismApp that apply to any production stack.

**Talking points:**
- This is the end of Section C. Summarize by naming the six transferable patterns.

| Pattern | What it means | Where to look |
|---|---|---|
| **Requirements drive technology** | Every tool is chosen to satisfy a named constraint | AGENTS.md § 5; C-01 |
| **Server Components for auth-gated rendering** | Layouts check auth on the server; no client-side redirect ping-pong | `app/(dashboard)/layout.tsx`; C-02 |
| **Route Handler shape: auth → parse → service → respond** | Consistent, auditable, testable | `app/api/blocks/route.ts`; C-02/C-03 |
| **Modular monolith: service + schemas + route** | Each domain is an island; no cross-module coupling | `src/modules/`; C-03 |
| **Shared API envelope: `ok()` + `fail()`** | Client never guesses the response shape; error codes are stable contracts | `src/lib/api-response.ts`; C-04 |
| **Server-side auth boundary** | Route Handlers enforce roles; UI hides, never guards | `src/lib/authz.ts`; C-05 |

- These six patterns are not Next.js-specific. They transfer to Express, Fastify, Spring Boot, Django, or any server framework. The names of the functions change; the responsibility model does not.
- Final thought: the best way to verify that you understand these patterns is to add a new domain module to PrismApp from scratch, without reading existing module files. If you can do that — pick a new entity, define the schema, write the service, write the route handler, add the UI page — you have internalized the architecture.

**Visual:** Summary table above, rendered cleanly. Below it: a one-line invitation: "Add a new domain module from scratch. That is your test."

**Section transition note:**
Section C complete. In Section D we will go deeper into data access patterns — pagination, filtering, and the read model pattern for complex reports.
