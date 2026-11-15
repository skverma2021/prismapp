# Playlist E · Episode 5 — "Forms and Client-Side Mutations"

## Video Metadata

- **Playlist:** E — Next.js Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Client-Side Application Behavior (1 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Show how a create/edit form in this app actually submits —
  controlled inputs, a shared `fetch`-based mutation hook, and optimistic-ish
  local state updates on success.
- **Title options:**
  1. Forms and Client-Side Mutations
  2. No `<form action>` Here — And Here's What's Used Instead
  3. One Hook, Every Create/Update/Delete Button
- **Thumbnail concept:** A form with a "Create" button, an arrow to a `fetch()`
  call, an arrow to a green checkmark toast reading "Block created."
- **Teaching principle:** Application behavior → framework requirement → Next.js
  solution.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Next.js has Server Actions. These are form submissions that run a function on the server. You do not write a fetch call by hand.
>
> This app does not use them. Its forms are plain controlled inputs. They submit through `fetch` to the Route Handlers we just saw.
>
> Let us see why that is a reasonable choice here. It is not an oversight."

---

## Scene 1 — A controlled input, nothing more (0:20–1:15)

**Visual:** Open `app/(dashboard)/blocks/page.tsx`, the `createDescription` state
and its bound `<input>`.

**Code shown:**
```tsx
const [createDescription, setCreateDescription] = useState("");
// ...
<input value={browse.query} onChange={(e) => browse.setQuery(e.target.value)} />
```

**Narration:**
> "The create field is an ordinary controlled input.
>
> Its value lives in `useState`. It updates on every keystroke. There is nothing Next.js-specific here at all. This is just React.
>
> The Next.js-specific part is what happens next, when you click 'Create.'"

---

## Scene 2 — One hook standing in for every mutation (1:15–2:45)

**Visual:** Open `app/(dashboard)/blocks/page.tsx`, `handleCreate`, next to
`src/hooks/use-crud-actions.ts`'s `create` implementation.

**Code shown:**
```tsx
function handleCreate() {
  void crud.create<BlockItem>({
    endpoint: "/api/blocks",
    body: { description: createDescription.trim() },
    errorMessage: "Unable to create block.",
    onSuccess: (data) => {
      invalidateBlockDependentLookups();
      setCreateDescription("");
      browse.setSubmitSuccess(`Block created: ${data.description}`);
      browse.setPage(1);
      browse.setQuery("");
    },
  });
}
```
```ts
const create = useCallback(async <T,>(options: CreateOptions<T>) => {
  setCreateLoading(true);
  setSubmitError("");
  try {
    const response = await fetch(options.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(options.body),
    });
    const payload = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok || !payload.ok) throw new Error(toErrorMessage(payload, options.errorMessage));
    options.onSuccess(payload.data);
  } catch (error) {
    setSubmitError(error instanceof Error ? error.message : options.errorMessage);
  }
}, [/* ... */]);
```

**Narration:**
> "`handleCreate` does not call `fetch` directly. It calls `crud.create`.
>
> That is a generic function from `useCrudActions`. Every master-data page in this app shares it.
>
> It sends a POST. It parses the response as an `ApiEnvelope<T>`. This is the discriminated union from Playlist C, again.
>
> If `payload.ok` is false, it throws a readable error. Otherwise it calls back into the page's own `onSuccess` with fully-typed data.
>
> So there is one hook and one fetch implementation. Every create button in the app reuses it. Nobody rewrites it per page."

---

## Scene 3 — What "success" actually updates (2:45–3:45)

**Visual:** Highlight the `onSuccess` callback body again: clearing the input,
resetting the page to 1, clearing the search query, invalidating a lookup cache.

**Narration:**
> "`onSuccess` is not just a success message.
>
> It resets the form. It jumps the list back to page 1, so the new row is visible. It clears any active search filter that might hide the row.
>
> And it calls `invalidateBlockDependentLookups()`. Other screens cache a dropdown of blocks, and this new block needs to show up there too.
>
> All of that is page-specific business logic. It is deliberately kept out of the shared hook.
>
> `useCrudActions` only knows how to make the request and report success or failure."

---

## Scene 4 — Why not a Server Action here (3:45–4:45)

**Narration (talking head, no new code):**
> "A Server Action would let this skip the explicit `fetch` and the envelope parsing.
>
> This app does not use them, and the reason is consistency.
>
> Every mutation already goes through a Route Handler. Some of those same endpoints must also be callable directly. Scripts can call them. Future integrations can call them. So can the test scripts in `scripts/test-*.mjs`.
>
> We keep one API surface. The UI and everything else hit it the same way.
>
> That was worth the extra work of writing the `fetch` call out. We write it only once, in a shared hook."

---

## Outro / CTA (4:45–5:15)

**Visual:** End card pointing to Episode 6.

**Narration:**
> "`useCrudActions` handles writes.
>
> Reading the list itself is handled by a second hook. That includes pagination, sorting, and filters synced to the URL.
>
> That is next."

---

## Production Notes

- **Screen recordings needed:** `app/(dashboard)/blocks/page.tsx` (lines 40–65,
  `handleCreate`), `src/hooks/use-crud-actions.ts` (`create`, lines ~55–75).
- **Source material:** the files above, read directly from the repository.
- **B-roll:** none required.
