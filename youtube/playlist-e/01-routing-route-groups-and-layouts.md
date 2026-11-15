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
> "This app has a public sign-in page. It also has a whole authenticated dashboard.
> Both live in one Next.js project.
>
> Neither one needs to know about the other's layout.
>
> Here is the folder structure that makes that possible.
>
> And there is one detail about it that surprises people the first time they see it."

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
> "Every single route in this app passes through this file.
>
> It is an `async` Server Component. So it can `await getServerAuthSession()` directly, on the server, before any HTML reaches the browser.
>
> Then it hands the result to a client-side session provider.
>
> This is the one layout everything shares. It holds the fonts, the `<html>` tag, and the session."

---

## Scene 2 — Route groups: folders that don't affect the URL (1:30–2:45)

**Visual:** File tree showing `app/(public)/page.tsx` and `app/(dashboard)/home/page.tsx`
side by side, with their resulting URLs `/` and `/home`.

**Narration:**
> "Here is the surprising part.
>
> `(public)` and `(dashboard)` are folders. But the parentheses tell Next.js to treat them as *route groups*.
>
> A route group organizes routes together. It does not appear in the URL at all.
>
> So `app/(dashboard)/home/page.tsx` serves `/home`, not `/(dashboard)/home`.
>
> The parentheses exist for one reason. They let this codebase attach a *different layout* to everything inside `(dashboard)`.
> It can attach another layout to everything inside `(public)`.
>
> And that grouping never leaks into the URLs users see."

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
> "Every page under `(dashboard)` nests inside this layout. That includes blocks, units, contributions, and all the rest.
>
> This layout nests inside the root layout.
>
> And it does something the root layout does not do. It calls `requireServerAppSession` before rendering anything.
>
> So no dashboard page has to remember to check auth itself.
>
> The layout already refuses to render without a valid session and an allowed role.
>
> We will look at exactly what that function does in Episode 4."

---

## Scene 4 — The public side, same root, no gate (4:00–5:00)

**Visual:** Open `app/(public)/page.tsx`, lines 1–15, showing the sign-in banner
logic reading `searchParams`.

**Narration:**
> "`(public)/page.tsx` sits directly under the root layout, with no extra gate.
>
> It *is* the sign-in page. So requiring a session first would make no sense.
>
> It also reads `searchParams.auth` to show a banner like 'sign in to continue'. That is the other end of the redirect we just saw in `DashboardLayout`.
>
> So we have the same root layout, and two folders. Each folder has completely different rules about who gets in.
>
> And neither folder's name shows up in a single URL."

---

## Outro / CTA (5:00–5:30)

**Visual:** End card pointing to Episode 2.

**Narration:**
> "Notice that both layouts we looked at are `async function` components.
> Neither has `"use client"` at the top. So they run only on the server.
>
> Most of the dashboard pages they wrap are the opposite.
>
> That boundary is next."

---

## Production Notes

- **Screen recordings needed:** `app/layout.tsx` (full file), `app/(dashboard)/layout.tsx`
  (full file, 11 lines), `app/(public)/page.tsx` (lines 1–15), a file-tree view of
  `app/` showing `(public)/`, `(dashboard)/`, and `api/` side by side.
- **Source material:** the files above, read directly from the repository.
- **B-roll:** none required.
