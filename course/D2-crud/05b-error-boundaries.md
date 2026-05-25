# D-05b — Error Boundaries in Next.js App Router

---

## Slide 1 of 3 — What `error.tsx` does

**Headline:** An `error.tsx` file is React's error boundary pattern — expressed as a file convention.

**Talking points:**
- In a React application, an error thrown during rendering will crash the entire component tree unless an error boundary catches it. Next.js implements this via the `error.tsx` file convention.
- When a component below an `error.tsx` boundary throws an unhandled error during render (or in a Server Component), Next.js displays the closest `error.tsx` instead of the broken subtree. The rest of the page — the shell, the navigation, the header — continues to render normally.
- This is different from API errors returned by route handlers. A `{ success: false }` JSON response is handled by the Client Component's own `catch` logic. `error.tsx` catches errors that escape component rendering entirely — unexpected throws, `null` dereferences, broken Server Component data, and similar runtime failures.
- `error.tsx` is not invoked by `throw new HttpError(...)` in a route handler. It is invoked when React's render tree throws during its own execution.

**Visual:** Component tree diagram: Root layout (safe) → Dashboard layout (safe) → `error.tsx` boundary → route page (throws). Arrow from "throws" pointing to `error.tsx` box labelled "caught here". Adjacent branches of the layout tree shown unaffected.

**Takeaway:** `error.tsx` is the last line of defence inside the render tree — it keeps the shell intact and shows a recoverable error screen instead of a blank page.

---

## Slide 2 of 3 — The `"use client"` contract

**Headline:** Error boundaries must be Client Components — that is a React constraint, not a Next.js choice.

**Talking points:**
- React error boundaries must be class components (using `componentDidCatch`) or, in React 18+, function components marked `"use client"`. They cannot be Server Components because Server Components do not support lifecycle methods or hooks.
- Next.js enforces this: if `error.tsx` is missing `"use client"`, you get a build error.
- The component receives two props:
  - `error: Error & { digest?: string }` — the caught error. `digest` is a server-generated hash that identifies the specific error in server logs without leaking the stack trace to the browser. Show the `digest` in the UI so support staff can correlate a user-reported error to a log entry.
  - `reset: () => void` — a function provided by Next.js that re-renders the subtree that failed. It does not reload the page; it retries the React render from the boundary down. If the transient condition (a flaky API call, a race condition) has resolved, `reset()` will restore the working state.

```tsx
// app/(dashboard)/error.tsx — the PrismApp pattern
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Page error</h2>
      <p>An unexpected error occurred. Try refreshing, or go back to the home page.</p>
      {error.digest && <p className="text-xs text-muted">Reference: {error.digest}</p>}
      <button onClick={reset}>Try again</button>
      <a href="/home">Home</a>
    </div>
  );
}
```

**Visual:** Props box showing `error` (with `message`, `digest` fields highlighted) and `reset` (arrow showing it calls `reset()` and triggers a re-render of the subtree below the boundary, not a page reload).

**Takeaway:** `"use client"` is not optional on `error.tsx`. Always surface `error.digest` for support correlation. `reset()` is a retry, not a reload.

---

## Slide 3 of 3 — Three-file scoping hierarchy in PrismApp

**Headline:** Error boundaries nest. A narrower boundary overrides the broader one for its subtree.

**Talking points:**
- PrismApp has three `error.tsx` files, each scoped to a different part of the route tree:

| File | Scope | Catches errors in |
|------|-------|------------------|
| `app/(dashboard)/error.tsx` | Dashboard boundary | All routes under `(dashboard)/` — blocks, units, individuals, ownerships, residencies, contributions, etc. |
| `app/reports/error.tsx` | Reports boundary | All routes under `app/reports/` — the paid/unpaid matrix and transaction list pages |
| `app/contributions/error.tsx` | Contributions entry boundary | All routes under `app/contributions/` — the payment entry flow |

- The dashboard boundary is the widest net. If a block page or a unit page throws, `app/(dashboard)/error.tsx` catches it.
- The reports and contributions entry pages sit **outside** the `(dashboard)` route group (they have their own layouts for presentation reasons). They need their own `error.tsx` files so an error in a report page still shows a recovery screen rather than a blank page.
- If there were no `error.tsx` at all, an unhandled render error would propagate to the root layout's error boundary (or show Next.js's built-in error page in production).

**Visual:** Nested rectangles: outermost = root layout, inside it = `(dashboard)` layout with `error.tsx` labelled "catches all dashboard routes", beside it two separate boxes: `reports/` with its own `error.tsx` and `contributions/` with its own `error.tsx`.

**Takeaway:** Add an `error.tsx` anywhere you want to limit the blast radius of a render error. The file's position in the folder hierarchy determines which subtree it protects.
