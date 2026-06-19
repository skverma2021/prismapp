# Terminal Commands — Project Setup Reference

A concise command reference covering every terminal step from a fresh machine to a running local development environment. For the full explanation of each step, see the `course/00-setup/` slide scripts.

---

## 1. Verify Prerequisites

```bash
node --version     # Must be v20.x or higher (v22 recommended)
npm --version      # Must be 10.x or higher
git --version      # Must be 2.40 or higher
```

**If Node is too old — upgrade via nvm:**

```bash
# macOS / Linux
nvm install 22
nvm use 22

# Windows (nvm-windows)
nvm install 22
nvm use 22
```

---

## 2. Clone and Install Dependencies

```bash
git clone https://github.com/YOUR_ACCOUNT/prismapp.git
cd prismapp
npm install
```

> `npm install` automatically runs `prisma generate` via the `postinstall` hook. The Prisma Client is written to `node_modules/@prisma/client`.

---

## 3. Configure Environment Variables

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` in your editor and set the required values:

| Variable | What to set |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string (see below) |
| `AUTH_SECRET` | A random string — minimum 32 characters |
| `NEXTAUTH_URL` | `http://localhost:3000` for local development |
| `AUTH_SEED_PASSWORD` | Password applied to demo users during seed (default: `ChangeMe123!`) |

**Generate a secure `AUTH_SECRET`:**

```bash
# macOS / Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])

# Or use the npx helper (any platform)
npx auth secret
```

**`DATABASE_URL` format — Local PostgreSQL:**

```
DATABASE_URL="postgres://postgres:YOUR_PASSWORD@localhost:5432/prismapp?sslmode=disable"
```

**`DATABASE_URL` format — Neon (cloud):**

```
DATABASE_URL="postgres://USER:PASSWORD@ep-xxx.region.aws.neon.tech/prismapp?sslmode=verify-full"
```

**Create the local database (only needed for Option A — local PostgreSQL):**

```bash
# Using the createdb CLI tool
createdb -U postgres prismapp

# Or from psql
psql -U postgres -c "CREATE DATABASE prismapp;"
```

---

## 4. Run Database Migrations

```bash
npm run prisma:migrate:dev
```

Applies all migrations from `prisma/migrations/` to your database, creating all tables and indexes. Safe to run multiple times — skips already-applied migrations.

---

## 5. Seed the Database

```bash
npm run prisma:seed
```

Creates the following starter data:

| Category | What is created |
|---|---|
| Blocks | Nalanda, Vaishali, Rajgir |
| Units | 112 per block (14 floors × 8 columns), 336 total |
| Contribution heads | Maintenance, Mandir, Gymnasium, Swimming Pool, Holi, Dusshera, SaraswatiPuja, + feast variants |
| Contribution period | Current year |
| App users | Admin, Manager, and Read-Only accounts |
| Gender types | Male, Female, Other |

Demo user passwords are set from `AUTH_SEED_PASSWORD` in `.env`.

---

## 6. Verify Quality Gates

```bash
npm run lint       # ESLint — must return with no errors
npm run build      # Production build — must complete without errors
npm run test       # Unit tests — must all pass
```

---

## 7. Start the Development Server

```bash
npm run dev
```

Starts the Next.js development server with Turbopack. Open `http://localhost:3000` in your browser. You should see the login page.

Leave this terminal running for your entire development session. Hot reload is active — saved files update the browser automatically.

---

## Quick-Reference: All npm Scripts

| Script | What it runs |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | `prisma generate` + Next.js production build |
| `npm run start` | Start built production server |
| `npm run lint` | ESLint across all source files |
| `npm run test` | Vitest unit test suite (single run) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with coverage report |
| `npm run prisma:generate` | Regenerate Prisma Client from schema |
| `npm run prisma:migrate:dev` | Apply pending migrations (development) |
| `npm run prisma:migrate:deploy` | Apply pending migrations (production) |
| `npm run prisma:seed` | Run seed script (`prisma/seed.mjs`) |
| `npm run backup:db` | Dump current database to a backup file |

---

## Day-to-Day Development Commands

```bash
# Start a session
npm run dev

# After pulling changes that include schema edits
npm run prisma:migrate:dev
npm run prisma:generate   # if only types changed, no migration needed

# Before committing
npm run lint
npm run build
npm run test
```

---

## Useful Prisma One-Liners

```bash
# Open Prisma Studio (visual database browser)
npx prisma studio

# Inspect the current database schema
npx prisma db pull

# Reset the database and re-seed (destroys all data)
npx prisma migrate reset

# Push schema changes without creating a migration file (prototyping only)
npx prisma db push
```

> **Warning:** `prisma migrate reset` and `prisma db push` are destructive in development. Never run them against a production database.

---

## Twelve-Step Readiness Checklist

Work through these in order. Stop at the first failure and fix it before continuing.

- [ ] `node --version` → v20 or higher
- [ ] `npm --version` → 10 or higher
- [ ] `.env` exists at the project root (not just `.env.example`)
- [ ] `DATABASE_URL` points to a reachable database
- [ ] `AUTH_SECRET` is a non-empty string (32+ characters)
- [ ] `NEXTAUTH_URL` is `http://localhost:3000`
- [ ] `npm install` completes without errors
- [ ] `npm run prisma:migrate:dev` applies all migrations without errors
- [ ] `npm run prisma:seed` completes successfully
- [ ] `npm run lint` returns with no errors
- [ ] `npm run dev` starts — terminal shows "Ready in X ms"
- [ ] Browser at `http://localhost:3000` shows the login page

All twelve checked = ready for formal development.
