# Playlist C · Episode 3 — "unknown, Narrowing, and Type Guards"

## Video Metadata

- **Playlist:** C — TypeScript Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Handling the Unknown (1 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Show `unknown` and narrowing as the honest way to type data you
  don't yet trust — using PrismApp's real error-normalization pipeline.
- **Title options:**
  1. unknown, Narrowing, and Type Guards
  2. The Type That Forces You to Check Before You Use It
  3. How PrismApp Turns Any Thrown Error Into a Typed One
- **Thumbnail concept:** A `catch (error: unknown)` block with a padlock icon,
  opening into a typed `HttpError` with the padlock removed.
- **Teaching principle:** Syntax → Context → Use Case.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "A `catch` block can throw literally anything — a real `Error`, a string, a
> Prisma error object, `undefined`. TypeScript's honest answer to 'I don't know what
> this is yet' is the `unknown` type. Today: how PrismApp uses `unknown` and
> narrowing to turn total uncertainty into a fully typed error, in one function."

---

## Scene 1 — Why not just use `any`? (0:20–1:10)

**Visual:** Code editor. Show `catch (error: any) { error.message }` — no error,
even though `error` could be a string with no `.message`.

**Narration:**
> "If you type a caught error as `any`, TypeScript stops checking it entirely.
> `error.message` compiles even if `error` is a string — and then crashes at
> runtime. `unknown` is `any`'s safer sibling: it accepts anything, but it forces
> you to prove what something is — narrow it — before you're allowed to use it."

---

## Scene 2 — The real function: `fromUnknownError` (1:10–3:00)

**Visual:** Open `src/lib/api-response.ts`, the `fromUnknownError` function
(~lines 137–186).

**Code shown:**
```ts
export function fromUnknownError(error: unknown, requestId?: string): HttpError {
  if (error instanceof HttpError) {
    logServerError(error, requestId);
    return error;
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const prismaLikeError = error as { code?: string; meta?: unknown };

    if (prismaLikeError.code === "P2002") {
      return new HttpError(409, "CONFLICT", "Unique constraint violated.", prismaLikeError.meta);
    }
    // ...more Prisma error codes
  }

  if (isRetryableDatabaseFailure(error)) { /* ... */ }
  if (isConnectivityFailure(error)) { /* ... */ }

  return new HttpError(500, "INTERNAL_ERROR", "Unexpected server error.");
}
```

**Narration:**
> "Every route handler in this app funnels caught errors through this one
> function, and it never trusts the input. Every branch narrows `unknown` a
> different way. `error instanceof HttpError` — a class check, the cleanest form of
> narrowing. `typeof error === "object" && error !== null && "code" in error` —
> three checks chained together, because `unknown` could be `null`, and `in` needs
> an object. Only after all three pass does the code cast it to a shape with an
> optional `code` and `meta`. Every single path ends in one typed, known thing: an
> `HttpError`. Nothing downstream ever has to guess again."

---

## Scene 3 — Narrowing helper functions (3:00–4:15)

**Visual:** Open `isConnectivityFailure` and `isRetryableDatabaseFailure` in the
same file (~lines 65–98).

**Code shown:**
```ts
function isConnectivityFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toUpperCase();

  return (
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNRESET") ||
    // ...
  );
}
```

**Narration:**
> "Both helpers take `unknown` and return a plain `boolean` — they're narrowing
> functions, just not ones that change the caller's type directly. `error instanceof
> Error` is the guard here: if it fails, bail out immediately with `false`, before
> ever touching `.message`. That single `instanceof` check is what makes
> `error.message` safe to read on the next line — TypeScript won't let you skip it."

---

## Scene 4 — A named type guard, for when you want one (4:15–5:15)

**Visual:** Talking head with a code snippet on screen (not from the repo — a
constructed example, clearly labeled as such).

**Code shown:**
```ts
function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
```

**Narration:**
> "This codebase gets by with inline `instanceof` and `typeof` checks — it doesn't
> need anything more. But TypeScript also has a dedicated syntax for this: a
> function that returns `error is HttpError` instead of `boolean`. Call this, and
> anywhere you check `if (isHttpError(error))`, TypeScript narrows `error` to
> `HttpError` inside that block — same effect as `instanceof`, just wrapped in a
> name you can reuse. Worth knowing it exists, even in a codebase that hasn't
> needed it yet."

---

## Outro / CTA (5:15–5:45)

**Visual:** End card pointing to Episode 4.

**Narration:**
> "Next: this app validates plenty of runtime data by hand, with plain functions —
> no schema library. We'll look at why, and how it keeps the runtime checks and the
> compile-time types from drifting apart."

---

## Production Notes

- **Screen recordings needed:** `src/lib/api-response.ts` — `fromUnknownError`
  (~lines 137–186), `isConnectivityFailure` (~lines 65–79),
  `isRetryableDatabaseFailure` (~lines 83–98). Scene 1's `any` example and Scene 4's
  named type-guard example are constructed illustrations, not repo code — label
  them clearly on screen as such.
- **Source material:** `src/lib/api-response.ts`, read directly from the running
  codebase.
- **B-roll:** none required.
