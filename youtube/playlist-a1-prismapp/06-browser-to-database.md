# Playlist A1 · PrismApp — Episode 6 — "From Browser Click to Database"

## Video Metadata

- **Playlist:** A1 — PrismApp: Building a Real Society Management System
- **Target length:** 7–9 minutes
- **Primary goal:** Trace one real user action through every architectural layer,
  closing out Playlist A1 by showing "the app" and "the architecture" are the same
  thing viewed from two angles — and set up Playlist B/C/D/E as the deep dives.
- **Title options:**
  1. From Browser Click to Database — The Full Request Journey
  2. What Actually Happens When You Click "Blocks"?
  3. One Click, Nine Steps: Tracing a Request Through a Real App
- **Thumbnail concept:** A left-to-right pipeline graphic: Browser → Route Handler →
  Service → Prisma → PostgreSQL, with a cursor-click icon on the far left.

---

## Cold Open (0:00–0:20)

**Visual:** Screen recording — a single mouse click on the "Blocks" nav link,
frozen/zoomed at the moment of the click.

**Narration:**
> "You just clicked a link. Before the table of blocks appears on screen, that one
> click passes through about half a dozen distinct layers of this application. Let's
> follow it, one layer at a time."

---

## Scene 1 — The click leaves the browser (0:20–1:40)

**Visual:** Diagram: Browser box → Client Component box → `fetch()` arrow → Route
Handler box, with a small cookie icon labeled on the arrow.

**Narration:**
> "The page you land on, `/blocks`, is a client component — it manages its own
> filter and pagination state in the browser. The moment it mounts, it fires a
> `fetch` request to `/api/blocks`. That request automatically carries your session
> cookie — the browser attaches it, you never touch it in code. This is a genuinely
> ordinary HTTP GET request; nothing exotic happens yet."

**On-screen action:** Browser dev tools network tab, showing the outgoing request
and its cookie header.

---

## Scene 2 — The request is authenticated before anything else (1:40–2:50)

**Visual:** Diagram continues: Route Handler box expands to show, in order,
`requireReadRole()` → parse query params → call service.

**Narration:**
> "Inside the route handler, the very first thing that happens is an authorization
> check — not a business logic check, an *authorization* check. No session, no
> minimum role, no data. Fail here, and the request never gets near the database:
> unauthenticated requests get a 401, insufficient-role requests get a 403. Only
> after that gate passes does the handler even look at the query string — page
> number, page size, search text."

---

## Scene 3 — The handler delegates; it doesn't decide (2:50–3:50)

**Visual:** Diagram: Route Handler box with an arrow labeled "delegates to" pointing
to a separate Service box. Callout text: "No SQL lives here."

**Narration:**
> "Here's a design rule worth calling out explicitly: the route handler itself
> contains no database code at all. It authenticates, it parses input, and it calls
> a service function. All of the actual logic — building the query, applying
> filters, deciding what 'valid' means — lives in that service layer, in its own
> file, completely decoupled from HTTP concerns. That separation is what makes this
> logic testable without spinning up a web server, and reusable if a second entry
> point — a script, a background job — ever needs the same behavior."

---

## Scene 4 — The service talks to Prisma, Prisma talks to PostgreSQL (3:50–5:10)

**Visual:** Diagram: Service box → `db.$transaction([...])` → Prisma layer →
PostgreSQL cylinder, with a small SQL snippet floating on the arrow into Postgres.

**Narration:**
> "The service asks Prisma for two things at once, in a single transaction: the
> actual rows, and a total count for pagination. Prisma translates that into real
> SQL — a `SELECT` with a `WHERE`, a `LIMIT`, and an `OFFSET` — and sends it to
> PostgreSQL over a connection pool. PostgreSQL runs the query and returns rows. On
> the way back, Prisma turns those raw rows into typed objects the rest of the
> TypeScript code can rely on. This is the one and only place in the whole request
> where SQL exists."

---

## Scene 5 — The trip back, and what happens when something's wrong (5:10–6:30)

**Visual:** Diagram reverses direction: PostgreSQL → Prisma → Service → Route
Handler → `ok(data)` / `NextResponse.json` → Browser → `setState` → re-rendered
table. A dashed alternate path shows an error branching to `fail(...)`.

**Narration:**
> "The service hands a plain object back to the route handler, which wraps it in a
> consistent envelope — always the same shape, success or failure — and sends it as
> JSON. Back in the browser, the fetch call resolves, the component updates its
> state, and React re-renders the table. If anything went wrong anywhere in that
> chain — a validation failure, a not-found, a conflict — the same envelope shape is
> used for the error, just with success set to false and an error code attached. The
> client checks one field to know which path it's on. One contract, every screen."

**On-screen action:** Browser dev tools — show the actual JSON response body for a
successful request.

---

## Scene 6 — Zooming back out (6:30–7:30)

**Visual:** Full pipeline diagram, all boxes now shown together in one frame:
`Browser → Client Component → Route Handler → Auth Guard → Service → Prisma →
PostgreSQL → Response → Re-render`.

**Narration:**
> "That's the whole architecture, in motion, for a single click. Every screen in
> this application follows this exact same shape — the specifics change, the
> pipeline doesn't. And that consistency is exactly why the rest of this channel
> can go deep on individual pieces without starting from zero each time: when we
> talk about TypeScript, we'll be talking about the types flowing through this
> pipeline. When we talk about Prisma and PostgreSQL, we'll be talking about this
> exact transaction step. When we talk about Next.js, we'll be talking about this
> exact client-to-route-handler boundary."

---

## Outro / CTA (7:30–8:00)

**Visual:** End card showing all upcoming playlists — Architecture & SDLC,
TypeScript, PostgreSQL & Prisma, Next.js, AI-Augmented Development.

**Narration:**
> "That wraps up the first playlist — you now know what this application does and
> roughly how it's built. From here, we go deep, one layer at a time. Subscribe so
> you don't miss where we start."

---

## Production Notes

- **Screen recordings needed:** browser dev tools network tab showing the outgoing
  request (with cookie header) and the JSON response body for `/api/blocks`.
- **Diagrams needed:** this episode is diagram-heavy — build the pipeline as one
  reusable animated diagram that assembles piece by piece across Scenes 1–5, then
  shows fully assembled in Scene 6. Reuse is efficient here: one asset, six reveals.
- **Source material to reuse:** `course/00-intro/request-lifecycle.md` is the exact
  source for this episode — it already contains the full diagram (browser → route
  handler → service → Prisma → PostgreSQL → response) and slide-by-slide talking
  points for the same `/blocks` example. This script is a condensed, spoken-word
  adaptation of that document; keep both in sync if the request path ever changes
  (e.g., if auth moves to middleware).
- **Fact check before recording:** confirm the file/function names named in
  narration (`requireReadRole`, `blocksService.listBlocks`, `db.$transaction`,
  `ok()`/`fail()`) still match `src/lib/authz.ts`, `src/modules/blocks/blocks.service.ts`,
  and `src/lib/api-response.ts` before recording, since this episode names real
  symbols on screen.
