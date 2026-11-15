# Playlist D · Episode 1 — "Modeling the Domain as Relations"

## Video Metadata

- **Playlist:** D — PostgreSQL & Prisma Through the Real Application (app-agnostic;
  episodes accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Foundations (1 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Show how a plain-language domain ("a block has units, an
  individual can own or live in a unit") becomes primary keys, foreign keys, and
  relations in a real Prisma schema.
- **Title options:**
  1. Modeling the Domain as Relations
  2. From "A Block Has Units" to a Real Schema
  3. Primary Keys, Foreign Keys, and Relations — For Real This Time
- **Thumbnail concept:** A hand-drawn box-and-arrow diagram (Block → Unit →
  Individual) morphing into the actual `model` blocks from `schema.prisma`.
- **Teaching principle:** Database requirement → relational model → PostgreSQL →
  Prisma.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head, `prisma/schema.prisma` visible behind.

**Narration:**
> "Every relational database question starts the same way.
>
> What are the things, and how do they connect?
>
> A block has units. A unit can have owners and residents over time.
>
> This episode shows how those plain sentences become primary keys, foreign keys, and relations.
> We will use an actual, running schema. Not a textbook one."

---

## Scene 1 — The plain-language model (0:20–1:00)

**Visual:** Simple diagram: `Block` → (has many) → `Unit` → (has many, over time)
→ `Owner` / `Resident`.

**Narration:**
> "Here is the core domain of PrismApp, before any code.
>
> A society has blocks. Each block has units.
>
> Over its lifetime, each unit has a sequence of owners. It also has a sequence of residents. It is not just one of each.
>
> That 'over time' detail matters. We will come back to it in Episode 3.
>
> For now, we have blocks, units, and people."

---

## Scene 2 — The primary key pattern (1:00–2:00)

**Visual:** Open `prisma/schema.prisma`, the `Block` model, lines 9–18.

**Code shown:**
```prisma
model Block {
  id          String   @id @default(uuid())
  description String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  units Unit[]

  @@map("blocks")
}
```

**Narration:**
> "`id` is the primary key.
> It is a UUID. The database default generates it, not the application code.
>
> `description` is separately marked `@unique`, because 'Block A' can only mean one thing.
>
> `units Unit[]` is not a column at all.
> It is the Prisma side of a relationship. It is the reverse direction of a foreign key that actually lives on `Unit`.
>
> And `@@map("blocks")` is the real Postgres table name.
> It uses lower snake_case, because that is the SQL convention. The Prisma model name is `PascalCase`."

---

## Scene 3 — The foreign key, both directions (2:00–3:15)

**Visual:** Open the `Unit` model, lines 20–34.

**Code shown:**
```prisma
model Unit {
  id          String   @id @default(uuid())
  description String
  blockId     String
  sqFt        Int
  inceptionDt DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  block         Block                 @relation(fields: [blockId], references: [id], onDelete: Restrict)
  owners        UnitOwner[]
  residents     UnitResident[]
  contributions Contribution[]
  complaints    Complaint[]

  @@unique([blockId, description])
  @@index([blockId])
  @@map("units")
}
```

**Narration:**
> "Here is the actual foreign key: `blockId String`, plus `block Block @relation(fields:
> [blockId], references: [id], onDelete: Restrict)`.
>
> That single `@relation` line does three jobs at once.
> It declares which column is the foreign key. It declares which column it points to. And it says what happens if someone deletes the block it points to.
>
> We will spend all of the next episode on that `onDelete` choice.
>
> For now, notice the shape. There is one real foreign key column.
> There are also four more `[]` relation fields: `owners`, `residents`, `contributions`, and `complaints`.
>
> These do not exist as columns on `Unit` at all.
> They are the Prisma-side view of foreign keys that live on *other* tables, pointing back here."

---

## Scene 4 — One model, many named relations (3:15–4:30)

**Visual:** Open the `Individual` model, lines ~52–68, highlighting the five
relation fields with their `@relation("...")` names.

**Code shown:**
```prisma
model Individual {
  id     String @id @default(uuid())
  // ...
  genderType         GenderType        @relation(fields: [genderId], references: [id], onDelete: Restrict)
  ownedUnits         UnitOwner[]
  livedUnits         UnitResident[]
  contributions      Contribution[]    @relation("ContributionDepositedBy")
  reportedComplaints Complaint[]       @relation("ComplaintReporter")
  assignedComplaints Complaint[]       @relation("ComplaintAssignee")
  bookingRequests    Booking[]         @relation("BookingRequestor")
}
```

**Narration:**
> "`Individual` is the busiest model in the schema.
> It shows why relations sometimes need a name.
>
> An individual can be the *depositor* on a contribution. The same person can be the *reporter* on one complaint, and the *assignee* on another.
> That is three different relationships to two different tables, from the same person.
>
> Without the named `@relation("ContributionDepositedBy")` tags, Prisma could not tell those apart.
>
> This is the real-world version of 'a person can play more than one role toward the same table'.
> And it is solved with a simple string label, not a workaround."

---

## Outro / CTA (4:30–5:00)

**Visual:** End card pointing to Episode 2.

**Narration:**
> "We skipped one detail this episode.
>
> Every relation here says `onDelete: Restrict`, never the default cascade.
>
> That is not an accident. It is a deliberate integrity decision.
> And it is what Episode 2 is about."

---

## Production Notes

- **Screen recordings needed:** `prisma/schema.prisma` — `Block` model (lines
  9–18), `Unit` model (lines 20–34), `Individual` model (lines ~52–68). A simple
  hand-drawn or slide-based Block→Unit→Individual diagram for Scene 1.
- **Source material:** `prisma/schema.prisma`, read directly from the repository.
  No invented models — every field and relation shown is real and currently in use.
- **B-roll:** none required.
- **Fact-check note:** line numbers refer to the schema as of 2026-09-22; re-verify
  before recording if the schema has grown since (new modules like CMM/Events were
  appended, so line numbers for later models will drift, though the models shown
  here — Block, Unit, Individual — are early/stable in the file).
