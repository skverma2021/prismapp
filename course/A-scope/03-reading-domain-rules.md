# Slide Script — A-03: Reading a Domain Rules Document

---

## Slide 1 — How to Read Rules, Not Just See Them

**Type:** `Concept`

**Headline:**
> Reading a domain rules document is a technical skill, not a reading comprehension exercise.

**Visual / layout:**
A page of text (Domain-Rules.md) with three types of highlights:
- Yellow: modal verbs — *must*, *cannot*, *must not*
- Blue: temporal qualifiers — *at any given time*, *once recorded*, *within 48 hours*
- Green: actor qualifiers — *only*, *exactly one*, *any person*

**Narration:**
Most developers skim a requirements document looking for things to build. That is the wrong approach for domain rules.

When you read domain rules, you are looking for three specific patterns.

First: modal verbs. Words like *must*, *cannot*, *must not*, and *shall* signal enforcement obligations. They tell you which sentences demand code, not just documentation. "A contribution record cannot be deleted" is not a preference — it is a contract.

Second: temporal qualifiers. Phrases like "at any given time," "once recorded," or "within 48 hours" are the footprint of a time-sensitive constraint. These almost always mean you need a date field in your schema and a time-based check in your service logic.

Third: actor qualifiers. Words like "only," "exactly one," or "any person" define the cardinality and eligibility of a relationship. "A unit must have exactly one active owner" is both a cardinality rule (one, not many) and a temporal rule (active — meaning right now).

Let us apply this discipline to the PrismApp rules document.

**On-screen action / demo:**
Open `vault/01-Domain/Domain-Rules.md`.
Manually highlight (use cursor to select) three examples as you name each category:
- Yellow highlight: O3 "cannot" — O7 "must not have gaps"
- Blue highlight: CM3 "within 48 hours of its resolvedAt timestamp"
- Green highlight: R4 "zero or one" — individual rules "any person"

**Key takeaway:**
Scan for must/cannot, temporal phrases, and actor qualifiers — these are the rules that will become code.

---

## Slide 2 — A Rule That Cannot Use a Simple Constraint

**Type:** `Code`

**Headline:**
> Some rules require transaction logic because no single index can enforce them.

**Visual / layout:**
A two-column table. Left column: "Can a DB constraint enforce this?" Right column: rule text + answer.
Row 1: O1 "An Individual can own one or more Units" → YES, no constraint needed.
Row 2: O3 "A Unit cannot have more than one active owner" → NO — needs overlap check in code.
Row 3: CM7 "Ticket IDs must be unique" → YES — `@unique` on ticketId field.
Row 4: CM3 "Reopen only within 48 hours of resolvedAt" → NO — needs time calculation in code.

**Narration:**
Here is a practical exercise every developer should do when reading domain rules: classify each rule by what can enforce it.

Rule O1 says an individual can own multiple units. That requires no constraint at all — it is a permission, not a restriction.

Rule O3 says a unit cannot have more than one active owner. Can a `UNIQUE` index enforce this? No. Ownership records are time-bounded. The same unit has many rows over its lifetime. The overlap check must compare date ranges, which requires reading existing rows before writing a new one — that is application-level logic inside a serializable transaction.

Rule CM7 says ticket IDs must be unique. A simple `@unique` constraint on the `ticketId` column handles this completely.

Rule CM3 says a complaint can only be reopened within 48 hours of resolution. No index can know what time it is and compare against a stored timestamp. This is time-sensitive service logic.

Classifying rules this way before you start building tells you exactly what goes in the schema, what goes in the service layer, and what needs a transaction.

**On-screen action / demo:**
Open `prisma/schema.prisma`. Show `@@unique` or `@unique` on the `ticketId` field of the Complaint model.
Then switch to `vault/01-Domain/Domain-Rules.md` and highlight CM3 — contrast it with CM7.

**Key takeaway:**
Classify every rule: DB constraint, service check, or transaction guard. Do this before writing any code.

---

## Slide 3 — Complaint Rules as a Case Study

**Type:** `Code`

**Headline:**
> CM1–CM13 define an entire lifecycle in fourteen sentences.

**Visual / layout:**
A numbered list of CM1–CM13, but with three sections visually grouped by colour:
- CM1–CM5 (amber): Lifecycle transitions
- CM6–CM7 (blue): Identity rules
- CM8–CM10 (teal): Category / priority assignment
- CM11–CM13 (purple): Anonymity and visibility

**Narration:**
Scroll to the Complaint Rules section of `Domain-Rules.md`. This section was added alongside the CMM module. Fourteen rules — written in plain English — define everything the system must enforce about complaints.

CM1 through CM5 define the status lifecycle. Notice that CM2 does not just say transitions are forward. It specifically names `Reopened` as the one backward exception. That single sentence is the entire specification for a "can this transition happen?" check in the service layer.

CM6 and CM7 are identity rules. The ticket ID is system-generated, immutable, and unique. Three words in the rule — *system-generated*, *immutable*, *unique* — each map to a specific implementation choice: generate in the service (not in the DB), never expose an update endpoint, add a `@unique` constraint.

CM11 through CM13 define visibility. This is the most interesting group. CM11 says a complaint *may* be anonymous — that is a permission. CM12 says the reporter ID *must not* be returned for anonymous complaints in resident-facing responses — that is an enforcement rule. CM13 says managers and admins *may* see the reporter regardless — that is a role-based exception to the enforcement rule.

Three sentences. Three completely different kinds of constraint. All three must be handled in the API response logic.

**On-screen action / demo:**
Open `vault/01-Domain/Domain-Rules.md`. Scroll to "Complaint Rules (CMM)".
Read CM2 aloud and pause at "except for Reopened."
Read CM12 aloud and pause at "must not be returned."
Open `src/modules/complaints/complaints.service.ts` — show `listComplaints` and point to where `isAnonymous` would influence the reporter field (even if the masking is currently in the UI).

**Key takeaway:**
Each domain rule sentence maps to a specific implementation artefact: a schema constraint, a service check, or an API response filter. Read them that way.

---

## Transition note

We have practised reading rules. Now let us look at the other end of the spectrum — the product vision document — and learn how to use it as a delivery planning tool rather than an implementation checklist.
