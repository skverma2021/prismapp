# Walkthrough — `useCrudActions` (Generic Mutations)

`useCrudActions` answers the third question of the master-data mini-framework: **"How do I perform generic CRUD operations?"** Not how a screen fetches and filters its list (that's `useBrowseState`), not what a specific entity's create form looks like (that's `page.tsx`) — just the mechanical act of sending a `POST`/`PATCH`/`DELETE`, handling the HTTP/error envelope consistently, and tracking mutation loading state.

Read this after [use-browse-state.md](use-browse-state.md). The two hooks are always used together on a browse page, and this walkthrough explains exactly how they connect.

---

## Why Generic Mutations, Not Per-Entity Hooks

Blocks, Units, Individuals, Ownerships — every entity's create/update/delete calls follow the same shape: send a request, parse the `{ ok, data }` / `{ ok: false, error }` envelope, surface an error message on failure, run a success callback on success. The only things that differ per entity are the endpoint URL and the request body.

`useCrudActions` captures exactly that common shape as three generic methods — `create<T>`, `update<T>`, `remove` — and leaves everything entity-specific (what the body contains, what happens after success) to the caller.

```ts
const crud = useCrudActions({
  setSubmitError: browse.setSubmitError,
  setSubmitSuccess: browse.setSubmitSuccess,
});
```

Notice the hook takes no entity type, no endpoint, and no schema at construction time — those are supplied per call, not per hook instance. The hook's only required inputs are the two notice-state setters, which is the single coupling point to `useBrowseState` (see [use-browse-state.md](use-browse-state.md)): this hook never holds its own "last error/success message" state — it reports through the browse hook's notice banner, so a page never has two independent notice systems to reconcile.

---

## The Three Methods

### `create<T>`

```ts
const create = useCallback(async <T,>(options: CreateOptions<T>) => {
  setCreateLoading(true);
  setSubmitError("");
  setSubmitSuccess("");
  try {
    const response = await fetch(options.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(options.body),
    });
    const payload = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok || !payload.ok) {
      throw new Error(toErrorMessage(payload, options.errorMessage));
    }
    options.onSuccess(payload.data);
  } catch (error) {
    setSubmitError(error instanceof Error ? error.message : options.errorMessage);
  } finally {
    setCreateLoading(false);
  }
}, [setSubmitError, setSubmitSuccess]);
```

Usage from a page ([units/page.tsx](../../app/(dashboard)/units/page.tsx)):

```ts
function handleCreate() {
  void crud.create<UnitItem>({
    endpoint: "/api/units",
    body: { description: createState.description.trim(), blockId: createState.blockId, sqFt: Number(createState.sqFt), inceptionDt: createState.inceptionDt },
    errorMessage: "Unable to create unit.",
    onSuccess: (data) => {
      setCreateState({ description: "", blockId: "", sqFt: "", inceptionDt: "" });
      browse.setSubmitSuccess(`Unit created: ${data.description}`);
      invalidateUnitLookups();
      browse.setPage(1);
    },
  });
}
```

`create` is the only one of the three methods with its own exposed loading flag, `createLoading` — because a page always has exactly one create form, so one boolean is enough to disable it while the request is in flight.

### `update<T>`

Same shape as `create`, but `PATCH` instead of `POST`, and — this is worth noticing — **no loading flag at all**. There's no `updateLoading` in the hook's returned object.

```ts
function handleUpdate(id: string) {
  void crud.update<UnitItem>({
    endpoint: `/api/units/${id}`,
    body: { description: editingState.description.trim(), blockId: editingState.blockId, sqFt: Number(editingState.sqFt) },
    errorMessage: "Unable to update unit.",
    onSuccess: (data) => {
      setEditingId(null);
      setEditingState({ description: "", blockId: "", sqFt: "", inceptionDt: "" });
      browse.setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)));
      browse.setSubmitSuccess(`Unit updated: ${data.description}`);
      invalidateUnitLookups();
    },
  });
}
```

Because the hook has no per-row update-loading state, the page itself owns `editingId` (which row is in edit mode) as local state, and `onSuccess` is responsible for clearing it. The row being edited is effectively its own "is this mutating" signal — while `editingId === item.id`, the row shows inputs instead of text, which doubles as the in-progress indicator. This is a real asymmetry between `create` and `update`, not an oversight to copy blindly if you're adding a new module — if a future entity needs an explicit "saving…" spinner on update, that state has to live in the page, not the hook.

### `remove`

```ts
const remove = useCallback(async (options: DeleteOptions & { id?: string | number }) => {
  if (options.id !== undefined) setDeleteLoadingId(options.id);
  setSubmitError("");
  setSubmitSuccess("");
  try {
    const response = await fetch(options.endpoint, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as ApiEnvelope<null>;
      throw new Error(toErrorMessage(payload, options.errorMessage));
    }
    options.onSuccess();
  } catch (error) {
    setSubmitError(error instanceof Error ? error.message : options.errorMessage);
  } finally {
    setDeleteLoadingId(null);
  }
}, [setSubmitError, setSubmitSuccess]);
```

`deleteLoadingId` holds the `id` of the row currently being deleted — not a boolean. This is what lets a `DataTable` disable (or show a spinner on) just the one "Delete" button for the row in flight, while every other row's button stays active. A plain boolean would disable every delete button on the page for every row at once, which is the wrong UX for a table.

Also notice `remove` doesn't call `.json()` on a successful response — a `204 No Content` delete has no body to parse. It only parses the envelope on the failure path, where the API does return a JSON error body.

---

## The Envelope Contract

All three methods rely on the same two shared pieces:

- **`ApiEnvelope<T>`** (`src/types/api.ts`) — the discriminated union `{ ok: true, data: T } | { ok: false, error: {...} }` returned by every route handler via `ok()`/`fail()`.
- **`toErrorMessage(payload, fallback)`** — extracts `payload.error.message` when present, otherwise falls back to the caller-supplied `errorMessage`. This guarantees a page never shows `"undefined"` or a raw exception string to the user — worst case, it shows the generic fallback you wrote for that specific action (e.g. `"Unable to delete unit."`).

Because every method funnels failures through `setSubmitError`, and `setSubmitError`/`setSubmitSuccess` are the same setters `useBrowseState` exposes as `browse.submitError`/`browse.submitSuccess`, `<NoticeStack>` is the single place on every page that renders mutation errors, mutation successes, *and* load errors — three different hooks' worth of state, one rendering surface.

---

## Things Worth Noticing

**No optimistic-by-default updates.** None of the three methods touch `browse.items` themselves — every `onSuccess` callback explicitly decides how to reconcile local list state (`setItems` with a mapped/filtered array, or `browse.setPage(1)` to force a refetch). The hook deliberately stays ignorant of what a "list of T" even looks like; that keeps it entity-agnostic.

**Errors never throw past the hook.** Every method wraps its body in `try/catch` and resolves normally either way — callers `void crud.create(...)` without a `.catch()`, because there's nothing left to catch. All error reporting happens through `setSubmitError`, not through a rejected promise.

**The hook has zero knowledge of HTTP status codes beyond `response.ok`.** Role/validation/conflict errors (`401`/`403`/`409`/`422`) are all handled uniformly — the only two outcomes a method distinguishes are "succeeded" and "didn't," which is appropriate since the structured `error.code` (`CONFLICT`, `VALIDATION_ERROR`, etc.) is a server-side concern the UI only needs as a human-readable message.

---

## What to Read Next

- **[use-browse-state.md](use-browse-state.md)** — the browse/read half of every master-data page; owns the `submitError`/`submitSuccess` state this hook writes into.
- **`src/types/api.ts`** — `ApiEnvelope`, `toErrorMessage`, and the shared response contract every route handler and every hook agree on.
- **[units.md](units.md)** — see `create`/`update`/`remove` wired into a real page's form and table.
