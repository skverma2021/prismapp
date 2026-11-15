# Slide Script — 00-06: Verification Exercise

---

## Slide 1 — The Twelve-Step Checklist

**Type:** `Exercise`

**Headline:**
> Work through all twelve. Stop at the first failure and fix it before continuing.

**Visual / layout:**
Numbered checklist in two columns of six. Each item has a checkbox. Below the list: a "What to do if stuck" section.

**Narration:**
This exercise is the final gate of the setup module. Every subsequent exercise in the course assumes this checklist is complete.

Work through each step in order. If a step fails, stop and fix it before moving on. Each failure has a common cause — the next slide lists the most frequent ones.

---

**The checklist:**

1. `node --version` returns v20 or higher
2. `npm --version` returns 10 or higher
3. `.env` exists at the project root (not `.env.example`)
4. `DATABASE_URL` in `.env` points to a reachable database
5. `AUTH_SECRET` in `.env` is a non-empty string (at least 32 characters)
6. `NEXTAUTH_URL` in `.env` is `http://localhost:3000`
7. `npm install` completes without errors
8. `npm run prisma:migrate:dev` applies all migrations without errors
9. `npm run prisma:seed` completes — shows "Seeding complete" or similar
10. `npm run lint` returns with no errors
11. `npm run dev` starts — terminal shows "Ready in X ms"
12. Browser at `http://localhost:3000` shows the login page

**Goal:** All twelve pass. Do not move to Section A until they do.

**On-screen action / demo:**
Work through the checklist on screen, ticking off each item. Show the terminal output for each command.

**Key takeaway:**
All twelve checked = you are ready. One failure = stop and fix.

---

## Slide 2 — Common Failures and Fixes

**Type:** `Concept`

**Headline:**
> Most setup failures have a short list of causes. Here they are.

**Visual / layout:**
Two-column table: "Symptom" on the left, "Likely cause and fix" on the right. Six rows.

**Narration:**
These are the setup failures that come up most frequently:

| Symptom | Likely cause and fix |
|---------|---------------------|
| `npm install` fails with permission errors | Run without `sudo` on macOS/Linux; on Windows, open terminal as Administrator |
| `prisma generate` fails: "Generator 'client' failed" | `DATABASE_URL` is malformed or missing from `.env` |
| `prisma migrate dev` fails: "P1001 Can't reach database server" | Database is not running, or `DATABASE_URL` host/port/credentials are wrong |
| `prisma migrate dev` fails: "P3000 Failed to create database" | User in `DATABASE_URL` does not have `CREATE DATABASE` permission |
| `npm run dev` starts but login fails with a redirect loop | `NEXTAUTH_URL` is missing or wrong — must be `http://localhost:3000` in local dev |
| Login page loads but credentials rejected | Seed did not run, or `AUTH_SEED_PASSWORD` changed after seed ran — re-seed with `npm run prisma:seed` |

One important note: if you change `DATABASE_URL` after running migrations, the new database is empty — run `prisma migrate dev` and `prisma db seed` again against the new database.

**On-screen action / demo:**
Show each row while explaining. If demonstrating a failure, reproduce it briefly and show the fix.

**Key takeaway:**
Most failures are `DATABASE_URL` or `NEXTAUTH_URL` misconfiguration. Check those two first.

---

## Slide 3 — You Are Ready

**Type:** `Summary`

**Headline:**
> Setup complete. The app runs. You can start the course.

**Visual / layout:**
Clean success screen. The PrismApp dashboard in a browser at localhost:3000. Text overlay: "You are ready for Section A."

**Narration:**
If your twelve-step checklist is complete, you have:
- A working Node.js environment
- A cloned repository with all dependencies installed
- A configured `.env` with a live database connection
- A migrated database with seed data
- A running development server

What you do not yet need to understand is: what the code does, why the database looks the way it does, or how any of the features work. That is what Sections A through H are for.

Use this table as your quick reference for the rest of the course:

| Command | When to use it |
|---------|---------------|
| `npm run dev` | Start of every session |
| `npm run lint` | Before every commit |
| `npm run build` | After structural changes |
| `npm run test` | Before every commit |
| `npx prisma studio` | When you need to see the data |
| `npm run prisma:migrate:dev` | After changing `schema.prisma` |

Welcome to the course. Go read Section A.

**On-screen action / demo:**
Show the dashboard after login. Navigate to Blocks, then Contribution Heads. Confirm the seeded data is visible. Return to the login page and log out.

**Key takeaway:**
The app runs locally. Every later exercise builds on this foundation.
