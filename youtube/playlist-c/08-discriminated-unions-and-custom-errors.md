# Playlist C · Episode 8 — "Discriminated Unions and Custom Errors"

## Video Metadata

- **Playlist:** C — TypeScript Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Control Flow and Errors (2 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Close the playlist by showing the single response shape every
  API route in this app returns — a discriminated union — and the custom error
  class that feeds it, tying together `unknown`, narrowing, and generics from
  earlier episodes into one real pattern.
- **Title options:**
  1. Discriminated Unions and Custom Errors
  2. The One Response Shape Behind Every API Route
  3. `ok: true` or `ok: false` — Never Anything Else
- **Thumbnail concept:** A fork in the road — one path labeled `{ ok: true, data }`,
  the other `{ ok: false, error }` — both leading back to the same client code.
- **Teaching principle:** Syntax → Context → Use Case.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Every API route in this app returns exactly one of two shapes — never a third,
> never a partial mix of both. That guarantee has a name: a discriminated union.
> This is the episode that ties this whole playlist together, so let's see the
> real type."

---

## Scene 1 — The envelope type (0:20–1:45)

**Visual:** Open `src/types/api.ts`, `ApiEnvelope<T>` (lines 1–11).

**Code shown:**
```ts
export type ApiEnvelope<T> =
  | { ok: true; data: T; warning?: string }
  | {
      ok: false;
      error?: {
        code?: string;
        message?: string;
        details?: unknown;
        retryable?: boolean;
      };
    };
```

**Narration:**
> "This is a union of two object shapes, and `ok` is the discriminant — the field
> whose literal value tells TypeScript which branch it's looking at. Check
> `payload.ok === true`, and inside that block, TypeScript knows `payload.data`
> exists as `T`. Check `payload.ok === false` instead, and `data` isn't even
> offered — only `error` is. Notice the generic `<T>` from Episode 5, back again:
> the envelope shape is reused for every entity in the app, `T` filled in per
> route."

---

## Scene 2 — Producing both sides: `ok()` and `fail()` (1:45–2:45)

**Visual:** Open `src/lib/api-response.ts`, `ok<T>()` and `fail()`
(~lines 106–121).

**Code shown:**
```ts
export function ok<T>(data: T, status = 200, warning?: string): Response {
  return Response.json({ ok: true, data, ...(warning ? { warning } : {}) }, { status });
}

export function fail(error: HttpError): Response {
  return Response.json(
    { ok: false, error: { code: error.code, message: error.message, details: error.details,
        retryable: error.code === "RATE_LIMITED" || error.code === "SERVICE_UNAVAILABLE" } },
    { status: error.status }
  );
}
```

**Narration:**
> "Two functions, one per branch of the union. Every route handler in this app
> calls exactly one of these to build its response — never hand-assembles the
> `{ ok, data }` shape itself. That's what makes the discriminant trustworthy on
> the client: it's produced in exactly one place, not fifty."

---

## Scene 3 — The custom error class that feeds `fail()` (2:45–3:45)

**Visual:** Open `HttpError` and `ApiErrorCode` at the top of `api-response.ts`
(lines 1–21) — connect back to Episode 1's literal unions and Episode 3's
`fromUnknownError`.

**Code shown:**
```ts
type ApiErrorCode =
  | "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND"
  | "CONFLICT" | "PRECONDITION_FAILED" | "RATE_LIMITED"
  | "INTERNAL_ERROR" | "SERVICE_UNAVAILABLE";

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
```

**Narration:**
> "`HttpError` is a real `Error` subclass, so `throw` and `instanceof` both work on
> it exactly like Episode 3 showed. Its `code` is a literal union from Episode 1 —
> a closed set of error codes, not an open `string` — so every catch site can
> `switch` on it exhaustively if it wants to. `fromUnknownError`, from Episode 3,
> is the function that guarantees every possible thrown value — a Prisma error, a
> connectivity failure, a plain `Error`, anything — ends up as one of these before
> `fail()` ever sees it."

---

## Scene 4 — Consuming the union on the client (3:45–4:45)

**Visual:** Open `src/hooks/use-crud-actions.ts`, the narrowing on
`payload.ok` (~lines 65–70), and `toErrorMessage` in `src/types/api.ts`
(~lines 22–24).

**Code shown:**
```ts
const payload = (await response.json()) as ApiEnvelope<T>;
if (!response.ok || !payload.ok) {
  throw new Error(toErrorMessage(payload, options.errorMessage));
}
options.onSuccess(payload.data);
```
```ts
export function toErrorMessage<T>(payload: ApiEnvelope<T>, fallback: string) {
  return payload.ok ? fallback : payload.error?.message ?? fallback;
}
```

**Narration:**
> "`payload.ok` is checked once, and TypeScript narrows the rest of the block
> accordingly. `options.onSuccess(payload.data)` only compiles because, past that
> `if`, TypeScript has already ruled out the `ok: false` branch — `data` is
> guaranteed to exist. `toErrorMessage` does the same narrowing in reverse, reading
> `payload.error?.message` only in the branch where it's actually legal to."

---

## Scene 5 — Why this matters, all the way back to Episode 1 (4:45–5:30)

**Visual:** Talking head.

**Narration:**
> "Look at what this one pattern leans on: a literal union for error codes, a
> generic envelope type, `unknown` narrowed into a custom error class, and
> `async`/`await` carrying it all through a request. None of these features exist
> in isolation — this is what 'a real application' actually looks like when you
> add them up. That's this playlist's whole point: not syntax for its own sake, but
> the shape a real system takes when it uses TypeScript properly."

---

## Outro / CTA (5:30–6:00)

**Visual:** End card — no next-episode pointer within Playlist C (it's the last
scripted episode); point instead to Playlist D or back to Playlist A1/B.

**Narration:**
> "That's TypeScript in this app, end to end — from a single literal type to the
> full response envelope every route returns. Subscribe to keep following the
> build, and I'll see you in the next playlist."

---

## Production Notes

- **Screen recordings needed:** `src/types/api.ts` (full file, ~24 lines),
  `src/lib/api-response.ts` (`ok`, `fail`, ~lines 106–121; `ApiErrorCode` and
  `HttpError`, ~lines 1–21), `src/hooks/use-crud-actions.ts` (~lines 65–70).
- **Source material:** the files above, read directly from the running codebase.
- **B-roll:** none required.
- **Series note:** this is the closing episode of Playlist C's initial 8-episode
  run. If the playlist grows later (per the blueprint's full topic list), it slots
  in as C9+ without renumbering these eight.
