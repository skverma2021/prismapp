# Walkthrough — App Shell (Domain-Agnostic)

The app shell is everything that surrounds your domain logic: authentication, session management, navigation, layouts, error boundaries, and the lookup cache. This walkthrough is intentionally domain-agnostic — the same patterns apply to any Next.js application with role-based access control.

Read this before studying any module walkthrough. The shell is the context in which every module runs.

---

## What the Shell Is

The shell is the set of files that handle the "around" of every page:

- *Who is the user?* — authentication
- *Are they allowed here?* — authorisation
- *How does the app look?* — layout, navigation, header
- *What happens on errors?* — error boundaries
- *What data should be pre-loaded?* — lookup cache warm-up

The shell is not a module. It does not own a domain concept. Its job is to make modules possible.

---

## Route Groups: The Two Zones

Next.js route groups (folder names in parentheses) let you apply different layouts to different parts of the app without affecting URL paths.

```
app/
  (public)/           ← unauthenticated zone
    page.tsx          → URL: /
  (dashboard)/        ← authenticated zone
    layout.tsx        ← applies to everything inside
    home/page.tsx     → URL: /home
    units/page.tsx    → URL: /units
    ...
```

The public zone: the login page, accessible without a session.
The dashboard zone: every protected page, gated by an auth check in the layout.

Nothing about the URL changes. The route group is a structural organiser, not a URL segment.

---

## The Root Layout

`app/layout.tsx`

```ts
export default async function RootLayout({ children }) {
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

Three responsibilities:

1. **Fonts** — `Geist` and `Geist Mono` are loaded via `next/font/google` and injected as CSS variables. Using `next/font` serves fonts from Vercel's CDN without a network request to Google at runtime — better performance and no cross-origin privacy concern.

2. **Metadata** — `title.template: "%s | PrismApp"` means any page that sets its own `<title>` will automatically append `" | PrismApp"`. The root layout sets the default; pages override the prefix.

3. **Session hydration** — `getServerAuthSession()` runs on the server. It reads the session cookie and returns the current session. This session is passed to `AppSessionProvider`, which makes it available to all client components via React context — without a client-side network request.

This pattern (session fetched server-side, passed to a client provider) is the recommended next-auth v4 approach for App Router. It avoids the waterfall of a client component fetching the session after hydration.

---

## The Authentication System

`auth.ts`

```ts
export const enabledOAuthProviders = {
  google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  microsoft: !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET),
};
```

OAuth providers are conditionally registered based on the presence of environment variables. The app works with credentials-only login if OAuth variables are absent. This means:

- Local development needs only `DATABASE_URL` and `AUTH_SECRET`
- Staging can add OAuth providers incrementally
- Removing an OAuth provider is a matter of clearing the env vars

The credentials provider verifies the submitted email/password against the `AppUser` table using bcrypt:

```ts
Credentials({
  async authorize(credentials) {
    const user = await db.appUser.findUnique({ where: { email } });
    if (!user || !user.isActive) return null;

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) return null;

    return { id: user.id, email, displayName: user.displayName, role };
  }
})
```

The `isActive` check is important: deactivating a user by setting `isActive = false` immediately prevents login without requiring a password change or account deletion. This is the correct pattern for revoking access in operational systems.

---

## The Session Boundary

There are two session layers — server and client — with a clean boundary between them.

### Server side

`src/lib/server-auth.ts`

```ts
export async function requireServerAppSession(options?: {
  allowedRoles?: UserRole[];
  redirectTo?: string;
}) {
  const session = await getServerAppSession();

  if (!session) {
    redirect(`/?auth=required&next=${options?.redirectTo}`);
  }

  if (options?.allowedRoles && !options.allowedRoles.includes(session.role)) {
    redirect(`/home?auth=denied`);
  }

  return session;
}
```

Used in Server Components and layouts. It reads the session cookie on the server and redirects immediately if the check fails — before any React rendering begins. The user never sees a flash of protected content.

### Client side

`src/lib/auth-session.tsx`

```ts
export function useAuthSession() {
  const result = useSafeAuthSession();
  if (!result.session) {
    throw new Error("useAuthSession requires an authenticated session.");
  }
  return { session: result.session, ... };
}
```

Used in Client Components. `useSafeAuthSession` returns `session | null` without throwing — useful for conditional rendering. `useAuthSession` throws if called without a session, which triggers the nearest error boundary. The design assumption: if you are calling `useAuthSession` inside a dashboard page, you are already inside the authenticated zone, so no session is a programming error, not a user error.

### Why two layers?

Server-side auth (layout redirect) prevents unauthorised users from seeing protected HTML at all. Client-side auth (`useAuthSession`) provides access to session data within components — for role-based UI gating, for including the user's name in the page, etc.

One without the other is incomplete:
- Server-only: client components have no way to access session data
- Client-only: a direct HTTP request bypasses JavaScript and serves protected HTML

---

## The Dashboard Layout

`app/(dashboard)/layout.tsx`

```ts
export default async function DashboardLayout({ children }) {
  await requireServerAppSession({
    allowedRoles: ["SOCIETY_ADMIN", "MANAGER", "READ_ONLY"],
    redirectTo: "/home",
  });

  return <DashboardShell>{children}</DashboardShell>;
}
```

One async call gates the entire dashboard zone. Every route inside `(dashboard)/` is protected by this single layout. Adding a new module (`app/(dashboard)/my-module/page.tsx`) inherits the auth check automatically — no per-page boilerplate.

The layout is a Server Component. It does not pass the session to `DashboardShell`. The shell reads the session from the client-side context (`useSafeAuthSession`) independently. This avoids prop-drilling the session through the layout tree.

---

## DashboardShell

`src/components/shell/dashboard-shell.tsx`

This is a Client Component — it uses `usePathname` for active nav state and `useEffect` for lookup pre-warming.

Structure:

```
DashboardShell
├── <aside>         ← sidebar
│   ├── App brand block
│   ├── Session info card (name, email, role, sign out, change password)
│   └── <nav>       ← role-filtered navigation links
└── <div>           ← main content area
    ├── PageHeader  ← breadcrumbs, title, description
    └── {children}  ← the current page
```

### Session expired state

If `useSafeAuthSession` returns `null` inside the shell (the session expired after the page loaded), the shell renders a "Session expired" banner instead of the navigation:

```ts
if (!session) {
  return (
    <div>
      <h2>Session expired</h2>
      <Link href="/?auth=required">Sign in</Link>
    </div>
  );
}
```

This handles the case where a user leaves a tab open for a long time. Without this guard, the navigation would crash trying to read `session.role`.

### Role-filtered navigation

```ts
const items = getVisibleNavItems(session.role);
```

`getVisibleNavItems` filters `dashboardNavItems` (defined in `src/lib/navigation.ts`) to the items whose `roles` array includes the current user's role. A `READ_ONLY` user sees all items. A restricted role would see fewer. Navigation filtering is UI convenience — the server-side role guard in each route handler remains the real enforcement.

### Lookup pre-warming

```ts
useEffect(() => {
  if (session) {
    void prewarmCommonLookups();
  }
}, [session?.userId]);
```

When the shell mounts with an authenticated session, it pre-fetches blocks, units, individuals, and contribution heads into a module-level in-memory cache. These lookups are needed by multiple pages (contributions, ownerships, residencies). Pre-warming means those pages load without a fetch waterfall.

The cache lives in `src/lib/master-data-lookups.ts` and uses a TTL of 5 minutes. It is invalidated on relevant mutations (e.g., creating a unit calls `invalidateUnitLookups()`).

---

## Navigation

`src/lib/navigation.ts`

Three functions:

| Function | Purpose |
|---|---|
| `getVisibleNavItems(role)` | Filter nav items by role |
| `isNavItemActive(pathname, href)` | True if the current path starts with the nav item's href |
| `getBreadcrumbs(pathname)` | Returns an array of `{ label, href? }` for the current path |

`dashboardNavItems` is the master list of all nav items. Each item declares which roles can see it:

```ts
{
  href: "/contributions",
  label: "Contribution Capture",
  description: "Record contributions and compensating corrections.",
  roles: ["SOCIETY_ADMIN", "MANAGER"],  // READ_ONLY excluded
}
```

To add a module to the navigation, add one entry to `dashboardNavItems`. The shell picks it up automatically.

---

## The Login Page

`app/(public)/page.tsx`

The login page is a Server Component that:
1. Checks if the user is already authenticated — if so, redirects to `/home`
2. Passes the `redirectTo` URL to the `LoginForm` (from a `?next=` query parameter)
3. Shows a contextual banner (`auth=required`, `auth=signed-out`, `auth=oauth-denied`) based on query params

The banner state is passed through query parameters rather than session flash messages. This is simpler (no server-side flash storage needed) and sufficient for the three cases that arise in this app.

The `LoginForm` is a Client Component that calls `signIn("credentials", ...)` from `next-auth/react`. On success, next-auth handles the redirect to `callbackUrl`. On failure, it sets a client-side error message.

---

## PageHeader

`src/components/shell/page-header.tsx`

Used on every page in the app — login page, dashboard pages, report pages. It accepts:

```ts
type PageHeaderProps = {
  breadcrumbs?: BreadcrumbItem[];
  eyebrow?: string;      // small label above the title
  title: string;
  description: string;
};
```

The header renders a consistent visual treatment across all pages: rounded card, border, shadow, breadcrumb nav, eyebrow label, title, description. Using a shared component enforces visual consistency without repetition.

---

## Error Boundaries

### Global error

`app/global-error.tsx`

Catches unhandled errors at the root level — the last resort. It renders outside the normal layout (no sidebar, no nav) and reports the error to Sentry:

```ts
useEffect(() => {
  Sentry.captureException(error);
}, [error]);
```

The `error.digest` is a Next.js-generated hash of the error for server-side correlation. Showing it to the user allows them to report it to support; support can search Sentry by digest.

### Dashboard error

`app/(dashboard)/error.tsx`

Catches errors within the dashboard zone while keeping the shell visible. The user sees an error card with a "Try again" button inside the normal layout, not a blank screen.

### Module-level

Each module can export its own `error.tsx` for page-specific error handling. The standard `(dashboard)/error.tsx` is the fallback for any module that does not.

---

## Applying This to a New Project

The domain-agnostic parts you can carry forward to any Next.js project:

| File / Pattern | What to reuse |
|---|---|
| `app/(public)/` + `app/(dashboard)/` route groups | Zone-based routing — unauthenticated vs authenticated |
| `(dashboard)/layout.tsx` with `requireServerAppSession` | Single-point auth gate for all protected routes |
| `app/layout.tsx` session hydration | Server-fetched session passed to a client provider |
| `src/lib/server-auth.ts` | Server-side session helper with role guard and redirect |
| `src/lib/auth-session.tsx` | Client-side session hook with safe/unsafe variants |
| `src/lib/user-role.ts` | Role type, role lists, role parser |
| `src/lib/navigation.ts` | Role-filtered nav items and active-route detection |
| `src/components/shell/dashboard-shell.tsx` | Sidebar + header shell with session expired handling |
| `src/components/shell/page-header.tsx` | Consistent page header component |
| `src/lib/api-response.ts` | `HttpError`, `ok()`, `fail()`, `fromUnknownError()` — the error envelope |
| `src/lib/audit-log.ts` | `writeAuditLog()` — append-only audit trail |
| `app/global-error.tsx` | Root error boundary with Sentry capture |
| `src/lib/master-data-lookups.ts` | Module-level lookup cache with TTL and invalidation |
| `auth.ts` | Conditional OAuth + credentials provider pattern |

The domain-specific parts (nav items, roles, entity names) are the only things that change between projects.

---

## What to Read Next

- **`src/lib/authz.ts`** — the `requireReadRole` and `requireMutationRole` route-handler utilities that complement the layout-level auth.
- **`src/lib/api-response.ts`** — the error envelope used by every route handler.
- **`course/walkthrough/units.md`** — the first module walkthrough. You now have the context to understand the shell around it.
