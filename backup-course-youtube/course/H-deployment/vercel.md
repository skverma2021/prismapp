# Vercel Deployment — Reference Guide

A practical reference for deploying PrismApp to Vercel. Complements the slide scripts in this folder. For the step-by-step exercise, see `06-deployment-exercise.md`.

---

## What Vercel Is (One Paragraph)

Vercel is a serverless hosting platform built specifically for frontend frameworks. It runs your Next.js app as a collection of short-lived functions — no persistent server process, no file system, no connection pool that survives between requests. Each API route invocation is potentially a cold start. This has direct consequences for how the database connection and session handling are configured.

---

## GitHub Integration

### First-time connect

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Add New → Project → Import Git Repository**
3. Authorise Vercel to access your GitHub account
4. Select the PrismApp fork from the list

Vercel detects Next.js automatically and pre-fills build settings:

| Setting | Auto-detected | Effective (from `vercel.json`) |
|---|---|---|
| Framework Preset | Next.js | Next.js |
| Build Command | `next build` | `prisma generate && next build` |
| Output Directory | `.next` | `.next` |
| Install Command | `npm install` | `npm install` |

The `vercel.json` at the project root overrides the build command. No manual change needed in the Vercel UI.

### Deployment triggers

| Event | What Vercel does |
|---|---|
| Push to `main` | Production deployment |
| Push to any other branch | Preview deployment (unique URL) |
| Pull request opened or updated | Preview deployment linked to the PR |

Every merge to `main` is a production deployment. You do not need to trigger deployments manually.

---

## The Build Pipeline

What Vercel runs on every push:

```
Phase 1 — Install
  npm install
  └─ triggers postinstall hook
     └─ prisma generate   (writes Prisma Client to node_modules)

Phase 2 — Build
  Reads buildCommand from vercel.json:
  prisma generate && next build
```

For production (after you complete the deployment exercise and update `vercel.json`):

```
prisma migrate deploy && prisma generate && next build
```

`prisma migrate deploy` runs migrations before the app compiles. If the migration fails, the build fails — the old deployment stays live and the broken version is never promoted.

---

## Environment Variables

Set in **Vercel Dashboard → Project → Settings → Environment Variables**.

Each variable can be scoped to: Production, Preview, Development.

### Required variables

| Variable | Production | Preview | Development | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | ✓ | ✓ | ✓ | Neon/Supabase connection string with `sslmode=require` or `verify-full` |
| `AUTH_SECRET` | ✓ | ✓ | ✓ | Random 32+ char string — different from local `.env` |
| `NEXTAUTH_URL` | ✓ | — | — | Your production URL: `https://your-project.vercel.app` |
| `AUTH_TRUST_HOST` | — | ✓ | ✓ | Set to `1` — fixes preview deployment login (see below) |

Generate a fresh `AUTH_SECRET` for production — do not reuse the value from your local `.env`:

```bash
# macOS / Linux
openssl rand -base64 32

# Any platform
npx auth secret
```

### Optional variables

| Variable | When to set | Notes |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | When Sentry project is created | Runtime: browser + server error capture |
| `SENTRY_ORG` | When enabling source maps | Build time only |
| `SENTRY_PROJECT` | When enabling source maps | Build time only |
| `SENTRY_AUTH_TOKEN` | When enabling source maps | Build time only — mark as **sensitive** in Vercel |

### Mark these variables as sensitive

Vercel can encrypt a variable so its value is write-only (never displayed after saving):

- `AUTH_SECRET`
- `DATABASE_URL`
- `SENTRY_AUTH_TOKEN`
- Any OAuth client secrets

Once marked sensitive, keep a copy in a password manager — Vercel will not show it again.

### Re-deploying after an env variable change

Changing a variable in the Vercel dashboard does **not** automatically re-deploy. Trigger a redeploy:

1. Vercel Dashboard → Deployments
2. Find the latest deployment
3. **⋯ menu → Redeploy**

Or push a trivial commit.

---

## Database Connection

### Why the connection differs from local

Vercel functions are stateless. Opening a traditional long-lived connection pool (like Prisma's default query engine) per function invocation exhausts the database's connection limit quickly.

PrismApp solves this with the `@prisma/adapter-pg` driver, which opens and closes connections per-request instead of holding a pool. See `src/lib/db.ts`.

### Required sslmode for hosted PostgreSQL

| Provider | Required sslmode |
|---|---|
| Neon | `sslmode=verify-full` |
| Supabase (direct, port 5432) | `sslmode=require` |
| Supabase (pooler, port 6543) | `sslmode=require` |
| Railway | `sslmode=require` |
| Local dev | `sslmode=disable` |

Do not copy-paste your local `DATABASE_URL` (which likely has `sslmode=disable`) into Vercel. Use the connection string from your cloud provider's dashboard.

### Running migrations in production

Never run `prisma migrate dev` against a production database. Use:

```bash
npx prisma migrate deploy
```

In the build pipeline (`vercel.json`):

```json
{
  "buildCommand": "prisma migrate deploy && prisma generate && next build"
}
```

`migrate deploy` only applies pending migrations — it never resets, never drops data.

### Seeding the production database

The seed script runs from your local machine pointing at the production `DATABASE_URL`:

```bash
# Inline override (do not commit this to any file)
DATABASE_URL="postgres://USER:PASSWORD@ep-host.region.aws.neon.tech/db?sslmode=verify-full" \
  node prisma/seed.mjs
```

Seed once at initial deployment. Re-running seed on a non-empty database will skip already-existing records (seed scripts use upsert patterns).

---

## Sentry Integration

### How it is wired up

Three config files initialise Sentry in each execution context:

| File | Context |
|---|---|
| `sentry.client.config.ts` | Browser — captures client-side errors |
| `sentry.server.config.ts` | Node.js / serverless functions |
| `sentry.edge.config.ts` | Edge middleware |

All three are loaded via `withSentryConfig` in `next.config.ts`.

### Minimum setup (error capture only)

Set one environment variable in Vercel (Production + Preview):

```
NEXT_PUBLIC_SENTRY_DSN = https://xxxx@o0000000.ingest.sentry.io/0000000
```

Get the DSN from: **Sentry project → Settings → Client Keys (DSN)**.

If `NEXT_PUBLIC_SENTRY_DSN` is absent, the SDK initialises silently — no errors captured, but the app does not crash.

### Full setup (error capture + readable stack traces)

Source maps let Sentry show original TypeScript lines instead of minified output. Add these three **build-time** variables in Vercel:

```
SENTRY_ORG       = your-sentry-org-slug
SENTRY_PROJECT   = your-sentry-project-slug
SENTRY_AUTH_TOKEN = sntrys_xxxxx...   (mark as sensitive)
```

Get the auth token from: **Sentry → Settings → Auth Tokens → Create Token** (scope: `project:releases`, `org:read`).

Source maps are uploaded to Sentry during the build and are never served to browsers.

### Verifying Sentry works after deployment

Sentry ships a test route at `GET /api/sentry-example-api`. Opening it triggers a sample error. Check your Sentry project's **Issues** tab — the error should appear within seconds.

---

## Preview Deployments and NEXTAUTH_URL

### The problem

Every preview deployment gets a unique URL:

```
https://prismapp-git-feature-branch-yourname.vercel.app
```

This URL is different for every PR. If `NEXTAUTH_URL` is hardcoded to your production URL, the login callback redirects to production even when testing a preview.

### The fix

Set `AUTH_TRUST_HOST=1` in Vercel for **Preview** and **Development** environments. Do **not** set it for Production.

With `AUTH_TRUST_HOST=1`, next-auth reads the request host header dynamically instead of using `NEXTAUTH_URL`. Preview deployments inherit the correct URL automatically.

`NEXTAUTH_URL` is still required on Production — set it to your live domain.

---

## Common Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Build fails: `P1001 Can't reach database server` | `DATABASE_URL` not set, or wrong credentials | Check Vercel env vars; verify connection string with `psql` |
| Build fails: `Please define a secret` | `AUTH_SECRET` not set | Add `AUTH_SECRET` to Vercel env vars |
| Login succeeds but immediately redirects to production | `NEXTAUTH_URL` set for Preview env | Remove `NEXTAUTH_URL` from Preview; add `AUTH_TRUST_HOST=1` instead |
| Login loop on preview URL | `NEXTAUTH_URL` set to a different URL | Same fix as above |
| Sentry errors show minified stack traces | `SENTRY_AUTH_TOKEN` not set | Add the three `SENTRY_*` build-time variables |
| Old data missing after first production deploy | Seed was not run against the production database | Run seed locally pointed at the production `DATABASE_URL` |
| New migration not applied | `vercel.json` still has old build command without `migrate deploy` | Update `vercel.json` to include `prisma migrate deploy` before `next build` |
| `prisma generate` fails at build | Schema references a type not yet in the installed Prisma version | Run `npm install` to pull the latest lockfile; check `prisma` and `@prisma/client` versions match |
| Function timeout on reports endpoint | Query missing index or fetching too many rows | Add `@@index` to `prisma/schema.prisma`; add pagination |

---

## Things Worth Knowing

**Deployments are immutable.** Every push creates a new deployment. Old deployments stay accessible at their own URL. Rolling back means promoting a previous deployment — not reversing code.

**Build logs are your first debugging tool.** Vercel Dashboard → Deployments → click any deployment → Build Logs. Always check here before checking the app itself.

**The `NEXTAUTH_URL` variable is only read at startup.** If you change it, you must redeploy for the change to take effect.

**Preview deployments share the same database by default.** If you set the same `DATABASE_URL` for Production and Preview, all preview deployments read and write production data. Use a separate database for preview/staging if that is a problem.

**Cold starts affect the first request after inactivity.** The Vercel free tier allows functions to go cold. The first request after a period of no traffic takes 1–3 seconds longer than subsequent requests. This is normal and not an error.

**Environment variables with `NEXT_PUBLIC_` prefix are embedded in the client bundle at build time.** They are visible in the browser. Never put secrets in `NEXT_PUBLIC_*` variables. The only intentional exception here is `NEXT_PUBLIC_SENTRY_DSN`, which is a safe-to-expose project key (not an auth token).

**`vercel.json` is the source of truth for the build command.** Whatever is set in the Vercel dashboard UI is overridden by `vercel.json`. Changes to the build command belong in `vercel.json`, not in the dashboard.

---

## Quick-Reference: Deployment Checklist

Before announcing the production URL:

- [ ] Vercel Build Logs show no errors
- [ ] `prisma migrate deploy` applied in the build log
- [ ] `DATABASE_URL` set in Vercel (Production + Preview)
- [ ] `AUTH_SECRET` set in Vercel — different from local `.env`
- [ ] `NEXTAUTH_URL` set to the production URL (Production only)
- [ ] `AUTH_TRUST_HOST=1` set for Preview + Development
- [ ] Seed run against production database
- [ ] Login works at the production URL
- [ ] One smoke-test contribution recorded end-to-end
- [ ] Sentry receiving errors (open `/api/sentry-example-api` to test)
