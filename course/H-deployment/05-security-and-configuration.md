# H-05 — Security and Configuration

## Slide 1 of 3 — Security Headers

### What security headers are

An HTTP response header is metadata the server sends alongside the page content. Security headers instruct the browser to apply protective policies.

None of these require client-side JavaScript. They work at the browser level, before any code runs.

---

### PrismApp's security headers

Defined in `next.config.ts`:

```ts
const securityHeaders = [
  { key: "X-Frame-Options",            value: "DENY" },
  { key: "X-Content-Type-Options",     value: "nosniff" },
  { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
];
```

Applied to **all routes** via `headers()` in `next.config.ts`.

---

### What each header does

#### `X-Frame-Options: DENY`

Prevents any page from being embedded in an `<iframe>`.

**Attack blocked:** Clickjacking — an attacker wraps your app in an invisible iframe and tricks users into clicking things they cannot see.

#### `X-Content-Type-Options: nosniff`

Prevents the browser from guessing a file's content type from its content.

**Attack blocked:** MIME-type confusion — the browser executes a malicious script because it guessed `application/javascript` from a response that claimed to be `text/plain`.

#### `Referrer-Policy: strict-origin-when-cross-origin`

Controls what URL is sent in the `Referer` header when a user follows a link.

**Attack blocked:** Referrer leakage — a URL containing a session token or query parameter leaking to third-party sites.

#### `Permissions-Policy: camera=(), microphone=(), geolocation=()`

Disables access to hardware APIs. The society management app has no legitimate need for camera, microphone, or location.

**Attack blocked:** Malicious script exploiting hardware access, or user confusion about what the app is doing.

---

### What is not configured yet

These headers are present and correct. What is not configured:

- **Content Security Policy (CSP)** — defines where the browser can load scripts, styles, and images from. CSP is the strongest XSS mitigation but requires careful configuration per deployment (nonces, CDN allowlists). Recommended for Phase 3 hardening.
- **HSTS (Strict-Transport-Security)** — tells browsers to always use HTTPS. Vercel sets this automatically for custom domains, so explicit configuration is less critical here.

---

## Slide 2 of 3 — Sentry in Production

### What Sentry does

Sentry captures unhandled errors, slow transactions, and performance traces from your running application. It aggregates them, shows the stack trace, and alerts you.

Without Sentry, you discover errors when users report them. With Sentry, you often discover errors before users notice.

---

### The three Sentry files

| File | Context | Purpose |
|------|---------|---------|
| `sentry.client.config.ts` | Browser | Client-side error capture |
| `sentry.server.config.ts` | Node.js / Edge | Server-side error capture |
| `sentry.edge.config.ts` | Edge runtime | Edge function error capture |

All three are initialised through the `withSentryConfig` wrapper in `next.config.ts`.

---

### Environment variables at different times

| Variable | Needed at | What it does |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Runtime (browser + server) | Tells the Sentry SDK where to send errors |
| `SENTRY_ORG` | Build time | Identifies your Sentry organisation for source map upload |
| `SENTRY_PROJECT` | Build time | Identifies the Sentry project for source map upload |
| `SENTRY_AUTH_TOKEN` | Build time | Authenticates the source map upload |

If `NEXT_PUBLIC_SENTRY_DSN` is absent, the Sentry SDK initialises silently without a DSN — no errors captured, no build failure, no runtime crash.

If `SENTRY_AUTH_TOKEN` is absent, source maps are not uploaded — stack traces in Sentry will show minified code, but the app still works.

---

### Source maps and minified code

When Next.js builds for production, it minifies JavaScript. A stack trace from minified code looks like:

```
TypeError: Cannot read property 'x' of undefined
  at e (main-abc123.js:1:2847)
```

With source maps uploaded to Sentry, the same trace becomes:

```
TypeError: Cannot read property 'x' of undefined
  at ContributionForm.handleSubmit (app/(dashboard)/contributions/page.tsx:47:12)
```

Source maps are uploaded during the build when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are present. They are **not deployed to the browser** — they are uploaded directly to Sentry's servers.

---

### Sample rate configuration

`sentry.server.config.ts` sets:

```ts
tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0
```

In production, only 10% of traces are sent. This limits costs on high-traffic deployments.

In development, 100% of traces are sent — helpful for debugging, but never seen by Sentry unless `NEXT_PUBLIC_SENTRY_DSN` is set.

---

## Slide 3 of 3 — First-Run Checklist

### Before you announce the URL to anyone

Work through this checklist after the first successful Vercel build.

---

#### Step 1 — Verify the build

In Vercel → **Deployments** → click the latest deployment → check **Build Logs**.

Look for:
- `✓ Compiled successfully` — Next.js build succeeded
- `Prisma Client generated` — prisma generate ran
- No `Error:` lines

If the build fails, the error is in the build log. Common causes:
- `DATABASE_URL` not set → `Error: P1001 Can't reach database server`
- `AUTH_SECRET` not set → `Error: Please define a secret`

---

#### Step 2 — Open the live URL

Click the deployment URL. You should see the login page.

If you see a 500 error page instead, check:
1. Function logs in Vercel → **Functions** → look for recent error entries
2. Sentry dashboard (if configured)

---

#### Step 3 — Run the seed (first time only)

The seed script (`prisma/seed.mjs`) creates initial blocks, contribution heads, periods, and demo app users.

For a first deployment, run it from your local machine against the production database:

```bash
# With your production DATABASE_URL set locally
DATABASE_URL="postgres://..." npm run db:seed
# or
DATABASE_URL="postgres://..." node prisma/seed.mjs
```

Do not run the seed again after users have entered real data — it is not idempotent for all records.

---

#### Step 4 — Create the first admin user

Using the seeded demo credentials (from `AUTH_SEED_PASSWORD`), log in and create a real admin user via **App Users** → **New User**.

Delete or deactivate the demo seeded accounts.

---

#### Step 5 — Smoke test the critical path

| Action | Expected result |
|--------|----------------|
| Login with admin credentials | Dashboard home loads |
| Navigate to Blocks | Block list appears |
| Create a unit in Block A | Unit appears in list |
| Navigate to Contributions → New | Form loads with active heads and period |
| Submit a contribution | Record appears in paid/unpaid matrix |
| Navigate to Reports | Contribution report renders |
| Logout | Redirected to login page |

If all six pass, the deployment is working.

---

### Takeaway

> Security headers are already in `next.config.ts` — no extra configuration needed. Sentry degrades gracefully if credentials are absent. Run the seed once, smoke test six paths, and you have a production-ready deployment.
