# Playlist E · Episode 3 — "Route Handlers: Request In, Response Out"

## Video Metadata

- **Playlist:** E — Next.js Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** The Request Pipeline (1 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Show the consistent shape every API route in this app follows —
  `GET`/`POST` exports, `NextRequest` in, a typed envelope out — and why that
  consistency matters.
- **Title options:**
  1. Route Handlers: Request In, Response Out
  2. Every API Route in This App Has the Same Shape
  3. `GET` and `POST` Are Just Exported Functions Now
- **Thumbnail concept:** A single `route.ts` file split into a `GET` box and a
  `POST` box, each with an arrow labeled "request" going in and "envelope" coming
  out.
- **Teaching principle:** Application behavior → framework requirement → Next.js
  solution.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "A Route Handler is just a file named `route.ts`. It exports functions named after HTTP verbs.
>
> There is no router configuration. There is no separate `app.get(...)` call to wire it up. The file path and the export name *are* the route.
>
> Let us see the exact shape this app uses, every single time."

---

## Scene 1 — One file, two verbs (0:20–1:45)

**Visual:** Open `app/api/blocks/route.ts`, full file (27 lines).

**Code shown:**
```ts
export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listBlocks(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateBlockInput(payload);
    const data = await createBlock(input, actor);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
```

**Narration:**
> "`GET /api/blocks` and `POST /api/blocks` are two exports in the same file.
>
> `GET` checks that the caller can read. Then it lists. `POST` checks that the caller can write. Then it reads the JSON body, validates it, and creates.
>
> It is the same file, the same request type in, and the same `ok`/`fail` envelope out.
>
> This is the discriminated union from Episode 8 of Playlist C. Here it appears again as the actual return type of every handler in the app."

---

## Scene 2 — `request.nextUrl` versus `request.json()` (1:45–2:45)

**Visual:** Highlight `request.nextUrl.searchParams` in `GET` versus
`await request.json()` in `POST`.

**Narration:**
> "`NextRequest` extends the standard `Request` with a few conveniences.
>
> `request.nextUrl` gives you a parsed URL object. So `GET` can read query string filters without building a `URL` by hand.
>
> `POST` does not need that. It needs the body, so it calls the standard `request.json()`.
>
> These are two different ways to pull input out of the same request type. Each one fits what its verb carries. A `GET` carries query parameters. A `POST` carries a body."

---

## Scene 3 — The same shape, a second time, for confidence (2:45–4:00)

**Visual:** Open `app/api/contributions/route.ts`, lines 1–27.

**Narration:**
> "This is not a one-off convention for blocks.
>
> `POST /api/contributions` follows the identical shape. It calls `requireMutationRole`. It parses the body. It calls a service function. And it returns `ok(...)`.
>
> The only real difference is what comes back. `ok(contribution, 201, warning)` passes through an optional warning message.
>
> That is because creating a contribution can succeed *and* still have something worth flagging. One example is paying for a period before the current owner's tenure started.
>
> So we have the same envelope and the same status-code pattern. Plus a small domain-specific addition."

---

## Scene 4 — Why this consistency is the actual point (4:00–5:00)

**Narration (talking head, no new code):**
> "Nothing forces every route handler in a Next.js app to look like this.
>
> You could write each one differently. You could use different error shapes and different status code conventions. This app did not.
>
> Every route handler checks authorization first. It parses and validates input second. It calls a service function third. And it returns the same envelope type fourth.
>
> So a developer who has read *one* route handler in this app has effectively read the shape of all sixty-plus of them."

---

## Outro / CTA (5:00–5:30)

**Visual:** End card pointing to Episode 4.

**Narration:**
> "We skipped over `requireReadRole` and `requireMutationRole`.
>
> These are two function calls at the very top of every handler. They do a lot of quiet work.
>
> That is next."

---

## Production Notes

- **Screen recordings needed:** `app/api/blocks/route.ts` (full file, 27 lines),
  `app/api/contributions/route.ts` (lines 1–29, including the `warning` parameter
  in `ok(contribution, 201, warning)`).
- **Source material:** the files above, read directly from the repository.
- **B-roll:** none required.
