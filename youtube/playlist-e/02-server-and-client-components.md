# Playlist E · Episode 2 — "Server and Client Components: Where the Line Actually Is"

## Video Metadata

- **Playlist:** E — Next.js Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Foundations: Routing & Boundaries (2 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Show the real, consistent rule this codebase uses to decide
  what needs `"use client"` and what doesn't, using actual layouts and pages
  rather than a made-up example.
- **Title options:**
  1. Server and Client Components: Where the Line Actually Is
  2. Why Nearly Every Dashboard Page Says `"use client"`
  3. The Directive That Changes Where Code Runs
- **Thumbnail concept:** A vertical line splitting the screen — left labeled
  "runs on the server," right labeled `"use client"`, with real file names
  scattered on each side.
- **Teaching principle:** Application behavior → framework requirement → Next.js
  solution.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Every component in the App Router is a Server Component by default — it renders
> on the server and ships no JavaScript to the browser for itself. `"use client"`
> opts a file back into the old model: it runs in the browser, can use `useState`,
> `useEffect`, event handlers. This episode is about where this app actually draws
> that line, and why."

---

## Scene 1 — The layouts: no directive, and no interactivity needed (0:20–1:30)

**Visual:** Re-show `app/layout.tsx` and `app/(dashboard)/layout.tsx` from Episode
1, pointing out the absence of `"use client"` at the top of either file.

**Narration:**
> "Both layouts from last episode have no `"use client"` line. Neither needs one —
> `RootLayout` just awaits a session and renders `<html>`; `DashboardLayout` just
> awaits an auth check and renders its children. No state, no event handlers, no
> browser APIs. That's the actual test: does this component need to hold state,
> respond to clicks, or use a browser-only API? If not, it can stay a Server
> Component — and get to do things client components can't, like `await` a
> database call directly."

---

## Scene 2 — A dashboard page, and why it needs the directive (1:30–2:45)

**Visual:** Open `app/(dashboard)/blocks/page.tsx`, line 1 (`"use client";`) plus
the `useState` calls just below it.

**Code shown:**
```tsx
"use client";

// ...
const [createDescription, setCreateDescription] = useState("");
const [editingId, setEditingId] = useState<string | null>(null);
```

**Narration:**
> "Compare that to the blocks page. It has a text input bound to `createDescription`,
> a table row that flips into an edit form when you click it, buttons that submit
> fetch requests — all of that needs `useState` and `onClick` handlers running in
> the browser. The moment a component needs interactivity like that, it has to be
> a Client Component, and `"use client"` is how you say so."

---

## Scene 3 — This is the rule almost everywhere in the dashboard (2:45–3:45)

**Visual:** A quick grep-style montage: `"use client"` at line 1 of `units/page.tsx`,
`contribution-rates/page.tsx`, `ownerships/page.tsx`, `complaints/page.tsx`, and
several more — roughly twenty files in total.

**Narration:**
> "This isn't an exception — nearly every page under `(dashboard)` starts with
> `"use client"`, because nearly every one of them is an interactive browse-and-edit
> screen: search boxes, sortable columns, inline forms. The two layouts are the
> quiet exception, because a layout's whole job here is an auth check and a shell —
> no interactivity required."

---

## Scene 4 — Error boundaries need it for a different reason (3:45–4:45)

**Visual:** Open `app/global-error.tsx`, showing `"use client"` plus the `useEffect`
that reports to Sentry.

**Code shown:**
```tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  // ...
}
```

**Narration:**
> "Error boundaries are a slightly different case: Next.js requires `error.tsx`
> files to be Client Components, full stop — because they need to catch errors
> that happen during client-side rendering too, not just on the server. This one
> uses that requirement anyway: the `useEffect` reports the error to Sentry the
> moment it renders in the browser. Same directive, but here it's mandatory, not a
> choice about interactivity."

---

## Outro / CTA (4:45–5:15)

**Visual:** End card pointing to Episode 3.

**Narration:**
> "Every one of these client pages still needs to talk to a server somehow — none
> of them can query the database directly from the browser. That's what Route
> Handlers are for, next."

---

## Production Notes

- **Screen recordings needed:** `app/layout.tsx` and `app/(dashboard)/layout.tsx`
  (no directive, re-shown from Ep1), `app/(dashboard)/blocks/page.tsx` (lines
  1–12), a grep result across `app/(dashboard)/**/page.tsx` showing `"use client"`
  at line 1 of ~20 files, `app/global-error.tsx` (lines 1–16).
- **Source material:** the files above, read directly from the repository.
- **B-roll:** none required.
