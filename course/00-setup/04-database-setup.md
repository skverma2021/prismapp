# Slide Script — 00-04: Database Setup

---

## Slide 1 — Running Migrations

**Type:** `Code`

**Headline:**
> Migrations create the tables. Seeding fills them.

**Visual / layout:**
Two-step flow: `prisma migrate dev` → creates all tables → then `prisma db seed` → inserts seed rows. Arrow between them. Below: a table listing what the seed creates.

**Narration:**
With `DATABASE_URL` pointing at an empty database, run:

```bash
npm run prisma:migrate:dev
# This runs: prisma migrate dev
```

Prisma reads `prisma/schema.prisma`, generates SQL, and applies all migrations from the `prisma/migrations/` folder. You will see output like:

```
Applying migration `20260319114421_prismaapp`
Applying migration `20260323093000_contribution_corrections`
...
The following migration(s) have been applied:
  migrations/
    └─ 20260319114421_prismaapp/
         └─ migration.sql
    └─ ...

✔ Generated Prisma Client (v7.5.0) to ./node_modules/@prisma/client
```

At the end, all database tables exist. No data is in them yet — they are empty structures.

**On-screen action / demo:**
Run `npm run prisma:migrate:dev` in the terminal. Show the migration output scrolling. Show the list of migrations applied (there are about 9 of them).

**Key takeaway:**
`prisma migrate dev` creates all tables. It reads the migration history and applies what is missing — safe to run multiple times.

---

## Slide 2 — Running the Seed Script

**Type:** `Code`

**Headline:**
> The seed script creates the data you need to explore the app immediately.

**Visual / layout:**
Terminal showing `npm run prisma:seed` output, then a table listing what was created.

**Narration:**
After the tables exist, populate them with starting data:

```bash
npm run prisma:seed
# This runs: node prisma/seed.mjs
```

The seed script creates:

| Category | What is created |
|----------|----------------|
| Blocks | A, B, C |
| Units | Several units per block |
| Contribution heads | Maintenance, Water, Sinking Fund, etc. |
| Contribution period | Current year |
| App users | Admin, Manager, and Read-Only accounts |
| Gender types | Male, Female, Other |

The demo app user passwords are set using `AUTH_SEED_PASSWORD` from your `.env` (default: `ChangeMe123!`).

**On-screen action / demo:**
Run `npm run prisma:seed`. Show the output confirming each category. Note the seeded user credentials in the output.

**Key takeaway:**
The seed runs once on a fresh database. Do not re-run it after you have added your own data — the seed creates duplicate entries for categories it does not check first.

---

## Slide 3 — Inspecting the Database with Prisma Studio

**Type:** `Demo`

**Headline:**
> Prisma Studio gives you a visual database browser — no extra tools needed.

**Visual / layout:**
Screenshot of Prisma Studio in a browser: left sidebar showing table names, main panel showing rows in the `Block` table.

**Narration:**
Prisma includes a browser-based database browser called Prisma Studio. Run it with:

```bash
npx prisma studio
```

A browser tab opens at `http://localhost:5555`. You can browse every table, see the rows the seed created, and make manual edits during development.

Things worth checking after the seed:
- **Block** — should show 3 rows: A, B, C
- **Unit** — should show the seeded units
- **ContributionHead** — should show the seeded heads
- **ContributionPeriod** — should show the current year
- **AppUser** — should show the seeded demo users

Prisma Studio is a development tool only. It directly reads and writes the database without going through the app's validation or access controls. Do not point it at a production database.

**On-screen action / demo:**
Run `npx prisma studio`. Switch to the browser. Click through Block, ContributionHead, and AppUser tables. Show the seeded rows.

**Key takeaway:**
`npx prisma studio` opens a database browser at port 5555. Use it to verify the seed worked and to inspect data while developing.
