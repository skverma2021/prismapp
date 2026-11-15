# Playlist B · Episode 2 — "The Architecture in One Diagram"

## Video Metadata

- **Playlist:** B — Architecture & SDLC (app-agnostic; episodes accumulate across
  every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Discovery & Domain (2 of 2) — bridges into Design & Contracts
- **Target length:** 6–7 minutes
- **Primary goal:** Explain *why* the application is structured as a layered,
  modular monolith — the engineering reasoning, not just the request trace already
  shown in Playlist A1 Episode 7.
- **Title options:**
  1. The Architecture in One Diagram
  2. Why This App Is a "Modular Monolith" and Not Six Microservices
  3. Choosing Boring Architecture on Purpose
- **Thumbnail concept:** A single box labeled "Modular Monolith" with internal
  dashed compartments, next to a crossed-out cluster of tiny microservice boxes.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "If you have only read about microservices, a plain layered monolith might sound boring.
>
> It is. And that is exactly why it is the right choice here.
>
> Today I want to walk through the actual reasoning, not just state the conclusion."

---

## Scene 1 — The decision: modular monolith, not distributed (0:20–1:30)

**Visual:** Two diagrams side by side: a single deployable box with internal
`app/`, `src/modules/`, `prisma/` compartments, versus a cluster of separate
services connected by network calls.

**Narration:**
> "This application is a single deployable unit. It is one Next.js app and one database.
>
> Inside it, responsibilities are still separated cleanly. There are UI routes, API route handlers, domain services per module, and the Prisma layer. That internal separation is what makes it 'modular.'
>
> The 'monolith' part means we do not pay for network calls, distributed transactions, and service discovery. We do not have those problems yet.
>
> Distributed complexity is a tool for a specific problem, such as team scale or independent deployability. It is not a default choice because it looks more serious on a resume."

---

## Scene 2 — Where the boundaries actually are (1:30–2:50)

**Visual:** Screen recording — VS Code file tree, expanding `app/api/blocks/`,
`src/modules/blocks/`, and `prisma/schema.prisma` side by side.

**Narration:**
> "The boundaries that matter are not between servers. They are between layers, in the same codebase.
>
> Route handlers under `app/api/` own HTTP concerns. They handle authentication, parse input, and shape the response.
>
> Domain services under `src/modules/<domain>/` own business rules. They are the only code allowed to call Prisma. Nothing else reaches into the database directly.
>
> So suppose you want to know whether a rule like 'no overlapping ownership' is enforced. There is exactly one place to look. It is the service, not the whole codebase."

---

## Scene 3 — Statelessness as a scaling requirement (2:50–3:50)

**Visual:** Diagram: multiple identical server instances, none holding session
state, all pointing to one shared PostgreSQL box.

**Narration:**
> "One architectural rule matters more than it looks. Application servers must be stateless.
>
> Nothing about a user's session or an in-progress request stays in server memory between requests. It all lives in the database or the signed session cookie.
>
> This is not an abstract best practice here. It is a deployment requirement.
>
> On Vercel, your code can run on a different server instance for every single request. Suppose you cached something in a local variable and expected it to be there next time. It will not be."

---

## Scene 4 — Idempotency where money is involved (3:50–4:50)

**Visual:** Screen recording or diagram — a duplicate-payment attempt being
rejected, with a callout: "unique constraint, not just a UI check."

**Narration:**
> "Statelessness has a sharp edge for financial writes.
>
> A request can be retried. A network may be flaky, a user may double-click, or a browser may go back. Then the same payment could be submitted twice.
>
> The architectural answer is not to ask the user nicely not to double-click. The answer is a database-level uniqueness constraint on unit, head, and period.
>
> So even a retried request lands as a rejected duplicate, not a second payment.
>
> Good architecture assumes retries will happen, and designs for them."

---

## Scene 5 — What this buys you, and what it costs (4:50–5:50)

**Visual:** Talking head.

**Narration:**
> "The trade-off is real.
>
> A monolith like this is simpler to build, simpler to reason about, and simpler to deploy. It has one build and one deploy target.
>
> It does not give you independent scaling of one module. It also does not let a different team own a different service with its own release schedule.
>
> For a project at this stage, that is the correct trade to make.
>
> Revisit the decision when those constraints stop being true. For example, when several teams own different modules, or when load differs widely per module. Not before."

---

## Outro / CTA (5:50–6:20)

**Visual:** End card pointing to Episode B3.

**Narration:**
> "Now we know the shape of the system.
>
> Next episode, we design the actual contract at its edge. We will see how the API talks to the outside world. And we will see why that contract is designed before the code that fulfills it.
>
> Subscribe, and I will see you there."

---

## Production Notes

- **Screen recordings needed:** VS Code file tree walkthrough (`app/api/`,
  `src/modules/`, `prisma/schema.prisma`); optionally a live duplicate-payment
  rejection if not already used up in Playlist A1 Episode 4 (reuse that footage if
  available instead of re-recording).
- **Diagrams needed:** monolith-vs-microservices comparison; stateless multi-instance
  diagram; layered boundary diagram (route handler → service → Prisma).
- **Source material to reuse:** `AGENTS.md` section 5 ("Architecture Baseline") for
  the modular-monolith rationale and stateless/idempotency principles almost
  verbatim; `course/00-intro/request-lifecycle.md` and `course/00-intro/project-structure-walkthrough.md`
  for the exact folder boundaries.
- **Fact check before recording:** confirm the duplicate-payment unique constraint
  is implemented at the database level (not only in service-layer logic) before
  stating that explicitly on camera — check `prisma/schema.prisma` for the relevant
  `@@unique` before Scene 4.
