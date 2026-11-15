# 00-setup — Assembled Speaker Notes (Camtasia-Ready)

## 00-01-01 — What You Need Before You Clone

Before you clone, verify that four tools are installed.

They are Node.js, Git, VS Code, and a way to access PostgreSQL.

Open your terminal and run each verification command. If any command returns "command not found", install that tool before you continue.

---

## 00-01-02 — Tool Verification Commands

Run three commands.

First, `node --version`. It should return v20.x.x or higher. The project runs on Node v22.

Node v18 will not work. It does not have features that Next.js 16 requires. If you are below v20, use nvm to upgrade. Run `nvm install 20`, then `nvm use 20`.

Second, `npm --version`. It should return 10.x or higher.

Third, `git --version`. It should return 2.40 or higher.

For the code editor, use VS Code. The course uses VS Code keyboard shortcuts and the integrated terminal.

---

## 00-01-03 — PostgreSQL: Two Options

Option A is a local install. Download it from postgresql.org/download. Use version 15 or 16.

Set a superuser password during setup. Write down the port. The default port is 5432. After installing, verify with pgAdmin or `psql`.

Option B is the free Neon cloud database. Go to console.neon.tech and create a free account. Then create a new project. You get a connection string.

This option needs no local installation. It needs internet access while you develop.

Pick one path. Both work for the entire course. Local PostgreSQL is better for offline work. Neon is simpler if you are new to database administration.

---

## 00-02-01 — Cloning the Repository

Run three commands. They are `git clone https://github.com/YOUR_ACCOUNT/prismapp.git`, `cd prismapp`, and `npm install`.

Clone from your fork if you plan to do the exercises. You need write access to push commits. Use the original repository URL only as read-only.

`npm install` downloads all packages. It takes one to two minutes on the first run.

---

## 00-02-02 — What `npm install` Does (and the `postinstall` Hook)

After the packages download, npm automatically runs `postinstall: "prisma generate"`.

`prisma generate` reads `prisma/schema.prisma`. It writes TypeScript types and a database client into `node_modules/@prisma/client`.

Without this step, import paths like `@/lib/db` do not resolve. TypeScript then reports hundreds of errors.

The `postinstall` hook means you never need to run `prisma generate` manually after `npm install`. This same hook runs on Vercel during the install phase.

Show `node_modules/@prisma/client` in the VS Code file tree after install completes.

---

## 00-02-03 — Repository Structure Tour

Open VS Code with `code .` from the project root.

There are five anchor points to know.
- `app/(dashboard)/` holds all authenticated pages.
- `app/api/` holds all route handlers. These are the REST endpoints.
- `src/modules/` holds the business logic. It has one folder per domain area.
- `prisma/schema.prisma` is the database schema.
- `.env.example` is the environment variable contract.

The `vault/` folder is domain documentation, not code.

The `course/` folder is this course. It is not part of the running application.

---

## 00-03-01 — The `.env` File

Copy `.env.example` to `.env`.
- On Windows, run `Copy-Item .env.example .env`.
- On macOS or Linux, run `cp .env.example .env`.

The `.env` file is in `.gitignore`. It never enters version control.

`.env.example` has placeholder values. `.env` has real values.

Open both files side by side in VS Code. Then fill in `.env`.

---

## 00-03-02 — Configuring `DATABASE_URL`

Option A is local PostgreSQL. Use `DATABASE_URL="postgres://postgres:YOUR_PASSWORD@localhost:5432/prismapp?sslmode=disable"`.

Create the database first. Run `createdb -U postgres prismapp`. Or run `CREATE DATABASE prismapp;` in pgAdmin.

Use `sslmode=disable` for local. TLS is usually not configured on a local install.

Option B is Neon. In the Neon dashboard, open Connection Details. Choose Prisma mode. Then copy the connection string. It ends with `?sslmode=verify-full`.

Paste it directly into `DATABASE_URL`.

---

## 00-03-03 — Remaining Variables

Two more variables are required.

First, `AUTH_SECRET`. Generate it with `openssl rand -base64 32` on macOS or Linux. On Windows, use the PowerShell equivalent.

Never reuse a secret from a tutorial or another project. Set it as `AUTH_SECRET="your-generated-value"`.

Second, `NEXTAUTH_URL`. For local development, use `NEXTAUTH_URL="http://localhost:3000"`. Do not change it unless you run on a different port.

Everything else in `.env.example` is optional for local development. The OAuth variables and the Sentry variables can stay commented out.

Show `.env` with three variables filled in: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`.

---

## 00-04-01 — Running Migrations

Make sure `DATABASE_URL` points to an empty database. Then run this command.

```bash
npm run prisma:migrate:dev
```

Prisma reads `prisma/schema.prisma`. It also reads the migration history in `prisma/migrations/`. Then it applies all unapplied migrations.

There are about 9 migrations in the PrismApp history.

The output ends with "Generated Prisma Client" and a list of applied migrations. All database tables now exist.

There is no data yet. That is what the seed does.

---

## 00-04-02 — Running the Seed Script

```bash
npm run prisma:seed
```

This runs `node prisma/seed.mjs`. The script creates several things.

It creates the Blocks Nalanda, Vaishali, and Rajgir. It creates 112 units per block, which is 14 floors × 8 columns, 336 in total.

It creates contribution heads. These are Maintenance, Mandir, Gymnasium, Swimming Pool, Holi, Dusshera, SaraswatiPuja, and feast variants.

It creates a contribution period for the current year. It creates app users: admin, manager, and read-only. It also creates gender types.

Demo user passwords are set from `AUTH_SEED_PASSWORD` in `.env`. The default is `ChangeMe123!`.

Do not run the seed again after you have added real data. It is not fully idempotent. It will create duplicate rows for some categories.

---

## 00-04-03 — Inspecting with Prisma Studio

```bash
npx prisma studio
```

This opens `http://localhost:5555` in your browser. Browse every table.

Click Block. It should show 3 rows. Click ContributionHead. It should show the seeded heads. Click AppUser. It should show the seeded demo users.

Prisma Studio is a development-only tool. It bypasses the authentication and validation of the app.

Never point it at a production database.

---

## 00-05-01 — Starting the Development Server

```bash
npm run dev
```

The output shows Turbopack compiling. Then it shows "Ready in X ms".

Open `http://localhost:3000`. The login page appears.

Hot reload is active. Save any file in VS Code, and the browser updates automatically.

Leave this terminal running for the entire development session.

---

## 00-05-02 — Lint, Build, and Test

There are three quality-gate commands.

First, `npm run lint`. This runs ESLint. It checks code quality. That includes unused imports, type issues, accessibility, and Next.js-specific rules. A clean run produces no output. Run it before every commit.

Second, `npm run build`. This is the full production build. It compiles TypeScript and runs the Next.js build. It is slower than lint. But it catches type errors that only appear during full compilation. Run it after structural changes.

Third, `npm run test`. This runs the Vitest test suite. It runs all tests once and exits. During active development, use `npm run test:watch`. It re-runs the tests on every file save.

The sequence before every commit is lint, then build, then test.

---

## 00-05-03 — Additional Development Commands

This is a reference table for commands you will use regularly.

`npm run prisma:migrate:dev` applies new migrations after you change `schema.prisma`.
`npm run prisma:seed` inserts seed data into a fresh database.
`npx prisma studio` opens the database browser at port 5555.
`npx prisma db push` syncs the schema without creating a migration file. Use it for throwaway experiments only.
`npm run test:watch` re-runs tests on every save.
`npm run test:coverage` runs the test suite with a coverage report.

Here is the key distinction. `migrate dev` creates tracked migration files. `db push` syncs without a file.

Use `migrate dev` for any change you plan to deploy.

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

All twelve must pass.

Stop at the first failure and fix it.

---

## 00-06-02 — Common Failures and Fixes

There are six common failures.

First, `npm install` gives permission errors. Do not use `sudo` on macOS or Linux. On Windows, run the terminal as Administrator.

Second, `prisma generate` says "Generator client failed". Then `DATABASE_URL` is malformed or missing from `.env`.

Third, `prisma migrate dev` says "P1001 Can't reach database server". Then the database is not running. Or the credentials, host, or port are wrong in `DATABASE_URL`.

Fourth, `prisma migrate dev` says "P3000 Failed to create database". Then the database user does not have `CREATE DATABASE` permission.

Fifth, login goes into a redirect loop. Then `NEXTAUTH_URL` is missing or wrong. It must be `http://localhost:3000`.

Sixth, credentials are rejected at login. Then the seed did not run. Or `AUTH_SEED_PASSWORD` changed after the seed ran. Run the seed again.

Most failures come from `DATABASE_URL` or `NEXTAUTH_URL`. Check those two first.

---

## 00-06-03 — You Are Ready

Show the PrismApp dashboard after a successful login. Navigate to Blocks (seeded blocks A, B, C visible) and Contribution Heads (seeded heads visible). Log out.

Use this quick reference table for the rest of the course.

`npm run dev` at the start of every session.
`npm run lint` before every commit.
`npm run build` after structural changes.
`npm run test` before every commit.
`npx prisma studio` to see database data.
`npm run prisma:migrate:dev` after changing the schema.

This setup is the foundation for every exercise in the course.

Now go to Section A.
