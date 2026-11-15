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
> "Here's a question that sounds trivial: who owns this flat? In a spreadsheet,
> that's one cell. In a real application, it's one of the harder modeling problems
> you'll run into — and today we'll see why."

---

## Scene 1 — Block and Unit: the easy part (0:20–1:30)

**Visual:** Screen recording of `/blocks`, then `/units`, plus a simple ERD-style
diagram: `Block (1) —— (many) Unit`.

**Narration:**
> "Blocks and units are straightforward. A block is a tower or wing — its name has to
> be unique. Every unit belongs to exactly one block, and a unit's own description —
> its flat number — only has to be unique *within* that block, not across the whole
> society. Two different towers can both have a 'Unit 101'. That's a small detail,
> but it's exactly the kind of rule that's easy to miss if you don't ask the domain
> question directly: unique to what, exactly?"

**On-screen action:** Point out two units named identically in different blocks if
seed data allows; otherwise, state the rule verbally over the units list.

---

## Scene 2 — Individual: a person, not a role (1:30–2:30)

**Visual:** Screen recording of `/individuals` list. Diagram: a single "Individual"
box with three dotted arrows labeled "Owner?", "Resident?", "Payer?".

**Narration:**
> "An individual is just a person — name, mobile, email, gender. Nothing on this
> record says 'owner' or 'resident'. That's deliberate. The same person can own one
> flat, live in a completely different one, and occasionally pay a bill for a third
> person's unit. If we baked 'owner' or 'resident' into the individual record itself,
> we'd have no way to represent someone who is both, or someone who stops being an
> owner but stays a resident. So the roles live somewhere else — as relationships."

---

## Scene 3 — Ownership and residency as relationships, not attributes (2:30–4:00)

**Visual:** Diagram: `Individual —— Ownership (fromDt/toDt) —— Unit` and
`Individual —— Residency (fromDt/toDt) —— Unit`, drawn as two separate linking
tables, each with a start date and an end date.

**Narration:**
> "Here's the core idea of this episode. Ownership isn't a field that says 'owner
> name: Priya Sharma.' It's its own record — who, which unit, from what date, to what
> date. Residency works the same way, as a completely separate record. Two separate
> timelines, because they change independently: an owner can rent their flat out
> without giving up ownership, and a resident can move out while the same person
> still owns the place. If you try to model this with a single 'current owner' field
> on the unit, you lose all history the moment something changes — and you can't
> answer 'who owned this on the 3rd of March last year.' Modeling it as a timestamped
> relationship keeps that question answerable forever."

---

## Scene 4 — A quick look at the shape (4:00–5:00)

**Visual:** Screen recording — `/ownerships` filtered to one unit, showing at least
one row with a `toDt` and one current row with no end date. Then `/residencies` for
the same unit.

**Narration:**
> "In the running app, here's what that looks like. This unit's ownership list shows
> a previous owner with an end date, and a current owner with no end date — an open
> end date just means 'still true today.' Residency for the same unit is tracked the
> same way, completely independently. Notice the owner and the resident right now
> aren't even the same person — that's a rented-out unit, and the data model handles
> it without any special-casing."

---

## Scene 5 — Why this matters going forward (5:00–5:40)

**Visual:** Talking head.

**Narration:**
> "This one modeling decision — relationships with dates, instead of attributes —
> is what makes almost everything else in this application possible: accurate
> historical reports, correct billing based on who actually lived somewhere on a
> given date, and audit trails that hold up under scrutiny. But it also opens a new
> problem: what stops two 'current owners' existing for the same unit at the same
> time? That's exactly what the next episode is about."

---

## Outro / CTA (5:40–6:10)

**Visual:** End card pointing to Episode 3.

**Narration:**
> "Next time, we look at what happens when ownership history goes wrong — overlaps,
> gaps, and the surprisingly tricky question of who owns a brand-new flat before it's
> ever been sold. Subscribe and I'll see you there."

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
