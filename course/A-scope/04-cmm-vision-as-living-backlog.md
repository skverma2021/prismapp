# Slide Script — A-04: The CMM Vision as a Living Backlog

---

## Slide 1 — What a Vision Document Actually Is

**Type:** `Concept`

**Headline:**
> A vision document is a map with a marked route, not a construction blueprint.

**Visual / layout:**
A stylised map. The destination is labelled "Full CMM". A route is marked through checkpoints: *Sprint 0 → Sprint 1 → Sprint 2*. Several areas of the map are shaded grey and labelled "Deferred territory." The route passes through some areas and consciously avoids others.

**Narration:**
Open `vault/CMM/cmm-vision.md`.

The first thing to notice is that this document was written *before a single line of CMM code existed*. It describes photo attachments, WhatsApp bot intake, OTP-based closure, automatic assignment by category, SLA escalation cron jobs, a vendor rating system, and a GBM export.

None of those are in the current implementation. The implementation has a complaint list, a create form, and a status badge. That is Sprint 0.

This is not failure. This is the document doing its job correctly. A vision document maps the full possibility space so that every smaller decision — what to build this sprint, what to defer, what to simplify — can be made against a known destination.

Without the vision, every sprint becomes a negotiation about direction. With the vision, sprints are negotiations about sequence.

Now open `vault/V1/master-data-vision.md`. The very first line after the header says: *"written retrospectively after delivery."* Same structure. Same deferred-items table. But written after the code, not before it.

The master data module was the foundation of PrismApp — blocks, units, individuals, ownership timelines. It was built first, before the project had settled into the habit of writing vision documents ahead of implementation. The V1 vision documents were created afterwards to preserve the reasoning before institutional memory fades.

CMM was the first module where the vision came first. That is the difference. A retrospective document explains decisions already made. A prospective one shapes them. Both have value. But if you are starting a new module, write the vision first.

**On-screen action / demo:**
Open `vault/CMM/cmm-vision.md`. Read the first paragraph of the Purpose section aloud.
Scroll quickly through sections A through E to show the breadth.
Then open `vault/V1/master-data-vision.md` side by side. Point to the retrospective note at the top. Show that the section structure — Purpose, delivered table, deferred table — mirrors the CMM document. The anatomy is identical; only the timing differs.

**Key takeaway:**
A vision document gives the team a shared map. Write it before the code and it shapes decisions. Write it after and it preserves them. Either way, write it.

---

## Slide 2 — Anatomy of a Good Vision Document

**Type:** `Concept`

**Headline:**
> Five sections that every useful vision document must answer.

**Visual / layout:**
Five labelled boxes in a vertical list, each with a one-line description:
1. **Purpose** — Why does this module exist? Who benefits?
2. **Core Flow** — What is the baseline behaviour that defines the module?
3. **User Experience** — What does the end user actually do and see?
4. **Admin / Operator Features** — What does the MC or manager need beyond basic CRUD?
5. **Deferred Items** — What is explicitly out of scope and why?

**Narration:**
A vision document that only answers "what features do we want" is incomplete. The CMM vision is structured to answer five distinct questions.

Purpose: why does this module exist? For CMM, it is accountability — residents need a record that a complaint was logged and the MC needs SLA visibility.

Core flow: what is the non-negotiable baseline? For CMM it is the lifecycle — Open to Assigned to In Progress to Resolved to Closed. Without that lifecycle, the module cannot function.

User experience: what does a resident actually do? Submit a complaint, track its status, reopen it if the issue persists. Simple and specific.

Admin features: what does the MC need on top of that? Assignment, notes, bulk operations, export. These are the features that typically get built in sprints two and three.

Deferred items: this section is the most valuable and most often skipped. What is explicitly not in scope right now? For CMM it is photo storage, the WhatsApp bot, OTP closure, and festival event suppression. Writing these down prevents scope creep from pulling them into sprint one.

Now notice: this five-section anatomy is not CMM-specific. Open `vault/V1/contribution-vision.md`. The same structure: Purpose, domain sections A through F, a *What Was Delivered* table, a *What Was Deferred* table, and Open Questions. This is a reusable template. Once you internalise it, writing a vision document for any new module takes an afternoon, not a sprint.

**On-screen action / demo:**
Open `vault/CMM/cmm-vision.md`. Scroll through and name each major section (A through E and Implementation Notes) as you describe the five questions.
Then briefly navigate to `vault/V1/contribution-vision.md`. Point to the parallel section structure — same anatomy, different domain. The pattern transfers.

**Key takeaway:**
A vision document without a deferred list is a wishlist. The deferred list is what makes it a planning tool.

---

## Slide 3 — Tracing from Vision to Sprint to Code

**Type:** `Diagram`

**Headline:**
> The vision sets direction. The sprint commits to a slice. The code delivers that slice.

**Visual / layout:**
Three columns:
- **Vision** (left): A table listing CMM features A.1 through E.3
- **Sprint 0** (middle): A short checklist — Schema ✓, Seed ✓, API ✓, List UI ✓
- **Code** (right): File paths — `prisma/schema.prisma`, `src/modules/complaints/`, `app/(dashboard)/complaints/page.tsx`

Arrows flow left-to-right showing traceability.

**Narration:**
Here is what a single sprint looks like when anchored to a vision document.

The CMM vision describes everything from photo attachments to WhatsApp bot intake. Sprint 0 committed to four things only: schema, seed data, API routes, and a basic list page.

Every item the sprint committed to is traceable to a specific file in the codebase. The migration at `prisma/migrations/20260520_cmm_entities` corresponds to the schema decision. The seed at `prisma/seed.mjs` corresponds to the categories and priorities in vision section A.1 and A.4. The service at `src/modules/complaints/complaints.service.ts` corresponds to the lifecycle rules CM1–CM13.

This traceability is not accidental. It is the result of writing the domain rules document first, then the vision, then the sprint scope, then the code — in that order. When you do it this way, you always know why a line of code exists.

The same chain exists for the master data module, even though that vision was written retrospectively. Open `vault/V1/master-data-vision.md` section A.3 — Builder Inventory. It explains why every unit creation immediately creates an ownership row assigned to a system identity. Trace it: vision → domain rules O4/O5 → `prisma/schema.prisma` (Unit + UnitOwners) → `src/modules/units/units.service.ts` `createUnit()`. The code follows the reasoning whether the document was written before or after.

**On-screen action / demo:**
Open the file tree in VS Code. Navigate chain 1 (CMM):
1. `vault/CMM/cmm-vision.md` → section A.1 (categories)
2. `prisma/seed.mjs` → `seedComplaintCategories()`
3. `vault/01-Domain/Domain-Rules.md` → CM6 (ticket ID)
4. `src/modules/complaints/complaints.service.ts` → `generateTicketId()`

Then navigate chain 2 (Master Data):
5. `vault/V1/master-data-vision.md` → section A.3 (Builder Inventory)
6. `vault/01-Domain/Domain-Rules.md` → O4/O5 (ownership continuity)
7. `src/modules/units/units.service.ts` → `createUnit()`

Show that both chains follow the same pattern: vision reasoning → domain rule → code.

**Key takeaway:**
Traceability from vision to sprint to code is a habit, not a tool. Build it into your process before you start writing.

---

## Transition note

We have seen what the vision looks like and how it connects to actual code. Next we will look at the discipline that makes a vision trustworthy: the explicit, written decision to say no.
