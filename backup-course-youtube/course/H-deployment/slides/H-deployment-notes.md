# H-deployment — Assembled Speaker Notes (Camtasia-Ready)

## H-01-01 — Environment Variables: The Concept

An environment variable is configuration that lives outside the source code. The app reads it at runtime. The value never goes into the repository.

This is not optional caution. A secret committed to git is permanently compromised — it exists in history even after deletion. There are three categories: database credentials, auth secrets, and OAuth credentials. Leaking any of them is a security incident.

The `.env.example` convention: the repository contains a template file with placeholders and comments. A new developer copies it to `.env` and fills in real values. The actual `.env` is in `.gitignore` and never committed.

Show `.gitignore` confirming `.env` is listed. Then open `.env.example` together.

Key rule: if it has a password, a secret, or a key — it belongs in `.env`.

---

## H-01-02 — The Full Variable List

Walk through `.env.example` variable by variable.

`DATABASE_URL` — the Postgres connection string. Prisma reads it for migrations, seeding, and all queries. The `?sslmode=require` at the end is mandatory — without it, credentials travel in cleartext.

`AUTH_SECRET` — used by next-auth to sign JWTs. Generate with `openssl rand -base64 32`. The app also accepts `NEXTAUTH_SECRET` — both names are checked.

`AUTH_SEED_PASSWORD` — demo password for seeded users. Development only.

`NEXTAUTH_URL` — the app's base URL. Required in local dev. On Vercel, `VERCEL_URL` is set automatically and next-auth falls back to it.

OAuth variables are all commented out. The app checks at startup whether they are present and registers those providers only if they are. Credentials login works without any of them.

Sentry: `NEXT_PUBLIC_SENTRY_DSN` is runtime. The three `SENTRY_*` build vars are build-time only for source map upload. The build does not fail if they are absent.

---

## H-01-03 — Server-Only vs Public Variables

Next.js applies a strict rule at build time. Variables prefixed `NEXT_PUBLIC_` are embedded into the JavaScript bundle and visible in the browser. Variables without that prefix are server-only and never sent to the browser.

If you read `process.env.AUTH_SECRET` in a Client Component, you get `undefined`. This is intentional.

What happens if a required variable is missing: `DATABASE_URL` missing → Prisma throws on first query. `AUTH_SECRET` missing → next-auth throws on first session operation. Sentry vars missing → silent, no capture. OAuth vars missing → those providers simply are not registered.

Verification before deploying: `npx prisma db pull` confirms Prisma can reach the database. Check the Vercel Environment Variables tab as the single source of truth for what is set in production.

---

## H-02-01 — Why Not a Local PostgreSQL

Vercel is serverless. Each function invocation is short-lived — no persistent process, no file system, no ability to run a PostgreSQL server alongside the app.

Traditional Prisma clients maintain a long-lived connection pool. On Vercel, each function spawn could open its own pool. At volume, you exhaust the database connection limit. Free-tier databases typically allow 25 to 100 connections.

The solution is a managed service: Postgres lives somewhere else, your app connects over a network using a connection string.

---

## H-02-02 — Managed PostgreSQL Options

Three options that work well: Neon, Supabase, Railway.

Neon is the course recommendation. It was designed for serverless from the beginning. The connection string works directly with `@prisma/adapter-pg`. Free tier covers a society management app.

Supabase: use the PgBouncer pooler connection string (port 6543) for the app, and the direct connection (port 5432) for migrations. This distinction matters — the pooler does not support all migration SQL.

Show what a Neon connection string looks like: `postgres://USER:PASSWORD@ep-hostname.region.aws.neon.tech/DATABASE?sslmode=verify-full`. Identify each part: credentials, endpoint hostname, database name, TLS mode.

---

## H-02-03 — Connection Pooling on Vercel

The traditional Prisma client uses a binary query engine process that is long-lived. On serverless, this breaks because the process is short-lived.

`@prisma/adapter-pg` uses the `pg` Node.js package Pool instead. The Pool manages connections at the Node.js runtime level — lighter, works correctly in short-lived functions.

The dev singleton pattern in `src/lib/db.ts`: `global.prisma ??= new PrismaClient(...)`. In local dev, Next.js hot-reloads modules on every file change. Without this guard, each reload creates a new client with a new pool — connections exhausted within minutes. In production on Vercel, this is a no-op.

The `withVerifyFullSsl()` detail: the app refuses to connect if the TLS certificate is not trusted. Silent downgrade to unencrypted is not possible.

---

## H-03-01 — Two Different Migration Commands

`prisma migrate dev`: compares schema to database, generates SQL migration files, resets if history is inconsistent, applies, re-seeds. **Development only**. The database reset is dangerous near real data.

`prisma migrate deploy`: reads existing migration files, applies only the unapplied ones, never resets anything. **Production safe**. Idempotent.

The rule: production gets `migrate deploy`. Never `migrate dev` near production data. `package.json` includes a `prisma:migrate:deploy` convenience script.

---

## H-03-02 — The Build Pipeline

Two phases: Install phase runs `npm install` which triggers `postinstall: prisma generate`. Build phase runs `vercel.json` buildCommand: `prisma generate && next build`.

Why `prisma generate` runs twice: `postinstall` runs in the install context. `buildCommand` runs in the build context. Running generate twice is harmless and defensive — guarantees the generated client is present before TypeScript compilation.

`prisma.config.ts` with `defineConfig` makes all paths explicit: schema, migrations folder, seed command. No convention-based defaults.

---

## H-03-03 — When and Where to Run Migrations

The problem: Vercel is a build-and-deploy system, not a server with a terminal. You cannot SSH in after deploy.

Three options:

Option 1 — build command: prepend `prisma migrate deploy &&` to `vercel.json`. Simple, requires `DATABASE_URL` set in Vercel env vars for build phase.

Option 2 — GitHub Actions: run migrations in CI before triggering the Vercel deploy. Cleanest separation of concerns. Preferred for production workloads.

Option 3 — local machine: run `DATABASE_URL="postgres://..." npx prisma migrate deploy` manually before merging. Only practical for very small teams or first deployment.

For the exercise: use Option 1. For real production: use Option 2.

---

## H-04-01 — Connecting the Repository

Vercel watches your GitHub repository. Push to `main` → production deployment. Push to any branch or open a PR → preview deployment at a unique URL.

Import steps: vercel.com/new → Add New → Import Git Repository → select fork. Framework detected automatically as Next.js. `vercel.json` overrides the default build command. Root directory blank — all key files are at the project root.

Do not click Deploy until environment variables are set.

---

## H-04-02 — Environment Variables in Vercel Dashboard

Project → Settings → Environment Variables. Add variables as key-value pairs, mark each for Production / Preview / Development as appropriate.

Required: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` (production URL).

Optional: OAuth credentials (only if enabling those providers), Sentry variables (only if using error tracking).

Mark sensitive variables as encrypted: `AUTH_SECRET`, `DATABASE_URL`, `*_CLIENT_SECRET`, `SENTRY_AUTH_TOKEN`. Once marked sensitive, the value cannot be read back from the dashboard.

---

## H-04-03 — Preview Deployments and NEXTAUTH_URL

Every preview deployment gets a unique URL. Static `NEXTAUTH_URL` pointing to production causes OAuth callbacks and next-auth redirects to go to the wrong place.

Solution: set `AUTH_TRUST_HOST=1` for Preview and Development environments. next-auth trusts the `X-Forwarded-Host` header that Vercel sets automatically. Set `NEXTAUTH_URL` for Production only.

Summary table: Production gets custom URL + `NEXTAUTH_URL`. Preview gets `AUTH_TRUST_HOST=1` and no `NEXTAUTH_URL`. Preview deployments share the production database by default — discuss the risk of migration PRs applying schema changes before approval.

---

## H-05-01 — Security Headers

Security headers are HTTP response metadata that instruct the browser to apply protective policies. Zero client-side JavaScript required.

Four headers in `next.config.ts`:

`X-Frame-Options: DENY` — prevents iframe embedding; blocks clickjacking.

`X-Content-Type-Options: nosniff` — prevents browser MIME-type guessing; blocks MIME confusion attacks.

`Referrer-Policy: strict-origin-when-cross-origin` — controls what URL appears in the `Referer` header; prevents URL parameter leakage to third parties.

`Permissions-Policy: camera=(), microphone=(), geolocation=()` — disables hardware APIs the app does not use.

What is not configured yet: Content Security Policy (recommended for Phase 3 hardening) and HSTS (Vercel sets it automatically for custom domains).

---

## H-05-02 — Sentry in Production

Three Sentry config files: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`. All wrapped through `withSentryConfig` in `next.config.ts`.

Variable timing: `NEXT_PUBLIC_SENTRY_DSN` is runtime. The `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` are build-time only for source map upload.

Source maps convert minified stack traces (file `main-abc123.js:1:2847`) into readable ones (file `contributions/page.tsx:47:12`). Source maps are uploaded to Sentry, never deployed to the browser.

`tracesSampleRate`: 0.1 in production, 1.0 in development. Controls Sentry cost at volume.

---

## H-05-03 — First-Run Checklist

Step 1: verify the build log. Look for `✓ Compiled successfully`, `Prisma Client generated`, no `Error:` lines.

Step 2: open the live URL. Login page should appear. If 500, check Vercel function logs and Sentry.

Step 3: run the seed script once from your local machine against the production database. Do not re-run after real data is entered.

Step 4: create a real admin user; deactivate or delete demo seeded accounts.

Step 5: smoke test six paths — login, blocks, contributions form, submit, paid/unpaid matrix, logout.

---

## H-06-01 — Exercise: Deploy to Neon + Vercel

Parts A through H. Walk through each.

A: Create Neon project, copy Prisma-mode connection string.
B: Fork PrismApp to your GitHub account.
C: Import to Vercel — stop before Deploy.
D: Set four env vars: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST`.
E: Update `vercel.json` to prepend `prisma migrate deploy &&` to buildCommand. Commit and push.
F: Deploy — watch build logs for migration names and compilation success.
G: Seed from local machine.
H: Run the 9-row smoke test.

---

## H-06-02 — The Preview Deployment Problem

Open a PR with a trivial change. Observe the preview URL. Try to login without `AUTH_TRUST_HOST`.

Show what breaks: callback URL redirects to production domain. For credentials login: subtle mismatch that may reject the callback.

Fix: `AUTH_TRUST_HOST=1` for Preview environment. `NEXTAUTH_URL` set only for Production.

Discussion: why preview deployments against production database are risky with schema migrations. How Option 2 (separate CI migration step) prevents migration PRs from running against production before approval.

---

## H-06-03 — Full Course Wrap

Module summary table: H-01 through H-06 with topics and key takeaways.

Full course summary table: 00-intro through H-deployment, nine sections.

What was built: temporal ownership, immutable finances, role-based access, audit logging, structured errors, paginated UI, CSV reports, security headers, Sentry, Vercel on Neon.

What comes next: CMM, Safety, Security, Events. Same architecture, same components, same patterns.

Closing note: every line of code exists because a domain rule required it. Understanding why it is written the way it is gives you the ability to change it correctly.
