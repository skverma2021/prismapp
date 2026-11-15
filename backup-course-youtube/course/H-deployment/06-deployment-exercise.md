# H-06 — Deployment Exercise

## Slide 1 of 3 — Exercise: Deploy to Neon + Vercel

### Goal

Deploy a working PrismApp instance to Vercel backed by a Neon PostgreSQL database. By the end, you will have a live URL you can share, with login working and the paid/unpaid contribution matrix loading correctly.

Estimated time: 30–45 minutes for a first deployment.

---

### Part A — Create the database (Neon)

1. Go to [console.neon.tech](https://console.neon.tech) and sign in (free tier).
2. Click **Create Project**.
3. Name: `prismapp-production` (or similar)
4. Region: choose the one closest to your Vercel region (US East / EU Central / etc.)
5. PostgreSQL version: 16
6. Click **Create Project**.

Once created:
- Go to **Connection Details**
- Select **Prisma** from the connection type dropdown
- Copy the connection string — it will look like:
  ```
  postgres://USER:PASSWORD@ep-hostname.region.aws.neon.tech/DATABASE?sslmode=verify-full
  ```
- Save this string. You will use it in two places: Vercel environment variables, and your local terminal for the seed step.

---

### Part B — Fork and prepare the repository

If you have not already:

1. Fork the PrismApp repository to your own GitHub account.
2. Ensure your fork has the latest `main` branch.

No code changes are needed before the first deployment.

---

### Part C — Import the project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your forked PrismApp repo
4. **Stop before clicking Deploy**

---

### Part D — Set environment variables

In the Vercel import wizard (or Settings → Environment Variables after import):

Add these variables. Mark them all for **Production**, **Preview**, and **Development**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string from Part A |
| `AUTH_SECRET` | Run `openssl rand -base64 32` and use the output |
| `NEXTAUTH_URL` | `https://your-project-name.vercel.app` (fill in after you know the URL — can update after first deploy) |
| `AUTH_TRUST_HOST` | `1` — for Preview and Development environments only |

Optional — only if you want error tracking from day one:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | From Sentry project → Settings → Client Keys |

---

### Part E — Update `vercel.json` for migrations

Open `vercel.json` in your fork. Change it to:

```json
{
  "buildCommand": "prisma migrate deploy && prisma generate && next build"
}
```

Commit and push this change to `main`. This ensures migrations run on every build before the app compiles.

---

### Part F — Deploy

Click **Deploy** in Vercel (or push the commit from Part E, which triggers a deployment automatically).

Watch the Build Logs. Expected sequence:
1. `npm install` runs
2. `postinstall: prisma generate` runs
3. `prisma migrate deploy` runs — you should see migration names being applied
4. `prisma generate` runs again
5. `next build` compiles — look for route count and no errors
6. Deployment completes — you get a live URL

---

### Part G — Seed the database

Run this from your local machine (not from Vercel):

```bash
# Replace with your actual Neon connection string
DATABASE_URL="postgres://USER:PASSWORD@ep-hostname.region.aws.neon.tech/DATABASE?sslmode=verify-full" \
  node prisma/seed.mjs
```

Or if you have the variable in your local `.env`:

```bash
npx prisma db seed
```

The seed creates:
- Blocks (Nalanda, Vaishali, Rajgir)
- Contribution heads (Maintenance, Mandir, Gymnasium, Swimming Pool, Holi, Dusshera, SaraswatiPuja, + feast variants)
- Contribution periods (current year)
- Demo app users (admin, manager, read-only)

---

### Part H — Smoke test

Open the live URL and verify:

| Action | Pass / Fail |
|--------|------------|
| Login page loads | |
| Login with seeded admin credentials | |
| Block list shows seeded blocks | |
| Contribution Heads list shows seeded heads | |
| Contribution Periods list shows current period | |
| Contribution capture form loads | |
| Submit a test contribution | |
| Paid/unpaid matrix shows the submission | |
| Logout | |

---

## Slide 2 of 3 — The Preview Deployment Problem

### What happens when you open a PR

After your initial deployment, open a new branch and make a trivial change (add a comment to `README.md`). Push it. Vercel creates a preview deployment at a URL like:

```
https://prismapp-git-your-branch-name-yourname.vercel.app
```

Try to log in at this preview URL.

---

### What breaks without `AUTH_TRUST_HOST`

If you set `NEXTAUTH_URL=https://prismapp.vercel.app` (production URL) for all environments and do not set `AUTH_TRUST_HOST`, the OAuth callback after login will redirect to the production URL instead of the preview URL.

For credentials login, the symptom is subtler: next-auth may reject the callback because the origin does not match.

---

### The fix

In Vercel → **Settings** → **Environment Variables**, find `AUTH_TRUST_HOST`:

- Ensure it is set to `1`
- Ensure it is enabled for **Preview** environment (not necessarily Production)

Set `NEXTAUTH_URL` to be environment-specific:

| Environment | `NEXTAUTH_URL` |
|-------------|----------------|
| Production | `https://your-domain.vercel.app` |
| Preview | (leave blank — `AUTH_TRUST_HOST` handles it) |
| Development | `http://localhost:3000` |

---

### Verify

Open your preview deployment URL. Login should work correctly. The session should be scoped to the preview URL, not redirect to production.

---

### Discussion question

Why would you want preview deployments to connect to a **separate staging database** rather than the production database?

Think about:
- A PR that adds a schema migration — it runs `prisma migrate deploy` against production before the PR is approved
- A developer testing destructive seed data on the preview
- Two developers submitting conflicting schema migrations in parallel PRs

For the scope of this course, using one database is acceptable. The exercise is to understand the risk.

---

## Slide 3 of 3 — Deployment Summary and Full Course Wrap

### Module H — What You Covered

| Slide | Topic | Key takeaway |
|-------|-------|-------------|
| H-01 | Environment variables | `.env.example` is the contract; never commit real values |
| H-02 | Database hosting | Use Neon/Supabase; `@prisma/adapter-pg` is what makes connections work |
| H-03 | Prisma in production | `migrate deploy` only; `vercel.json` + `postinstall` handle generation |
| H-04 | Vercel deployment | Import repo → set env vars → deploy; `AUTH_TRUST_HOST=1` for previews |
| H-05 | Security + first run | Security headers are built-in; Sentry is optional but valuable; 6 smoke tests |
| H-06 | Exercise | End-to-end: Neon → Vercel → seed → test |

---

### Full Course Summary

| Section | Focus |
|---------|-------|
| 00-intro | App tour, React/Express transition, how to add modules, shared components |
| A-scope | What the app does; domain rules; immutability; contribution lifecycle |
| B-erd | Entity model; temporal ownership; foreign key constraints |
| C-technology | Next.js App Router; Prisma 7; PrismaPg; next-auth v4; roles |
| D-crud | Route handlers; server actions; Zod validation; pagination |
| E-hardening | AuthN/AuthZ; rate limiting; audit logging; error firewall; indexes |
| F-reporting | Paid/unpaid matrix; transaction list; CSV export; deterministic totals |
| G-testing | Unit tests; service tests; route handler tests; vitest |
| H-deployment | Env vars; Neon + Vercel; Prisma in production; Sentry; smoke test |

---

### What you have built

A production-grade society management application with:

- Temporal ownership and residency tracking with overlap prevention
- Immutable financial records with compensating transaction support
- Role-based access control (three roles, server-side enforcement)
- Full audit logging of all write operations
- Structured error handling with a 7-branch error classifier
- Paginated, filterable list views with URL-synced state
- CSV contribution reports with deterministic totals
- Security headers on all routes
- Sentry error capture and performance tracing
- Vercel deployment with PostgreSQL hosted on Neon

This is not a toy. This is the real thing.

---

### What comes next (deferred modules)

| Module | Topic |
|--------|-------|
| CMM | Complaint management: intake, assignment, escalation, resolution |
| Safety | Checklist workflows for building safety inspections |
| Security | Incident logging and access control records |
| Events | Common-space booking and event management |

These modules use the same architecture, the same shared components, and the same patterns you now know. When the time comes, the vault documents and the guides in `00-intro/` will be your starting point.

---

### Closing note

Every line of code in PrismApp exists because a domain rule required it. The temporal ownership check, the duplicate payment guard, the immutable financial records — these are not arbitrary. They map to real constraints that a society management system must enforce correctly.

Understanding why the code is written the way it is gives you the ability to change it correctly.

That is what this course was for.
