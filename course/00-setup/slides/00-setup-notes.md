# 00-setup — Assembled Speaker Notes (Camtasia-Ready)

## 00-01-01 — What You Need Before You Clone

Before cloning, verify four tools are installed: Node.js, Git, VS Code, and a way to access PostgreSQL.

Open your terminal and run each verification command. If any returns "command not found", install it before continuing.

---

## 00-01-02 — Tool Verification Commands

Three commands to run:

`node --version` — should return v20.x.x or higher. The project runs on Node v22. Node v18 will not work — it lacks features Next.js 16 requires. If you are below v20, use nvm to upgrade: `nvm install 20` then `nvm use 20`.

`npm --version` — should return 10.x or higher.

`git --version` — should return 2.40 or higher.

For the code editor: use VS Code. The course references VS Code keyboard shortcuts and the integrated terminal.

---

## 00-01-03 — PostgreSQL: Two Options

Option A — Local Install. Download from postgresql.org/download. Version 15 or 16. Set a superuser password during setup. Note the port (default 5432). After installing, verify with pgAdmin or `psql`.

Option B — Neon free cloud database. Go to console.neon.tech, create a free account, create a new project. You get a connection string. No local installation required. Needs internet access while developing.

Pick one path. Both work for the entire course. Local PostgreSQL is better for offline work. Neon is simpler if you are new to database administration.

---

## 00-02-01 — Cloning the Repository

Three commands: `git clone https://github.com/YOUR_ACCOUNT/prismapp.git`, `cd prismapp`, `npm install`.

Clone from your fork if you intend to do the exercises — you need write access to push commits. Use the original repository URL as read-only only.

`npm install` downloads all packages and takes one to two minutes on first run.

---

## 00-02-02 — What `npm install` Does (and the `postinstall` Hook)

After packages download, npm automatically runs `postinstall: "prisma generate"`.

`prisma generate` reads `prisma/schema.prisma` and writes TypeScript types and a database client into `node_modules/@prisma/client`. Without this, import paths like `@/lib/db` do not resolve and TypeScript reports hundreds of errors.

The `postinstall` hook means you never need to remember to run `prisma generate` manually after `npm install`. This same hook runs on Vercel during the install phase.

Show `node_modules/@prisma/client` in the VS Code file tree after install completes.

---

## 00-02-03 — Repository Structure Tour

Open VS Code with `code .` from the project root.

Five anchor points to know:
- `app/(dashboard)/` — all authenticated pages
- `app/api/` — all route handlers (the REST endpoints)
- `src/modules/` — business logic; one folder per domain area
- `prisma/schema.prisma` — the database schema
- `.env.example` — the environment variable contract

The `vault/` folder is domain documentation, not code. The `course/` folder is this course — not part of the running application.

---

## 00-03-01 — The `.env` File

Copy `.env.example` to `.env`:
- Windows: `Copy-Item .env.example .env`
- macOS/Linux: `cp .env.example .env`

The `.env` file is in `.gitignore`. It never enters version control. `.env.example` has placeholder values. `.env` has real values.

Open both side-by-side in VS Code and fill in `.env`.

---

## 00-03-02 — Configuring `DATABASE_URL`

Option A — Local PostgreSQL: `DATABASE_URL="postgres://postgres:YOUR_PASSWORD@localhost:5432/prismapp?sslmode=disable"`. Create the database first: `createdb -U postgres prismapp` or run `CREATE DATABASE prismapp;` in pgAdmin. Use `sslmode=disable` for local — TLS is typically not configured on a local install.

Option B — Neon: In the Neon dashboard, Connection Details → Prisma mode → copy the connection string. It ends with `?sslmode=verify-full`. Paste it directly into `DATABASE_URL`.

---

## 00-03-03 — Remaining Variables

Two more required variables:

`AUTH_SECRET` — generate with `openssl rand -base64 32` on macOS/Linux, or the PowerShell equivalent on Windows. Never reuse a secret from a tutorial or another project. Set it as `AUTH_SECRET="your-generated-value"`.

`NEXTAUTH_URL` — for local dev: `NEXTAUTH_URL="http://localhost:3000"`. Do not change this unless you are running on a different port.

Everything else in `.env.example` is optional for local dev. The OAuth variables and Sentry variables can remain commented out.

Show `.env` with three variables filled in: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`.

---

## 00-04-01 — Running Migrations

With `DATABASE_URL` pointing to an empty database:

```bash
npm run prisma:migrate:dev
```

Prisma reads `prisma/schema.prisma`, reads the existing migration history in `prisma/migrations/`, and applies all unapplied migrations. There are about 9 migrations in the PrismApp history.

The output ends with "Generated Prisma Client" and a list of applied migrations. All database tables now exist. No data yet — that is what the seed does.

---

## 00-04-02 — Running the Seed Script

```bash
npm run prisma:seed
```

This runs `node prisma/seed.mjs` which creates: Blocks Nalanda, Vaishali, Rajgir; 112 units per block (14 floors × 8 columns, 336 total); contribution heads (Maintenance, Mandir, Gymnasium, Swimming Pool, Holi, Dusshera, SaraswatiPuja, + feast variants); a contribution period for the current year; app users (admin, manager, read-only); gender types.

Demo user passwords are set using `AUTH_SEED_PASSWORD` from `.env` (default: `ChangeMe123!`).

Do not re-run the seed after you have added real data — it is not fully idempotent and will create duplicate rows for some categories.

---

## 00-04-03 — Inspecting with Prisma Studio

```bash
npx prisma studio
```

Opens `http://localhost:5555` in your browser. Browse every table. Click Block — should show 3 rows. Click ContributionHead — should show seeded heads. Click AppUser — should show seeded demo users.

Prisma Studio is a development-only tool. It bypasses the app's authentication and validation. Never point it at a production database.

---

## 00-05-01 — Starting the Development Server

```bash
npm run dev
```

Output shows Turbopack compiling, then "Ready in X ms". Open `http://localhost:3000` — the login page appears.

Hot reload is active. Save any file in VS Code and the browser updates automatically.

Leave this terminal running for the entire development session.

---

## 00-05-02 — Lint, Build, and Test

Three quality-gate commands:

`npm run lint` — ESLint. Checks code quality: unused imports, type issues, accessibility, Next.js-specific rules. Clean run produces no output. Run before every commit.

`npm run build` — full production build. Compiles TypeScript, runs the Next.js build. Slower than lint but catches type errors that only surface during full compilation. Run after structural changes.

`npm run test` — Vitest test suite. Runs all tests once and exits. Use `npm run test:watch` during active development to re-run on file save.

Sequence before every commit: lint → build → test.

---

## 00-05-03 — Additional Development Commands

Reference table for commands that come up regularly:

`npm run prisma:migrate:dev` — apply new migrations after changing `schema.prisma`.
`npm run prisma:seed` — insert seed data into a fresh database.
`npx prisma studio` — database browser at port 5555.
`npx prisma db push` — sync schema without creating a migration file. For throwaway experiments only.
`npm run test:watch` — re-run tests on every save.
`npm run test:coverage` — test suite with coverage report.

Key distinction: `migrate dev` creates tracked migration files. `db push` syncs without a file. Use `migrate dev` for any change you intend to deploy.

---

## 00-06-01 — The Twelve-Step Checklist

Walk through each item on screen:

1. `node --version` → v20+
2. `npm --version` → 10+
3. `.env` exists at project root
4. `DATABASE_URL` points to a reachable database
5. `AUTH_SECRET` is set and non-empty
6. `NEXTAUTH_URL` is `http://localhost:3000`
7. `npm install` → no errors
8. `npm run prisma:migrate:dev` → all migrations applied
9. `npm run prisma:seed` → seeding complete
10. `npm run lint` → no errors
11. `npm run dev` → "Ready in X ms"
12. Browser at localhost:3000 → login page shows

All twelve must pass. Stop at the first failure and fix it.

---

## 00-06-02 — Common Failures and Fixes

Six common failures:

`npm install` permission errors → don't use `sudo` on macOS/Linux; on Windows run terminal as Administrator.

`prisma generate` "Generator client failed" → `DATABASE_URL` is malformed or missing from `.env`.

`prisma migrate dev` "P1001 Can't reach database server" → database not running, or credentials/host/port wrong in `DATABASE_URL`.

`prisma migrate dev` "P3000 Failed to create database" → database user does not have `CREATE DATABASE` permission.

Login redirect loop → `NEXTAUTH_URL` missing or wrong — must be `http://localhost:3000`.

Credentials rejected at login → seed did not run, or `AUTH_SEED_PASSWORD` changed after seed ran — re-seed.

Most failures are `DATABASE_URL` or `NEXTAUTH_URL`. Check those two first.

---

## 00-06-03 — You Are Ready

Show the PrismApp dashboard after a successful login. Navigate to Blocks (seeded blocks A, B, C visible) and Contribution Heads (seeded heads visible). Log out.

Quick reference table for the rest of the course:

`npm run dev` — every session start.
`npm run lint` — before every commit.
`npm run build` — after structural changes.
`npm run test` — before every commit.
`npx prisma studio` — to see database data.
`npm run prisma:migrate:dev` — after changing schema.

This setup is the foundation for every exercise in the course. Now go to Section A.
