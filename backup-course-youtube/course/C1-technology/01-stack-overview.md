# C-01 — Technology Choices Follow Architecture

---

## Slide 1 of 3 — The Wrong Way to Choose a Stack

**Headline:** "Which technology should we use?" is the wrong first question.

**Talking points:**
- Most developers start a project by asking "what framework do I like?" or "what's trending right now?" Show a comic image or a slide of a Stack Overflow survey — "most loved frameworks."
- The problem: a trending framework optimized for marketing sites is a poor fit for a financial ledger. A framework optimized for real-time gaming is irrelevant for a batch-heavy report system.
- The right first question is: **what are the architectural requirements?** The requirements constrain the choice space.
- Then — and only then — pick the tool that best fits the constraints.
- For PrismApp, there are four architectural requirements that matter most. We'll look at each one and trace it to the technology choice it drove.

**Visual:** Two columns — "Wrong Question" (screenshot of a framework popularity poll) vs "Right Question" (the four requirements we're about to state).

**Takeaway:** Technology is chosen to satisfy requirements. Work backwards from architecture, not forwards from preference.

---

## Slide 2 of 3 — Four Requirements, Four Choices

**Headline:** Each tool in the stack was chosen to satisfy a specific constraint.

**Talking points:**

Open `AGENTS.md` Section 5 (Architecture Baseline). Read the first bullet: "Stateless application servers (required on Vercel)." That one sentence rules out session-based servers, sticky routing, and in-process cache. The consequence is: the entire framework must support stateless execution.

Walk through the four requirements-to-choices table:

| Architectural requirement | Why it matters for PrismApp | Technology chosen |
|---|---|---|
| **Stateless servers** (Vercel, serverless) | Financial writes must not rely on in-process memory | **Next.js App Router** (every function is a stateless handler) |
| **Relational integrity** (temporal overlaps, duplicate payment prevention) | Domain rules from Section B require foreign keys, unique constraints, and transactional writes | **PostgreSQL** (ACID; rich constraint model) |
| **Type-safe data access** with migration history | Schema must evolve without data loss; developers must get IDE help on table shapes | **Prisma** (ORM with generated types and versioned migrations) |
| **Authenticated, role-based access** | Three roles with distinct permissions; no unauthenticated reads | **next-auth** (JWT sessions; role claim baked into the token) |

- These four choices were **forced** by the requirements. You could swap frameworks, but you'd need to satisfy the same four constraints in a different way.
- One more tool is worth naming: **TypeScript**. Domain rules are expressed in code. Type annotations catch rule violations at compile time before they ever reach the database. PrismApp uses TypeScript end-to-end: schema → generated Prisma types → service functions → route handlers → UI components.

**Visual:** The table above, animated row-by-row. Each row highlights the requirement in orange (domain constraint color), draws an arrow, then shows the technology.

**Talking transition:** "Now that we know why each tool exists, let's look at the one that shapes the most code: the Next.js App Router."

---

## Slide 3 of 3 — The Deployment Constraint

**Headline:** Vercel is not just a hosting provider — it is an architectural constraint.

**Talking points:**
- Students often treat deployment as the last step: "we'll figure out hosting later." PrismApp treats it as an upfront constraint.
- Vercel runs every Route Handler as a **serverless function**: it starts, handles one request, and exits. There is no persistent memory between requests.
- Consequences for the design:
  - No in-memory rate limit that survives across function instances (so `proxy.ts` notes: "acceptable for single-region deployment; a new function instance resets state").
  - No server-side session store — sessions must be **stateless JWTs** signed with a secret.
  - The Prisma client must use a **connection-pooling adapter** (`@prisma/adapter-pg`) rather than a raw long-lived connection, because serverless functions must not exhaust PostgreSQL's connection pool.
- Open `src/lib/db.ts` and point to the `PrismaPg` adapter line. The comment even names the pattern: "Reuse a single Prisma client in development to avoid exhausting connections." The production adapter prevents the same problem in Vercel's short-lived function invocations.
- The global singleton guard (`global.prisma ??`) is a development-only optimization. Next.js in dev mode runs in hot-reload, which would otherwise create a new client on every file save.

**Visual:** Diagram showing: Browser → Vercel Edge Network → Serverless Function (new per request) → connection pool → PostgreSQL. Annotate the connection pool as the place `@prisma/adapter-pg` manages.

**Takeaway:** Deployment shape drives code shape. Reading the Vercel architecture docs before writing the first line of Prisma setup is not gold-plating — it prevents production bugs.

**Transition to C-02:** "We've chosen Next.js App Router. Now let's see how it actually works — and why it's fundamentally different from the Pages Router many developers learned first."
