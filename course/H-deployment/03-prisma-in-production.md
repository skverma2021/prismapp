# H-03 — Prisma in Production

## Slide 1 of 3 — Two Different Migration Commands

### `migrate dev` vs `migrate deploy`

These two commands look similar. They do fundamentally different things.

---

#### `prisma migrate dev`

```bash
npx prisma migrate dev
```

**What it does:**
1. Compares your schema to the current database state.
2. Generates a new SQL migration file in `prisma/migrations/`.
3. **Resets the database if needed** (drops and recreates if history is inconsistent).
4. Applies the migration.
5. Re-runs the seed script.

This command is for **development only**. The database reset behaviour is the danger — if run against production data, it can **delete everything**.

---

#### `prisma migrate deploy`

```bash
npx prisma migrate deploy
```

**What it does:**
1. Reads the migration files already in `prisma/migrations/`.
2. Checks which have already been applied (the `_prisma_migrations` table tracks this).
3. Applies only the unapplied migrations, in order.
4. **Does not reset anything. Does not generate new migrations.**

This command is **safe for production**. It is additive and idempotent.

---

### The rule

| Environment | Command | Safe? |
|-------------|---------|-------|
| Local dev | `prisma migrate dev` | Yes — your local data is disposable |
| Staging | `prisma migrate deploy` | Yes — treat staging data as real |
| Production | `prisma migrate deploy` | Yes — only ever use this |
| Production | `prisma migrate dev` | **Never** |

PrismApp's `package.json` includes:

```json
"prisma:migrate:deploy": "prisma migrate deploy"
```

This is the command to run before (or during) a production deployment.

---

## Slide 2 of 3 — The Build Pipeline

### What happens when Vercel builds PrismApp

Vercel runs two phases:

```
Phase 1: Install
  npm install (or equivalent)
  ↓ triggers postinstall script

Phase 2: Build
  Runs buildCommand from vercel.json
```

---

### The `postinstall` hook

`package.json`:

```json
"scripts": {
  "postinstall": "prisma generate"
}
```

`npm install` automatically runs `postinstall` after packages are installed. This means `prisma generate` runs during Vercel's install phase — before the build even starts.

`prisma generate` reads `prisma/schema.prisma` and writes the TypeScript client code into `node_modules/@prisma/client`. Without this step, the generated client types do not exist and the build fails with a module-not-found error.

---

### The `vercel.json` build command

```json
{
  "buildCommand": "prisma generate && next build"
}
```

This overrides Vercel's default build command (`next build`). It runs `prisma generate` again before `next build`.

You might wonder: why twice?

- `postinstall` runs during the install phase on the *build machine*.
- The `buildCommand` runs in a potentially different context.
- Running it again is harmless and defensive — it guarantees the generated client is fresh before the build compiles TypeScript.

---

### Where `prisma.config.ts` fits

```ts
// prisma.config.ts
import { defineConfig } from "prisma/config";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  seed: { run: "node prisma/seed.mjs" },
});
```

This file explicitly tells Prisma the path to your schema, migrations folder, and seed command. Without it, Prisma uses convention-based defaults. With it, there is no ambiguity — even if you restructure the project later.

---

## Slide 3 of 3 — When and Where to Run Migrations

### The problem

Vercel is a build-and-deploy system, not a server you SSH into. After the build, the app is deployed as a set of serverless functions. There is no "after deploy" hook where you run a terminal command.

This creates a challenge: **where do you run `prisma migrate deploy`?**

---

### Option 1 — In the Vercel build command (simplest)

```json
{
  "buildCommand": "prisma migrate deploy && prisma generate && next build"
}
```

Add `prisma migrate deploy` to the front of the build command. Vercel runs it before the build.

**Pros:** Simple. No extra infrastructure.  
**Cons:** If the migration fails, the build fails and you get a confusing error in the build log. Also, the build machine needs `DATABASE_URL` set in Vercel's environment variables.

This is the approach PrismApp uses implicitly — the `prisma:migrate:deploy` script in `package.json` can be called from the build command in CI.

---

### Option 2 — Vercel CLI pre-build hook

Use a GitHub Actions workflow that runs before the Vercel deploy trigger:

```yaml
- name: Run migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

- name: Deploy to Vercel
  run: npx vercel --prod
```

**Pros:** Migrations and deployment are clearly separated. Failures are isolated.  
**Cons:** Requires GitHub Actions or equivalent CI.

---

### Option 3 — Direct connection from local machine

For small teams or first deployment:

```bash
DATABASE_URL="postgres://..." npx prisma migrate deploy
```

Run this from your local machine against the production database before merging the PR that changes the schema.

**Pros:** Immediate, visible, controllable.  
**Cons:** Manual. Does not scale. Easy to forget.

---

### What PrismApp recommends for the course

For the exercise in H-06, use **Option 1** (build command) as the simplest path. For a real production app, **Option 2** (separate CI step) is cleaner — it separates migration concerns from build concerns and gives you separate failure signals.

---

### Takeaway

> `migrate dev` is a development tool with destructive power. `migrate deploy` is the only command that belongs near production data. The build pipeline (`postinstall` + `vercel.json`) handles `prisma generate` automatically — you do not need to think about it.
