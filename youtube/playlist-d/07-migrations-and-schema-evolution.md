# Playlist D · Episode 7 — "Migrations and the Schema Evolution Workflow"

## Video Metadata

- **Playlist:** D — PostgreSQL & Prisma Through the Real Application (app-agnostic;
  episodes accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** From Schema to Running Database (1 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Show how `schema.prisma` becomes a real, versioned sequence of
  database changes — including a real example of a migration drafted but
  deliberately not yet applied — plus idempotent seeding.
- **Title options:**
  1. Migrations and the Schema Evolution Workflow
  2. Eleven Migrations, One Growing Application
  3. The Migration That's Written but Not Run Yet
- **Thumbnail concept:** A folder tree of dated migration folders, with one folder
  greyed out and labeled "DRAFT — not applied."
- **Teaching principle:** Database requirement → relational model → PostgreSQL →
  Prisma.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "`schema.prisma` describes the database you want.
>
> A migration is the recorded set of SQL statements that actually gets you there. It is reversible in principle. It starts from whatever database you currently have.
>
> Editing the schema file changes nothing by itself.
> The migration is the real event."

---

## Scene 1 — Eleven real migrations, in order (0:20–1:45)

**Visual:** `prisma/migrations/` folder listing.

**Visual detail:**
```
20260319114421_prismaapp/
20260323093000_contribution_corrections/
20260325130000_contribution_detail_rate_provenance/
20260326164000_contribution_input_comment/
20260401231726_auth_users/
20260406093000_unit_inception_dt/
20260407110000_builder_inventory_identity/
20260415022708_audit_log/
20260507100000_correction_status_hooks/
20260520135439_cmm_entities/
20260525104324_events_bookings/
```

**Narration:**
> "This is not a demo.
> It is the actual migration history of a real, growing application.
>
> Read the names in order, and you are reading the history of the app.
> First the initial schema. Then contribution corrections. Then rate provenance tracking. Then auth users. Then an audit log. Then an entire new complaint module. And then bookings.
>
> Each folder is a timestamped, one-way step.
> Nobody goes back and edits `20260319114421_prismaapp` after the fact.
>
> If something needs to change, it is a *new* migration on top."

---

## Scene 2 — A migration that's written, but deliberately not run (1:45–3:00)

**Visual:** Open `prisma/migration-drafts/20260326_non_linear_pricing.sql`.

**Code shown:**
```sql
-- Draft only. Do NOT run automatically.
-- Phase-2 proposal for non-linear pricing support.

ALTER TABLE "public"."contribution_details"
ADD COLUMN "baseAmount" DECIMAL(12,2),
ADD COLUMN "discountAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN "pricingMode" VARCHAR(32),
ADD COLUMN "pricingBreakdownJson" JSONB;

ALTER TABLE "public"."contribution_details"
ADD CONSTRAINT "contribution_details_pricing_mode_check"
CHECK (
  "pricingMode" IS NULL OR
  "pricingMode" IN ('LINEAR', 'TIERED', 'DISCOUNTED', 'WAIVED', 'CUSTOM')
);
```

**Narration:**
> "This one lives in `migration-drafts/`. That is outside the real `migrations/` folder that Prisma tracks.
> And that is exactly the point.
>
> It is a fully written proposal for a future non-linear pricing feature.
> It has a Postgres `CHECK` constraint that restricts `pricingMode` to five known values. And it has a `JSONB` column for a flexible pricing breakdown.
>
> Both are genuinely Postgres-specific capabilities.
> `CHECK` constraints and `JSONB` do not exist in every database engine.
>
> But the comment at the top says it plainly: draft only, do not run automatically.
>
> Writing the migration and deciding to apply it are two separate, deliberate steps."

---

## Scene 3 — Seeding has to be safe to run twice (3:00–4:15)

**Visual:** Open `prisma/seed.mjs`, `seedGenderTypes`, lines ~32–43.

**Code shown:**
```js
async function seedGenderTypes() {
  const entries = [
    { id: 0, description: "Male" },
    { id: 1, description: "Female" },
    { id: 2, description: "Other" },
  ];

  for (const entry of entries) {
    await prisma.genderType.upsert({
      where: { id: entry.id },
      update: { description: entry.description },
      create: entry,
    });
  }
}
```

**Narration:**
> "A migration runs once.
> A seed script has no such guarantee.
>
> Someone will run `prisma db seed` against a database that already has this data. Probably more than once.
>
> `upsert` is what makes that safe.
> If a row with this `id` already exists, update it. Otherwise, create it.
>
> So there are no duplicate gender types, and no crash on the second run.
>
> That is the actual bar for a seed script. It must be idempotent. It must not 'assume a blank database'."

---

## Scene 4 — Wiring it together (4:15–4:45)

**Visual:** Open `prisma.config.ts`, full file.

**Code shown:**
```ts
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
```

**Narration:**
> "One small config file ties together the schema, the migrations folder, and the seed command.
>
> So `prisma migrate` and `prisma db seed` both know exactly what to run.
> Nobody has to remember a separate command by hand."

---

## Outro / CTA (4:45–5:15)

**Visual:** End card pointing to Episode 8.

**Narration:**
> "All of this assumes the app can actually reach the database in the first place.
> It also assumes the app reaches it exactly once per instance, not once per request.
>
> That is the last episode in this playlist."

---

## Production Notes

- **Screen recordings needed:** `prisma/migrations/` folder listing (all 11
  folders), `prisma/migration-drafts/20260326_non_linear_pricing.sql` (full file),
  `prisma/seed.mjs` (`seedGenderTypes`, ~lines 32–43), `prisma.config.ts` (full
  file, 14 lines).
- **Source material:** the files above, read directly from the repository. The
  migration folder names and count are real as of 2026-09-22 — re-verify the count
  before recording if migrations have been added since.
- **B-roll:** none required.
