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
> "Who owns this unit? That is an easy question.
>
> But then someone asks, 'Who owned it in March last year, during that dispute?'
> If your schema only stores the *current* owner, that question has no answer.
>
> PrismApp never overwrites an owner.
> It closes a row and opens a new one.
>
> Let us see exactly how."

---

## Scene 1 — The naive design, and its dead end (0:25–1:15)

**Visual:** A hypothetical `Unit.currentOwnerId` column, crossed out.

**Narration:**
> "The naive version is one foreign key on `Unit`, called `currentOwnerId`.
> It is updated in place every time ownership changes.
>
> This works for 'who owns it now', and for nothing else.
> Every previous owner is gone the moment you overwrite that column.
>
> There is no history. There is no audit trail. And there is no way to answer 'who owned it on this date'."

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
>
> `fromDt` is always set. `toDt` is nullable.
> `toDt: null` specifically means 'this ownership has not ended'. It is the active one.
>
> Changing owners never updates a row in place.
> It closes the old row by setting its `toDt`. Then it inserts a brand-new row for the new owner, starting the next day.
>
> The whole history stays queryable, forever.
>
> `UnitResident` uses the exact same shape for residency."

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
> "A nullable end date is convenient to store, but awkward to compare.
> 'null' is not a number you can subtract.
>
> So `rangesOverlap` treats an open `toDt` as positive infinity.
> That turns 'is this range still open' into ordinary date math.
>
> It is a pure function. It has no database and no `tx`. Two date ranges go in, and a boolean comes out.
>
> That is exactly why it lives in its own module, not in the service file.
> It is trivial to unit-test in isolation."

---

## Scene 4 — Enforcing a gapless, ordered timeline (3:45–5:15)

**Visual:** Open `src/modules/ownerships/ownerships.service.ts`,
`ensureOwnershipContinuity`, lines ~35–80.

**Narration:**
> "Overlap prevention alone is not enough.
> Two ownership rows could still leave a gap. That would be a week where a unit legally has no owner, which should not be possible.
>
> `ensureOwnershipContinuity` sorts every ownership row by `fromDt`.
> It checks that the very first row starts on the unit's own inception date.
> Then it walks the timeline row by row. It confirms that each next `fromDt` is exactly one day after the previous row's `toDt`.
>
> So there are no gaps and no overlaps. And the timeline always starts where the unit itself started.
>
> This is business logic that a `@@unique` or `@@index` alone could never express.
> It needs to read the whole timeline to judge one new row."

---

## Scene 5 — The same pattern, reused for pricing (5:15–6:00)

**Visual:** Open `ContributionRate`'s `fromDt`/`toDt` fields, schema lines
~136–144.

**Narration:**
> "This is not a one-off trick for ownership.
>
> `ContributionRate` uses the identical `fromDt` and nullable `toDt` shape.
> It tracks how a maintenance rate has changed over time.
> Which rate applied on any given transaction date is just 'the row whose range contains that date'.
>
> It is one temporal pattern, reused everywhere something in this domain legitimately changes over time."

---

## Outro / CTA (6:00–6:30)

**Visual:** End card pointing to Episode 4.

**Narration:**
> "Overlap and continuity checks both read existing rows before they decide.
> They decide whether a new row is safe to write.
>
> That gap between reading and writing is exactly where race conditions live.
>
> And that is what transactions are for. They are next."

---

## Production Notes

- **Screen recordings needed:** `prisma/schema.prisma` `UnitOwner` model,
  `src/modules/ownerships/ownerships.helpers.ts` (`rangesOverlap`, full function),
  `src/modules/ownerships/ownerships.service.ts` (`ensureOwnershipContinuity`,
  ~lines 35–80), `ContributionRate` model fields (`fromDt`/`toDt`, ~lines
  136–144).
- **Source material:** the files above, read directly from the repository.
- **B-roll:** none required.
