# Section A — Speaker Notes (Assembled)
# For: A-scope.pptx | Camtasia session A

<!--
  This file is the single source of truth for PPT notes-panel text
  and Camtasia narration. Copy each slide's narration block into
  the corresponding PPT slide notes panel before recording.
  Sections are numbered to match slide groups (01–06).
-->

---

# 01 — Why Requirements Go Wrong (6 min)

## Slide A-01-1 — Opening: The Two Project Killers

Most software projects don't fail from bad code. They fail from bad scope.

When a software project goes over budget, misses its deadline, or gets rebuilt from scratch within two years, the post-mortem almost always points to the same two causes: the team built the wrong thing, or they built the right thing but kept changing what "right" meant.

Neither of those is a coding problem. Both are scope problems.

In this module we are going to look at how to define scope in a way that is precise enough to guide engineers, honest enough to set stakeholder expectations, and structured enough to survive the inevitable changes that come in every real project.

We will use a real application — PrismApp, a Society Management System built for a residential apartment complex — as our working example throughout.

*[DEMO: Open project root in VS Code. Show top-level folder structure briefly.]*

---

## Slide A-01-2 — The Single-Document Trap

Most students are taught to write a Software Requirements Specification — an SRS — and treat it as the source of truth for the entire project.

The problem is not with having a document. The problem is when one document tries to do three completely different jobs at the same time.

It tries to describe what the business absolutely cannot allow — rules like "a flat cannot have two owners at the same moment." It also tries to describe what the data looks like — entities, fields, relationships. And it tries to describe what features the product should have in version one.

Each of those three things changes at a completely different rate. Mixing them in the same document means every time a feature changes — which happens constantly — you re-open the document, and you risk accidentally modifying the rules that should never change.

---

## Slide A-01-3 — Three Rates of Change

Think of requirements in three separate buckets, each with a different rate of change.

The first bucket is domain rules. These are the invariants — the things the business can never allow, regardless of what feature is being built. "A unit cannot have two active owners." "A contribution record cannot be deleted once posted." These do not change between sprints.

The second bucket is entity contracts — what data exists, what it is called, how entities relate to each other. These change occasionally: a new field gets added, a relationship is refactored. But they are far more stable than features.

The third bucket is the feature vision — what the application does for users in a given version. This changes constantly. Priorities shift, customers ask for new things, competitors release features.

Separating these three buckets is the foundational discipline of good requirements work. The rest of this module will show you exactly how PrismApp does it.

---

# 02 — Three Layers, Not One List (8 min)

## Slide A-02-1 — The Layer Stack

Here is the structure we use in PrismApp. Three layers, each with its own document, its own owner, and its own tolerance for change.

The bottom layer is domain rules. These are non-negotiable. They come from the nature of the problem — from how society management actually works, from legal requirements, from the consequences of getting it wrong. "A unit cannot have two active owners at the same time" is not a product decision. It is a fact about property ownership. The code must enforce it.

The middle layer is the entity model — what data exists and how it connects. This layer is driven by the rules below it. If you have an ownership rule about time periods, you need a data model that can represent time periods. The entity model serves the rules; it does not define them.

The top layer is the feature vision — the living backlog of things the product will do for users. This is where product decisions live, where priorities shift, where "we'll do that in V2" is written down.

*[DEMO: VS Code → vault/ folder. Name Domain-Rules.md, ERD.md, cmm-vision.md against each layer.]*

---

## Slide A-02-2 — The Bottom Layer: Domain Rules in Practice

Let us look at a concrete example. Open vault/01-Domain/Domain-Rules.md.

Rule O3: "A Unit cannot have more than one active owner at any given time."

Read that sentence carefully. It does not say "a unit should probably not have two owners." It says cannot. That word signals a domain rule — something the system must enforce without exception.

Now, how do you enforce it in code? You might think a UNIQUE constraint on unitId in the ownership table would work. But it would not. A unit can have many ownership records over time — one after another. The rule is specifically about active ownership: two periods that overlap. A database index cannot check for overlapping date ranges. The enforcement must happen in application code, inside a transaction that checks for overlaps before writing.

This is why domain rules need their own layer. They shape not just your schema but your service logic.

Not only the shape of the tables — also how you split them. Rules about immutability and calendar constraints can lead you to table structures you would not invent on your own. We will see exactly how that works when we get to Section B and look at how contribution_periods and contribution_details were designed. For now, the point is: the rule comes first, the schema follows.

*[DEMO: Domain-Rules.md → O3. Then schema.prisma → Ownership model. Then src/modules/ownerships/ — point to overlap check.]*

---

## Slide A-02-3 — The Top Layer: Feature Vision Is Not a Contract

Now look at the top layer. Open vault/CMM/cmm-vision.md.

This document describes a Complaint Management Module with photo attachments, automatic routing, SLA escalation, a WhatsApp bot, and OTP-based physical closure. It is a compelling vision.

But look closely at the last section. "Deferred to Later Phases" lists photo storage, WhatsApp bot, OTP closure, festival event suppression, and authority letter generation. These are explicitly not in the first sprint.

This is the crucial discipline. A vision document that does not have a deferred list is not a vision document — it is a wishlist. The deferred list is what allows the team to ship something real in sprint one instead of spending six months designing infrastructure for features that may never be needed in their original form.

*[DEMO: vault/CMM/cmm-vision.md → scroll to "Deferred to Later Phases".]*

---

# 03 — Reading a Domain Rules Document (10 min)

## Slide A-03-1 — How to Read Rules, Not Just See Them

When you read domain rules, you are looking for three specific patterns.

First: modal verbs. Words like must, cannot, must not, and shall signal enforcement obligations. They tell you which sentences demand code, not just documentation.

Second: temporal qualifiers. Phrases like "at any given time," "once recorded," or "within 48 hours" are the footprint of a time-sensitive constraint. These almost always mean you need a date field in your schema and a time-based check in your service logic.

Third: actor qualifiers. Words like "only," "exactly one," or "any person" define the cardinality and eligibility of a relationship.

*[DEMO: Domain-Rules.md. Highlight O3 "cannot", O7 "must not have gaps", CM3 "within 48 hours", R4 "zero or one".]*

---

## Slide A-03-2 — A Rule That Cannot Use a Simple Constraint

Here is a practical exercise every developer should do when reading domain rules: classify each rule by what can enforce it.

Rule O3: overlap check — requires application logic in a transaction. Not a database constraint.
Rule CM7: unique ticket ID — a simple @unique constraint handles this completely.
Rule CM3: 48-hour reopen window — requires time calculation in service code. Not a constraint.

Classifying rules this way before you start building tells you exactly what goes in the schema, what goes in the service layer, and what needs a transaction.

*[DEMO: schema.prisma → @unique on ticketId. Then Domain-Rules.md → CM3 contrast with CM7.]*

---

## Slide A-03-3 — Complaint Rules as a Case Study

Scroll to the Complaint Rules section of Domain-Rules.md.

CM1 through CM5 define the status lifecycle. CM2 names Reopened as the one backward exception — that single sentence is the entire specification for a "can this transition happen?" check.

CM6 and CM7 are identity rules. System-generated, immutable, unique — three words, three implementation choices: generate in the service, never expose an update endpoint, add a @unique constraint.

CM11 through CM13 define visibility. CM11 says a complaint may be anonymous — permission. CM12 says reporter ID must not be returned in resident-facing responses — enforcement. CM13 says managers and admins may see the reporter — role-based exception.

Three sentences. Three completely different kinds of constraint. All three must be in the API response logic.

*[DEMO: Domain-Rules.md → CMM section. Read CM2, CM12 aloud. Then complaints.service.ts → listComplaints.]*

---

# 04 — The CMM Vision as a Living Backlog (8 min)

## Slide A-04-1 — What a Vision Document Actually Is

Open vault/CMM/cmm-vision.md.

This document was written before a single line of CMM code existed. It describes photo attachments, WhatsApp bot, OTP closure, automatic assignment, SLA escalation, vendor ratings, and GBM export.

None of those are in the current implementation. The implementation has a complaint list, a create form, and a status badge. That is Sprint 0.

This is not failure. This is the document doing its job correctly. A vision document maps the full possibility space so that every smaller decision — what to build this sprint, what to defer — can be made against a known destination.

Without the vision, every sprint becomes a negotiation about direction. With the vision, sprints are negotiations about sequence.

Now open vault/V1/master-data-vision.md. The very first line after the header says: "written retrospectively after delivery." Same structure. Same deferred-items table. But written after the code, not before it.

The master data module was built first, before the project had the habit of writing vision documents ahead of implementation. The V1 vision documents were created afterwards to preserve the reasoning before institutional memory fades. CMM was the first module where the vision came first. That is the difference. A retrospective document explains decisions already made. A prospective one shapes them.

Both have value. But if you are starting a new module, write the vision first.

*[DEMO: cmm-vision.md → Purpose section. Scroll through A–E. Then open vault/V1/master-data-vision.md side by side. Point to the retrospective note at the top. Show that the section structure mirrors the CMM document — anatomy identical, timing different.]*

---

## Slide A-04-2 — Anatomy of a Good Vision Document

Five sections that every useful vision document must answer:

Purpose — why does this module exist? For CMM: accountability and SLA visibility.
Core Flow — the non-negotiable baseline. For CMM: the six-state lifecycle.
User Experience — what does the resident do? Submit, track, reopen.
Admin Features — what does the MC need? Assignment, notes, bulk close, export.
Deferred Items — what is explicitly not in scope and why? This section is the most valuable and most often skipped.

This five-section anatomy is not CMM-specific. Open vault/V1/contribution-vision.md. The same structure: Purpose, domain sections, a What Was Delivered table, a What Was Deferred table, and Open Questions. This is a reusable template. Once you internalise it, writing a vision document for any new module takes an afternoon, not a sprint.

*[DEMO: cmm-vision.md → scroll through sections A through E and Implementation Notes. Then navigate to vault/V1/contribution-vision.md — show the parallel section structure. Same anatomy, different domain.]*

---

## Slide A-04-3 — Tracing from Vision to Sprint to Code

Here is what a single sprint looks like when anchored to a vision document.

Sprint 0 committed to four things only: schema, seed, API routes, list page. Every item is traceable to a specific file.

The migration corresponds to the schema decision. The seed corresponds to categories and priorities in vision sections A.1 and A.4. The service corresponds to lifecycle rules CM1–CM13.

This traceability is the result of writing domain rules first, then the vision, then the sprint scope, then the code — in that order.

The same chain exists for the master data module, even though that vision was written retrospectively. vault/V1/master-data-vision.md section A.3 — Builder Inventory — explains why every unit creation immediately creates an ownership row assigned to a system identity. Trace it: vision → domain rules O4/O5 → schema.prisma (Unit + UnitOwners) → units.service.ts createUnit(). The code follows the reasoning whether the document was written before or after.

*[DEMO: Chain 1 (CMM): cmm-vision.md A.1 → seed.mjs seedComplaintCategories(). Domain-Rules.md CM6 → complaints.service.ts generateTicketId(). Chain 2 (Master Data): master-data-vision.md A.3 → Domain-Rules.md O4/O5 → units.service.ts createUnit(). Show that both chains follow the same pattern: vision reasoning → domain rule → code.]*

---

# 05 — Saying No — and Writing It Down (7 min)

## Slide A-05-1 — The Cost of an Unwritten Deferral

Every project has features the team decides to defer. The question is not whether to defer — deferring is good engineering. The question is whether the deferral is written down.

When a deferral is unwritten, it becomes an implicit promise. The developer means "we might do it eventually." The product manager hears "it will be in the next sprint." These two people are having completely different conversations.

---

## Slide A-05-2 — How PrismApp Manages Scope Control

Open AGENTS.md. Scroll to Section 10 — Scope Control.

This section names the next priority explicitly: CMM, not Safety, not Events.
It states when CMM work begins: only after Phase 3 hardening quality gates.
It lists deferred modules by name and says to reject or defer any work on them.

"Reject" is a strong word. It means if someone raises a pull request that adds an Events table, the reviewer has written authority to say no.

*[DEMO: AGENTS.md → Section 10. Read first paragraph. Read deferred list. Point to "reject or defer".]*

---

## Slide A-05-3 — Infrastructure Cost as a Deferral Reason

None of the CMM deferred features are deferred because they are unimportant. They are deferred because they require infrastructure that does not yet exist.

Photo attachments → file storage provider. WhatsApp bot → Business API vendor. SLA escalation → cron infrastructure. OTP closure → SMS gateway.

When you write down a deferral, write the reason too. That transforms a vague "later" into a trackable decision with a named prerequisite.

*[DEMO: cmm-vision.md → "New Infrastructure Required" table. Then "Open Questions" → question 4.]*

---

# 06 — Exercise: Finding What Was Never Said (7 min)

## Slide A-06-1 — The Exercise Setup

One sentence: "Residents can log complaints."

Pause. List every question that sentence raises. Who can do it? What data does it require? What happens after? Who can see the result? What must the system never allow?

[60-second pause]

---

## Slide A-06-2 — The Hidden Requirements, Revealed

Five categories of questions that every user story must answer.

**WHO:** Who counts as a "resident"? Who can see the complaint? Can a non-resident submit?
**WHAT:** What data is required? Can it be anonymous?
**WHEN:** When does the lifecycle begin and end? Can it be reopened? For how long?
**HOW MANY:** Can one resident submit multiple complaints? Can others upvote?
**WHAT NEVER:** Can it be deleted? Can the ticket ID change? Can a Closed complaint be reopened?

For each category, the corresponding domain rule: WHO → CM12/CM13. WHAT → CM8/CM9. WHEN → CM1–CM5, CM3. HOW MANY → CM7. WHAT NEVER → CM4, CM6.

*[DEMO: Domain-Rules.md → point to each rule group as you name each category.]*

---

## Slide A-06-3 — Module Wrap-Up

Five things to remember:

1. Mix requirements by stability and scope creep breaks your schema.
2. Three layers: rules (never change), contracts (rarely change), vision (every sprint).
3. Scan for must/cannot, temporal qualifiers, actor qualifiers — these become code.
4. A good vision document is as valuable for its deferred list as for its commitments.
5. WHO / WHAT / WHEN / HOW MANY / WHAT NEVER — apply to every user story.

Module B will take the domain rules and entity contracts from today and turn them into an ERD — showing exactly how rules drive schema design.

*[DEMO: vault/ folder — name Domain-Rules.md, ERD.md, cmm-vision.md against the three layers one final time.]*

---

*End of Section A speaker notes.*
