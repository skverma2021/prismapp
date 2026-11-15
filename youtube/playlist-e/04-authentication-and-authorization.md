# Playlist E · Episode 4 — "Authentication and Authorization at the Edge of Every Request"

## Video Metadata

- **Playlist:** E — Next.js Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** The Request Pipeline (2 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Show the two distinct places this app checks "who is this"
  and "are they allowed" — a page-level redirect for the browser, and a
  token-based check for API routes — and why they're not the same mechanism.
- **Title options:**
  1. Authentication and Authorization at the Edge of Every Request
  2. Two Different Auth Checks, One Session
  3. Why a Page Redirects but an API Route Returns 401
- **Thumbnail concept:** A fork in the road — one path labeled "page request" going
  to a redirect sign, the other labeled "API request" going to a `401` sign.
- **Teaching principle:** Application behavior → framework requirement → Next.js
  solution.

---

## Cold Open (0:00–0:25)

**Visual:** Talking head.

**Narration:**
> "'Are you logged in' and 'are you allowed to do this' sound like one question.
>
> But this app answers it twice. It answers differently, depending on who is asking.
>
> A browser loading a dashboard page gets redirected to sign in. An API route hit directly, without a session, gets a `401` JSON response.
>
> It is the same underlying session. But there are two different mechanisms. A browser and a fetch call need different answers."

---

## Scene 1 — The page-level gate: redirect, not an error (0:25–2:00)

**Visual:** Open `src/lib/server-auth.ts`, `requireServerAppSession`.

**Code shown:**
```ts
export async function requireServerAppSession(options?: { allowedRoles?: UserRole[]; redirectTo?: string }) {
  const session = await getServerAppSession();

  if (!session) {
    const params = new URLSearchParams();
    if (options?.redirectTo) params.set("next", options.redirectTo);
    params.set("auth", "required");
    redirect(`/${params.size > 0 ? `?${params.toString()}` : ""}`);
  }

  if (options?.allowedRoles && !options.allowedRoles.includes(session.role)) {
    const params = new URLSearchParams({ auth: "denied" });
    // ...redirect again
  }
}
```

**Narration:**
> "This is what the `DashboardLayout` from Episode 1 actually calls.
>
> Is there no session? Then it calls Next.js's `redirect()` straight to `/`. It carries an `auth=required` query parameter. So the sign-in page can show a banner that explains why you landed there.
>
> Is the role wrong for this section? Then it redirects again, with `auth=denied`.
>
> Notice that there is no JSON response anywhere here.
>
> `redirect()` throws a special Next.js signal. The signal aborts rendering and sends an HTTP redirect instead.
>
> That is the right behavior for a page a person navigates to in a browser."

---

## Scene 2 — The API-level gate: a token, not a redirect (2:00–3:30)

**Visual:** Open `src/lib/authz.ts`, `getAuthContext`, showing the `getToken` call
from `next-auth/jwt`.

**Narration:**
> "A `fetch()` call from a client component cannot follow a redirect the way a browser navigation can.
>
> It would just get a redirect response back as data. That is not useful.
>
> So route handlers use a different check entirely.
>
> `getAuthContext` calls `getToken` from `next-auth/jwt` directly against the request's cookies. It decodes the session JWT. Then it returns a typed `AuthContext` with the user's `role`.
>
> What if there is no session, or no valid token? The wrapper functions are `requireReadRole` and `requireMutationRole`. We saw them at the top of every route handler in Episode 3.
>
> They throw an `HttpError` with a `401`. That flows straight into the same `fail(fromUnknownError(...))` pattern we have already seen."

---

## Scene 3 — Same cookie, two different consumers (3:30–4:45)

**Visual:** Diagram: one browser cookie (`next-auth.session-token`), two arrows —
one to `getServerAuthSession()` (used by layouts/pages), one to `getToken()` (used
by route handlers).

**Narration:**
> "Both checks ultimately read the same encrypted session cookie. The browser sends it with every request.
>
> So there is exactly one source of truth for 'who is this.'
>
> `getServerAuthSession()` is the higher-level helper from next-auth. It is convenient for Server Components that just want a session object.
>
> `getToken()` is the lower-level JWT decode. Route handlers use it because it does not assume a React rendering context.
>
> It is the same cookie and the same secret. But there are two APIs, suited to two different callers."

---

## Scene 4 — Authorization is a second, separate question (4:45–5:45)

**Visual:** Re-show `requireServerAppSession({ allowedRoles: [...] })` from Scene
1, next to `requireMutationRole` from Episode 3's route handlers.

**Narration:**
> "Notice that both layers ask two questions, not one.
>
> First, is there a session at all? That is authentication. Second, does *this* session's role permit *this* action? That is authorization.
>
> A `READ_ONLY` user has a perfectly valid session. They are authenticated. But `requireMutationRole` still rejects their `POST` request.
>
> These are two separate checks, and both are enforced server-side.
>
> So the UI can hide a button for a read-only user as a convenience. But the actual protection never depends on the UI cooperating."

---

## Outro / CTA (5:45–6:15)

**Visual:** End card pointing to Episode 5.

**Narration:**
> "Every one of these protected pages eventually needs to submit a form back to one of these protected route handlers.
>
> How that submission actually happens, client-side, is next."

---

## Production Notes

- **Screen recordings needed:** `src/lib/server-auth.ts`
  (`requireServerAppSession`, full function), `src/lib/authz.ts`
  (`getAuthContext`, ~lines 58–75, and the `requireReadRole`/`requireMutationRole`
  wrappers), `auth.ts` (root, next-auth config, brief mention only).
- **Source material:** the files above, read directly from the repository.
- **B-roll:** a simple two-arrow diagram (one cookie, two consumers) for Scene 3.
