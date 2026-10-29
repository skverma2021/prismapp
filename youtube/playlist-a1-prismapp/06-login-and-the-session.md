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
login form". Optional: browser dev tools → Application → Cookies, empty.

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
