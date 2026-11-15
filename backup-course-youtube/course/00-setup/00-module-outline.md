# Module Outline — 00: Local Development Setup

## Identity

| Field | Value |
|---|---|
| Section | 00-setup — Local Development Setup |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | Comfort with a terminal; basic Git knowledge; no prior Next.js experience needed |
| Estimated duration | 30–40 minutes |
| Companion project | PrismApp — Society Management System |

---

## Purpose

This is a prerequisite module. It gets your machine ready before you study any of the course content.

You do not need to understand what everything does yet — understanding comes in sections A onward. Your goal here is a single outcome:

**The app runs on your machine. You can log in. The database has seed data.**

If you reach that outcome, every subsequent section works. If you skip this module and try to follow along in later sections without a running app, you will be blocked from the hands-on exercises.

---

## Learning Objectives

By the end of this module, the student will be able to:

1. Verify that all required tools are installed and at a compatible version.
2. Clone the repository and install all dependencies.
3. Configure a local `.env` file with a working database connection.
4. Run Prisma migrations and the seed script to create a usable database.
5. Start the local development server and log in with seeded credentials.
6. Use the key development workflow commands: `dev`, `lint`, `build`, `test`.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 1 | `01-prerequisites-and-tools.md` | What you need before you clone | 5 min |
| 2 | `02-clone-and-install.md` | Clone the repo and install dependencies | 5 min |
| 3 | `03-environment-configuration.md` | Configure your `.env` file | 8 min |
| 4 | `04-database-setup.md` | Create the database, migrate, and seed | 8 min |
| 5 | `05-local-development-workflow.md` | Daily dev commands and tools | 5 min |
| 6 | `06-verification-exercise.md` | End-to-end verification checklist | 5 min |

---

## Key Files Referenced

| File | Purpose |
|------|---------|
| `.env.example` | Template listing all required environment variables with comments |
| `prisma/schema.prisma` | The database schema — defines all tables and relationships |
| `prisma/seed.mjs` | Creates initial blocks, contribution heads, periods, and demo users |
| `prisma/migrations/` | Migration SQL files — applied by `prisma migrate dev` |
| `package.json` | Lists all scripts: `dev`, `lint`, `build`, `test`, `prisma:seed` |

---

## Two Database Paths

This module covers two ways to get a working database:

| Path | Best for | Effort |
|------|---------|--------|
| **Local PostgreSQL** | Students who want zero cloud dependency | Install PostgreSQL, create a user and database |
| **Neon (cloud)** | Students who prefer not to install a database server | Create a free Neon account, copy the connection string |

Both produce the same outcome. Choose the path that matches your preference.

---

## Key Takeaways

- A running local environment is the prerequisite for every hands-on exercise in this course.
- `.env` is never committed. `.env.example` is the contract for what variables the app needs.
- `prisma migrate dev` applies schema changes. `prisma db seed` fills the database with starting data.
- After setup, you spend most of your time in three commands: `npm run dev`, `npm run lint`, and `npm run test`.

---

## Definition of Done for This Module

1. `npm install` completes without errors.
2. `npm run lint` passes.
3. `npm run dev` starts the server at `http://localhost:3000`.
4. Login with seeded admin credentials opens the dashboard.
5. The Blocks list shows seeded blocks (A, B, C).
6. The Contribution Heads list shows seeded heads.
