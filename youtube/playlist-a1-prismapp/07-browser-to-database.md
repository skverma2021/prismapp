# Playlist A1 · PrismApp — Episode 7 — "From Browser Click to Database"

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
> "You just clicked a link. You are already logged in. Episode 6 showed how that cookie got into your browser.
>
> Before the table of blocks appears on screen, that one click passes through about half a dozen distinct layers of this application.
>
> Let us follow it, one layer at a time."

---

## Scene 1 — The click leaves the browser (0:20–1:40)

**Visual:** Diagram: Browser box → Client Component box → `fetch()` arrow → Route
Handler box, with a small cookie icon labeled on the arrow.

**Narration:**
> "The page you land on, `/blocks`, is a client component. It manages its own filter and pagination state in the browser.
>
> The moment it mounts, it fires a `fetch` request to `/api/blocks`.
>
> That request automatically carries your session cookie. This is the cookie created when you logged in, in the previous episode. The browser attaches it, so you never touch it in code.
>
> This is a genuinely ordinary HTTP GET request. Nothing exotic happens yet."

**On-screen action:** Browser dev tools network tab, showing the outgoing request
and its cookie header.

---

## Scene 2 — The request is authenticated before anything else (1:40–2:50)

**Visual:** Diagram continues: Route Handler box expands to show, in order,
`requireReadRole()` → parse query params → call service.

**Narration:**
> "Inside the route handler, the very first thing that happens is an authorization check. It is not a business logic check. It is an *authorization* check.
>
> No session, no minimum role, no data.
>
> If it fails here, the request never gets near the database. Unauthenticated requests get a 401. Insufficient-role requests get a 403.
>
> Only after that gate passes does the handler look at the query string. That means page number, page size, and search text."

---

## Scene 3 — The handler delegates; it doesn't decide (2:50–3:50)

**Visual:** Diagram: Route Handler box with an arrow labeled "delegates to" pointing
to a separate Service box. Callout text: "No SQL lives here."

**Narration:**
> "Here is a design rule worth calling out explicitly.
>
> The route handler itself contains no database code at all.
>
> It authenticates. It parses input. And it calls a service function.
>
> All of the actual logic lives in that service layer, in its own file. This includes building the query, applying filters, and deciding what 'valid' means. It is completely decoupled from HTTP concerns.
>
> That separation makes this logic testable without starting a web server. It also makes the logic reusable if a second entry point ever needs the same behavior, such as a script or a background job."

---

## Scene 4 — The service talks to Prisma, Prisma talks to PostgreSQL (3:50–5:10)

**Visual:** Diagram: Service box → `db.$transaction([...])` → Prisma layer →
PostgreSQL cylinder, with a small SQL snippet floating on the arrow into Postgres.

**Narration:**
> "The service asks Prisma for two things at once, in a single transaction. It asks for the actual rows, and for a total count for pagination.
>
> Prisma translates that into real SQL. It is a `SELECT` with a `WHERE`, a `LIMIT`, and an `OFFSET`. Prisma sends it to PostgreSQL over a connection pool.
>
> PostgreSQL runs the query and returns rows.
>
> On the way back, Prisma turns those raw rows into typed objects. The rest of the TypeScript code can rely on them.
>
> This is the one and only place in the whole request where SQL exists."

---

## Scene 5 — The trip back, and what happens when something's wrong (5:10–6:30)

**Visual:** Diagram reverses direction: PostgreSQL → Prisma → Service → Route
Handler → `ok(data)` / `NextResponse.json` → Browser → `setState` → re-rendered
table. A dashed alternate path shows an error branching to `fail(...)`.

**Narration:**
> "The service hands a plain object back to the route handler.
>
> The handler wraps it in a consistent envelope. The envelope always has the same shape, for success or failure. Then the handler sends it as JSON.
>
> Back in the browser, the fetch call resolves. The component updates its state. And React re-renders the table.
>
> Now suppose anything went wrong anywhere in that chain. It could be a validation failure, a not-found, or a conflict. Then the same envelope shape is used for the error. Success is set to false, and an error code is attached.
>
> The client checks one field to know which path it is on.
>
> One contract, every screen."

**On-screen action:** Browser dev tools — show the actual JSON response body for a
successful request.

---

## Scene 6 — Zooming back out (6:30–7:30)

**Visual:** Full pipeline diagram, all boxes now shown together in one frame:
`Browser → Client Component → Route Handler → Auth Guard → Service → Prisma →
PostgreSQL → Response → Re-render`.

**Narration:**
> "That is the whole architecture, in motion, for a single click.
>
> Every screen in this application follows this exact same shape. The specifics change. The pipeline does not.
>
> That consistency is why the rest of this channel can go deep on individual pieces without starting from zero each time.
>
> When we talk about TypeScript, we will talk about the types flowing through this pipeline.
>
> When we talk about Prisma and PostgreSQL, we will talk about this exact transaction step.
>
> When we talk about Next.js, we will talk about this exact client-to-route-handler boundary."

---

## Outro / CTA (7:30–8:00)

**Visual:** End card showing all upcoming playlists — Architecture & SDLC,
TypeScript, PostgreSQL & Prisma, Next.js, AI-Augmented Development.

**Narration:**
> "That wraps up the first playlist. You now know what this application does and roughly how it is built.
>
> From here, we go deep, one layer at a time.
>
> Subscribe, so you do not miss where we start."

---

## Production Notes

- **Screen recordings needed:** browser dev tools network tab showing the outgoing
  request (with cookie header) and the JSON response body for `/api/blocks`.
- **Diagrams needed:** this episode is diagram-heavy — build the pipeline as one
  reusable animated diagram that assembles piece by piece across Scenes 1–5, then
  shows fully assembled in Scene 6. Reuse is efficient here: one asset, six reveals.
- **Source material to reuse:** `course/00-intro/request-lifecycle.md` is the exact
  source for this episode (Slides 2 onward; Slide 1, the login and session, is the
  source for Episode 6) — it already contains the full diagram (browser → route
  handler → service → Prisma → PostgreSQL → response) and slide-by-slide talking
  points for the same `/blocks` example. This script is a condensed, spoken-word
  adaptation of that document; keep both in sync if the request path ever changes
  (e.g., if auth moves to middleware).
- **Fact check before recording:** confirm the file/function names named in
  narration (`requireReadRole`, `blocksService.listBlocks`, `db.$transaction`,
  `ok()`/`fail()`) still match `src/lib/authz.ts`, `src/modules/blocks/blocks.service.ts`,
  and `src/lib/api-response.ts` before recording, since this episode names real
  symbols on screen.
