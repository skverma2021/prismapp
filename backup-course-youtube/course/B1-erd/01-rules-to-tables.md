# Slide Script — B-01: From Rules to Tables — A Decision Framework

---

## Slide 1 — Every Table Decision Has a Rule Behind It

**Type:** `Concept`

**Headline:**
> A schema that cannot be explained is a schema that cannot be trusted.

**Visual / layout:**
A two-column layout. Left column: four labelled rule types (Cardinality, Temporal, Immutability, Controlled Vocabulary). Right column: the schema implication of each (FK / join table, timeline model, append-only table, pre-seeded lookup). Arrows connect each pair.

**Narration:**
In Section A we said that domain rules shape not just your service logic but your schema. In this module we are going to prove that claim with five concrete tables from PrismApp.

Before we look at specific tables, we need a decision framework. Not every domain rule leads to the same schema structure. There are four rule types that appear repeatedly in this project, and each one leads to a different table design pattern.

Cardinality rules — rules that say "exactly one," "at most one," "zero or more" — lead to foreign keys or join tables. These are the rules most developers already know how to handle.

Temporal rules — rules that say "at any given time," "once recorded," "from this date" — are different. They require you to model time explicitly in the data, not just in your service logic. A foreign key alone cannot represent a time-bounded relationship.

Immutability rules — rules that say "cannot be modified after," "must not change" — lead to append-only table patterns. The instinct to reach for an UPDATE statement is exactly wrong.

Controlled vocabulary rules — rules that constrain the valid values for a field to a finite, pre-defined set — lead to lookup tables. When that vocabulary also has business constraints attached (like "current year only"), the lookup table may be pre-seeded rather than user-managed.

The rest of this module is one example per pattern.

**On-screen action / demo:**
Open `vault/01-Domain/Domain-Rules.md`. Scroll slowly through the headings: Ownership Rules, Temporal Integrity Rules, Financial Integrity Rules, Contribution Period Constraints. As each heading appears, name the rule type it represents without reading the rules yet.

**Key takeaway:**
Before writing a single table, classify each domain rule — the classification tells you which design pattern to reach for.

---

## Slide 2 — The Decision Matrix

**Type:** `Diagram`

**Headline:**
> Match the rule type to the pattern before you open your schema editor.

**Visual / layout:**
A four-row table with columns: Rule Type | Signal words | Schema pattern | PrismApp example. Rows:
1. Cardinality | "exactly one", "at most one", "zero or more" | FK + UNIQUE or join table | `UnitResidents.indId FK→Individuals`
2. Temporal | "at any given time", "once recorded", "from/to" | fromDt/toDt row pairs, NULL=active | `UnitOwners`, `ContributionRates`
3. Immutability | "cannot be modified", "must not change", "once posted" | Append-only; no UPDATE | `ContributionRates`, `Contributions`
4. Controlled vocabulary | "must be one of", "current year only", "monthly or yearly" | Pre-seeded lookup table | `ContributionPeriods`

**Narration:**
Here is the matrix. Print it. Keep it next to your schema editor.

The signal words are your cues. If a domain rule contains the phrase "at any given time," you are looking at a temporal rule. If it says "cannot be modified after creation," you are looking at an immutability rule. If it constrains a value to a small, known set, you are looking at a controlled vocabulary rule.

PrismApp has examples of all four. The next four topics cover one example each in depth.

One important note before we continue: these rule types are not mutually exclusive. A single table can be both temporal and immutable. `ContributionRates` is exactly that — it models a time-bounded rate (temporal) that cannot be modified once set (immutable). That double classification is what forces the append-only design, which we will see in topic 4.

**On-screen action / demo:**
Static slide. Point to each row as you name the signal words. Pause on row 4 and circle the PrismApp example (`ContributionPeriods`) — this is the one that surprises most students.

**Key takeaway:**
Signal words in domain rules are your schema design vocabulary. Learn to read them before you write any SQL.

---

## Slide 3 — Reading the Rules: A Quick Classification Pass

**Type:** `Demo`

**Headline:**
> Do this before you design any table: classify every rule in two minutes.

**Visual / layout:**
Split screen. Left: `vault/01-Domain/Domain-Rules.md` open in VS Code. Right: a simple two-column note: Rule | Type.

**Narration:**
Let us do this live. Open `vault/01-Domain/Domain-Rules.md` and classify five rules in real time.

O3: "A Unit cannot have more than one active owner at any given time." — Temporal. "At any given time" is the signal. This leads to a timeline model.

O7: "Ownership periods for a Unit must not have gaps." — Temporal with a continuity constraint. A simple date range is not enough — a gapless check must also run on every write.

Financial Integrity 1: "Contributions are immutable once recorded." — Immutability. This one word — immutable — closes the door on UPDATE and DELETE for this table.

Financial Integrity 5: "Contribution rate must be determined at the time of payment using contributionRates." — Immutability. The rate row must be resolved at write time and the resolved value must be persisted.

Contribution Period Constraints 1: "Payments can only be made for periods within the current year." — Controlled vocabulary. "Within the current year" means the valid values are a finite, calculable set. That set should be stored as rows, not computed at runtime.

Five rules, five minutes, five design decisions already made. The rest of the module shows you what those decisions look like in the actual schema.

**On-screen action / demo:**
Open `vault/01-Domain/Domain-Rules.md`. Navigate to Ownership Rules → O3, O7. Then scroll to Financial Integrity → rules 1 and 5. Then scroll to Contribution Period Constraints → rule 1. Read each rule aloud and state its type.

**Key takeaway:**
Classifying rules before designing tables takes five minutes and saves five days of schema rework.

---

## Transition note

We have the framework. Starting with the pattern that surprises developers most: when a foreign key is not enough.
