# Playlist A1 · PrismApp — Episode 6 — "What Happens Before the First Click? Logging In"

## Video Metadata

- **Playlist:** A1 — PrismApp: Building a Real Society Management System
- **Target length:** ~5:00
- **Primary goal:** Explain how the application knows who you are — what happens
  between opening the app and being logged in — so that the next episode's
  "session cookie" is not a mystery. Keep it at mental-model level; the mechanics
  are taught later in Playlist E Episode 4.
- **Title options:**
  1. What Happens Before the First Click? Logging In
  2. How the App Knows It's You
  3. From Login Screen to Logged In: The Session Explained
- **Thumbnail concept:** A browser window on the login screen with a small cookie
  icon traveling from the server back to the browser, labeled "your session".

---

## Cold Open (0:00–0:20)

**Visual:** Screen recording — the login screen, then the signed-in `/home` page.

**Narration:**
> "In the last episodes you saw what this application does. Everything you saw
> happened after one step we skipped: logging in. Before a single block, unit or
> payment can appear, the application has to answer one question — who is
> asking? Let's follow that, from an empty browser to a logged-in user."

---

## Scene 1 — The first visit: no cookie, no session (0:20–1:20)

**Visual:** Diagram: Browser (empty cookie jar) → arrow `GET /` → Server box. Inside
the Server box, three small steps: "read cookie", "no cookie → no session", "show
login form". Optional: browser dev tools → Application → Cookies, with no session cookie
(only the library's `next-auth.csrf-token` may appear).

**Narration:**
> "You type the address. Your browser has nothing from us yet — no cookie. The
> request reaches the server, and before anything is drawn the server checks:
> does this visitor have a session? There is none, so the page that comes back is
> the login form. Notice who made that decision: the server, before the page was
> sent. The browser never had to ask 'am I logged in?' and then wait. If you had
> already been logged in, you would have been sent straight to the home page
> instead."

**On-screen action:** Show the login page. Optionally show the banner that
appears when you were sent here because you needed to sign in
(`?auth=required`).

---

## Scene 2 — Submitting the form: who does what (1:20–2:50)

**Visual:** Diagram: Login form → `signIn("credentials")` → `/api/auth/...`
route → box labeled "NextAuth (a library)" → three small callouts "authorize",
"jwt", "session" → PostgreSQL cylinder labeled `AppUser`. A small gate icon on the
arrow labeled "max 10 attempts / 15 min".

**Narration:**
> "You type your email and password and press the button. The form hands them to
> NextAuth, the sign-in library this app uses, and the request goes to one single
> address that the library owns. Before it gets there it passes a small gatekeeper
> that allows only ten attempts every fifteen minutes from one address, so
> nobody can sit there guessing passwords.
>
> Here is the part worth noticing: almost everything that happens next is the
> library's job, not the application's. The application only supplies three small
> pieces. First, how to check a login: look up the user by email in our own user
> table — this is the first time the database is touched — reject anyone who is
> unknown or switched off, and compare the password against a stored hash. The
> password itself is never stored. Second and third, what to put in the session:
> the user's id, their role and their display name. Wrong email and wrong password
> give the same error on purpose, so nobody can use the form to find out which
> email addresses exist."

**On-screen action:** Show a failed login (generic error), then a successful one.

**Dev tools (optional):** Network tab, steps 2–3 of
[On-screen action / dev tools](#on-screen-action--dev-tools-network-tab-in-edge).

---

## Scene 3 — The cookie is the session (2:50–4:00)

**Visual:** Browser dev tools → Application → Cookies, showing the session cookie
appear after login (`next-auth.session-token`, HttpOnly ticked). Diagram: a small
box inside the cookie: "userId · role · displayName", with a lock icon over it.

**Narration:**
> "If the login succeeds, the library sets a cookie in your browser. This cookie
> *is* your session. There is no table of sessions on the server to look up —
> the cookie itself carries who you are and what role you have, and it is
> encrypted with a secret key that only the server knows. The browser keeps it
> and sends it back with every request. It is also marked HttpOnly, which means
> scripts running on the page cannot read it, which protects it from a whole
> class of attacks. The form then takes you to the home page — the one you saw in
> Episode 1."

**On-screen action:** Show the cookie flags in dev tools. Optional: show that the
login page now redirects straight to `/home` when you revisit it.

**Dev tools (optional):** Network tab, steps 4–5 of
[On-screen action / dev tools](#on-screen-action--dev-tools-network-tab-in-edge).

---

## Scene 4 — Every request after this (4:00–4:40)

**Visual:** Diagram: Browser with cookie → arrows to "page" and to "API" → Server
checks the cookie at both. A small label: "no cookie, or wrong role → turned away".

**Narration:**
> "From now on you are not logging in again. Every page you open and every data
> request the page makes carries that same cookie, and the server checks it every
> time — a page without a valid session sends you back to the login form, and a
> data request without one gets a refusal, and a role that is not allowed gets a
> different refusal. That is how a read-only user can look at the data but cannot
> change it, even if they try the address directly. We'll take that apart
> properly in the Next.js playlist. For now, hold on to the cookie."

---

## Outro / CTA (4:40–5:00)

**Visual:** End card pointing to Episode 7.

**Narration:**
> "You're in. In the next episode we click 'Blocks' and follow that one request —
> with this cookie riding along — through every layer, all the way to the
> database and back."

---

## On-screen action / dev tools: Network tab in Edge

Optional screen-recording guide that shows the login process in the browser. The
request names and headers below come from `login-form.tsx`, `auth.ts` and
`proxy.ts` (NextAuth v4); confirm the exact list on your machine before recording.

### Setup

1. Run the app locally and open Edge at `http://localhost:3000/`.
2. Press **F12** and open the **Network** tab.
3. Tick **Preserve log**. Without it the list clears when the page navigates to
   `/home`.
4. Tick **Disable cache** (optional). Use the filter **Fetch/XHR** for the login
   calls, and **Doc** when showing page requests.
5. Open **Application → Cookies → `http://localhost:3000`** in a second dev-tools
   view or panel, and delete any `next-auth.*` cookies first.
6. Use the seeded demo accounts shown on the login page. Never type a real
   password on camera.

### 1. First visit (Scene 1)

- Hard-refresh (Ctrl+Shift+R) and click the first request, `localhost` (type
  *document*).
- **Headers → Request Headers:** there is no `Cookie` header, so the browser has
  no session to send.
- **Response:** the HTML contains the login form. The server decided that before
  sending the page.
- Say "no **session** cookie", not "no cookies": `next-auth.csrf-token` may
  already be present from `GET /api/auth/csrf`.
- Optional: open `/home` while logged out. You are redirected (307) to the login
  page with the `?auth=required` banner.

### 2. Failed login (Scene 2)

Clear the log, enter a **wrong** password and submit. Requests to point out:

| Request | What to say |
|---|---|
| `GET /api/auth/providers`, `GET /api/auth/csrf` | The library's own preparation calls (see the box below). Mention only briefly. |
| `POST /api/auth/callback/credentials` | The one address NextAuth owns; this is the real login attempt. |

> **Preparation calls (what `signIn("credentials")` does before your password
> is sent)**
>
> | Call | Purpose | How it works |
> |---|---|---|
> | `GET /api/auth/providers` | Check that the provider name exists. | Returns a JSON map of the configured providers (`credentials`, plus Google/Microsoft if configured) with each `type` and URL. The `type` decides what `signIn` does next: `credentials` posts to `/api/auth/callback/credentials` and returns the result to the form (`redirect: false`). No secrets, no cookie. |
> | `GET /api/auth/csrf` | Anti-forgery (CSRF) token, so a foreign site cannot make your browser submit a login. | The server creates a random token and sets the cookie `next-auth.csrf-token = token\|sha256(token + AUTH_SECRET)`. It returns the token as `{ "csrfToken": "..." }`. `signIn` sends it back as `csrfToken` in the POST body; the server verifies the cookie's hash and that cookie token = body token, and refuses the credentials login otherwise. |
>
> - Demo: copy `csrfToken` from the `csrf` response, find it as the left half of
>   the `next-auth.csrf-token` cookie (Application → Cookies), then find the same
>   value in the POST Payload.
> - Narration, one sentence: "The library first checks the login method exists
>   and fetches a one-time anti-forgery token." The details belong to Playlist E
>   Episode 4.
> - After a successful POST, `signIn` also calls `GET /api/auth/session` to
>   refresh the client's view of the session (returns `user` with id, role and
>   display name).
> - These are **Fetch/XHR** requests (made by JavaScript, no page reload), which
>   is why the Fetch/XHR filter shows them while **Doc** shows only the page
>   loads (`/`, `/home`).

Click the POST:

- **Payload:** `csrfToken`, `email`, `password`, `callbackUrl`, `json`. The
  password is plain text in the body because the server needs it for
  `bcrypt.compare`. What protects it in transit is HTTPS: automatic on Vercel,
  and irrelevant on `localhost` because the traffic never leaves the machine.
- **Response:** status **401**, body
  `{ "url": "http://localhost:3000/api/auth/error?error=CredentialsSignin&provider=credentials" }`.
- Repeat with an unknown email. The response is identical, which is the
  "same error on purpose" point (every failure path in `authorize` returns
  `null`).
- **Response headers:** only `Set-Cookie: next-auth.callback-url=...; HttpOnly`
  is set. It just remembers where to go after sign-in. There is **no**
  `next-auth.session-token`.

### 3. Successful login (Scene 2 → 3)

Submit a correct password and click the same POST (the `credentials` row under
**Fetch/XHR**, not the `/home` document request; the page request has
`content-type: text/html` and no `Set-Cookie` or `x-request-id`):

- Status **200**; the body `url` is the redirect target (`/home`).
- **Response headers:** `Set-Cookie: next-auth.session-token=...; HttpOnly;
  Path=/; SameSite=Lax`. This is the moment the session is created.
- `x-request-id` is also in the response headers (added by `proxy.ts`); it is a
  teaser for Episode 7.

### 4. The cookie is the session (Scene 3)

- In **Application → Cookies**, `next-auth.session-token` is now present with the
  **HttpOnly** column ticked, and its value is unreadable (encrypted).
- Optional proof: in the **Console**, run `document.cookie`. The session token is
  not listed.
- On HTTPS (Vercel) the name becomes `__Secure-next-auth.session-token`; leave
  that out of the video.

### 5. Every request after this (Scene 4)

- After sign-in the form calls `window.location.assign`, so the browser requests
  `/home`. Filter **Doc**, click it and check **Request Headers**: it now carries
  `Cookie: next-auth.session-token=...`.
- Revisit `/` while logged in. You are redirected to `/home`.
- Optional contrast: delete the cookie in Application → Cookies and reload
  `/home` to be sent back to the login form. Or right-click an `/api/...`
  request, **Copy → Copy as cURL**, and run it without the `Cookie` header to get
  a refusal.

### Optional: the rate limit

`proxy.ts` allows 10 login POSTs per 15 minutes per IP; the 11th returns **429**
with a `Retry-After` header. Do this last or off-camera, because the in-memory
counter keeps blocking you until the window expires or the dev server restarts.

### Recording tips

- Zoom the browser (Ctrl +) and widen the Name and Status columns so text is
  readable. Enable the **Method** column via right-click on the column header.
- Use the Payload tab's *view source* toggle to show the raw form-encoded body.

---

## Production Notes

- **Screen recordings needed:** empty cookie jar on first visit; the login page
  and a failed login; a successful login with the cookie appearing in dev tools
  (name, HttpOnly flag); revisiting `/` while logged in and being redirected to
  `/home`. Use the seeded accounts shown on the login page.
- **Diagrams needed:** the first-visit decision, the "who does what" diagram of
  Scene 2 (form → library → three callbacks → `AppUser`), and the cookie contents.
  Reuse the visual style of Episode 7's pipeline diagram so the two episodes read
  as one story.
- **Source material:** `course/00-intro/request-lifecycle.md` Slide 1 (this is a
  condensed, spoken-word adaptation; keep the two in sync if the login flow
  changes). Files to name only lightly on screen: `auth.ts` (`authorize`, `jwt`,
  `session` callbacks), `src/components/auth/login-form.tsx` (`signIn`),
  `proxy.ts` (login rate limit).
- **What is deliberately left out:** cookie flag details beyond HttpOnly, the
  `__Secure-` prefix, JWT internals, OAuth sign-in (Google/Microsoft), the
  difference between the page-level redirect and the API-level 401. Those belong
  to Playlist E Episode 4 (`playlist-e/04-authentication-and-authorization.md`),
  which picks up exactly where this episode ends.
- **Fact check before recording:**
  - the rate limit is 10 attempts per 15 minutes per IP and applies only to
    `POST /api/auth/callback/credentials` (`proxy.ts`);
  - the cookie name is `next-auth.session-token` over HTTP locally (it becomes
    `__Secure-next-auth.session-token` on HTTPS, e.g. on Vercel);
  - say "no **session** cookie", not "no cookies": `GET /api/auth/csrf` sets
    `next-auth.csrf-token`, and every call to the credentials endpoint (even a
    failed one) sets `next-auth.callback-url`. Only a successful login sets
    `next-auth.session-token`;
  - for the Network-tab demo, enable **Preserve log**, otherwise the list clears
    when the page navigates to `/home`;
  - the form navigates itself after sign-in (`redirect: false` plus
    `window.location.assign`), so "the form takes you to the home page" is
    accurate for the app's own code;
  - the login page copy on `app/(public)/page.tsx` was updated (the old text
    described a "header-based authorization contract" that no longer exists); it
    now says the session carries the role and every page and API request is
    checked on the server, which matches Scene 4. Record the login screen after
    this change so the on-screen text and the narration agree.
- **Link back to Episode 1:** the login screen and the home page appear in
  Episode 1's Scene 2; reuse that footage as a quick recap if the cold open needs
  it.
