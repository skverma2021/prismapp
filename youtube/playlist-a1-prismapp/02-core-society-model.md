# Playlist A1 · PrismApp — Episode 2 — "The Core Society Model"

## Video Metadata

- **Playlist:** A1 — PrismApp: Building a Real Society Management System
- **Target length:** 5–7 minutes
- **Primary goal:** Establish the three foundational entities — Block, Unit,
  Individual — and the key conceptual shift: ownership and residency are
  *relationships over time*, not simple attributes on a person or a unit.
- **Title options:**
  1. The Core Society Model — Blocks, Units, and Individuals
  2. Why "Who Owns This Flat" Is Harder Than It Sounds
  3. Modeling a Society: Blocks → Units → Individuals
- **Thumbnail concept:** Simple diagram graphic — three boxes, Block → Unit →
  Individual, with a question mark over the Unit–Individual arrow.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Here is a question that sounds trivial: who owns this flat?
>
> In a spreadsheet, that is one cell. In a real application, it is one of the harder modeling problems you will meet.
>
> Today we will see why."

---

## Scene 1 — Block and Unit: the easy part (0:20–1:30)

**Visual:** Screen recording of `/blocks`, then `/units`, plus a simple ERD-style
diagram: `Block (1) —— (many) Unit`.

**Narration:**
> "Blocks and units are straightforward.
>
> A block is a tower or a wing. Its name must be unique.
>
> Every unit belongs to exactly one block. The description of a unit is its flat number. It only has to be unique *within* that block, not across the whole society.
>
> So two different towers can both have a 'Unit 101'.
>
> That is a small detail. But it is easy to miss.
>
> You only find it if you ask the domain question directly: unique to what, exactly?"

**On-screen action:** Point out two units named identically in different blocks if
seed data allows; otherwise, state the rule verbally over the units list.

---

## Scene 2 — Individual: a person, not a role (1:30–2:30)

**Visual:** Screen recording of `/individuals` list. Diagram: a single "Individual"
box with three dotted arrows labeled "Owner?", "Resident?", "Payer?".

**Narration:**
> "An individual is just a person. It has a name, mobile, email, and gender.
>
> Nothing on this record says 'owner' or 'resident'. That is deliberate.
>
> The same person can own one flat. They can live in a completely different one. And they can occasionally pay a bill for the unit of a third person.
>
> Suppose we put 'owner' or 'resident' into the individual record itself. Then we could not represent someone who is both. And we could not represent someone who stops being an owner but stays a resident.
>
> So the roles live somewhere else. They live in relationships."

---

## Scene 3 — Ownership and residency as relationships, not attributes (2:30–4:00)

**Visual:** Diagram: `Individual —— Ownership (fromDt/toDt) —— Unit` and
`Individual —— Residency (fromDt/toDt) —— Unit`, drawn as two separate linking
tables, each with a start date and an end date.

**Narration:**
> "Here is the core idea of this episode.
>
> Ownership is not a field that says 'owner name: Priya Sharma.' It is its own record. It says who, which unit, from what date, to what date.
>
> Residency works the same way, as a completely separate record.
>
> These are two separate timelines, because they change independently. An owner can rent their flat out without giving up ownership. And a resident can move out while the same person still owns the place.
>
> Suppose you model this with a single 'current owner' field on the unit. Then you lose all history the moment something changes. And you cannot answer 'who owned this on the 3rd of March last year.'
>
> Modeling it as a timestamped relationship keeps that question answerable forever."

---

## Scene 4 — A quick look at the shape (4:00–5:00)

**Visual:** Screen recording — `/ownerships` filtered to one unit, showing at least
one row with a `toDt` and one current row with no end date. Then `/residencies` for
the same unit.

**Narration:**
> "In the running app, here is what that looks like.
>
> The ownership list of this unit shows a previous owner with an end date. It also shows a current owner with no end date. An open end date just means 'still true today.'
>
> Residency for the same unit is tracked the same way, completely independently.
>
> Notice that the owner and the resident right now are not even the same person. That is a rented-out unit. And the data model handles it without any special-casing."

---

## Scene 5 — Why this matters going forward (5:00–5:40)

**Visual:** Talking head.

**Narration:**
> "This one modeling decision uses relationships with dates, instead of attributes.
>
> It makes almost everything else in this application possible. It gives us accurate historical reports. It gives us correct billing, based on who lived somewhere on a given date. And it gives us audit trails that hold up under scrutiny.
>
> But it also opens a new problem. What stops two 'current owners' from existing for the same unit at the same time?
>
> That is exactly what the next episode is about."

---

## Outro / CTA (5:40–6:10)

**Visual:** End card pointing to Episode 3.

**Narration:**
> "Next time, we look at what happens when ownership history goes wrong.
>
> We look at overlaps and gaps. And we look at a surprisingly tricky question: who owns a brand-new flat before it has ever been sold?
>
> Subscribe, and I will see you there."

---

## Production Notes

- **Screen recordings needed:** `/blocks`, `/units` (ideally showing same unit number
  in two blocks), `/individuals`, `/ownerships` for one unit (with a past + current
  row), `/residencies` for the same unit.
- **Diagrams needed:** Block→Unit ERD snippet; Individual with three dotted role
  arrows; Individual—Ownership—Unit / Individual—Residency—Unit relationship diagram.
- **Source material to reuse:** `vault/01-Domain/Entities.md` and
  `vault/01-Domain/ERD.md` for the authoritative shapes; `course/00-intro/domain-glossary.md`
  for plain-English definitions of Block, Unit, Individual, Owner/Ownership,
  Resident/Residency.
- **Fact check before recording:** verify current seed data actually contains a unit
  where the current owner and current resident differ (rented-out scenario) — this
  makes Scene 4 concrete instead of hypothetical.
