# Section A2 - Speaker Notes (Part 2)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

# 04 — The CMM Vision as a Living Backlog (8 min)

## Slide A-04-1 — What a Vision Document Actually Is

Open vault/CMM/cmm-vision.md.

This document was written before a single line of CMM code existed.

It describes photo attachments, WhatsApp bot, OTP closure, automatic assignment, SLA escalation, vendor ratings, and GBM export.

None of those are in the current implementation. The implementation has a complaint list, a create form, and a status badge. That is Sprint 0.

This is not failure. This is the document doing its job correctly.

A vision document maps the full possibility space. Then every smaller decision can be made against a known destination. That includes what to build this sprint and what to defer.

Without the vision, every sprint becomes a negotiation about direction. With the vision, sprints are negotiations about sequence.

Now open vault/V1/master-data-vision.md. The first line after the header says: "written retrospectively after delivery."

It has the same structure. It has the same deferred-items table. But it was written after the code, not before it.

The master data module was built first, before the project had the habit of writing vision documents ahead of implementation. The V1 vision documents were created afterwards. They preserve the reasoning before institutional memory fades.

CMM was the first module where the vision came first. That is the difference.

A retrospective document explains decisions already made. A prospective one shapes them.

Both have value. But if you are starting a new module, write the vision first.

*[DEMO: cmm-vision.md → Purpose section. Scroll through A–E. Then open vault/V1/master-data-vision.md side by side. Point to the retrospective note at the top. Show that the section structure mirrors the CMM document — anatomy identical, timing different.]*

---

## Slide A-04-2 — Anatomy of a Good Vision Document

Every useful vision document must answer five questions.

Purpose. Why does this module exist? For CMM, the answer is accountability and SLA visibility.

Core Flow. This is the non-negotiable baseline. For CMM, it is the six-state lifecycle.

User Experience. What does the resident do? They submit, track, and reopen.

Admin Features. What does the MC need? Assignment, notes, bulk close, and export.

Deferred Items. What is explicitly not in scope, and why? This section is the most valuable, and it is often skipped.

This five-section anatomy is not specific to CMM.

Open vault/V1/contribution-vision.md. It has the same structure. It has Purpose, domain sections, a What Was Delivered table, a What Was Deferred table, and Open Questions.

This is a reusable template. Once you understand it well, writing a vision document for any new module takes an afternoon, not a sprint.

*[DEMO: cmm-vision.md → scroll through sections A through E and Implementation Notes. Then navigate to vault/V1/contribution-vision.md — show the parallel section structure. Same anatomy, different domain.]*

---

## Slide A-04-3 — Tracing from Vision to Sprint to Code

Here is what a single sprint looks like when it is anchored to a vision document.

Sprint 0 committed to four things only. They are schema, seed, API routes, and list page.

Every item is traceable to a specific file.

The migration corresponds to the schema decision. The seed corresponds to categories and priorities in vision sections A.1 and A.4. The service corresponds to lifecycle rules CM1–CM13.

This traceability is not accidental. We wrote domain rules first. Then the vision. Then the sprint scope. Then the code.

The same chain exists for the master data module, even though that vision was written retrospectively.

vault/V1/master-data-vision.md section A.3, Builder Inventory, explains why every unit creation immediately creates an ownership row assigned to a system identity.

Trace it step by step. Start with the vision. Then domain rules O4/O5. Then schema.prisma (Unit + UnitOwners). Then units.service.ts createUnit().

The code follows the reasoning, whether the document was written before or after.

*[DEMO: Chain 1 (CMM): cmm-vision.md A.1 → seed.mjs seedComplaintCategories(). Domain-Rules.md CM6 → complaints.service.ts generateTicketId(). Chain 2 (Master Data): master-data-vision.md A.3 → Domain-Rules.md O4/O5 → units.service.ts createUnit(). Show that both chains follow the same pattern: vision reasoning → domain rule → code.]*

---

# 05 — Saying No — and Writing It Down (7 min)

## Slide A-05-1 — The Cost of an Unwritten Deferral

Every project has features the team decides to defer. The question is not whether to defer. Deferring is good engineering.

The question is whether the deferral is written down.

When a deferral is unwritten, it becomes an implicit promise.

The developer means "we might do it eventually." The product manager hears "it will be in the next sprint."

These two people are having completely different conversations.

---

## Slide A-05-2 — How PrismApp Manages Scope Control

Open AGENTS.md. Scroll to Section 10, Scope Control.

This section does three things.

It names the next priority explicitly. The priority is CMM, not Safety, not Events.

It states when CMM work begins. That is only after Phase 3 hardening quality gates.

It lists deferred modules by name. It says to reject or defer any work on them.

"Reject" is a strong word. Suppose someone raises a pull request that adds an Events table. The reviewer then has written authority to say no.

*[DEMO: AGENTS.md → Section 10. Read first paragraph. Read deferred list. Point to "reject or defer".]*

---

## Slide A-05-3 — Infrastructure Cost as a Deferral Reason

None of the CMM deferred features are deferred because they are unimportant. They are deferred because they need infrastructure that does not yet exist.

Photo attachments need a file storage provider. The WhatsApp bot needs a Business API vendor. SLA escalation needs cron infrastructure. OTP closure needs an SMS gateway.

When you write down a deferral, write the reason too.

That turns a vague "later" into a trackable decision with a named prerequisite.

*[DEMO: cmm-vision.md → "New Infrastructure Required" table. Then "Open Questions" → question 4.]*

---

# 06 — Exercise: Finding What Was Never Said (7 min)

## Slide A-06-1 — The Exercise Setup

Here is the exercise. We have one sentence: "Residents can log complaints."

Pause. List every question that sentence raises.

Who can do it? What data does it require? What happens after? Who can see the result? What must the system never allow?

[60-second pause]

---

## Slide A-06-2 — The Hidden Requirements, Revealed

Every user story must answer five categories of questions.

**WHO:** Who counts as a "resident"? Who can see the complaint? Can a non-resident submit?

**WHAT:** What data is required? Can it be anonymous?

**WHEN:** When does the lifecycle begin and end? Can it be reopened? For how long?

**HOW MANY:** Can one resident submit multiple complaints? Can others upvote?

**WHAT NEVER:** Can it be deleted? Can the ticket ID change? Can a Closed complaint be reopened?

Each category has a matching domain rule. WHO matches CM12/CM13. WHAT matches CM8/CM9. WHEN matches CM1–CM5 and CM3. HOW MANY matches CM7. WHAT NEVER matches CM4 and CM6.

*[DEMO: Domain-Rules.md → point to each rule group as you name each category.]*

---

## Slide A-06-3 — Module Wrap-Up

Here are five things to remember.

1. Mix requirements by stability, and scope creep breaks your schema.
2. Use three layers. Rules never change. Contracts rarely change. Vision changes every sprint.
3. Scan for must/cannot, temporal qualifiers, and actor qualifiers. These become code.
4. A good vision document is as valuable for its deferred list as for its commitments.
5. Apply WHO / WHAT / WHEN / HOW MANY / WHAT NEVER to every user story.

Module B will take the domain rules and entity contracts from today. It will turn them into an ERD.

It will show exactly how rules drive schema design.

*[DEMO: vault/ folder — name Domain-Rules.md, ERD.md, cmm-vision.md against the three layers one final time.]*

---

*End of Section A speaker notes.*
