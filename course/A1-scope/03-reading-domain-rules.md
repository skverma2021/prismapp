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
Most developers skim a requirements document and look for things to build. That is the wrong approach for domain rules.

When you read domain rules, you look for three specific patterns.

First, modal verbs. Words like *must*, *cannot*, *must not*, and *shall* signal enforcement obligations.

They tell you which sentences demand code, not just documentation. "A contribution record cannot be deleted" is not a preference. It is a contract.

Second, temporal qualifiers. Phrases like "at any given time," "once recorded," or "within 48 hours" signal a time-sensitive constraint.

These almost always mean two things. You need a date field in your schema. You also need a time-based check in your service logic.

Third, actor qualifiers. Words like "only," "exactly one," or "any person" define the cardinality and eligibility of a relationship.

Take the rule "a unit must have exactly one active owner." It is a cardinality rule, because it says one, not many. It is also a temporal rule, because active means right now.

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
Here is a practical exercise for every developer. When you read domain rules, classify each rule by what can enforce it.

Rule O1 says an individual can own multiple units. That needs no constraint at all. It is a permission, not a restriction.

Rule O3 says a unit cannot have more than one active owner. Can a `UNIQUE` index enforce this? No.

Ownership records are time-bounded. The same unit has many rows over its lifetime.

The overlap check must compare date ranges. That means reading existing rows before writing a new one. This is application-level logic inside a serializable transaction.

Rule CM7 says ticket IDs must be unique. A simple `@unique` constraint on the `ticketId` column handles this completely.

Rule CM3 says a complaint can only be reopened within 48 hours of resolution. No index can know the current time and compare it with a stored timestamp. This is time-sensitive service logic.

Classify rules this way before you start building. It tells you what goes in the schema, what goes in the service layer, and what needs a transaction.

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
Scroll to the Complaint Rules section of `Domain-Rules.md`. This section was added alongside the CMM module.

Fourteen rules, written in plain English, define everything the system must enforce about complaints.

CM1 through CM5 define the status lifecycle. Notice that CM2 does not just say transitions move forward. It names `Reopened` as the one backward exception.

That single sentence is the entire specification for a "can this transition happen?" check in the service layer.

CM6 and CM7 are identity rules. The ticket ID is system-generated, immutable, and unique.

Each of those three words maps to an implementation choice. *System-generated* means we generate it in the service, not in the DB. *Immutable* means we never expose an update endpoint. *Unique* means we add a `@unique` constraint.

CM11 through CM13 define visibility. This is the most interesting group.

CM11 says a complaint *may* be anonymous. That is a permission.

CM12 says the reporter ID *must not* be returned for anonymous complaints in resident-facing responses. That is an enforcement rule.

CM13 says managers and admins *may* see the reporter regardless. That is a role-based exception to the enforcement rule.

These are three sentences and three different kinds of constraint. All three must be handled in the API response logic.

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
