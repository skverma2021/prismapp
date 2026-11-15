# Section A1 - Speaker Notes (Part 1)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

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

Most software projects do not fail from bad code. They fail from bad scope.

Sometimes a software project goes over budget. Sometimes it misses its deadline. Sometimes it is rebuilt from scratch within two years.

The post-mortem almost always points to the same two causes.

The team built the wrong thing. Or the team built the right thing, but kept changing what "right" meant.

Neither of those is a coding problem. Both are scope problems.

In this module, we will learn how to define scope well.

Good scope is precise enough to guide engineers. It is honest enough to set stakeholder expectations. And it is structured enough to survive the changes that come in every real project.

We will use a real application as our working example. It is PrismApp, a Society Management System built for a residential apartment complex.

*[DEMO: Open project root in VS Code. Show top-level folder structure briefly.]*

---

## Slide A-01-2 — The Single-Document Trap

Most students learn to write a Software Requirements Specification. This is called an SRS.

Students then treat the SRS as the source of truth for the entire project.

The problem is not the document itself. The problem is one document doing three different jobs at the same time.

First, it describes what the business can never allow. One example is the rule "a flat cannot have two owners at the same moment."

Second, it describes what the data looks like. That means entities, fields, and relationships.

Third, it describes which features the product should have in version one.

Each of these three things changes at a different rate.

Features change constantly. So you re-open the document again and again.

Each time, you risk accidentally changing the rules that should never change.

---

## Slide A-01-3 — Three Rates of Change

Think of requirements as three separate buckets. Each bucket has a different rate of change.

The first bucket is domain rules. These are the invariants. They are the things the business can never allow, whatever feature we build.

"A unit cannot have two active owners." "A contribution record cannot be deleted once posted." These rules do not change between sprints.

The second bucket is entity contracts. They describe what data exists, what it is called, and how entities relate to each other.

These change occasionally. A new field is added. A relationship is refactored. But they are far more stable than features.

The third bucket is the feature vision. It describes what the application does for users in a given version.

This bucket changes constantly. Priorities shift. Customers ask for new things. Competitors release new features.

Separating these three buckets is the foundation of good requirements work.

The rest of this module shows exactly how PrismApp does it.

---

# 02 — Three Layers, Not One List (8 min)

## Slide A-02-1 — The Layer Stack

Here is the structure we use in PrismApp. It has three layers.

Each layer has its own document, its own owner, and its own tolerance for change.

The bottom layer is domain rules. These are non-negotiable.

They come from the nature of the problem. They come from how society management actually works, from legal requirements, and from the cost of getting it wrong.

"A unit cannot have two active owners at the same time" is not a product decision. It is a fact about property ownership. The code must enforce it.

The middle layer is the entity model. It describes what data exists and how it connects.

The rules below drive this layer. Suppose you have an ownership rule about time periods. Then you need a data model that can represent time periods.

The entity model serves the rules. It does not define them.

The top layer is the feature vision. It is the living backlog of things the product will do for users.

This is where product decisions live. Priorities shift here. This is where "we will do that in V2" is written down.

*[DEMO: VS Code → vault/ folder. Name Domain-Rules.md, ERD.md, cmm-vision.md against each layer.]*

---

## Slide A-02-2 — The Bottom Layer: Domain Rules in Practice

Let us look at a concrete example. Open vault/01-Domain/Domain-Rules.md.

Rule O3 says: "A Unit cannot have more than one active owner at any given time."

Read that sentence carefully. It does not say "a unit should probably not have two owners." It says cannot.

That word signals a domain rule. The system must enforce it without exception.

Now, how do you enforce it in code? You might think a UNIQUE constraint on unitId in the ownership table would work. But it would not.

A unit can have many ownership records over time, one after another. The rule is about active ownership. That means two periods that overlap.

A database index cannot check for overlapping date ranges. So the enforcement must happen in application code. It runs inside a transaction that checks for overlaps before writing.

This is why domain rules need their own layer. They shape your schema, and they also shape your service logic.

Rules also affect how you split the tables, not only their shape. Rules about immutability and calendar constraints can lead you to table structures you would not invent on your own.

We will see exactly how that works in Section B. There we look at how contribution_periods and contribution_details were designed.

For now, remember this point. The rule comes first. The schema follows.

*[DEMO: Domain-Rules.md → O3. Then schema.prisma → Ownership model. Then src/modules/ownerships/ — point to overlap check.]*

---

## Slide A-02-3 — The Top Layer: Feature Vision Is Not a Contract

Now look at the top layer. Open vault/CMM/cmm-vision.md.

This document describes a Complaint Management Module. It includes photo attachments, automatic routing, SLA escalation, a WhatsApp bot, and OTP-based physical closure.

It is a compelling vision.

Now look closely at the last section. "Deferred to Later Phases" lists photo storage, WhatsApp bot, OTP closure, festival event suppression, and authority letter generation.

These are explicitly not in the first sprint.

This is the crucial discipline. A vision document without a deferred list is not a vision document. It is a wishlist.

The deferred list lets the team ship something real in sprint one. Without it, the team might spend six months designing infrastructure. That infrastructure may never be needed in its original form.

*[DEMO: vault/CMM/cmm-vision.md → scroll to "Deferred to Later Phases".]*

---

# 03 — Reading a Domain Rules Document (10 min)

## Slide A-03-1 — How to Read Rules, Not Just See Them

When you read domain rules, you look for three specific patterns.

First, modal verbs. Words like must, cannot, must not, and shall signal enforcement obligations.

They tell you which sentences demand code, not just documentation.

Second, temporal qualifiers. Phrases like "at any given time," "once recorded," or "within 48 hours" signal a time-sensitive constraint.

These almost always mean two things. You need a date field in your schema. You also need a time-based check in your service logic.

Third, actor qualifiers. Words like "only," "exactly one," or "any person" define the cardinality and eligibility of a relationship.

*[DEMO: Domain-Rules.md. Highlight O3 "cannot", O7 "must not have gaps", CM3 "within 48 hours", R4 "zero or one".]*

---

## Slide A-03-2 — A Rule That Cannot Use a Simple Constraint

Here is a practical exercise for every developer. When you read domain rules, classify each rule by what can enforce it.

Rule O3 is an overlap check. It needs application logic in a transaction. It is not a database constraint.

Rule CM7 is a unique ticket ID. A simple @unique constraint handles this completely.

Rule CM3 is a 48-hour reopen window. It needs time calculation in service code. It is not a constraint.

Classify rules this way before you start building. It tells you what goes in the schema, what goes in the service layer, and what needs a transaction.

*[DEMO: schema.prisma → @unique on ticketId. Then Domain-Rules.md → CM3 contrast with CM7.]*

---

## Slide A-03-3 — Complaint Rules as a Case Study

Scroll to the Complaint Rules section of Domain-Rules.md.

CM1 through CM5 define the status lifecycle. CM2 names Reopened as the one backward exception.

That single sentence is the entire specification for a "can this transition happen?" check.

CM6 and CM7 are identity rules. They say system-generated, immutable, and unique.

Those are three words and three implementation choices. Generate the ID in the service. Never expose an update endpoint. Add a @unique constraint.

CM11 through CM13 define visibility.

CM11 says a complaint may be anonymous. That is a permission.

CM12 says the reporter ID must not be returned in resident-facing responses. That is enforcement.

CM13 says managers and admins may see the reporter. That is a role-based exception.

These are three sentences and three different kinds of constraint. All three must be in the API response logic.

*[DEMO: Domain-Rules.md → CMM section. Read CM2, CM12 aloud. Then complaints.service.ts → listComplaints.]*

---