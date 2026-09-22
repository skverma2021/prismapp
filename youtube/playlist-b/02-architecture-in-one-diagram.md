# Playlist B · Episode 2 — "The Architecture in One Diagram"

## Video Metadata

- **Playlist:** B — Architecture & SDLC (app-agnostic; episodes accumulate across
  every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Discovery & Domain (2 of 2) — bridges into Design & Contracts
- **Target length:** 6–7 minutes
- **Primary goal:** Explain *why* the application is structured as a layered,
  modular monolith — the engineering reasoning, not just the request trace already
  shown in Playlist A1 Episode 6.
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
> "If you've only ever read about microservices, a plain layered monolith might
> sound like the boring choice. It is. That's exactly why it's the right one here —
> and today I want to walk through the actual reasoning, not just assert it."

---

## Scene 1 — The decision: modular monolith, not distributed (0:20–1:30)

**Visual:** Two diagrams side by side: a single deployable box with internal
`app/`, `src/modules/`, `prisma/` compartments, versus a cluster of separate
services connected by network calls.

**Narration:**
> "This application is a single deployable unit — one Next.js app, one database.
> Inside it, responsibilities are still separated cleanly: UI routes, API route
> handlers, domain services per module, and the Prisma layer. That internal
> separation is what makes it 'modular.' The 'monolith' part just means we don't pay
> the cost of network calls, distributed transactions, and service discovery for
> problems this application doesn't actually have yet. Distributed complexity is a
> tool for a specific problem — team scale, independent deployability — not a
> default you reach for because it looks more serious on a resume."

---

## Scene 2 — Where the boundaries actually are (1:30–2:50)

**Visual:** Screen recording — VS Code file tree, expanding `app/api/blocks/`,
`src/modules/blocks/`, and `prisma/schema.prisma` side by side.

**Narration:**
> "The boundaries that matter aren't between servers — they're between layers, in
> the same codebase. Route handlers under `app/api/` own HTTP concerns:
> authentication, parsing input, shaping the response. Domain services under
> `src/modules/<domain>/` own business rules and are the only code allowed to call
> Prisma. Nothing else reaches into the database directly. If you want to know
> whether a rule like 'no overlapping ownership' is enforced, there's exactly one
> place to look — the service — not a search across the whole codebase."

---

## Scene 3 — Statelessness as a scaling requirement (2:50–3:50)

**Visual:** Diagram: multiple identical server instances, none holding session
state, all pointing to one shared PostgreSQL box.

**Narration:**
> "One architectural rule matters more than it looks: application servers must be
> stateless. Nothing about a user's session or an in-progress request is held in
> server memory between requests — it all lives in the database or the signed
> session cookie. This isn't an abstract best practice here; it's a deployment
> requirement. On Vercel, your code can run on a different server instance for every
> single request. If you'd cached something in a local variable expecting it to
> still be there next time, it simply won't be."

---

## Scene 4 — Idempotency where money is involved (3:50–4:50)

**Visual:** Screen recording or diagram — a duplicate-payment attempt being
rejected, with a callout: "unique constraint, not just a UI check."

**Narration:**
> "Statelessness has a sharp edge for financial writes: if a request can be retried
> — a flaky network, a double-click, a browser back-button — the same payment could
> get submitted twice. The architectural answer isn't 'ask the user nicely not to
> double-click.' It's a real database-level uniqueness constraint on unit, head, and
> period, so even a retried request lands as a rejected duplicate, not a second
> payment. Good architecture assumes retries will happen and designs for them, rather
> than hoping they won't."

---

## Scene 5 — What this buys you, and what it costs (4:50–5:50)

**Visual:** Talking head.

**Narration:**
> "The trade-off is real: a monolith like this is simpler to build, simpler to
> reason about, and simpler to deploy — one build, one deploy target. What it doesn't
> give you is independent scaling of one module, or a different team owning a
> different service with its own release schedule. For a project at this stage,
> that's the correct trade to make. The moment those constraints stop being true —
> real multi-team ownership, wildly different load per module — is the moment this
> decision deserves to be revisited, not before."

---

## Outro / CTA (5:50–6:20)

**Visual:** End card pointing to Episode B3.

**Narration:**
> "Now that we know the shape of the system, next episode we design the actual
> contract at its edge — how the API talks to the outside world, and why that
> contract gets designed before the code that fulfills it. Subscribe and I'll see
> you there."

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
