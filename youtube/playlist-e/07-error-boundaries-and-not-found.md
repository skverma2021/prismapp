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
> "A special file named `error.tsx` in any App Router folder becomes an error boundary. It covers everything inside that folder.
>
> This app has five of them, at different depths. It also has a `not-found.tsx` and a `global-error.tsx`.
>
> Each one exists for a distinct reason. None exists out of habit."

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
> "If any page under `(dashboard)` throws during rendering, this file catches it.
>
> It does not catch it for the whole app. It catches it only for this segment.
>
> The dashboard shell around it never unmounts. That includes the nav and the header. Only the broken page's area shows this fallback.
>
> `reset()` is provided by Next.js. It lets the user retry without a full reload.
>
> `error.digest` is a server-generated reference ID. It is safe to show to the user. It does not leak the actual error message or stack trace."

---

## Scene 2 — More than one segment has its own (1:30–2:30)

**Visual:** File-tree callout showing `app/(dashboard)/error.tsx`,
`app/reports/error.tsx`, and `app/contributions/error.tsx` all existing
separately.

**Narration:**
> "This is not one error boundary for the whole app. There are several, at different route segments.
>
> Reports has its own. Contributions has its own.
>
> A crash in the reports section shows the reports fallback. It does not affect anything else.
>
> Nesting does real work here. The closest `error.tsx` up the tree from the crash is the one that catches it."

---

## Scene 3 — When nothing else can catch it (2:30–3:45)

**Visual:** Open `app/global-error.tsx`, full file.

**Narration:**
> "`global-error.tsx` is the one exception to 'error boundaries do not affect the rest of the app.'
>
> It only fires when the *root layout itself* throws.
>
> That means it must render its own `<html>` and `<body>`. The layout that would normally provide them is the thing that failed.
>
> This is also where Sentry capture actually lives. It is `useEffect(() => Sentry.captureException(error), [error])`.
>
> Every other, more specific `error.tsx` in this app catches and displays. `global-error.tsx` is the last resort. It is used when even the shell could not render."

---

## Scene 4 — `not-found.tsx`: a different kind of failure (3:45–4:45)

**Visual:** Open `app/not-found.tsx`, full file.

**Narration:**
> "`not-found.tsx` is not for exceptions at all.
>
> Next.js renders it when a route genuinely does not exist. It also renders it when code explicitly calls `notFound()` for a missing resource.
>
> There is no `error` prop and no `reset()`. There is nothing to retry. The thing you asked for simply is not there.
>
> It is in the same App Router convention family as `error.tsx`. But it answers a different question. Not 'something broke,' but 'this does not exist.'"

---

## Outro / CTA (4:45–5:15)

**Visual:** End card pointing to Episode 8.

**Narration:**
> "Every error boundary we have seen runs client-side. It runs after something has already gone wrong inside a request.
>
> The next episode looks at what runs *before* a request even reaches a page.
>
> And it shows what it takes to actually ship this app."

---

## Production Notes

- **Screen recordings needed:** `app/(dashboard)/error.tsx` (full file),
  `app/reports/error.tsx` and `app/contributions/error.tsx` (file-tree mention
  only), `app/global-error.tsx` (full file), `app/not-found.tsx` (full file).
- **Source material:** the files above, read directly from the repository.
- **B-roll:** none required.
