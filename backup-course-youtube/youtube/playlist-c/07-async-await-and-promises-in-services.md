# Playlist C · Episode 7 — "Async/Await and Promise Typing in Services"

## Video Metadata

- **Playlist:** C — TypeScript Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Control Flow and Errors (1 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Follow one real request end to end — route handler to service
  function to database and back — to show how `async`/`await` and `Promise` types
  compose across layers without ever needing a manual `.then()`.
- **Title options:**
  1. Async/Await and Promise Typing in Services
  2. Following One Request, Await by Await
  3. What `async function` Actually Returns
- **Thumbnail concept:** A single arrow running left to right through three boxes —
  "Route Handler → Service → Database" — each labeled `await`.
- **Teaching principle:** Syntax → Context → Use Case.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Every mutation in this app — creating a complaint, posting a payment — is a
> chain of `async` functions calling `async` functions. Today, we follow one all
> the way through: from the route handler, into the service layer, into the
> database, and back out — and see exactly what type is flowing at each hop."

---

## Scene 1 — The entry point: a route handler (0:20–1:30)

**Visual:** Open `app/api/complaints/route.ts`, the `POST` handler (~lines 17–26).

**Code shown:**
```ts
export async function POST(request: NextRequest) {
  try {
    const actor = await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateComplaintInput(payload);
    const data = await createComplaint(input, actor);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
```

**Narration:**
> "`async function POST` always returns a `Promise` — Next.js awaits it for you.
> Inside, three `await`s in a row: authorize the request, parse the body, then hand
> off to `createComplaint`. No `.then()` chains, no callback nesting — each `await`
> pauses this function until the previous promise settles, and the code reads top
> to bottom like synchronous code, even though none of it is."

---

## Scene 2 — The service function: sequential awaits, narrowed every step (1:30–3:15)

**Visual:** Open `src/modules/complaints/complaints.service.ts`, `createComplaint`
(~lines 147–175).

**Code shown:**
```ts
export async function createComplaint(input: CreateComplaintInput, actor: AuthContext) {
  const unit = await db.unit.findUnique({ where: { id: input.unitId }, select: { id: true } });
  if (!unit) throw new HttpError(400, "VALIDATION_ERROR", "Unit not found.");

  const reporter = await db.individual.findUnique({
    where: { id: input.reportedById },
    select: { id: true, isSystemIdentity: true },
  });
  if (!reporter) throw new HttpError(400, "VALIDATION_ERROR", "Reporter individual not found.");
  if (reporter.isSystemIdentity) {
    throw new HttpError(400, "VALIDATION_ERROR", "System identities cannot be complaint reporters.");
  }
  // ...category and priority checked the same way

  const complaint = await db.complaint.create({ data: { /* ... */ } });
  // ...
}
```

**Narration:**
> "Every `db.*.findUnique` call returns a `Promise` of a typed row, or `null` —
> Prisma generates that type from the schema. `await` unwraps the promise; the
> `if (!unit)` right after is doing real work — it narrows `unit` from 'possibly
> null' to 'definitely present' for every line below it. Four sequential checks,
> each one a real `await`, each one narrowing before the next step is allowed to
> assume anything. The function's return type is inferred as a `Promise` of
> whatever the final `db.complaint.create(...)` resolves to — nobody wrote that
> type by hand; TypeScript derived it from the Prisma call."

---

## Scene 3 — What happens when a promise rejects (3:15–4:15)

**Visual:** Back to the route handler's `catch (error)` block; connect it to
Episode 3's `fromUnknownError`.

**Narration:**
> "If any `await` in `createComplaint` throws — a validation `HttpError`, or a
> genuine database failure — the promise it's part of rejects, and that rejection
> propagates straight up through every `await` in between, uncaught, until it
> reaches the route handler's `try`/`catch`. That's the other half of async/await:
> exceptions behave like synchronous `throw` again, instead of needing a `.catch()`
> at every single link in the chain."

---

## Scene 4 — The type that ties it together: `Promise<T>` (4:15–5:00)

**Visual:** Hover the return type of `createComplaint` in the editor — show the
inferred `Promise<{...}>` in the tooltip.

**Narration:**
> "Hover any `async` function in this codebase, and the editor shows you
> `Promise<SomeType>` — never just `SomeType`. That's not decoration. It's the
> honest signature: calling this function doesn't hand you the data, it hands you a
> promise of the data, later. `await` is the only thing that turns one into the
> other, and TypeScript won't let you forget which one you're holding."

---

## Outro / CTA (5:00–5:30)

**Visual:** End card pointing to Episode 8.

**Narration:**
> "Last episode in this playlist: the exact shape every API response takes in this
> app — success or failure — and the custom error type that makes sure nothing
> escapes untyped."

---

## Production Notes

- **Screen recordings needed:** `app/api/complaints/route.ts` (`POST`, ~lines
  17–26), `src/modules/complaints/complaints.service.ts` (`createComplaint`,
  ~lines 147–175). Scene 4's hover-tooltip moment needs to be captured live in the
  editor (not typed out) to show the inferred `Promise<T>` authentically.
- **Source material:** the files above, read directly from the running codebase.
- **B-roll:** none required.
