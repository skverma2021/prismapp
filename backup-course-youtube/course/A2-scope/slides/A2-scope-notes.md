# Section A2 - Speaker Notes (Part 2)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

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
