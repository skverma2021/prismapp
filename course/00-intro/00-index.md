# 00-intro — Reading Index

This folder is the orientation layer of the course. Read these files in the order below before starting Section A.
Each document is a standalone reference; the sequence is designed so later documents build on vocabulary and mental models from earlier ones.

---

## Sequence

| # | File | What it gives you | Time |
|---|------|--------------------|------|
| 1 | [react-express-transition.md](react-express-transition.md) | Six mental model shifts from React+Express to Next.js. Read this before anything else or the rest of the course will feel backwards. | 10 min |
| 2 | [project-structure-walkthrough.md](project-structure-walkthrough.md) | A guided tour of every folder in the codebase — what lives where and why. | 10 min |
| 3 | [domain-glossary.md](domain-glossary.md) | Every domain term defined in plain English: Block, Unit, Individual, Ownership, Residency, Contribution Head, Temporal Period, and more. Use this as a reference throughout the course. | 10 min |
| 4 | [how-to-read-the-vault.md](how-to-read-the-vault.md) | The `vault/` folder is the authoritative spec. This guide shows what it contains, how sections relate, and how to use it while coding. | 8 min |
| 5 | [app-tour.md](app-tour.md) | A narrated walkthrough of the running application — every module, every screen. Now that you have the vocabulary, the tour makes sense. | 6 min |
| 6 | [request-lifecycle.md](request-lifecycle.md) | One user click traced from the browser through the Client Component → fetch → route handler → service → Prisma → PostgreSQL → response. The architecture in motion. | 10 min |
| 7 | [guide-how-to-add-new-module.md](guide-how-to-add-new-module.md) | The synthesis: how the layers learned in 1–6 combine when building a new entity end-to-end. | 15 min |
| 8 | [guide-shared-components.md](guide-shared-components.md) | Reference for the shared UI components used across all module pages. Consult this when building new screens. | 10 min |

---

## What comes before and after

**Before this folder:** Complete `course/00-setup/` first. You need a running local instance before the app tour (step 5) is meaningful.

**After this folder:** Section A (Scope) through Section H (Deployment) build on this foundation.

---

## For Express Developers: Where Did `app.listen()` Go?

If you're coming from Node + Express, the first instinct is to look for the line that starts the server. There isn't one — Next.js owns that lifecycle. Two questions come up immediately; both are answered here so you don't go hunting for a `server.js` that doesn't exist.

### 1. How does the server start, without `app.listen(3000, ...)`?

**A) On your local machine**

`npm run dev` runs `next dev`, which is itself a long-running Node process — Next.js already contains an HTTP server (built on top of Node's `http` module), so you never write the listen call yourself. What it does on startup:

1. Scans the `app/` directory and builds a route manifest — every `page.tsx` and `route.ts` becomes an entry mapped to its folder path.
2. Starts its own dev server bound to `localhost`, default port `3000` (override with `next dev -p 4000` or the `PORT` env var).
3. Compiles routes on demand (or eagerly with Turbopack) as you hit them in the browser, and keeps a persistent process alive for Fast Refresh.

So "the server starts listening at port 3000" still happens — it's just inside `next dev`, not inside your code. Compare: in Express, *you* are the author of the HTTP server. In Next.js, the framework is the HTTP server, and your `page.tsx`/`route.ts` files are handlers it dispatches to.

**B) On Vercel**

There is no persistent server at all, and therefore no port to listen on.

- `vercel build` (or the build step triggered by a git push) compiles each route into its own deployable unit — a serverless function for most Route Handlers and dynamic pages, or a static asset for anything fully pre-renderable.
- Vercel's edge network receives the incoming request and invokes the matching function for that specific route, cold-starting it if needed, then discards the execution context after the response is sent.
- "Listening on a port" is a local-dev concept only. In production, there's no process sitting idle waiting for connections — each request is a fresh, isolated invocation. This is why PrismApp's code never assumes in-memory state survives between requests (see Slide 4, point 5 in [react-express-transition.md](react-express-transition.md)).

---

### 2. What already happened before the login form even appears?

Given `DATABASE_URL`, `AUTH_SECRET`, and `NEXTAUTH_URL` in `.env`, here's what's already run by the time you see a login form at `localhost:3000`:

1. **`AUTH_SECRET`** is the key NextAuth uses to sign and verify the session cookie (PrismApp uses `session: { strategy: "jwt" }` in [auth.ts](../../auth.ts)). No session cookie exists yet on a first visit, so nothing is verified on this request — but the key is loaded and ready for the moment you do log in.
2. **`NEXTAUTH_URL`** tells NextAuth the canonical origin of the app, used to build absolute callback/redirect URLs (important for the Google/Azure AD OAuth providers) and to decide cookie attributes like `Secure`. On `localhost` over HTTP this matters for cookies to be set correctly at all.
3. **`DATABASE_URL`** is *not* touched yet at this point. The `Credentials` provider's `authorize()` function — the one that queries `db.appUser.findUnique(...)` — only runs when the login form is actually submitted. Rendering the empty form requires no database call.
4. The root layout ([app/layout.tsx](../../app/layout.tsx)) runs on the server for every request, including this one:
   ```ts
   const session = await getServerAuthSession();
   // ...
   <AppSessionProvider session={session}>{children}</AppSessionProvider>
   ```
   `getServerAuthSession()` reads the (in this case absent) session cookie from the incoming request and tries to verify it against `AUTH_SECRET`. With no cookie, it resolves to `null`.
5. That `null` session is handed to `AppSessionProvider`, which is just a thin client wrapper around NextAuth's `SessionProvider` (see [src/lib/auth-session.tsx](../../src/lib/auth-session.tsx)) — this is how the session becomes available to any Client Component via `useSession()`/`useAuthSession()`, without those components making their own fetch.
6. The actual page being rendered, `app/(public)/page.tsx`, independently calls `getServerAppSession()` (a typed wrapper over the same `getServerAuthSession()`). Since the session is `null`, it does **not** redirect to `/home` — it falls through and renders `<LoginForm />`. (If a session *had* existed, this page would `redirect("/home")` before any form ever rendered.)

**On session hydration in `layout.tsx`:** the key idea is that the session is fetched **once, server-side**, before any HTML is sent to the browser — not fetched client-side after the page loads. This avoids a loading flicker where the UI briefly doesn't know if you're logged in.

**The pattern — session fetched server-side, passed to a client provider — is the recommended NextAuth v4 approach for the App Router.** It looks like this everywhere a layout needs auth state:

```
Server (layout.tsx)                          Client (everything inside)
──────────────────────                       ───────────────────────────
await getServerAuthSession()   ──session──►  <SessionProvider session={session}>
(reads cookie, verifies JWT,                   useSession() / useAuthSession()
 no client round-trip)                         reads from React context, instantly
```

Contrast this with the Express + separate React SPA world, where the client has no choice but to make a fetch to something like `/api/me` after mount, show a loading spinner, then render — because the server and the UI don't share a rendering pass. In the App Router, the server *is* part of the same render that produces the page, so the session can simply be passed down as a prop (here, to a Client Component boundary) instead of being re-fetched.

See also: [request-lifecycle.md](request-lifecycle.md) for how this same session is re-verified (via `requireReadRole`/`requireMutationRole`, not re-fetched) on every API call, and [course/walkthrough/app-shell.md](../walkthrough/app-shell.md) for the full shell walkthrough.

---

## If you are in a hurry

Minimum viable orientation: read documents 1, 2, 3, and 6. That covers the mental model shift, the file layout, the vocabulary, and the request flow. You can read 4, 5, 7, and 8 as you encounter the relevant sections of the course.
