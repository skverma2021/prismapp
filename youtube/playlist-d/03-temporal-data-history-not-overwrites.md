# Playlist D · Episode 3 — "Temporal Data: Modeling History Instead of Overwriting"

## Video Metadata

- **Playlist:** D — PostgreSQL & Prisma Through the Real Application (app-agnostic;
  episodes accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Handling Change Over Time (1 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Show the `fromDt`/nullable-`toDt` pattern this app uses to
  record a full ownership/residency timeline instead of overwriting "the current
  owner," plus the overlap and continuity checks that keep that timeline honest.
- **Title options:**
  1. Temporal Data: Modeling History Instead of Overwriting
  2. Why This Schema Never Just Says `UPDATE ... SET owner = ...`
  3. `fromDt`, `toDt`, and the Row That's Still Open
- **Thumbnail concept:** Two rows in a table, one greyed out with a `toDt` filled
  in, one highlighted green with `toDt: NULL`, captioned "still active."
- **Teaching principle:** Database requirement → relational model → PostgreSQL →
  Prisma.

---

## Cold Open (0:00–0:25)

**Visual:** Talking head.

**Narration:**
> "Who owns this unit? Easy question — until someone asks 'who owned it in March
> last year, during that dispute?' If your schema only stores the *current* owner,
> that question is unanswerable. PrismApp never overwrites an owner. It closes a
> row and opens a new one. Let's see exactly how."

---

## Scene 1 — The naive design, and its dead end (0:25–1:15)

**Visual:** A hypothetical `Unit.currentOwnerId` column, crossed out.

**Narration:**
> "The naive version is one foreign key on `Unit` — `currentOwnerId` — updated in
> place every time ownership changes. It works for 'who owns it now,' and for
> nothing else. Every previous owner is gone the moment you overwrite that column.
> No history, no audit trail, no way to answer 'who owned it on this date.'"

---

## Scene 2 — The real model: a timeline, not a pointer (1:15–2:30)

**Visual:** Open `prisma/schema.prisma`, the `UnitOwner` model.

**Code shown:**
```prisma
model UnitOwner {
  id        String    @id @default(uuid())
  unitId    String
  indId     String
  fromDt    DateTime
  toDt      DateTime?
  createdAt DateTime  @default(now())

  unit       Unit       @relation(fields: [unitId], references: [id], onDelete: Restrict)
  individual Individual @relation(fields: [indId], references: [id], onDelete: Restrict)

  @@index([unitId, fromDt, toDt])
  @@index([indId, fromDt, toDt])
}
```

**Narration:**
> "Instead of one row per unit, `UnitOwner` is one row *per ownership period*.
> `fromDt` is always set. `toDt` is nullable — and `toDt: null` specifically means
> 'this ownership hasn't ended, it's the active one.' Changing owners never
> updates a row in place; it closes the old row by setting its `toDt`, and inserts
> a brand-new row for the new owner starting the next day. The whole history stays
> queryable, forever. `UnitResident` uses the exact same shape for residency."

---

## Scene 3 — A pure function that decides "do these overlap?" (2:30–3:45)

**Visual:** Open `src/modules/ownerships/ownerships.helpers.ts`, `rangesOverlap`.

**Code shown:**
```ts
export function rangesOverlap(
  aStart: Date,
  aEnd: Date | null,
  bStart: Date,
  bEnd: Date | null
): boolean {
  const aEndTime = aEnd ? aEnd.getTime() : Number.POSITIVE_INFINITY;
  const bEndTime = bEnd ? bEnd.getTime() : Number.POSITIVE_INFINITY;

  return aStart.getTime() <= bEndTime && bStart.getTime() <= aEndTime;
}
```

**Narration:**
> "A nullable end date is convenient to store, but awkward to compare — 'null' isn't
> a number you can subtract. `rangesOverlap` treats an open `toDt` as
> positive infinity, which turns 'is this range still open' into ordinary date
> math. It's a pure function — no database, no `tx`, nothing but two date ranges in
> and a boolean out — which is exactly why it's pulled out of the service file and
> into its own module: it's trivial to unit-test in isolation."

---

## Scene 4 — Enforcing a gapless, ordered timeline (3:45–5:15)

**Visual:** Open `src/modules/ownerships/ownerships.service.ts`,
`ensureOwnershipContinuity`, lines ~35–80.

**Narration:**
> "Overlap prevention alone isn't enough — two ownership rows could still leave a
> gap, a week where a unit legally has no owner, which shouldn't be possible.
> `ensureOwnershipContinuity` sorts every ownership row by `fromDt`, checks that the
> very first row starts on the unit's own inception date, and then walks the
> timeline row by row confirming each next `fromDt` is exactly one day after the
> previous row's `toDt`. No gaps, no overlaps, and the timeline always starts where
> the unit itself started. This is business logic that a `@@unique` or `@@index`
> alone could never express — it needs to read the whole timeline to judge one new
> row."

---

## Scene 5 — The same pattern, reused for pricing (5:15–6:00)

**Visual:** Open `ContributionRate`'s `fromDt`/`toDt` fields, schema lines
~136–144.

**Narration:**
> "This isn't a one-off trick for ownership. `ContributionRate` uses the identical
> `fromDt` / nullable-`toDt` shape to track how a maintenance rate has changed over
> time — which rate applied on any given transaction date is just 'the row whose
> range contains that date.' One temporal pattern, reused everywhere something in
> this domain legitimately changes over time instead of just existing."

---

## Outro / CTA (6:00–6:30)

**Visual:** End card pointing to Episode 4.

**Narration:**
> "Overlap and continuity checks both have to read existing rows before deciding
> whether a new row is safe to write. That read-then-write gap is exactly where
> race conditions live — and that's what transactions are for, next."

---

## Production Notes

- **Screen recordings needed:** `prisma/schema.prisma` `UnitOwner` model,
  `src/modules/ownerships/ownerships.helpers.ts` (`rangesOverlap`, full function),
  `src/modules/ownerships/ownerships.service.ts` (`ensureOwnershipContinuity`,
  ~lines 35–80), `ContributionRate` model fields (`fromDt`/`toDt`, ~lines
  136–144).
- **Source material:** the files above, read directly from the repository.
- **B-roll:** none required.
