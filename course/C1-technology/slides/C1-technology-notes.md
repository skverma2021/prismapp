# Section C1 - Speaker Notes (Part 1)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

# C-Technology — Assembled Speaker Notes

These are the presenter notes for Section C: Technology Stack and Architecture.
Organized by topic file and slide number. Use these in Camtasia or alongside the PowerPoint.

---

## C-01 — Technology Choices Follow Architecture

### C-01-1: The Wrong Way to Choose a Stack

Good morning / welcome back. Before we look at a single line of PrismApp code, I want to address a question I hear constantly: "Which framework should I use?"

The answer is: that is the wrong first question.

[SHOW: stack popularity poll / Stack Overflow survey screenshot]

This is what "framework selection by preference" looks like. It's a popularity contest. The problem is that popularity is measured across all use cases, and your use case is specific. A framework that is excellent for building marketing sites may be a poor fit for a financial ledger.

The right first question is: what are my architectural requirements? What constraints does this system have to satisfy? Once you can answer that, the technology options narrow dramatically.

For PrismApp, there are four constraints that mattered most. We're going to trace each one to the technology choice it drove.

**Takeaway: Work backwards from requirements. Never forwards from preference.**

---

### C-01-2: Four Requirements, Four Choices

[OPEN: AGENTS.md Section 5]

Let me read the first bullet: "Stateless application servers — required on Vercel." That one sentence rules out a class of architectures. No sticky sessions. No in-process cache shared across requests. No in-memory job queues that persist between restarts.

[SHOW: table, animate row by row]

**Row 1 — Stateless servers → Next.js App Router.** Every Route Handler in Next.js is a function. It starts, handles one request, and exits. That's stateless by design.

**Row 2 — Relational integrity → PostgreSQL.** Remember in Section B we had temporal overlap prevention, duplicate payment protection, and foreign key enforcement between units, owners, and contribution details. Those rules require ACID transactions and foreign keys. PostgreSQL does this; MongoDB does not.

**Row 3 — Type-safe data access with migration history → Prisma.** The schema is defined in `prisma/schema.prisma`. When you change the schema, Prisma generates a migration SQL file. You have a versioned history of every schema change. And Prisma generates TypeScript types from the schema — your IDE knows the shape of every table without you maintaining separate type definitions.

**Row 4 — Role-based access → next-auth.** Three roles, JWT sessions, role claim baked into the token. No database round-trip to check the role on every request.

And finally: **TypeScript**, end-to-end. Domain rules expressed in code are only as reliable as the type system enforcing them. TypeScript catches rule violations at compile time.

**Takeaway: Every tool in this stack can be traced to a named requirement.**

---

### C-01-3: The Deployment Constraint

Now let me zoom in on the Vercel deployment constraint, because it affects more code than you might expect.

[SHOW: deployment diagram — browser → Vercel Edge → Serverless Function → connection pool → PostgreSQL]

Vercel runs each Route Handler as a serverless function. This means three things for PrismApp:

First, **no persistent in-memory state.** Look at `proxy.ts` — the rate limiter uses an in-memory Map. The comment acknowledges: "A new function instance resets state — sufficient to deter automated scripts." This is a deliberate, documented tradeoff.

Second, **JWT sessions, not server sessions.** A server session store requires a process that lives between requests — that contradicts serverless. JWTs are signed, self-contained, and verified without any server-side store.

Third, **connection pooling.** [OPEN: `src/lib/db.ts`] See the `PrismaPg` adapter on line 3. Serverless functions cannot hold a long-lived database connection — they would exhaust PostgreSQL's connection limit after a few hundred concurrent invocations. The `@prisma/adapter-pg` adapter uses PgBouncer-style connection management. Each function invocation borrows a connection from the pool and returns it immediately.

[POINT TO: the `global.prisma ??` guard]

This is a dev-only optimization. Next.js in development reloads modules on every file save. Without this guard, each reload would create a new Prisma client with a new connection pool. In production, there is no hot-reload, so the guard is inert.

**Takeaway: Deployment shape drives code shape. Read the deployment architecture before writing setup code.**

---

## C-02 — The Next.js App Router

### C-02-1: Server vs Client: The Fundamental Split

[OPEN: app/(dashboard)/layout.tsx and app/(dashboard)/blocks/page.tsx side by side]

The App Router introduces a distinction that changes how you think about components: **Server** and **Client**.

Server Components run during the request, on the server. They have full access to environment variables, the database, and the auth session. They never ship JavaScript to the browser.

Client Components are marked `"use client"` at the top of the file. They run in the browser. They have state, event handlers, and browser APIs. They cannot directly access the database.

Look at the layout: no `"use client"` directive. It's a Server Component. The first thing it does is call `requireServerAppSession()`. This runs on the server, reads the JWT cookie, and redirects to the login page if the session is missing or expired. An unauthenticated user never receives any page HTML — the redirect happens before rendering.

Now look at blocks/page.tsx. First line: `"use client"`. This is a Client Component. It uses `useState`, event handlers, and `fetch`. It has no direct database access.

[SHOW: two-tree diagram, blue for server, green for client]

The rule: default to Server Component. Add `"use client"` only when you need browser APIs, state, or event handlers.

**Takeaway: Server Components are the default. Client Components are the deliberate exception.**

---

### C-02-2: Route Handlers: Your API Layer

[OPEN: app/api/blocks/route.ts]

Route Handlers are Next.js's API layer. No separate Express server. No separate API project. The Next.js server is the API server.

Each Route Handler file exports named async functions: `GET`, `POST`, `PATCH`, `DELETE`. Each function receives a `NextRequest` and returns a `Response`.

Let me read the POST handler aloud and annotate it:

[READ: POST function, annotate four bands]

1. `requireMutationRole(request)` — **auth band.** No further code runs unless this passes.
2. `request.json()` then `parseCreateBlockInput(payload)` — **parse band.** No database access until input is clean.
3. `createBlock(input, actor)` — **service band.** All business logic happens here.
4. `return ok(data, 201)` — **respond band.** The standard envelope wraps the result.

This four-step shape is identical in every Route Handler in this project. When you read one, you understand all of them.

The catch block calls `fail(fromUnknownError(error, getRequestId(request)))`. This is the translation layer — any error, from any layer, becomes the standard error envelope. The request ID connects this error to the Sentry trace.

**Takeaway: Every Route Handler follows auth → parse → service → respond. Deviation from this shape is a review flag.**

---

### C-02-3: Why `proxy.ts` and Not `middleware.ts`

[OPEN: proxy.ts]

If you've used Next.js before version 16, you may be looking for `middleware.ts`. In Next.js 16, cross-cutting middleware is `proxy.ts`, exported as `proxy`.

Two things happen here:

**Rate limiting.** Only the login endpoint is rate-limited. Why not every endpoint? Because rate limiting every API call would break legitimate users making multiple requests. The login endpoint is the only attack surface for brute-force credential attacks.

[POINT TO: the credential rate limit block]

10 attempts per 15-minute window per IP. This closes the OWASP brute-force gap without requiring Redis or any external dependency.

**Request ID propagation.** [POINT TO: the requestId block]

Every API request gets a unique ID: `crypto.randomUUID()`. This ID is forwarded to the Route Handler in the `x-request-id` header, included in every error log, and linked in Sentry. In production, this is how you connect a user's "something went wrong" report to a specific server error.

Note what is NOT here: auth. The proxy does not check JWTs. Auth verification requires the Prisma client and the full request context — those are only available inside the Route Handler.

**Takeaway: `proxy.ts` handles infrastructure concerns: rate limiting and request tracing. Auth lives in Route Handlers.**

---

## C-03 — The Modular Monolith

### C-03-1: What Is a Modular Monolith?

[SHOW: src/modules/ folder tree]

Thirteen module folders. Blocks, units, individuals, ownerships, residencies, contributions, reports, and more. Each one is an island.

The rule is simple: a module can import from `src/lib/` (shared utilities) and from its own folder. It cannot import from another module. If a contribution needs to look up a unit, it calls the units service — it does not reach into `src/modules/units/units.schemas.ts` from inside `src/modules/contributions/`.

[SHOW: the four-level table: lib, modules, route handlers, UI pages]

This is the hierarchy. Data only flows down this hierarchy, never sideways between modules.

Why does this matter? PrismApp will grow. The CMM module — Complaint Management — is already planned. When a developer adds `src/modules/complaints/`, they should be able to work in that folder without reading or touching `src/modules/contributions/`. Module boundaries, enforced by import discipline, make that possible.

**Takeaway: The folder structure is architecture. Module boundaries prevent accidental coupling.**

---

### C-03-2: What Goes Where: Service, Schemas, Route Handler

[OPEN: src/modules/blocks/ — show three files]

Three files per module. One responsibility per file.

[OPEN: blocks.schemas.ts]

**Schemas file.** This is the input contract. It defines what shape the caller must provide and throws `HttpError(400, "VALIDATION_ERROR")` if the input doesn't comply. It does not touch the database. It has no business logic.

[OPEN: blocks.service.ts]

**Service file.** This is where business logic lives. It calls the Prisma client. It enforces rules — look at line 20: `if (pageSize > MAX_PAGE_SIZE) throw new HttpError(400, "VALIDATION_ERROR", ...)`. It writes audit log entries on mutations. It returns typed objects.

Notice what is NOT here: HTTP verbs, status codes, or request objects. The service function receives a `URLSearchParams` or a typed input object. It doesn't care whether the caller is an HTTP request, a unit test, or a CLI script.

[OPEN: app/api/blocks/route.ts]

**Route Handler.** This is the thin HTTP adapter. Its only job is to connect the HTTP layer to the service layer. It has no Prisma calls. It has no business rules. It calls schemas to parse, calls service to execute, calls `ok()`/`fail()` to respond.

**Takeaway: Business logic in a Route Handler is a smell. HTTP codes in a service file are a smell. Three files, three responsibilities.**

---

### C-03-3: Why Not Microservices?

Let me address the question that comes up in every architecture discussion: "Why not microservices?"

[SHOW: three-column diagram: single file, modular monolith, microservices]

Microservices solve real problems — at scale. Independent deployment, independent scaling, team autonomy for large engineering organizations. These are genuine benefits.

But microservices introduce real costs: network calls between services, distributed transaction management, separate CI/CD pipelines, separate test environments for each service. For a two-person team building a society management tool, these costs have no payoff.

The modular monolith is the correct first architecture. And here's the key point: the module boundaries we've drawn now are the same boundaries you'd draw if you were extracting a microservice later. The folder structure is already segmented. The imports are already disciplined.

[SHOW: extraction scenario]

If `src/modules/contributions/` ever needed to scale independently, the extraction is a defined operation: create a new project, copy the service file, replace Prisma imports with an HTTP client, update the Route Handler to call externally. No other module changes — because no other module imports from contributions directly.

**Takeaway: The modular monolith satisfies V1. The module boundaries make future extraction possible. Don't build microservices for a problem you don't have yet.**

---