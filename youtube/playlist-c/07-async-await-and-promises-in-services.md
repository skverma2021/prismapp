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
> "Every mutation in this app is a chain of `async` functions calling `async` functions. Two examples are creating a complaint and posting a payment.
>
> Today we follow one mutation all the way through. It starts at the route handler. It goes into the service layer, then into the database, and back out.
>
> We will see exactly what type flows at each step."

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
> "`async function POST` always returns a `Promise`. Next.js awaits it for you.
>
> Inside, there are three `await`s in a row. First, authorize the request. Second, parse the body. Third, hand off to `createComplaint`.
>
> There are no `.then()` chains and no callback nesting. Each `await` pauses this function until the previous promise settles.
>
> So the code reads from top to bottom like synchronous code, even though it is not."

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
> "Every `db.*.findUnique` call returns a `Promise` of a typed row, or `null`. Prisma generates that type from the schema.
>
> `await` unwraps the promise. The `if (!unit)` right after does real work. It narrows `unit` from 'possibly null' to 'definitely present' for every line below it.
>
> There are four sequential checks. Each one is a real `await`. Each one narrows before the next step may assume anything.
>
> The return type of the function is inferred as a `Promise` of whatever the final `db.complaint.create(...)` resolves to. Nobody wrote that type by hand. TypeScript derived it from the Prisma call."

---

## Scene 3 — What happens when a promise rejects (3:15–4:15)

**Visual:** Back to the route handler's `catch (error)` block; connect it to
Episode 3's `fromUnknownError`.

**Narration:**
> "Suppose any `await` in `createComplaint` throws. It could be a validation `HttpError`, or a genuine database failure.
>
> Then the promise it belongs to rejects. The rejection travels straight up through every `await` in between, uncaught. It stops at the `try`/`catch` in the route handler.
>
> That is the other half of async/await. Exceptions behave like a synchronous `throw` again. You do not need a `.catch()` at every link in the chain."

---

## Scene 4 — The type that ties it together: `Promise<T>` (4:15–5:00)

**Visual:** Hover the return type of `createComplaint` in the editor — show the
inferred `Promise<{...}>` in the tooltip.

**Narration:**
> "Hover over any `async` function in this codebase. The editor shows `Promise<SomeType>`, never just `SomeType`.
>
> That is not decoration. It is the honest signature.
>
> Calling this function does not give you the data. It gives you a promise of the data, for later.
>
> `await` is the only thing that turns one into the other. And TypeScript will not let you forget which one you are holding."

---

## Outro / CTA (5:00–5:30)

**Visual:** End card pointing to Episode 8.

**Narration:**
> "Last episode in this playlist: the exact shape of every API response in this app, for success and for failure.
>
> We will also see the custom error type that makes sure nothing escapes untyped."

---

## Production Notes

- **Screen recordings needed:** `app/api/complaints/route.ts` (`POST`, ~lines
  17–26), `src/modules/complaints/complaints.service.ts` (`createComplaint`,
  ~lines 147–175). Scene 4's hover-tooltip moment needs to be captured live in the
  editor (not typed out) to show the inferred `Promise<T>` authentically.
- **Source material:** the files above, read directly from the running codebase.
- **B-roll:** none required.
