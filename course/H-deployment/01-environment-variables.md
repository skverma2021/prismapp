# H-01 — Environment Variables

## Slide 1 of 3 — The Concept

### What are environment variables?

An environment variable is a piece of configuration that lives **outside the source code**.

The app code reads it at runtime. The value itself is never stored in the repository.

This is not optional caution — it is a hard rule. A secret committed to git is permanently compromised. Even if you delete the commit, it exists in history.

**Three categories of sensitive config:**

| Category | Example | Risk if leaked |
|----------|---------|---------------|
| Database credentials | `DATABASE_URL` with username + password | Full read/write access to all data |
| Auth secret | `AUTH_SECRET` | Attacker can forge valid session cookies |
| OAuth credentials | `GOOGLE_CLIENT_SECRET` | Attacker can impersonate your app |

---

### The `.env.example` convention

The repository contains a file called `.env.example`. It lists every variable the app needs, with placeholder values and comments explaining each one.

When a developer joins the project:

```bash
cp .env.example .env
# Then edit .env and fill in real values
```

The actual `.env` file is listed in `.gitignore`. It never enters the repository.

`.env.example` is safe to commit — it contains no real secrets.

> **Instructor note:** Show `.gitignore` and confirm `.env` is listed. Then open `.env.example` together.

---

### Key rule to memorise

> If it has a password, a secret, or a key — it belongs in `.env`, never in source code.

The consequence of getting this wrong is not a build error. It is a silent, permanent security breach.

---

## Slide 2 of 3 — The Full Variable List

### Walking through `.env.example`

Here is every variable in PrismApp's `.env.example` and what each one does.

---

#### `DATABASE_URL`

```
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

The PostgreSQL connection string. Prisma reads this in:
- `prisma migrate deploy` (runs migrations)
- `prisma db seed` (inserts seed data)
- `src/lib/db.ts` at runtime (queries from the running app)

The `?sslmode=require` at the end tells the PostgreSQL driver to use TLS. Without it, credentials travel in cleartext over the network.

---

#### `AUTH_SECRET`

```
AUTH_SECRET="replace-with-a-long-random-secret"
```

Used by next-auth to sign and encrypt session JWTs. If this is guessable or short, an attacker can forge valid login sessions.

Generate a safe value:

```bash
openssl rand -base64 32
```

The app also accepts `NEXTAUTH_SECRET` — both names are checked (`AUTH_SECRET ?? NEXTAUTH_SECRET`).

---

#### `AUTH_SEED_PASSWORD`

```
AUTH_SEED_PASSWORD="ChangeMe123!"
```

The password given to demo app users when the seed script runs. Only relevant in development. You would not include this in a production deployment unless you intentionally seed demo users.

---

#### `NEXTAUTH_URL`

```
NEXTAUTH_URL="http://localhost:3000"
```

The base URL of the app. next-auth uses it to construct callback redirect URLs.

Required in **local development**. On Vercel, the platform sets `VERCEL_URL` automatically and next-auth reads it as a fallback — so this variable becomes optional for production and preview deployments, but you should still set it for the production domain.

---

#### OAuth variables (optional)

```
#GOOGLE_CLIENT_ID="your-google-client-id"
#GOOGLE_CLIENT_SECRET="your-google-client-secret"

#AZURE_AD_CLIENT_ID="your-azure-app-client-id"
#AZURE_AD_CLIENT_SECRET="your-azure-app-client-secret"
#AZURE_AD_TENANT_ID="your-azure-tenant-id-or-common"
```

All commented out by default. The app checks whether these are present at startup and registers the corresponding OAuth provider only if they are set. Credentials login works with none of these present.

---

#### Sentry variables

```
NEXT_PUBLIC_SENTRY_DSN="https://..."   # runtime, browser + server
SENTRY_ORG="your-sentry-org"           # build-time only
SENTRY_PROJECT="your-sentry-project"   # build-time only
SENTRY_AUTH_TOKEN="..."                # build-time only, for source maps
```

- `NEXT_PUBLIC_SENTRY_DSN` — needed at runtime. The `NEXT_PUBLIC_` prefix makes it available in client-side JavaScript.
- The other three are only needed during the build to upload source maps. The build does not fail if they are absent.

---

## Slide 3 of 3 — Server-Only vs Public Variables

### How Next.js separates secrets from public config

Next.js applies a strict rule at build time:

| Prefix | Visible in browser JS | When to use |
|--------|----------------------|-------------|
| `NEXT_PUBLIC_` | Yes — embedded in the bundle | Public config like analytics DSNs |
| (no prefix) | No — server only | All secrets, all credentials |

**A variable without `NEXT_PUBLIC_` is never sent to the browser.**

If you try to read `process.env.AUTH_SECRET` in a Client Component, you will get `undefined`. This is intentional and correct.

---

### What happens if a required variable is missing?

The behaviour depends on the variable:

| Variable missing | Result |
|-----------------|--------|
| `DATABASE_URL` | Prisma throws at the first query attempt |
| `AUTH_SECRET` | next-auth throws on the first session operation |
| `NEXTAUTH_URL` | Silent fallback to `VERCEL_URL` on Vercel; may cause wrong redirects in local dev |
| Sentry vars | Build succeeds silently; errors just not captured |
| OAuth vars | Those providers are not registered; credentials login still works |

The app is designed to degrade gracefully where possible. Core secrets (`DATABASE_URL`, `AUTH_SECRET`) have no fallback — they must be set.

---

### Verification command

Before deploying, check that all required variables are set:

```bash
# In local dev — confirm Prisma can connect
npx prisma db pull

# Confirm next-auth secret is non-empty
node -e "console.log(process.env.AUTH_SECRET ? 'OK' : 'MISSING')"
```

On Vercel, use the **Environment Variables** tab in the project settings as your single source of truth for what is set.

---

### Takeaway

> `.env.example` is the contract. It describes every variable the app needs. The real values live in `.env` locally and in the Vercel dashboard in production. Never close that gap with hardcoded values.
