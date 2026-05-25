# D-01 — The List Pattern

---

## Slide 1 of 3 — What a List Endpoint Must Return

**Headline:** A list endpoint returns more than items — it returns everything the client needs to paginate.

**Talking points:**
- The simplest possible list endpoint: `return db.block.findMany()`. This is wrong for production for two reasons: it returns every row (no page limit), and it gives the client no information about how many more rows exist.
- A production list response is a **paginated envelope**. Open `src/types/api.ts` and show `PaginatedResponse<T>`:

```typescript
type PaginatedResponse<T> = {
  items: T[];          // the current page of records
  page: number;        // which page this is
  pageSize: number;    // how many per page
  totalItems: number;  // total records matching the filter
  totalPages: number;  // total pages at this page size
  hasNext?: boolean;
  hasPrev?: boolean;
}
```

- The client needs `totalItems` (or `totalPages`) to render pagination controls. Without it, the UI cannot know whether there is a next page.
- `page` and `pageSize` are echoed back so the client can reconstruct the URL for a refresh — it doesn't have to track them separately.
- The `items` array is always bounded by `pageSize`. The default is 20; the maximum is 100. This prevents a client from accidentally requesting unbounded data by omitting pagination parameters.

**Visual:** The `PaginatedResponse<T>` type annotated as a diagram — items array on the left, metadata fields on the right. Show a concrete example: 52 total blocks, page 2, pageSize 20 → items has 20 entries, hasNext: true, hasPrev: true.

**Takeaway:** Never return a raw array from a list endpoint in production. Always return a paginated envelope with metadata.

---

## Slide 2 of 3 — The `$transaction([findMany, count])` Pattern

**Headline:** Two separate queries let a write slip through in between. One transaction doesn't.

**Talking points:**
- Open `src/modules/blocks/blocks.service.ts` → `listBlocks()`. Find the `db.$transaction` call:

```typescript
const [items, totalItems] = await db.$transaction([
  db.block.findMany({ where, orderBy, skip, take }),
  db.block.count({ where }),
]);
```

- Why not two separate awaits?

```typescript
// WRONG — race window between the two queries
const items = await db.block.findMany({ where, skip, take });
// ← another request creates a block here
const totalItems = await db.block.count({ where });
// totalItems is now 1 higher than the page items reflect
```

- Between the two separate queries, another request could create or delete a block. The `count` would then disagree with `items`. The pagination UI would show "53 total" but deliver only 52 across all pages — or the page 2 link would return an empty page for a user who was on the last page.
- `db.$transaction([...])` wraps both operations in a single database snapshot. Both queries see the same consistent state of the table.
- Walk through the full `listBlocks` function:
  1. Parse `page`, `pageSize` from `URLSearchParams` — validate against max
  2. Parse `q` (search query), `sortBy`, `sortDir` — whitelist valid `sortBy` values
  3. Build `where` clause from query
  4. `db.$transaction([findMany, count])` in a single snapshot
  5. Derive `totalPages = Math.ceil(totalItems / pageSize)`
  6. Return the paginated envelope

**Visual:** Side-by-side timeline: "Two separate queries" (timeline with a gap and a race-condition arrow) vs "One `$transaction`" (single atomic block). Annotate the race window with "block created here".

**Takeaway:** Always pair `findMany` and `count` inside `db.$transaction([...])`. The cost is negligible; the correctness guarantee is essential.

---

## Slide 3 of 3 — Parsing Parameters Safely

**Headline:** URLSearchParams are user input. Treat them as such.

**Talking points:**
- Every value from `request.nextUrl.searchParams` is an untrusted string. If the user passes `pageSize=999999`, the server should not forward that to the database.
- Open `blocks.service.ts` and trace the parameter parsing:

```typescript
const page     = parseQueryInt(searchParams.get("page"),     DEFAULT_PAGE);
const pageSize = parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

if (pageSize > MAX_PAGE_SIZE) {
  throw new HttpError(400, "VALIDATION_ERROR", `pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
}

const sortBy = searchParams.get("sortBy") ?? "description";
if (!["description", "createdAt"].includes(sortBy)) {
  throw new HttpError(400, "VALIDATION_ERROR", "Invalid sortBy field.");
}
```

- `parseQueryInt` handles nulls and non-numeric strings by returning the default. The `> MAX_PAGE_SIZE` guard then enforces the ceiling.
- The `sortBy` whitelist is important: without it, a caller could pass `sortBy=passwordHash` and — if the table had such a field — accidentally sort by sensitive data. The whitelist accepts only the fields the list is designed to expose.
- The `q` parameter (search query) is passed to Prisma as `{ contains: q, mode: "insensitive" }`. Prisma parameterizes this — it never becomes a raw SQL string. SQL injection via `q` is not possible.

**Visual:** Flow diagram: URLSearchParams string → `parseQueryInt` (null-safe coerce) → bounds check → whitelist check → Prisma `where`/`orderBy`. Label each step with what it catches.

**Takeaway:** URLSearchParams must be parsed, bounded, and whitelisted before use. `parseQueryInt` handles type coercion; explicit checks handle range and enum violations.

**Transition to D-02:** "We know how to list records. Now let's look at how to create one — from the browser form submission all the way to the database row."
