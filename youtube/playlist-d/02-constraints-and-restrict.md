# Playlist D · Episode 2 — "Constraints and Restrict: Data Integrity by Design"

## Video Metadata

- **Playlist:** D — PostgreSQL & Prisma Through the Real Application (app-agnostic;
  episodes accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Foundations (2 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Show that uniqueness and deletion rules in this schema are
  deliberate integrity decisions enforced by Postgres itself, not just application
  code being careful.
- **Title options:**
  1. Constraints and Restrict: Data Integrity by Design
  2. The Database Won't Let You Break This
  3. Why Every Relation Here Says `onDelete: Restrict`
- **Thumbnail concept:** A red "DENIED" stamp over a `DELETE FROM blocks` statement,
  with a tooltip reading "23503 foreign key violation."
- **Teaching principle:** Database requirement → relational model → PostgreSQL →
  Prisma.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Last episode we saw the relations. This episode is about the rules attached to
> them — what Postgres refuses to let happen, no matter what the application code
> does or forgets to do. Two mechanisms: unique constraints, and delete
> restrictions."

---

## Scene 1 — Uniqueness that spans a whole table (0:20–1:20)

**Visual:** Open `prisma/schema.prisma`, the `Individual` model's unique fields.

**Code shown:**
```prisma
model Individual {
  eMail            String   @unique
  mobile           String   @unique
  systemTag        String?  @unique
  // ...
}
```

**Narration:**
> "`@unique` on a single column means Postgres itself rejects a second row with the
> same email or mobile number — not a validator that might get skipped, a
> constraint the database enforces on every write, from every code path,
> forever."

---

## Scene 2 — Uniqueness that only matters together (1:20–2:20)

**Visual:** Open the `Unit` model's `@@unique([blockId, description])`, line 33.

**Code shown:**
```prisma
model Unit {
  // ...
  @@unique([blockId, description])
}
```

**Narration:**
> "Compare that to `Unit`. A unit description like '101' isn't unique across the
> whole society — every block probably has a '101'. It only needs to be unique
> *within* a block. That's a compound unique constraint — `@@unique` at the model
> level, over two columns together, instead of `@unique` on one column alone. Same
> idea as Episode 1's compound index, different job: this one blocks duplicate
> rows, not just speeds up lookups."

---

## Scene 3 — `onDelete: Restrict`, everywhere, on purpose (2:20–3:45)

**Visual:** Grep-style montage across `schema.prisma` showing every
`onDelete: Restrict` occurrence — `Unit.block`, `Individual.genderType`,
`UnitOwner.unit`/`.individual`, `Contribution.unit`/`.contributionHead`/`.depositor`.

**Narration:**
> "Notice something: every single relation in this schema uses `onDelete:
> Restrict`. Not `Cascade`, not the Prisma default. That means if you try to delete
> a `Block` that still has `Unit` rows pointing at it, Postgres throws a foreign
> key violation and refuses. If you try to delete an `Individual` who has ever
> made a contribution, same refusal. In a system with financial and ownership
> history, that's exactly what you want — the alternative, `Cascade`, would let one
> careless delete silently erase a paper trail. `Restrict` forces a human to deal
> with the dependent rows first, instead of the database quietly doing it for
> them."

---

## Scene 4 — Indexes: the same discipline, for reads instead of writes (3:45–5:00)

**Visual:** Open `UnitOwner` model, the two `@@index` lines, and `AuditLog`'s three
`@@index` lines.

**Code shown:**
```prisma
model UnitOwner {
  // ...
  @@index([unitId, fromDt, toDt])
  @@index([indId, fromDt, toDt])
}

model AuditLog {
  // ...
  @@index([entityType, entityId])
  @@index([actorUserId])
  @@index([createdAt])
}
```

**Narration:**
> "Constraints stop bad writes. Indexes speed up real reads. And these indexes
> aren't guesses — `[unitId, fromDt, toDt]` exists because the overlap-check query
> we'll see in Episode 4 filters on exactly those three columns, every single
> time a new ownership row is created. `AuditLog`'s three indexes exist because
> the audit trail gets filtered by entity, by actor, and by date range — three
> separate real screens, three separate indexes. An index that doesn't match a
> real query is just wasted write overhead; these all earn their place."

---

## Outro / CTA (5:00–5:30)

**Visual:** End card pointing to Episode 3.

**Narration:**
> "One thing we skated past: `UnitOwner` has both a `fromDt` and a nullable `toDt`.
> That's not a coincidence — it's how this app models history instead of
> overwriting it, and that's next."

---

## Production Notes

- **Screen recordings needed:** `prisma/schema.prisma` — `Individual` unique
  fields, `Unit.@@unique([blockId, description])` (line 33), the `onDelete:
  Restrict` occurrences on `Unit.block`, `Individual.genderType`, `UnitOwner`/
  `UnitResident` relations, and `Contribution`'s three relations; `UnitOwner`
  and `AuditLog` `@@index` declarations.
- **Source material:** `prisma/schema.prisma`, read directly from the repository.
- **B-roll:** a quick terminal demo of Postgres actually rejecting a delete (`prisma
  studio` or a scratch script attempting `db.block.delete()` on a block with units)
  would sell Scene 3 well, if time allows — optional, not required.
