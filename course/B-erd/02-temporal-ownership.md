# Slide Script — B-02: When a Foreign Key Is Not Enough

---

## Slide 1 — The Naive Design and Why It Fails

**Type:** `Diagram`

**Headline:**
> `Unit.currentOwnerId FK→Individual` answers one question and destroys the rest.

**Visual / layout:**
Two table diagrams side by side. Left (labelled "Naive — what most developers write first"):
- `Units` table with columns: id, description, blockId, sqFt, **currentOwnerId FK→Individuals**
Right (labelled "What the rules actually require"):
- `UnitOwners` table with columns: id, unitId FK, indId FK, fromDt, toDt (nullable)
A ✓ and ✗ checklist below each design:
Naive: ✓ Who owns it now? ✗ Who owned it in March 2024? ✗ How many times has this flat changed hands? ✗ Was there ever a gap in ownership?
Timeline: ✓ All of the above.

**Narration:**
When you first encounter the requirement "track who owns each flat," the obvious design is to add a `currentOwnerId` column to the Units table. It is a single column, it is a FK, it even has a clear name.

It answers exactly one question: who owns this flat right now?

Now look at the rules. Rule O2: "An individual may own the same unit multiple times across different time periods." Rule O5: "Ownership continuity starts on `Units.inceptionDt`." These rules require you to reconstruct the full ownership history, not just the current state.

The naive design cannot do this. When a flat changes hands, you UPDATE the column. The previous owner is gone. The history is destroyed.

This is the most common mistake in data modeling for systems that manage resources over time. The symptom appears late — usually when someone needs a historical report and discovers there is no data to support it.

**On-screen action / demo:**
Open `vault/V1/master-data-vision.md`. Navigate to Section C.3 — "Why Timelines, Not Just Foreign Keys." Read the first two sentences aloud.

**Key takeaway:**
A FK column answers "who now." A timeline answers "who, when." If the rules mention history, you need a timeline.

---

## Slide 2 — The Timeline Pattern and the Day-Zero Problem

**Type:** `Diagram`

**Headline:**
> O4 says "always exactly one owner" — including on the day the unit is born.

**Visual / layout:**
Two annotated tables stacked vertically for the same flat V-101.

**Table 1 — UnitOwners (ownership is always unbroken):**

| unitId | indId | fromDt | toDt | Note |
|---|---|---|---|---|
| V-101 | BUILDER_INV | 2020-01-15 | 2022-06-30 | ← inceptionDt; no real buyer yet |
| V-101 | Ravi Kumar | 2022-07-01 | 2024-03-14 | ← first sale; BUILDER_INV closed |
| V-101 | Priya Nair | 2024-03-15 | NULL ← active | |

**Table 2 — UnitResidents (residency may have gaps):**

| unitId | indId | fromDt | toDt | Note |
|---|---|---|---|---|
| V-101 | Ravi Kumar | 2022-08-10 | 2024-03-10 | ← moved in 5 weeks after purchase |
| V-101 | Priya Nair | 2024-05-01 | NULL | ← moved in 7 weeks after purchase |

Annotation band between the two tables: "Jul 01 – Aug 10, 2022 → Unit OWNED by Ravi Kumar but VACANT. No resident. This is legal: R4 allows zero active residents."

**Narration:**
Before we go further, look at the first row of the ownership table. The owner is `BUILDER_INVENTORY`. What is that?

Rule O4 says a unit must always have exactly one active owner — not usually, not once it is sold — always. Including from the moment it enters the system on `inceptionDt`.

But on `inceptionDt`, no real buyer exists. The flat has just been registered into the system. It may not even have been marketed yet. If we take O4 seriously, we need an owner from day zero.

`BUILDER_INVENTORY` is the system identity that fills this requirement. It is not a real person. It is the system's representation of the builder's de facto possession before any sale. When the first real buyer purchases the flat, the ownership transfer closes the `BUILDER_INVENTORY` row and opens a new row for that buyer. Unit creation and first-ownership-row creation are a single atomic operation — so no unit ever enters the database without an owner.

The ownership chain is unbroken from `inceptionDt` — not because the data happens to be clean, but because the system enforces it structurally.

Now look at the residency table. Between July and August 2022, Ravi Kumar owns the flat but no one lives there. The unit is vacant. That is perfectly fine.

This is the distinction that trips up many developers: **vacancy is a residency state, not an ownership state.** O4 says there must always be exactly one owner. R4 explicitly says a unit may have zero or one active resident. The two chains are independent. A vacant unit has an owner — it is just that no one is currently living there.

**On-screen action / demo:**
Open `vault/01-Domain/Domain-Rules.md`. Read O4 aloud: "A Unit must always have exactly one active owner." Then scroll to O6: "The first owner on inceptionDt is BUILDER_INVENTORY." Show the connection between the two rules. Then open `vault/01-Domain/ERD.md` → UnitOwners table. Then open `prisma/schema.prisma` → `UnitOwners` model and the `Unit` model's `create` logic to show the atomic first-row creation.

**Key takeaway:**
`BUILDER_INVENTORY` is not a workaround — it is the mechanism that makes O4 ("always exactly one owner") satisfiable from the very first day. Ownership continuity and residency vacancy are independent states.

---

## Slide 3 — Why the Overlap Check Cannot Be a Constraint

**Type:** `Code`

**Headline:**
> A UNIQUE constraint on a column cannot detect overlapping date ranges.

**Visual / layout:**
Split screen. Left: a database UNIQUE constraint definition (shown failing with two overlapping rows). Right: pseudocode for the service-layer overlap check — "within a transaction, SELECT existing rows WHERE unitId = X AND toDt IS NULL OR toDt >= newFromDt AND fromDt <= newToDt; if any rows found, reject."

**Narration:**
Why can we not just add a UNIQUE constraint to prevent two owners at the same time?

Because UNIQUE constraints check for exact duplicate values in a column — not for ranges that overlap. Two ownership rows with different `fromDt` values would pass a UNIQUE check even if their date ranges overlap completely.

Consider: Row 1 is fromDt=2024-01-01, toDt=2024-12-31. Row 2 is fromDt=2024-06-01, toDt=NULL. Both rows have different fromDt values. UNIQUE does not catch this.

PostgreSQL has range types and exclusion constraints that can detect overlapping ranges, but they add schema complexity and are not universally portable. For this project, the enforcement lives in the service layer, inside a serializable transaction. The check runs before the write. If overlapping rows are found, the write is rejected.

This is not a weakness — it is correct separation of concerns. The schema enforces what schemas can enforce. The service enforces what requires business logic.

**On-screen action / demo:**
Open `src/modules/ownerships/ownerships.service.ts`. Navigate to the `createOwnership` or `transferOwnership` function. Point to the overlap-check query — the `findFirst` or `findMany` call that checks for existing rows in the date range before the `create`. Name the transaction wrapper.

**Key takeaway:**
Temporal overlap is a business constraint, not a unique-value constraint. It belongs in service code, inside a transaction, not in a schema index.

---

## Transition note

We have seen why a FK is insufficient for time-bounded relationships. Next: how a different kind of domain rule — a controlled vocabulary constraint — leads to a completely different pattern.
