# Playlist C · Episode 4 — "Runtime Validation vs. Compile-Time Types"

## Video Metadata

- **Playlist:** C — TypeScript Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Handling the Unknown (2 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Make the boundary between "TypeScript checked this" and
  "nothing checked this yet" concrete, using PrismApp's hand-rolled request
  validators — and be honest that this app doesn't use a schema library, by choice
  or by not-yet, and what that trade-off actually costs.
- **Title options:**
  1. Runtime Validation vs. Compile-Time Types
  2. TypeScript Doesn't Run in Production. Here's What Does.
  3. The Line Where Your Types Stop Protecting You
- **Thumbnail concept:** A line down the middle labeled "Compile Time | Runtime" —
  left side shows a type annotation, right side shows a thrown `HttpError`.
- **Teaching principle:** Syntax → Context → Use Case.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Here's a fact that trips people up: TypeScript's types disappear the moment your
> code compiles. A request body from the network has no types at all by the time
> your function sees it — it's just JSON. So who checks it's actually correct?
> Today: the functions in this app that do that job by hand."

---

## Scene 1 — The gap types can't cover (0:20–1:15)

**Visual:** Code editor — a route handler reading `const body = await
request.json()`. Hover over `body` — it's typed `any`.

**Narration:**
> "`request.json()` returns `any`. TypeScript has no idea what's actually inside —
> it could be `{}`, it could be `null`, it could be a string someone sent by
> mistake. A type annotation you write yourself here is a promise, not a guarantee.
> Something still has to check the real value, at runtime, every single request."

---

## Scene 2 — The validators that do the checking (1:15–3:00)

**Visual:** Open `src/lib/api-response.ts`, `requireString` and `parsePositiveInt`
(~lines 196–220).

**Code shown:**
```ts
export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
  }

  return value.trim();
}

export function parsePositiveInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a positive integer.`);
  }

  return value;
}
```

**Narration:**
> "This is PrismApp's actual approach — no schema library, just small functions
> that take `unknown` in and either return a real, narrower type, or throw. Notice
> the return types: `requireString` returns `string`, not `string | undefined`. If
> it returns at all, you know — for a fact, not a hope — that you have a non-empty
> string. The runtime check and the compile-time type are doing two different jobs
> that meet at exactly one line: the `return`."

---

## Scene 3 — One source of truth for allowed values (3:00–4:00)

**Visual:** Back to `src/modules/complaints/complaints.schemas.ts`, the
`COMPLAINT_STATUSES` array and `ComplaintStatus` type from Episode 1.

**Code shown:**
```ts
export const COMPLAINT_STATUSES = [
  "Open", "Assigned", "InProgress", "Resolved", "Closed", "Reopened",
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
```

**Narration:**
> "This is the other half of runtime-vs-compile-time. `COMPLAINT_STATUSES` is a
> real array that exists when the app runs — you can loop over it, check
> `.includes()` against it, use it to validate an incoming status string. `as const`
> is what lets TypeScript also read that same array as a type. One declaration,
> two jobs: a runtime list to validate against, and a compile-time type to check
> against. If this app added a schema library like Zod later, this is exactly the
> pattern it would be automating — this hand-written version is worth understanding
> first, because it's the same idea with nothing hidden."

---

## Scene 4 — Where it's enforced (4:00–4:45)

**Visual:** Quick look at a route handler or service function that calls
`requireString(body.title, "title")` before ever touching `body.title` directly.

**Narration:**
> "Every mutation in this app goes through validators like these before the data
> touches the database. It's not glamorous, but it's the actual boundary where
> 'the internet sent us something' becomes 'we know what this is.' Skip it, and
> every type annotation past that point is just a hopeful guess."

---

## Outro / CTA (4:45–5:15)

**Visual:** End card pointing to Episode 5.

**Narration:**
> "Next: the hooks that power almost every list and form in this app are generic —
> written once, reused for blocks, units, individuals, complaints, everything. Here's
> how that actually works."

---

## Production Notes

- **Screen recordings needed:** `src/lib/api-response.ts` — `requireString`,
  `parseOptionalString`, `parsePositiveInt`, `parseQueryInt` (~lines 196–228);
  `src/modules/complaints/complaints.schemas.ts` (lines 7–16, reused from Ep. 1).
- **Fact check before recording:** confirm the project still has no schema-library
  dependency (`zod` etc. absent from `package.json`) before stating this as fact on
  camera — re-verify if a validation library gets added later.
- **Source material:** the files above, read directly from the running codebase.
- **B-roll:** none required.
