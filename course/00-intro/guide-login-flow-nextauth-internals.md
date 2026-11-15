# Guide: The Login Flow, End to End (NextAuth v4 Internals)

A personal reference for **who does what** during authentication (AuthN) and
authorization (AuthZ) in PrismApp: our code, the NextAuth library, and Next.js.

**How this was verified.** The library order below was traced by reading the
installed source in `node_modules/next-auth` (**v4.24.13**, Next.js 16, App Router)
and the app files named in each section. It is not taken from the documentation.
Re-check it after upgrading `next-auth` or `next`. Items marked *(derived)* follow
from reading the code and have not been exercised in a browser.

> Naming: this app uses **NextAuth v4**. "Auth.js" is the v5 rebrand and has a
> different API. Do not mix their docs.

---

## 1. The big picture

```
Browser                         Next.js server
-------                         --------------
GET /                           app/layout.tsx -> getServerAuthSession()  (no cookie -> null)
                                app/(public)/page.tsx -> renders LoginForm
user types, clicks Sign in
signIn("credentials")
  GET  /api/auth/providers  --> proxy.ts -> [...nextauth]/route.ts -> NextAuth
  GET  /api/auth/csrf       --> (same path)
  POST /api/auth/callback/credentials --> (same path) -> authorize -> callbacks -> cookie
  GET  /api/auth/session    --> (same path) -> decode cookie -> callbacks -> JSON
window.location.assign("/home")
GET /home (+ cookie)            layouts -> getServerSession (in-process) -> requireServerAppSession
```

Key facts:

- The `providers` and `csrf` calls happen **after the click**, inside `signIn()`.
  Loading the login page makes no `/api/auth/*` request.
- The server never redirects the browser after a successful POST. The POST returns
  JSON `{ "url": ... }` and **our form** navigates with `window.location.assign`.
- `/home` does **not** call `/api/auth/session` over HTTP. The server reads the
  cookie in-process.

---

## 2. Who does what

| Party | Responsibilities |
|---|---|
| **Our code (app developer)** | What counts as a valid user (`authorize`: email lookup, `isActive`, role validity, `bcrypt.compare`); what goes into the token (`jwt` callback) and the session (`session` callback); the role model; page guards (`requireServerAppSession`); API guards (`requireReadRole` and friends); the login rate limit (`proxy.ts`); the generic error message. |
| **NextAuth v4 (library)** | The `/api/auth/*` protocol and its four actions; the CSRF token and its check; calling our callbacks in a fixed order; encrypting and decrypting the JWT with `AUTH_SECRET`; creating, chunking and reading the cookies; the client helpers (`signIn`, `SessionProvider`) and the server helper (`getServerSession`). |
| **Next.js (framework)** | Routing (the catch-all `[...nextauth]` handler), `proxy.ts` as the pre-route hook, Server Components and layouts, `cookies()`/`headers()` access, `redirect()`. Next.js knows nothing about users, passwords or roles. |
| **bcryptjs** | Separate library, used only inside `authorize` to compare the password with the stored hash. |
| **Prisma / PostgreSQL** | The `AppUser` table (`email`, `passwordHash`, `role`, `isActive`, `displayName`). Touched at login only, not on later requests (see section 8). |

AuthN = NextAuth running **our** `authorize`. AuthZ = entirely ours: NextAuth only
carries the role we stored in the token.

---

## 3. Our files, in the order they are touched

| # | File | When | What it does |
|---|---|---|---|
| 1 | `app/layout.tsx` | Every page render | Calls `getServerAuthSession()` and wraps the app in `AppSessionProvider`. |
| 2 | `src/lib/auth-session.tsx` | Every page | Wraps NextAuth's `SessionProvider` (client). Makes `__NEXTAUTH._getSession` available, so `signIn` can refresh the session afterwards. |
| 3 | `app/(public)/page.tsx` | `GET /` | `getServerAppSession()`: session exists -> `redirect("/home")`; otherwise renders the form. |
| 4 | `src/lib/server-auth.ts` | Server pages | `getServerAppSession` / `requireServerAppSession` (wraps `getServerAuthSession` from `auth.ts`). |
| 5 | `src/components/auth/login-form.tsx` | On submit | `signIn("credentials", { redirect: false })`, then on success `window.location.assign(result.url ?? redirectTo)`. |
| 6 | `proxy.ts` | Every `/api/*` request | Rate limit (10 per 15 min per IP) on `POST /api/auth/callback/credentials` only; adds `x-request-id`. Matcher is `/api/:path*`, so it does **not** run for `/home`. |
| 7 | `app/api/auth/[...nextauth]/route.ts` | All four calls | `NextAuth(authOptions)` exported as `GET` and `POST`. |
| 8 | `auth.ts` | Inside the library | `authOptions`: `providers` (Credentials + `authorize`), `callbacks.signIn`, `callbacks.jwt`, `callbacks.session`; also `getServerAuthSession`. |
| 9 | `src/lib/db.ts`, `src/lib/user-role.ts`, `prisma/schema.prisma` | Inside `authorize` and callbacks | `AppUser` lookup, `parseUserRole`. |
| 10 | `app/(dashboard)/layout.tsx` and sub-layouts | After `/home` loads | `requireServerAppSession({ allowedRoles })`: the page-level AuthZ. |
| 11 | `src/lib/authz.ts` | Every protected API route | `getAuthContext` -> `getToken`, then `requireRole` / `requireReadRole` / `requireMutationRole` / `requireAdminRole`. 401 without a valid token, 403 for a wrong role. |

---

## 4. Library parts that take part

| Library part (`node_modules/next-auth/...`) | Role |
|---|---|
| `react/index.js` | Client: `signIn()` (drives calls 1-4), `getProviders()`, `getCsrfToken()`, `SessionProvider`, `__NEXTAUTH._getSession`. |
| `next/index.js` | Server adapter: `NextAuth(options)` -> `NextAuthRouteHandler` (reads cookies/headers/body via `next/headers`, calls `AuthHandler`, converts the result to a `Response`, turns a redirect into JSON `{url}` when the body has `json=true`); also `getServerSession`. |
| `core/index.js` | `AuthHandler`: parses the action from the URL, runs `init`, then dispatches GET/POST by action (`providers`, `csrf`, `session`, `callback`, ...). |
| `core/lib/assert.js` | Configuration sanity checks (secret present, etc.). |
| `core/init.js` | Builds `options` for the request: secret, provider list, cookie names, **CSRF token**, **callback URL**. |
| `core/lib/csrf-token.js` | `createCSRFToken`: generate or verify the CSRF token. |
| `core/lib/callback-url.js` + `default-callbacks.js` | Resolves `callbackUrl`; calls `callbacks.redirect` (we do not override it; the default only allows same-origin targets). |
| `core/lib/cookie.js` | Cookie names/flags and `SessionStore` (reads and **chunks** the session cookie when it exceeds ~4 KB). |
| `core/routes/providers.js` | Builds the provider map for `GET /providers`. |
| `core/routes/callback.js` | The credentials branch: `authorize` -> `signIn` -> `jwt` -> encode -> cookie. |
| `core/routes/session.js` | `GET /session`: decode -> `jwt` -> `session` -> re-encode. |
| `jwt/index.js` | `encode`/`decode`: a **JWE** (encrypted JWT, `A256GCM`) using a key derived from `AUTH_SECRET` with HKDF, via the `jose` library. Adds `iat`, `exp`, `jti`. |

---

## 5. Call by call, in exact order

### 5.0 What every `/api/auth/*` request goes through first

1. **Browser** sends the request with whatever cookies it holds.
2. **`proxy.ts`** (Next.js hook, `/api/*` only): for the credentials POST it applies
   the rate limit (429 if exceeded, and the library is never reached); then sets
   `x-request-id`.
3. **Route handler** `[...nextauth]/route.ts` -> `NextAuthRouteHandler` builds the
   internal request: body (form-urlencoded parsed to an object), query, cookies,
   headers, `action = nextauth[0]` (the first segment after `/api/auth/`),
   `providerId = nextauth[1]`.
4. **`AuthHandler`** (`core/index.js`):
   1. `assertConfig`: bad configuration -> 500 JSON.
   2. **`init`** (`core/init.js`), for every action, in this order:
      1. resolve the secret and pick the provider matching `providerId`;
      2. decide cookie names (`__Secure-` prefix and `__Host-` for the CSRF cookie
         when the origin is HTTPS);
      3. **`createCSRFToken`**: if a valid `next-auth.csrf-token` cookie is present
         (hash matches) reuse its token, and for a POST set
         `csrfTokenVerified = (cookie token === body csrfToken)`; otherwise mint a new
         token and queue a `Set-Cookie` for it;
      4. **`createCallbackUrl`**: runs `callbacks.redirect` on the `callbackUrl` from
         the body/query, or on the existing callback-url cookie; queues
         `Set-Cookie: next-auth.callback-url` when it differs from the cookie.
   3. Dispatch on method and action.

The queued cookies from `init` are merged into every response. That is why even a
**failed** login carries `next-auth.callback-url`.

### 5.1 `GET /api/auth/providers`

`routes.providers(options.providers)` returns a JSON map
`{ credentials: { id, name, type, signinUrl, callbackUrl } }` (plus Google/Microsoft
if configured). No secrets, no session. `signIn` reads `type` to decide the next
step: `credentials` -> `POST /callback/credentials`; OAuth -> `/signin/<provider>`
and a full-page redirect. If the provider name is not in the map, `signIn`
navigates to the sign-in page instead of posting.

### 5.2 `GET /api/auth/csrf`

Returns `{ "csrfToken": X }` with `Cache-Control: private, no-cache, no-store`.
Sets cookie `next-auth.csrf-token = X|H` only if no valid cookie exists, where
`H = sha256(X + secret)`. A repeat call with a valid cookie returns the same `X` and
**no** new `Set-Cookie`.

### 5.3 `POST /api/auth/callback/credentials` (the login)

Body fields (form-urlencoded): `email`, `password`, `csrfToken`, `callbackUrl`,
`json=true`. After the shared steps in 5.0, `core/index.js` and
`core/routes/callback.js` run **this exact order**:

| Step | Who | What happens | Outcome on failure |
|---|---|---|---|
| 1 | proxy | Rate limit | 429 (`Retry-After`); library not reached |
| 2 | NextAuth `init` | CSRF verified? (cookie hash valid **and** cookie X = body X) | `core/index.js`: a credentials POST without `csrfTokenVerified` returns a redirect to `/signin?csrf=true` and never calls `authorize` *(see note A)* |
| 3 | **our `authorize`** | Trim/lowercase email; require email and password; `db.appUser.findUnique`; reject unknown or `!isActive`; `parseUserRole`; `bcrypt.compare`. Returns `{ id, email, name, displayName, role }` or `null` | `null` -> **401**, redirect target `/api/auth/error?error=CredentialsSignin&provider=credentials`. An exception thrown inside `authorize` -> also 401, with the error message in `error=` |
| 4 | NextAuth | Builds `account = { providerAccountId: user.id, type: "credentials", provider: "credentials" }` | - |
| 5 | **our `callbacks.signIn`** | `{ user, account, credentials }`. Ours returns `true` for credentials (OAuth is gated here against `AppUser`) | `false` -> 403 `AccessDenied`; a string -> redirect there |
| 6 | NextAuth | Builds the default token `{ name, email, picture, sub: user.id }` | - |
| 7 | **our `callbacks.jwt`** | Called with `{ token, user, account, isNewUser: false, trigger: "signIn" }`. Because `user` is present, ours copies `userId`, `role`, `displayName` into the token and returns it | - |
| 8 | NextAuth `jwt.encode` | Encrypts the token (JWE, A256GCM; key from HKDF of the secret); expiry = `now + 30 days` (`maxAge`) | - |
| 9 | NextAuth `SessionStore.chunk` | Splits into several `next-auth.session-token.N` cookies if over ~4 KB; sets `HttpOnly; SameSite=Lax; Path=/` (plus `Secure` and the `__Secure-` prefix on HTTPS) | - |
| 10 | NextAuth `events.signIn` | We define no events, so nothing runs | - |
| 11 | NextAuth | Returns `redirect: callbackUrl` | - |
| 12 | `NextAuthRouteHandler` | Body has `json=true`, so it deletes `Location` and returns `{ "url": callbackUrl }` with `Content-Type: application/json`, status 200 on success, 401 for the failure above | - |

`callbacks.session` is **not** called during the POST.

*Note A (derived).* A failed CSRF check returns status 200 with
`{ "url": ".../api/auth/signin?csrf=true" }` and no `error=` parameter, so
`signIn` reports no error and the form would navigate there. With `pages.signIn: "/"`
that URL redirects back to the login page. A wrong password is therefore
distinguishable from a CSRF failure in the Network tab (401 + `CredentialsSignin`
vs 200 + `csrf=true`).

### 5.4 `GET /api/auth/session`

`routes.session`, in order:

1. Read the session cookie (join the chunks). **No cookie** -> returns `{}` (the
   client treats it as "not logged in").
2. `jwt.decode` (decrypt + verify expiry). Failure -> logs `JWT_SESSION_ERROR` and
   clears the cookie.
3. **our `callbacks.jwt`** again, now with **only `token`** (no `user`, no
   `account`). Ours has `if (user) {...}`, so it returns the token unchanged.
4. **our `callbacks.session`** with `session = { user: { name, email, image },
   expires }` and the token. Ours sets `session.user.id`, `role` (default
   `READ_ONLY` if missing or invalid) and `displayName`.
5. Body = the session object. The token is **re-encoded** and the cookie re-issued
   with a fresh 30-day expiry (a rolling session, only when this endpoint is
   called over HTTP).
6. `events.session` (none defined).

Who calls it: `signIn` right after a successful POST (`event: "storage"`, which
forces a fetch), `SessionProvider` when the tab becomes visible again (only while a
session exists; it does not fetch on mount because the server passes the initial
session), and `useSession`/`getSession` on the client.

### 5.5 The first page load after login: `GET /home`

No `/api/auth/*` request. The browser sends the cookie with the page request.

1. `app/layout.tsx` -> `getServerAuthSession()` -> `getServerSession(authOptions)`
   (`next/index.js`). With zero or one argument it runs in RSC mode: it reads
   cookies and headers through `next/headers` and calls `AuthHandler` with
   `action: "session"` **in-process**. That means steps 1-4 of section 5.4 run
   (decode -> `jwt` -> `session`) on the server.
2. Cookie re-issue is skipped. In RSC mode the library's `setCookie` is a no-op,
   because a Server Component cannot set cookies. Only the HTTP session endpoint
   extends the cookie.
3. `app/(dashboard)/layout.tsx` -> `requireServerAppSession({ allowedRoles })`:
   no session -> `redirect("/?auth=required")`; wrong role ->
   `redirect("/home?auth=denied")`.
4. The client `SessionProvider` is given the server session as its initial value,
   so the page does not need an extra `/api/auth/session` call on mount.

---

## 6. Two different ways our code reads the session

| Path | Used by | Mechanism | Callbacks run? |
|---|---|---|---|
| Pages and layouts | `getServerAuthSession` / `requireServerAppSession` | `getServerSession` -> `AuthHandler("session")` | **Yes**: `jwt` then `session` |
| API route handlers | `requireReadRole`, `requireMutationRole`, `requireAdminRole` in `src/lib/authz.ts` | `getToken` from `next-auth/jwt`: decrypts the cookie directly, reads `token.userId` and `token.role` | **No**: `jwt` and `session` do not run |

Consequences:

- Anything the API guards need (`userId`, `role`) must already be in the token
  **at sign-in**, written by the `jwt` callback. The `session` callback only shapes
  the object that pages and the client see.
- Without a valid token the API guard throws 401 (`UNAUTHORIZED`); with a valid
  token but a role outside the allowed list it throws 403 (`FORBIDDEN`). Page
  guards redirect instead of returning status codes.

---

## 7. Cookies at a glance

| Cookie (HTTP / HTTPS name) | Set by | Holds | Why |
|---|---|---|---|
| `next-auth.csrf-token` / `__Host-next-auth.csrf-token` | `GET /csrf` (or any request without a valid one) | `X\|H` | Anti-CSRF (double submit) |
| `next-auth.callback-url` / `__Secure-next-auth.callback-url` | `init` on any request whose callback URL differs from the cookie, including failed logins | Where to go after sign-in | Remembers `callbackUrl` |
| `next-auth.session-token` / `__Secure-next-auth.session-token` (+ `.0`, `.1`, ... if chunked) | Successful credentials POST; re-issued by `GET /session` | Encrypted JWT: `userId`, `role`, `displayName`, `name`, `email`, `sub`, `iat`, `exp`, `jti` | **The session** |

All three are `HttpOnly; SameSite=Lax; Path=/`.

---

## 8. Behaviors worth knowing (consequences of the above)

1. **The token is the source of truth for 30 days.** The database is read only in
   `authorize` (at login) and, for OAuth, in the `signIn`/`jwt` callbacks. Changing
   a user's `role` or setting `isActive = false` does **not** affect a session that
   already exists until the cookie expires, the user logs out, or the cookie is
   removed. `isActive` is checked only at login and in `change-password`. If instant
   revocation is ever required, the options are: re-check `AppUser` in the `jwt`
   callback on each call (extra DB read per request), a shorter `maxAge`, or a
   token-version field.
2. **Same error for everything.** Unknown email, inactive user, invalid role and
   wrong password all make `authorize` return `null`, so the response is identical
   (`CredentialsSignin`). This is deliberate: the form cannot be used to discover
   which emails exist.
3. **`jwt` runs more than once.** It runs at sign-in (with `user`) and on every
   session read (without `user`). Always guard first-time population with
   `if (user)`.
4. **No server-side session list.** There is no table of sessions to revoke, which
   is what makes the app stateless on Vercel.
5. **The password is only protected in transit by HTTPS.** It is plain text in the
   POST body; the server compares it to the bcrypt hash in `authorize`.
6. **The CSRF check precedes `authorize`.** A forged cross-site login cannot reach
   the password check.
7. **Cookie size.** The session is small today. If much more is added to the token,
   the library chunks it, but every request then carries all the chunks.

---

## 9. Quick map: "where do I change X?"

| I want to... | Change |
|---|---|
| Add a login rule (lockout, MFA, email verified) | `authorize` in `auth.ts` |
| Add a field to the session or token | `jwt` **and** `session` callbacks in `auth.ts`; the type augmentation in `src/types/next-auth.d.ts` |
| Make a role change effective immediately | `jwt` callback (re-read `AppUser`) or shorten `session.maxAge` |
| Change who may open a page | `requireServerAppSession({ allowedRoles })` in the layout |
| Change who may call an API | `requireReadRole` / `requireMutationRole` / `requireAdminRole` in the route |
| Change the login rate limit | `proxy.ts` (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`) |
| Change the login page copy or error text | `app/(public)/page.tsx`, `login-form.tsx` |
| Add a provider | `providers` in `auth.ts` (OAuth users must exist in `AppUser`) |

---

## 10. How to see all of this in the browser

See the step-by-step Network-tab guide in
[`youtube/playlist-a1-prismapp/06-login-and-the-session.md`](../../youtube/playlist-a1-prismapp/06-login-and-the-session.md)
("On-screen action / dev tools: Network tab in Edge"). Related course material:
[request-lifecycle.md](request-lifecycle.md) (Slide 1) and
[`../E1-hardening/01-auth-hardening.md`](../E1-hardening/01-auth-hardening.md).
