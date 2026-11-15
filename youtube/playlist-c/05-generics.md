# Playlist C · Episode 5 — "Generics"

## Video Metadata

- **Playlist:** C — TypeScript Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Shape of Data (1 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Demystify generics by showing the exact hook that lets one
  browse-and-paginate implementation serve every list page in the app — blocks,
  units, individuals, complaints — without being copy-pasted per entity.
- **Title options:**
  1. Generics
  2. One Hook, Every List Page in the App
  3. Why `<T>` Isn't Scary
- **Thumbnail concept:** One hook icon with arrows fanning out to five different
  entity icons (block, unit, person, complaint, booking), each labeled with a
  different `T`.
- **Teaching principle:** Syntax → Context → Use Case.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "This app has a dozen list pages. There are blocks, units, individuals, complaints, bookings, and more.
>
> And there is exactly one pagination hook behind all of them.
>
> It is not twelve copies with the names swapped. It is one hook.
>
> Generics make that possible."

---

## Scene 1 — The problem without generics (0:20–1:15)

**Visual:** Code editor — a hypothetical `function useBlockBrowseState(): {items:
Block[], ...}` next to `function useUnitBrowseState(): {items: Unit[], ...}` —
nearly identical bodies, different types hard-coded.

**Narration:**
> "Without generics, the honest alternative is one hook per entity.
>
> It is the same logic, pasted once per type. The hook needs to know what kind of items it holds.
>
> That is a maintenance trap. You fix a bug in one copy, and eleven other copies still have it."

---

## Scene 2 — The real hook: `BrowseConfig<T, S>` (1:15–3:00)

**Visual:** Open `src/hooks/use-browse-state.ts`, ~lines 23–75.

**Code shown:**
```ts
export type BrowseConfig<T, S extends string> = {
  endpoint: string;
  errorMessage: string;
  sortOptions: SortOptionDef<S>[];
  defaultSortBy: S;
  // ...
};

export type BrowseState<T, S extends string> = {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  // ...
  sortBy: S;
  setSortBy: (value: S) => void;
  // ...
};
```

**Narration:**
> "`T` and `S` are type parameters. They are placeholders, filled in at the call site, not here.
>
> `T` means 'whatever kind of item this list holds'. It can be a `Block`, a `Unit`, or a `ComplaintItem`.
>
> `S` is constrained with `extends string`. It is not just any type. It must be a string, specifically the union of valid sort-field names for that entity.
>
> We write the pagination, filtering, and sorting logic exactly once, against `T` and `S`.
>
> Then every entity that calls this hook gets fully typed `items: T[]` back. There is no casting and no `any`."

---

## Scene 3 — Calling it: `T` and `S` get filled in (3:00–4:00)

**Visual:** Any real call site, e.g. the complaints or blocks browse page calling
`useBrowseState<ComplaintItem, "createdAt" | "title">({...})`.

**Narration:**
> "At the call site, `T` becomes `ComplaintItem`. `S` becomes the literal union of that page's sort fields.
>
> TypeScript now knows that `items` is `ComplaintItem[]`. It knows that `sortBy` can only be one of those exact field names. And `setSortBy` rejects anything else.
>
> All of this comes from one generic hook definition."

---

## Scene 4 — Generics on functions, not just types (4:00–5:15)

**Visual:** Open `src/hooks/use-crud-actions.ts`, the `create` callback
(~lines 55–56), and `src/lib/api-response.ts`, `ok<T>()` (~line 106).

**Code shown:**
```ts
const create = useCallback(
  async <T,>(options: CreateOptions<T>) => {
    // ...
    const payload = (await response.json()) as ApiEnvelope<T>;
    // ...
    options.onSuccess(payload.data);
  },
  [setSubmitError, setSubmitSuccess],
);
```
```ts
export function ok<T>(data: T, status = 200, warning?: string): Response {
  return Response.json({ ok: true, data, ...(warning ? { warning } : {}) }, { status });
}
```

**Narration:**
> "Generics are not only for object shapes. Functions get them too.
>
> `create<T>` is called once per entity. `T` is set to whatever that create call returns, such as a `Block` or a `Complaint`.
>
> `options.onSuccess(payload.data)` is fully typed as `T`, not `any`. The generic passes all the way from the call site, through the fetch response.
>
> The server has the same story. `ok<T>()` wraps any typed payload in the same envelope shape, for every route in the app."

---

## Outro / CTA (5:15–5:45)

**Visual:** End card pointing to Episode 6.

**Narration:**
> "Next: `Record`, `keyof typeof`, and the other utility types this app uses.
>
> They derive new types from types that already exist. So we do not write them twice."

---

## Production Notes

- **Screen recordings needed:** `src/hooks/use-browse-state.ts` (~lines 23–75, plus
  a real call site from any browse page, e.g. `app/(dashboard)/complaints/page.tsx`),
  `src/hooks/use-crud-actions.ts` (~lines 55–73), `src/lib/api-response.ts`
  (`ok<T>`, ~line 106). Scene 1's "hypothetical duplicated hooks" is a constructed,
  clearly-labeled illustration, not repo code.
- **Source material:** the files above, read directly from the running codebase.
- **B-roll:** none required.
