# Playlist E · Episode 1 — "Routing: Route Groups, Layouts, and Nested Shells"

## Video Metadata

- **Playlist:** E — Next.js Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Foundations: Routing & Boundaries (1 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Show how App Router folders, route groups, and nested layouts
  turn "a public page" and "an authenticated dashboard" into two different shells
  sharing one root.
- **Title options:**
  1. Routing: Route Groups, Layouts, and Nested Shells
  2. The Folder That Doesn't Appear in the URL
  3. One Root Layout, Two Very Different Apps
- **Thumbnail concept:** A file tree with `(dashboard)` and `(public)` folders,
  both with an arrow pointing to the same URL bar showing no parentheses at all.
- **Teaching principle:** Application behavior → framework requirement → Next.js
  solution.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head, `app/` folder tree visible behind.

**Narration:**
> "This app has a public sign-in page and a whole authenticated dashboard, sharing
> one Next.js project. Neither needs to know about the other's layout. Here's the
> folder structure that makes that possible — and the one detail about it that
> genuinely surprises people the first time they see it."

---

## Scene 1 — The root layout, shared by everything (0:20–1:30)

**Visual:** Open `app/layout.tsx`, full file.

**Code shown:**
```tsx
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerAuthSession();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <AppSessionProvider session={session}>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
```

**Narration:**
> "Every single route in this app passes through this file — it's an `async`
> Server Component, so it can `await getServerAuthSession()` directly, on the
> server, before any HTML reaches the browser, and hand the result to a client-side
> session provider. This is the one layout everything shares: fonts, the `<html>`
> tag, and the session."

---

## Scene 2 — Route groups: folders that don't affect the URL (1:30–2:45)

**Visual:** File tree showing `app/(public)/page.tsx` and `app/(dashboard)/home/page.tsx`
side by side, with their resulting URLs `/` and `/home`.

**Narration:**
> "Here's the surprising part. `(public)` and `(dashboard)` are folders — but the
> parentheses tell Next.js to treat them as *route groups*: organizational folders
> that group routes together without appearing in the URL at all.
> `app/(dashboard)/home/page.tsx` serves `/home`, not `/(dashboard)/home`. The
> parentheses exist purely so this codebase can attach a *different layout* to
> everything inside `(dashboard)` versus everything inside `(public)`, without that
> grouping leaking into the URLs users actually see."

---

## Scene 3 — The dashboard's own gate, layered on top (2:45–4:00)

**Visual:** Open `app/(dashboard)/layout.tsx`, full file (11 lines).

**Code shown:**
```tsx
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireServerAppSession({
    allowedRoles: ["SOCIETY_ADMIN", "MANAGER", "READ_ONLY"],
    redirectTo: "/home",
  });

  return <DashboardShell>{children}</DashboardShell>;
}
```

**Narration:**
> "Every page under `(dashboard)` — blocks, units, contributions, all of it —
> nests inside this layout, which nests inside the root layout. And this layout
> does something the root layout doesn't: it calls `requireServerAppSession` before
> rendering anything. No dashboard page has to remember to check auth itself —
> the layout it's nested inside already refuses to render without a valid,
> allowed-role session. We'll look at exactly what that function does in Episode
> 4."

---

## Scene 4 — The public side, same root, no gate (4:00–5:00)

**Visual:** Open `app/(public)/page.tsx`, lines 1–15, showing the sign-in banner
logic reading `searchParams`.

**Narration:**
> "`(public)/page.tsx` sits directly under the root layout with no extra gate — it
> *is* the sign-in page, so requiring a session first would make no sense. It even
> reads `searchParams.auth` to show a banner like 'sign in to continue' — that's
> the other end of the redirect we just saw in `DashboardLayout`. Same root
> layout, two folders, two completely different rules about who gets in, and
> neither folder's name shows up in a single URL."

---

## Outro / CTA (5:00–5:30)

**Visual:** End card pointing to Episode 2.

**Narration:**
> "Notice that both layouts we looked at are `async function` components with no
> `"use client"` at the top — they run only on the server. Most of the actual
> dashboard pages they wrap are the opposite. That boundary is next."

---

## Production Notes

- **Screen recordings needed:** `app/layout.tsx` (full file), `app/(dashboard)/layout.tsx`
  (full file, 11 lines), `app/(public)/page.tsx` (lines 1–15), a file-tree view of
  `app/` showing `(public)/`, `(dashboard)/`, and `api/` side by side.
- **Source material:** the files above, read directly from the repository.
- **B-roll:** none required.
