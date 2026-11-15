# Playlist E · Episode 7 — "Error Boundaries and the Pages Nobody Wants to Visit"

## Video Metadata

- **Playlist:** E — Next.js Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Resilience and Going Live (1 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Show the layered `error.tsx`/`global-error.tsx`/`not-found.tsx`
  convention this app uses, and why more than one error boundary exists instead of
  just one.
- **Title options:**
  1. Error Boundaries and the Pages Nobody Wants to Visit
  2. Four Error Files, Four Different Jobs
  3. What Happens When a Server Component Throws
- **Thumbnail concept:** A file tree with `error.tsx` appearing at three different
  folder depths, each captioned with what it catches.
- **Teaching principle:** Application behavior → framework requirement → Next.js
  solution.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "A special file named `error.tsx` in any App Router folder becomes an error
> boundary for everything inside that folder. This app has five of them, at
> different depths, plus a `not-found.tsx` and a `global-error.tsx` — and each one
> exists for a distinct reason, not out of habit."

---

## Scene 1 — A segment-level boundary (0:20–1:30)

**Visual:** Open `app/(dashboard)/error.tsx`, full file.

**Code shown:**
```tsx
"use client";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-red-700">Page error</h2>
        <p className="mt-2 text-sm text-slate-600">
          This page ran into a problem. You can retry or go back to the home page.
        </p>
        {error.digest && <p className="mt-3 font-mono text-xs text-slate-400">Reference: {error.digest}</p>}
      </div>
    </div>
  );
}
```

**Narration:**
> "If any page under `(dashboard)` throws during rendering, this file catches it —
> not the whole app, just this segment. The dashboard shell around it — the nav,
> the header — never unmounts; only the broken page's area shows this fallback.
> `reset()` is provided by Next.js and lets the user retry without a full reload.
> `error.digest` is a server-generated reference ID, safe to show to the user
> without leaking the actual error message or stack trace."

---

## Scene 2 — More than one segment has its own (1:30–2:30)

**Visual:** File-tree callout showing `app/(dashboard)/error.tsx`,
`app/reports/error.tsx`, and `app/contributions/error.tsx` all existing
separately.

**Narration:**
> "This isn't one error boundary for the whole app — it's several, at different
> route segments. Reports has its own, contributions has its own. A crash in the
> reports section shows the reports-flavored fallback without affecting anything
> else. Nesting is doing real work here: the closest `error.tsx` up the tree from
> where the crash happened is the one that catches it."

---

## Scene 3 — When nothing else can catch it (2:30–3:45)

**Visual:** Open `app/global-error.tsx`, full file.

**Narration:**
> "`global-error.tsx` is the one exception to 'error boundaries don't affect the
> rest of the app' — it only fires when the *root layout itself* throws, which
> means it has to render its own `<html>` and `<body>`, because the layout that
> would normally provide them is the thing that failed. This is also where Sentry
> capture actually lives: `useEffect(() => Sentry.captureException(error), [error])`.
> Every other, more specific `error.tsx` in this app catches and displays;
> `global-error.tsx` is the last resort when even the shell couldn't render."

---

## Scene 4 — `not-found.tsx`: a different kind of failure (3:45–4:45)

**Visual:** Open `app/not-found.tsx`, full file.

**Narration:**
> "`not-found.tsx` isn't for exceptions at all — it's what Next.js renders when a
> route genuinely doesn't exist, or when code explicitly calls `notFound()` for a
> resource that's missing. No `error` prop, no `reset()` — because there's nothing
> to retry, the thing you asked for simply isn't there. Same App Router
> convention family as `error.tsx`, answering a different question: not 'something
> broke,' but 'this doesn't exist.'"

---

## Outro / CTA (4:45–5:15)

**Visual:** End card pointing to Episode 8.

**Narration:**
> "Every error boundary we've seen runs client-side, after something has already
> gone wrong inside a request. Next episode looks at what runs *before* a request
> even reaches a page — and what it takes to actually ship this app."

---

## Production Notes

- **Screen recordings needed:** `app/(dashboard)/error.tsx` (full file),
  `app/reports/error.tsx` and `app/contributions/error.tsx` (file-tree mention
  only), `app/global-error.tsx` (full file), `app/not-found.tsx` (full file).
- **Source material:** the files above, read directly from the repository.
- **B-roll:** none required.
