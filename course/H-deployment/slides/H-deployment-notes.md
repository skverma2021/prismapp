# H-deployment — Assembled Speaker Notes (Camtasia-Ready)

## H-01-01 — Environment Variables: The Concept

An environment variable is configuration that lives outside the source code. The app reads it at runtime. The value never goes into the repository.

This is not optional caution.

A secret committed to git is permanently compromised. It stays in history even after you delete it.

There are three categories: database credentials, auth secrets, and OAuth credentials. Leaking any of them is a security incident.

The `.env.example` convention works like this. The repository contains a template file with placeholders and comments. A new developer copies it to `.env` and fills in real values. The actual `.env` is in `.gitignore` and is never committed.

Show `.gitignore` confirming `.env` is listed. Then open `.env.example` together.

Here is the key rule. If it has a password, a secret, or a key, it belongs in `.env`.

---

## H-01-02 — The Full Variable List

Walk through `.env.example` variable by variable.

`DATABASE_URL` is the Postgres connection string. Prisma reads it for migrations, seeding, and all queries.

The `?sslmode=require` at the end is mandatory. Without it, credentials travel in cleartext.

`AUTH_SECRET` is used by next-auth to sign JWTs. Generate it with `openssl rand -base64 32`. The app also accepts `NEXTAUTH_SECRET`. Both names are checked.

`AUTH_SEED_PASSWORD` is the demo password for seeded users. Use it in development only.

`NEXTAUTH_URL` is the base URL of the app. It is required in local dev. On Vercel, `VERCEL_URL` is set automatically, and next-auth falls back to it.

The OAuth variables are all commented out. At startup, the app checks whether they are present. It registers those providers only if they are. Credentials login works without any of them.

Now Sentry. `NEXT_PUBLIC_SENTRY_DSN` is a runtime variable.

The three `SENTRY_*` build variables are build-time only. They are used for source map upload. The build does not fail if they are absent.

---

## H-01-03 — Server-Only vs Public Variables

Next.js applies a strict rule at build time.

Variables with the prefix `NEXT_PUBLIC_` are embedded into the JavaScript bundle. They are visible in the browser. Variables without that prefix are server-only. They are never sent to the browser.

If you read `process.env.AUTH_SECRET` in a Client Component, you get `undefined`. This is intentional.

Now consider what happens when a required variable is missing.

If `DATABASE_URL` is missing, Prisma throws on the first query. If `AUTH_SECRET` is missing, next-auth throws on the first session operation. If the Sentry variables are missing, nothing is captured, and there is no error. If the OAuth variables are missing, those providers are simply not registered.

Verify before you deploy. Run `npx prisma db pull` to confirm that Prisma can reach the database.

Use the Vercel Environment Variables tab as the single source of truth for what is set in production.

---

## H-02-01 — Why Not a Local PostgreSQL

Vercel is serverless. Each function invocation is short-lived. There is no persistent process and no file system. You cannot run a PostgreSQL server alongside the app.

Traditional Prisma clients keep a long-lived connection pool. On Vercel, each function spawn could open its own pool. At volume, you exhaust the database connection limit.

Free-tier databases typically allow 25 to 100 connections.

The solution is a managed service. Postgres lives somewhere else. Your app connects over a network using a connection string.

---

## H-02-02 — Managed PostgreSQL Options

Three options work well: Neon, Supabase, and Railway.

Neon is the course recommendation. It was designed for serverless from the beginning. The connection string works directly with `@prisma/adapter-pg`. The free tier covers a society management app.

For Supabase, use the PgBouncer pooler connection string on port 6543 for the app. Use the direct connection on port 5432 for migrations.

This distinction matters. The pooler does not support all migration SQL.

Show what a Neon connection string looks like: `postgres://USER:PASSWORD@ep-hostname.region.aws.neon.tech/DATABASE?sslmode=verify-full`. Identify each part: credentials, endpoint hostname, database name, TLS mode.

---

## H-02-03 — Connection Pooling on Vercel

The traditional Prisma client uses a binary query engine process. That process is long-lived. On serverless, this breaks, because the function process is short-lived.

`@prisma/adapter-pg` uses the `pg` Node.js package Pool instead. The Pool manages connections at the Node.js runtime level. It is lighter, and it works correctly in short-lived functions.

Now look at the dev singleton pattern in `src/lib/db.ts`: `global.prisma ??= new PrismaClient(...)`.

In local dev, Next.js hot-reloads modules on every file change. Without this guard, each reload creates a new client with a new pool. The connections are exhausted within minutes.

In production on Vercel, the guard does nothing.

One more detail is `withVerifyFullSsl()`. The app refuses to connect if the TLS certificate is not trusted. A silent downgrade to an unencrypted connection is not possible.

---

## H-03-01 — Two Different Migration Commands

`prisma migrate dev` compares the schema to the database. It generates SQL migration files. It resets the database if the history is inconsistent. Then it applies the migrations and re-seeds.

Use it for **development only**. The database reset is dangerous near real data.

`prisma migrate deploy` reads the existing migration files. It applies only the unapplied ones. It never resets anything.

It is **production safe**, and it is idempotent.

Here is the rule. Production gets `migrate deploy`. Never run `migrate dev` near production data.

`package.json` includes a `prisma:migrate:deploy` convenience script.

---

## H-03-02 — The Build Pipeline

The pipeline has two phases.

The install phase runs `npm install`. This triggers `postinstall: prisma generate`.

The build phase runs the `vercel.json` buildCommand: `prisma generate && next build`.

Why does `prisma generate` run twice? `postinstall` runs in the install context. `buildCommand` runs in the build context.

Running generate twice is harmless. It is also defensive. It guarantees that the generated client is present before TypeScript compilation.

`prisma.config.ts` with `defineConfig` makes all paths explicit. That includes the schema, the migrations folder, and the seed command. There are no convention-based defaults.

---

## H-03-03 — When and Where to Run Migrations

Here is the problem. Vercel is a build-and-deploy system, not a server with a terminal. You cannot SSH in after deploy.

There are three options.

Option 1 is the build command. Prepend `prisma migrate deploy &&` to the command in `vercel.json`. It is simple. It requires `DATABASE_URL` to be set in the Vercel env vars for the build phase.

Option 2 is GitHub Actions. Run the migrations in CI before you trigger the Vercel deploy. This gives the cleanest separation of concerns. It is preferred for production workloads.

Option 3 is your local machine. Run `DATABASE_URL="postgres://..." npx prisma migrate deploy` manually before merging. This is practical only for very small teams or a first deployment.

For the exercise, use Option 1.

For real production, use Option 2.

---

## H-04-01 — Connecting the Repository

Vercel watches your GitHub repository.

A push to `main` creates a production deployment. A push to any other branch, or a new PR, creates a preview deployment at a unique URL.

The import steps are: vercel.com/new → Add New → Import Git Repository → select your fork.

Vercel detects the framework automatically as Next.js. `vercel.json` overrides the default build command. Leave the root directory blank, because all key files are at the project root.

Do not click Deploy until the environment variables are set.

---

## H-04-02 — Environment Variables in Vercel Dashboard

Go to Project → Settings → Environment Variables. Add the variables as key-value pairs. Mark each one for Production, Preview, or Development, as appropriate.

Three variables are required: `DATABASE_URL`, `AUTH_SECRET`, and `NEXTAUTH_URL`. Set `NEXTAUTH_URL` to the production URL.

Some variables are optional. Add the OAuth credentials only if you enable those providers. Add the Sentry variables only if you use error tracking.

Mark the sensitive variables as encrypted. These are `AUTH_SECRET`, `DATABASE_URL`, `*_CLIENT_SECRET`, and `SENTRY_AUTH_TOKEN`.

Once a variable is marked sensitive, you cannot read its value back from the dashboard.

---

## H-04-03 — Preview Deployments and NEXTAUTH_URL

Every preview deployment gets a unique URL. A static `NEXTAUTH_URL` that points to production is a problem. OAuth callbacks and next-auth redirects then go to the wrong place.

The solution is to set `AUTH_TRUST_HOST=1` for the Preview and Development environments. Then next-auth trusts the `X-Forwarded-Host` header, which Vercel sets automatically. Set `NEXTAUTH_URL` for Production only.

Here is the summary table. Production gets the custom URL and `NEXTAUTH_URL`. Preview gets `AUTH_TRUST_HOST=1` and no `NEXTAUTH_URL`.

Preview deployments share the production database by default. Discuss the risk. A migration PR could apply schema changes before anyone approves it.

---

## H-05-01 — Security Headers

Security headers are HTTP response metadata. They instruct the browser to apply protective policies. They need zero client-side JavaScript.

There are four headers in `next.config.ts`.

`X-Frame-Options: DENY` prevents iframe embedding. It blocks clickjacking.

`X-Content-Type-Options: nosniff` prevents the browser from guessing MIME types. It blocks MIME confusion attacks.

`Referrer-Policy: strict-origin-when-cross-origin` controls which URL appears in the `Referer` header. It prevents URL parameter leakage to third parties.

`Permissions-Policy: camera=(), microphone=(), geolocation=()` disables the hardware APIs that the app does not use.

Two things are not configured yet. One is Content Security Policy, which is recommended for Phase 3 hardening. The other is HSTS, which Vercel sets automatically for custom domains.

---

## H-05-02 — Sentry in Production

There are three Sentry config files: `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`. All of them are wrapped through `withSentryConfig` in `next.config.ts`.

Now the variable timing. `NEXT_PUBLIC_SENTRY_DSN` is a runtime variable. `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` are build-time only. They are used for source map upload.

Source maps convert minified stack traces into readable ones. For example, file `main-abc123.js:1:2847` becomes file `contributions/page.tsx:47:12`.

Source maps are uploaded to Sentry. They are never deployed to the browser.

`tracesSampleRate` is 0.1 in production and 1.0 in development. It controls Sentry cost at volume.

---

## H-05-03 — First-Run Checklist

Step 1: verify the build log. Look for `✓ Compiled successfully` and `Prisma Client generated`. There should be no `Error:` lines.

Step 2: open the live URL. The login page should appear. If you see a 500 error, check the Vercel function logs and Sentry.

Step 3: run the seed script once from your local machine against the production database. Do not run it again after real data is entered.

Step 4: create a real admin user. Then deactivate or delete the demo seeded accounts.

Step 5: smoke test six paths. They are login, blocks, contributions form, submit, paid/unpaid matrix, and logout.

---

## H-06-01 — Exercise: Deploy to Neon + Vercel

The exercise has Parts A through H. Walk through each one.

Part A: create a Neon project. Copy the Prisma-mode connection string.

Part B: fork PrismApp to your GitHub account.

Part C: import it to Vercel. Stop before Deploy.

Part D: set four env vars: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, and `AUTH_TRUST_HOST`.

Part E: update `vercel.json` to prepend `prisma migrate deploy &&` to the buildCommand. Commit and push.

Part F: deploy. Watch the build logs for the migration names and for compilation success.

Part G: seed from your local machine.

Part H: run the 9-row smoke test.

---

## H-06-02 — The Preview Deployment Problem

Open a PR with a trivial change. Observe the preview URL. Try to login without `AUTH_TRUST_HOST`.

Show what breaks. The callback URL redirects to the production domain. For credentials login, there is a subtle mismatch that may reject the callback.

The fix is `AUTH_TRUST_HOST=1` for the Preview environment. Set `NEXTAUTH_URL` only for Production.

Now the discussion. Why are preview deployments against the production database risky with schema migrations?

Option 2 is a separate CI migration step. It prevents migration PRs from running against production before approval.

---

## H-06-03 — Full Course Wrap

Here is the module summary table. It lists H-01 through H-06 with topics and key takeaways.

Here is the full course summary table. It covers nine sections, from 00-intro through H-deployment.

Here is what we built. Temporal ownership. Immutable finances. Role-based access. Audit logging. Structured errors. A paginated UI. CSV reports. Security headers. Sentry. Vercel on Neon.

Here is what comes next: CMM, Safety, Security, and Events. They use the same architecture, the same components, and the same patterns.

One closing note.

Every line of code exists because a domain rule required it. When you understand why it is written the way it is, you can change it correctly.
