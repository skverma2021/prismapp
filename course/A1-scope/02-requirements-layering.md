# Slide Script — A-02: Three Layers, Not One List

---

## Slide 1 — The Layer Stack

**Type:** `Diagram`

**Headline:**
> Three layers. Three documents. Three rates of change.

**Visual / layout:**
A tall stacked rectangle, divided into three horizontal bands (bottom to top):
- **Bottom band (dark, solid):** DOMAIN RULES — "vault/01-Domain/Domain-Rules.md" — label: *Invariants. Enforced by code. Never negotiated.*
- **Middle band (medium, neutral):** ENTITY CONTRACTS — "vault/01-Domain/ERD.md + Entities.md" — label: *Structure. Changes rarely. Driven by rules.*
- **Top band (light, airy):** FEATURE VISION — "vault/CMM/cmm-vision.md" — label: *What we build now. Changes every sprint.*

**Narration:**
Here is the structure we use in PrismApp. Three layers, each with its own document, its own owner, and its own tolerance for change.

The bottom layer is domain rules. These are non-negotiable. They come from the nature of the problem — from how society management actually works, from legal requirements, from the consequences of getting it wrong. "A unit cannot have two active owners at the same time" is not a product decision. It is a fact about property ownership. The code must enforce it.

The middle layer is the entity model — what data exists and how it connects. This layer is driven by the rules below it. If you have an ownership rule about time periods, you need a data model that can represent time periods. The entity model serves the rules; it does not define them.

The top layer is the feature vision — the living backlog of things the product will do for users. This is where product decisions live, where priorities shift, where "we'll do that in V2" is written down.

**On-screen action / demo:**
Open VS Code. Show the `vault/` folder structure:
- `vault/01-Domain/Domain-Rules.md`
- `vault/01-Domain/ERD.md`
- `vault/CMM/cmm-vision.md`
Point to each and name its layer.

**Key takeaway:**
Every requirement belongs in exactly one layer. If you are unsure which layer it belongs to, you have not thought about it carefully enough.

---

## Slide 2 — The Bottom Layer: Domain Rules in Practice

**Type:** `Code`

**Headline:**
> A domain rule is a constraint the system must never violate — regardless of the feature being built.

**Visual / layout:**
Split screen. Left: the text of rule O3 from `Domain-Rules.md`. Right: a simplified Prisma `Ownership` model with `fromDt`, `toDt` fields highlighted. A label bridges them: *"The rule demands this structure."*

**Narration:**
Let us look at a concrete example. Open `vault/01-Domain/Domain-Rules.md`.

Rule O3: "A Unit cannot have more than one active owner at any given time."

Read that sentence carefully. It does not say "a unit should probably not have two owners." It says *cannot*. That word signals a domain rule — something the system must enforce without exception.

Now, how do you enforce it in code? You might think a `UNIQUE` constraint on `unitId` in the ownership table would work. But it would not. A unit can have many ownership records over time — one after another. The rule is specifically about *active* ownership: two periods that overlap. A database index cannot check for overlapping date ranges. The enforcement must happen in application code, inside a transaction that checks for overlaps before writing.

This is why domain rules need their own layer. They shape not just your schema but your service logic.

**On-screen action / demo:**
Open `vault/01-Domain/Domain-Rules.md`. Scroll to Ownership Rules, highlight O3.
Then open `prisma/schema.prisma`. Show the `Ownership` model with `fromDt` and `toDt`.
Then open `src/modules/ownerships/` — point to the overlap-check transaction without deep-diving into code.

**Key takeaway:**
A domain rule that cannot be enforced by a single DB constraint must be enforced by transaction logic. The rule comes first; the implementation follows.

---

## Slide 3 — The Top Layer: Feature Vision Is Not a Contract

**Type:** `Concept`

**Headline:**
> The vision document commits to direction, not to every feature in the first release.

**Visual / layout:**
A road stretching into the distance. Milestones along the road labelled V1, V2, V3. Off to the sides, signs point to features labelled "Photo attachments → V2", "WhatsApp bot → V3+", "OTP closure → V3+". The road itself is labelled "Domain rules stay constant."

**Narration:**
Now look at the top layer. Open `vault/CMM/cmm-vision.md`.

This document describes a Complaint Management Module with photo attachments, automatic routing, SLA escalation, a WhatsApp bot, and OTP-based physical closure. It is a compelling vision.

But look closely at the last section. "Deferred to Later Phases" lists photo storage, WhatsApp bot, OTP closure, festival event suppression, and authority letter generation. These are explicitly *not* in the first sprint.

This is the crucial discipline. A vision document that does not have a deferred list is not a vision document — it is a wishlist. The deferred list is what allows the team to ship something real in sprint one instead of spending six months designing infrastructure for features that may never be needed in their original form.

Students often treat every feature in a vision document as a requirement. It is not. The vision is a direction. The sprint backlog is the commitment.

**On-screen action / demo:**
Open `vault/CMM/cmm-vision.md`. Scroll to "Deferred to Later Phases" at the bottom of the Implementation Notes section.

**Key takeaway:**
What a vision document explicitly defers is as important as what it commits to.

---

## Transition note

Now that we understand the three layers conceptually, the next topic goes deeper into the bottom layer — how to actually *read* a domain rules document and identify which rules demand code and which demand schema.
