# Slide Script — B-06: Exercise — Design from Rules

---

## Slide 1 — Exercise Setup

**Type:** `Exercise`

**Headline:**
> New module: Society Event Bookings. Here are five rules. Design the tables.

**Visual / layout:**
A card showing the scenario and rules:

**Scenario:** The society wants to track bookings of common spaces (Clubhouse, Swimming Pool deck, Rooftop garden). Residents can book a space for a specific date. The MC wants reports on utilisation and revenue.

**Rules given:**
1. E1 — A space cannot be double-booked: only one booking per space per date.
2. E2 — Booking fees are set per space and may change year to year. Historical bookings must always show the fee that applied at booking time.
3. E3 — A booking can be cancelled, but the cancellation record must be retained.
4. E4 — A booking is associated with exactly one resident. The resident must be active on the booking date.
5. E5 — The society may have new spaces added at any time. Spaces are not hardcoded.

**Instructions:** Pause the video. Write down: (a) how many tables you need; (b) what rule drives each table; (c) which constraints require service logic vs. a DB constraint. Resume after two minutes.

**On-screen action / demo:**
Static slide. Pause narration for two minutes.

**Key takeaway:**
Before designing, classify: E1 = cardinality/overlap; E2 = append-only rate history; E3 = immutability; E4 = FK with eligibility; E5 = user-managed lookup.

---

## Slide 2 — Sample Answer Walkthrough

**Type:** `Diagram`

**Headline:**
> Four tables. Each driven by a rule. No guesswork.

**Visual / layout:**
Four table sketches:

**CommonSpaces** (from E5 — spaces are user-managed):
`id, description, sqFt (optional)`

**SpaceFees** (from E2 — append-only rate history):
`id, spaceId FK, amt, fromDt, toDt nullable`
Note: same pattern as `ContributionRates`.

**SpaceBookings** (from E1 + E3 + E4):
`id, spaceId FK, residentId FK, bookingDate, fee (locked at write), status (Active/Cancelled), cancelledAt nullable`
Note: UNIQUE constraint on `(spaceId, bookingDate)` where `status = Active`. Cancelled bookings are retained — E3 enforced by no DELETE, only status update.

No separate cancellation log table needed in V1 — the `status` field and `cancelledAt` timestamp give the audit trail. For a full cancellation audit, a separate `SpaceBookingEvents` table could be added in V2.

Constraint classification:
- E1 (double booking): PARTIAL UNIQUE on `(spaceId, bookingDate)` WHERE status = Active, OR service-layer overlap check.
- E2 (fee history): service-layer: close old row, insert new.
- E3 (retention): no DELETE; service sets status = Cancelled.
- E4 (resident eligibility): service check against `UnitResidents` on `bookingDate`.
- E5 (spaces): no constraint needed — regular CRUD.

**Narration:**
Here is the sample answer.

Four tables: `CommonSpaces`, `SpaceFees`, `SpaceBookings`, and no fourth one needed in V1. Let me explain each.

`CommonSpaces` comes from rule E5. Spaces can be added at any time by the MC. This is a standard user-managed lookup — no pre-seeding, no special structure.

`SpaceFees` comes from rule E2. Fees change year to year and historical bookings must show the original fee. This is exactly the append-only rate history pattern from topic 4. If you recognised that, you solved E2 in thirty seconds.

`SpaceBookings` handles rules E1, E3, and E4 together. E1 says no double booking — a UNIQUE constraint on `(spaceId, bookingDate)` for active bookings handles this. E3 says retain cancellations — a `status` field and no DELETE enforces this. E4 says verify the resident is active — this requires a service-layer check against `UnitResidents`, not a DB constraint.

Notice what we did not need: a separate cancellation table, a separate event log, or a booking period table. The rules did not call for those. We built exactly what the rules required — nothing more.

**On-screen action / demo:**
Draw the four tables on a whiteboard or show a pre-prepared diagram. Point to each rule as you explain the table it produced.

**Key takeaway:**
A correct ERD has one reason for every table and every column. If you cannot name the rule that produced it, question whether it belongs.

---

## Slide 3 — Module Wrap-Up

**Type:** `Summary`

**Headline:**
> Five patterns. All derived from rules. All already in PrismApp.

**Visual / layout:**
A summary table:

| Pattern | Table in PrismApp | Rule type | Enforcement location |
|---|---|---|---|
| Timeline (FK not enough) | `UnitOwners` | Temporal | Service + transaction |
| Calendar as data | `ContributionPeriods` | Controlled vocabulary | Seed + FK |
| Append-only history | `ContributionRates` | Immutability + temporal | Service (close + insert) |
| Header + detail | `Contributions` + `ContributionDetails` | Multi-period event | Service (amount distribution) |
| System identity | `Individuals.isSystemIdentity` | Cardinality (exclusion) | Service filter |

Below: a closing line — "The exercise showed a sixth case: these patterns compose. SpaceFees = rate history applied to a new domain. You did not need to invent a new pattern."

**Narration:**
Let us close the module.

Five patterns. Every one of them was derived from a domain rule, not from a preference or a framework recommendation. The timeline pattern came from the ownership overlap rule. The pre-seeded calendar came from the current-year constraint. The append-only rate history came from the financial immutability rule. The header + detail split came from the multi-period payment rule.

The most important point: these patterns compose. When the exercise gave you SpaceFees, you had already seen that pattern in `ContributionRates`. The new domain did not require a new pattern — it required recognising the rule type and applying the pattern you already knew.

This is the skill this module aimed to build. Not a set of tables to memorise. A set of rule-type-to-pattern mappings that work across every domain you will ever encounter.

Open the ERD for any system you work on and ask: what rule produced this table? If nobody can answer, the design has a gap.

**On-screen action / demo:**
Show the final summary table on screen. Then briefly open `vault/01-Domain/ERD.md` and scroll through the full model — name each table and its rule type from memory. End on the mermaid diagram at the bottom of the file.

**Key takeaway:**
Domain rules do not just constrain your code — they produce your schema. Learn to read rules before you open a schema editor.

---

## Transition note

Section B complete. In Section C we will look at API design: how domain rules determine which endpoints exist, what they validate, and what errors they return.
