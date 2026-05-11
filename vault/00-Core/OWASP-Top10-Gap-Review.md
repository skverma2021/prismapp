# OWASP Top 10 (2021) Gap Review — PrismApp V1

**Date:** 2026-05-11  
**Scope:** Internal operator app for society management (Magadh Signature Homes). Not public-facing. Authenticated users only: `SOCIETY_ADMIN`, `MANAGER`, `READ_ONLY`.  
**Reviewer:** Engineering (AI-assisted formal pass, Track-A item 2.7)  
**Status:** Initial pass complete. Action items captured below.

---

## A01:2021 — Broken Access Control

**Finding: PASS with one open gap**

What is in place:
- Every route handler (`app/api/**`) begins with `requireReadRole(request)` or `requireMutationRole(request)` before any business logic. No route is unauthenticated except `app/api/auth/[...nextauth]` (the login handler itself).
- Role checks enforce: `SOCIETY_ADMIN` and `MANAGER` for mutations; all three roles for reads.
- `READ_ONLY` role cannot create, update, or delete anything — enforced server-side in `src/lib/authz.ts`.
- Auth context (`userId`, `role`) is derived from the JWT in the signed cookie — not from query params or request body.
- Ownership and residency timelines enforce ownership-level access implicitly (you can only operate on data for your society, single-tenant deployment).
- Financial records are append-only: `updateContribution` and `deleteContribution` are not implemented by design.

Open gap:
- **A01-GAP-1**: No resource-level ownership check. Any authenticated user with a mutation role can edit *any* block, unit, or individual record. For a single-society app this is acceptable, but it is a design assumption that must be documented. If multi-tenancy is ever added, this becomes a critical gap.
- **Recommendation:** Document the single-tenancy assumption in `vault/00-Core/System-Overview.md`. Add a backlog note for multi-tenant isolation before any multi-society deployment.

---

## A02:2021 — Cryptographic Failures

**Finding: PASS with one advisory note**

What is in place:
- Passwords stored as bcrypt hashes (`bcryptjs@3.x`, cost factor 10 — `bcrypt.hash(password, 10)` in `seed.mjs`).
- JWT session secret pulled from `AUTH_SECRET` environment variable, not hardcoded.
- Database connection uses `sslmode=require` (Prisma Postgres / Neon).
- No sensitive data stored in `localStorage` or cookies beyond the HttpOnly JWT session cookie managed by Auth.js.
- PII masking (`maskEmail`, `maskMobile`) for `READ_ONLY` role on all individual reads.

Advisory notes:
- **A02-NOTE-1**: The bcrypt cost factor of 10 is the Auth.js/bcryptjs default. It is acceptable today but should be reviewed every 2–3 years as hardware speeds up. Consider 12 for new installs.
- **A02-NOTE-2**: The `DATABASE_URL` SSL warning (Track-A 8.5) is unresolved. Confirm `sslmode=require` or `?sslmode=require` is appended to the connection string in the Vercel environment. Without this, connections may fall back to unencrypted.
- **A02-NOTE-3**: The seed password defaults to `ChangeMe123!` when `AUTH_SEED_PASSWORD` is unset. This is explicitly documented in `seed.mjs` and is acceptable for local dev, but the Vercel/production seed run must use a real secret.

---

## A03:2021 — Injection

**Finding: PASS**

What is in place:
- All database access uses Prisma ORM parameterized queries exclusively. No raw SQL (`$queryRaw` / `$executeRaw`) is present anywhere in the codebase. Injection via query parameters is structurally prevented.
- All user-supplied inputs are validated through schema parse functions (`requireString`, `parsePositiveInt`, `parseQueryInt`, `parseOptionalString`, `parseCreateContributionInput`, etc.) before reaching the service layer.
- No template literals constructing SQL, HTML, or shell commands found in the codebase.
- No `dangerouslySetInnerHTML`, `eval()`, `Function()`, or `innerHTML` usage found.
- React JSX by default escapes all interpolated values (XSS prevention at framework level).

No open gaps.

---

## A04:2021 — Insecure Design

**Finding: PASS with three design notes**

What is in place:
- Financial records are immutable by design (no update/delete on `Contribution`).
- Compensating transactions used for corrections with full linkage and audit trail.
- Duplicate contribution prevention via unique constraint and pre-write check.
- Rate locked at payment time (snapshot in contribution row).
- Temporal overlap prevention for ownership and residency timelines enforced server-side.
- Builder inventory identity prevents misuse of system records as real depositors.

Design notes:
- **A04-NOTE-1**: Maker-checker workflow for financial corrections is stubbed but disabled (`MAKER_CHECKER_ENABLED = false`). For a live deployment processing significant transactions, single-step correction approval by a `MANAGER` without a second approver is a design risk. ADR-001 documents the V1 decision. Activate maker-checker when volume or risk threshold is reached.
- **A04-NOTE-2**: No CSRF protection beyond what Auth.js session cookies provide. Auth.js JWT cookies are `HttpOnly` and `SameSite` by default, which mitigates standard CSRF for state-changing requests. Route handlers validate the JWT from the cookie — a cross-origin forged request would not carry a valid JWT. For a same-site deployment (Vercel, single domain), risk is low. **No action required for V1.**
- **A04-NOTE-3**: No explicit `pageSize` maximum on all paths. Browse endpoints cap at 100 rows via `parseQueryInt`. CSV export endpoints are intentionally uncapped (full dataset for report accuracy). This is an accepted design decision.

---

## A05:2021 — Security Misconfiguration

**Finding: PARTIAL PASS — two actionable items**

What is in place:
- No debug endpoints exposed (the `app/api/debug-cookie/` folder is empty).
- `NODE_ENV=production` suppresses Prisma query logging (only `error` level in production).
- No hardcoded secrets in source; all secrets via environment variables.
- `.env.example` present; actual `.env` not committed.
- `AUTH_SECRET` (or `NEXTAUTH_SECRET`) required to start the auth server.

Open gaps:
- **A05-GAP-1**: **Missing HTTP security headers.** No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, or `Referrer-Policy` headers are set in `next.config.ts`. Next.js does not add these automatically. For an internal app on Vercel (HTTPS by default), the risk is reduced, but defense-in-depth requires these headers.
  - **Action (Track-A 2.7 follow-up):** Add security headers to `next.config.ts` via the `headers()` configuration. See implementation note below.
- **A05-GAP-2**: No rate limiting on any endpoints, including `/api/auth/[...nextauth]` (Track-A 8.9). A brute-force or credential-stuffing attack on the login endpoint is currently possible. Vercel does not add rate limiting by default.
  - **Action (Track-A 8.9):** Add rate limiting to `/api/auth/*`. Options: Vercel Edge Middleware with an in-memory counter (acceptable for single-region), or Upstash Redis for distributed rate limiting.

---

## A06:2021 — Vulnerable and Outdated Components

**Finding: ACTION REQUIRED**

`npm audit` output (2026-05-11):

| Package | Direct? | Severity | Issue |
|---------|---------|----------|-------|
| `next@16.2.0` | **Yes** | High | DoS with Server Components (GHSA) |
| `prisma@^7.5.0` | **Yes** | High | Transitive via `@prisma/dev`, `@prisma/config` |
| `hono` / `@hono/node-server` | No (transitive via `@prisma/dev`) | High | Auth bypass, SSE injection, cookie injection |
| `lodash` | No (transitive) | High | Code injection via `_.template`, prototype pollution |
| `defu` / `effect` | No (transitive) | High | Prototype pollution |
| `picomatch` | No (transitive) | High | ReDoS via extglob |
| `postcss` | No (transitive) | Moderate | XSS via `</style>` in CSS output |

Total: 16 vulnerabilities (10 high, 6 moderate).

Key observations:
1. All `hono`, `defu`, `effect`, `lodash`, `picomatch` vulnerabilities are **transitive** — they come through `@prisma/dev`, which is a **development tool** (`prisma` CLI dev dependency). These packages are not shipped to production.
2. The `next@16.2.0` high severity (DoS via Server Components) **affects the production app**. `npm audit fix` should be run to see if an in-range fix is available.
3. `postcss` is a build-time tool. The XSS vulnerability is in CSS stringify output — not a runtime risk for this app.

**Actions:**
- **A06-ACTION-1**: Run `npm audit fix` to apply non-breaking fixes. Check if `next` can be patched in-range.
- **A06-ACTION-2**: If `next` has no in-range fix, track the Next.js release notes and upgrade promptly when a patched version is available.
- **A06-ACTION-3**: Add `npm audit --audit-level=high` to the CI pipeline (Track-A 7.5) to catch future regressions.

---

## A07:2021 — Identification and Authentication Failures

**Finding: PASS with two open items**

What is in place:
- Credentials login with bcrypt hash comparison (timing-safe).
- JWT sessions (not server-side sessions — no session fixation risk).
- `isActive` flag checked before authenticating any user.
- Invalid role strings rejected (`parseUserRole` returns `null` → 401).
- Sign-in page redirects to `/` (public entry) — no account enumeration feedback (returns `null` on any failure).
- Auth.js handles `HttpOnly`, `Secure`, `SameSite` cookie attributes on the session cookie.

Open items:
- **A07-GAP-1**: No account lockout after repeated failed attempts. A brute-force attack against a known email address can run indefinitely. Mitigated partly by bcrypt cost factor, but not structurally. Same as A05-GAP-2 (rate limiting).
- **A07-GAP-2**: Password change functionality does not exist. If credentials are compromised, the only remediation is a direct database update. For V1 single-admin deployment this is acceptable but must be addressed before any wider rollout.
- **A07-NOTE-1**: OAuth (Google/Microsoft) is deferred (Track-A 2.6). When added, it will reduce credential exposure for most users.

---

## A08:2021 — Software and Data Integrity Failures

**Finding: PASS**

What is in place:
- All application code is committed to Git with signed commits (sole developer).
- Prisma migrations are version-controlled and applied deterministically via `prisma migrate deploy`.
- No deserialization of untrusted data — API inputs are validated as plain JSON objects by schema parse functions.
- No dynamic `require()` or `import()` of user-supplied module names.
- `npm ci` / lockfile enforced on Vercel builds (package-lock.json committed).
- Financial corrections are append-only with linkage to original record — data integrity is structural.

No open gaps.

---

## A09:2021 — Security Logging and Monitoring Failures

**Finding: PARTIAL PASS — one actionable item**

What is in place:
- All `500`-class failures are logged as structured JSON to server console (Vercel logs).
- `requestId` propagated from middleware through all 33 route handlers for trace correlation.
- `AuditLog` table records all financial and master-data mutations with `actorUserId`, `actorRole`, `action`, `entityType`, `entityId`, and `payload`.
- Failed authentication returns `null` (no detail leak), and Auth.js logs internally.

Open item:
- **A09-GAP-1**: No external error tracking integration (Track-A 4.6). Server logs exist in Vercel's log viewer but there is no alerting, aggregation, or anomaly detection. For an internal app with manual monitoring, this is acceptable for V1. **Recommended before production hardening:** add Sentry or similar with `NEXT_PUBLIC_SENTRY_DSN` environment variable.
- **A09-NOTE-1**: Auth failures (wrong password, inactive user) are not currently written to `AuditLog`. Consider adding auth failure logging (email + timestamp, never password) to detect brute-force patterns. Low priority for V1 internal app.

---

## A10:2021 — Server-Side Request Forgery (SSRF)

**Finding: PASS**

What is in place:
- No server-side `fetch()` or HTTP client calls to user-supplied URLs. All external calls from route handlers go to the database only (via Prisma/PgAdapter).
- No webhook endpoints, no URL-parameter-driven redirects, no image proxy.
- The only `fetch()` calls in `app/api/**` are absent — confirmed by grep.
- Client-side `fetch()` calls go to `/api/*` paths (same-origin) only.

No open gaps.

---

## Summary Table

| #   | Category                  | Status     | Severity   | Action Required                                |
| --- | ------------------------- | ---------- | ---------- | ---------------------------------------------- |
| A01 | Broken Access Control     | ✅ Pass     | Low gap    | Document single-tenancy assumption             |
| A02 | Cryptographic Failures    | ✅ Pass     | Advisory   | Verify SSL in prod; rotate seed password       |
| A03 | Injection                 | ✅ Pass     | None       | —                                              |
| A04 | Insecure Design           | ✅ Pass     | Advisory   | Activate maker-checker at scale                |
| A05 | Security Misconfiguration | ⚠️ Partial | **Medium** | **Add HTTP security headers; rate limit auth** |
| A06 | Vulnerable Components     | ⚠️ Action  | **High**   | **Run `npm audit fix`; track Next.js patch**   |
| A07 | Auth Failures             | ✅ Pass     | Low gap    | Rate limiting covers lockout gap               |
| A08 | Data Integrity            | ✅ Pass     | None       | —                                              |
| A09 | Logging & Monitoring      | ⚠️ Partial | Low        | Add error tracker before production            |
| A10 | SSRF                      | ✅ Pass     | None       | —                                              |

---

## Immediate Action Items

### 1. Add HTTP Security Headers (A05-GAP-1)

Add to `next.config.ts`:

```typescript
headers: async () => [
  {
    source: "/(.*)",
    headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ],
  },
],
```

Note: `Strict-Transport-Security` is handled by Vercel automatically on HTTPS deployments. A full CSP can be added during Phase 3 hardening when the static asset inventory is stable.

### 2. Run npm audit fix (A06-ACTION-1)

Run `npm audit fix` and verify:
- No breaking changes to `next` or `prisma`.
- Rebuild passes.
- Tests pass.

### 3. Add Rate Limiting (A05-GAP-2, A07-GAP-1) — Track-A 8.9

Defer to Track-A 8.9. Options evaluated at that point: Vercel Edge rate limiting, Upstash Redis, or `next-rate-limit`.

---
## GitHub Copilot: ### Methodology

### **What was referenced:**
- The codebase itself — auth.ts, authz.ts, proxy.ts, next.config.ts, api-response.ts, pii-mask.ts, audit-log.ts, schema.prisma, seed.mjs, and a grep sweep of all `app/api/**` route handlers.
- `npm audit` output for dependency CVEs.
- OWASP Top 10 (2021) definitions as the checklist framework.

### **How each was assessed:**

| #   | Category                  | What was checked                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A01 | Broken Access Control     | Every `app/api/**` route handler grepped for `requireReadRole`/`requireMutationRole`. Confirmed no unguarded route except the auth handler itself. Noted the missing resource-level (row-level) ownership check — accepted for single-tenant V1.                                                                   |
| A02 | Cryptographic Failures    | Traced password storage: `bcrypt.hash(password, 10)` in seed. Confirmed `AUTH_SECRET` from env, not hardcoded. Checked pii-mask.ts for PII handling. Noted unresolved SSL warning (Track-A 8.5).                                                                                                                   |
| A03 | Injection                 | Searched entire codebase for raw SQL (`$queryRaw`), `eval`, `innerHTML`, `dangerouslySetInnerHTML`, `document.write` — all zero matches. All DB access goes through Prisma parameterized queries.                                                                                                                  |
| A04 | Insecure Design           | Read `contributions.service.ts` for immutability enforcement, duplicate-payment guard, rate-locking, and maker-checker stub. Assessed whether the append-only model was structurally enforced vs. just policy.                                                                                                     |
| A05 | Security Misconfiguration | Checked next.config.ts for security headers (none existed). Checked for debug endpoints (debug-cookie — empty). Checked for hardcoded secrets (none). Identified the missing headers as a concrete actionable gap.                                                                                                 |
| A06 | Vulnerable Components     | Ran `npm audit` and parsed the JSON output to separate **direct** deps (`next`, prisma) from **transitive** deps. Checked which transitive packages (`hono`, `lodash`, etc.) were pulled through `@prisma/dev` (CLI dev tool, not shipped). The `next@16.2.0` DoS CVE was the only runtime-affecting high finding. |
| A07 | Auth Failures             | Traced the full login flow in auth.ts: credential validation, `bcrypt.compare`, `isActive` check, role parse. Noted absence of account lockout and password-change functionality.                                                                                                                                  |
| A08 | Data Integrity            | Checked for `require()`/`import()` of user-supplied paths, JSON deserialization of untrusted input, and migration versioning. Verified package-lock.json is committed.                                                                                                                                             |
| A09 | Logging & Monitoring      | Confirmed `AuditLog` table coverage, structured JSON error logging in api-response.ts, `requestId` propagation. Noted absence of external alerting/aggregation.                                                                                                                                                    |
| A10 | SSRF                      | Grepped all `app/api/**` for `fetch(`, `axios`, `http.`, `https.` — zero matches. No server-side URL fetching of any kind.                                                                                                                                                                                         |

### **How severity and action-required was determined:**

- **Pass / no action** — the OWASP attack class was structurally prevented by the framework or the code (e.g. Prisma parameterization for A03, append-only model for A08).
- **Advisory / no immediate action** — a gap exists but the threat model is low (internal-only app, single-tenant, no public exposure). Noted for future reference.
- **Actionable** — a concrete, implementable fix existed that closes a real attack vector regardless of deployment context. The two that crossed that threshold: missing security headers (A05, trivial to add) and the `next@16.2.0` DoS CVE (A06, a one-line upgrade). Both were implemented immediately rather than deferred.
- **Deferred** — gaps that require architectural decisions or external services (rate limiting, Sentry, CSP). Recorded in the vault and back-referenced to Track-A items.

## References

- OWASP Top 10 2021: https://owasp.org/Top10/
- Track-A open items: `vault/06-Tracks/Track-A-TODO.md`
- ADR-001 (financial immutability): `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`
- Roles and permissions: `vault/00-Core/Roles-and-Permissions.md`
