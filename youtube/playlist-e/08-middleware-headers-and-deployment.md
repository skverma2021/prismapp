# Playlist E · Episode 8 — "Middleware, Headers, and Shipping It"

## Video Metadata

- **Playlist:** E — Next.js Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Resilience and Going Live (2 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Show the code that runs before every request (rate limiting),
  the security headers applied to every response, and what actually happens on
  deploy — while being honest that this app deliberately doesn't use caching or
  revalidation.
- **Title options:**
  1. Middleware, Headers, and Shipping It
  2. The Code That Runs Before Your Route Handler Does
  3. Why This App Doesn't Cache Its Data
- **Thumbnail concept:** A gate icon labeled "proxy.ts" sitting in front of a
  Route Handler icon, with a small padlock icon above both representing security
  headers.
- **Teaching principle:** Application behavior → framework requirement → Next.js
  solution.

---

## Cold Open (0:00–0:25)

**Visual:** Talking head.

**Narration:**
> "Everything so far has been what happens once a request reaches a page or a
> Route Handler. This episode is about what runs *before* that — and what happens
> after `next build` finishes, when this app actually goes live on Vercel."

---

## Scene 1 — Middleware, renamed but the same idea (0:25–1:45)

**Visual:** Open `proxy.ts`, the comment block and the `proxy` function signature.

**Code shown:**
```ts
// ---------------------------------------------------------------------------
// Proxy (Next.js 16 middleware equivalent)
// ---------------------------------------------------------------------------
export function proxy(request: NextRequest) {
  if (
    request.method === "POST" &&
    request.nextUrl.pathname === "/api/auth/callback/credentials"
  ) {
    const ip = getClientIp(request);
    const { limited, retryAfterSec } = checkRateLimit(ip);
    if (limited) {
      // ...return a 429 response
    }
  }
  // ...
}
```

**Narration:**
> "If you've used an older Next.js version, you'll recognize this as middleware —
> code that runs before a request reaches any route or page. Next.js 16 renamed
> the convention to `proxy.ts`, but the idea is identical: this function runs
> ahead of everything else. Here, it does exactly one job — watch for repeated
> `POST` attempts against the credentials sign-in callback, and rate-limit them
> per IP address, closing off a brute-force login vector before it ever reaches
> next-auth's own handler."

---

## Scene 2 — Deliberately simple, and the comment says why (1:45–2:45)

**Visual:** Highlight the code comment above `RATE_LIMIT_MAX`.

**Narration:**
> "The rate limit state is an in-memory `Map`, not Redis or a database table — and
> the comment explains the trade-off explicitly: 'a new function instance resets
> state — sufficient to deter automated scripts without requiring an external
> dependency,' for 'a single-region internal deployment.' That's an honest,
> written-down engineering decision, not an oversight — a simple defense that
> matches this app's actual deployment shape, with the reasoning left in the code
> for whoever reads it next."

---

## Scene 3 — Headers and Sentry, wired at the config level (2:45–4:00)

**Visual:** Open `next.config.ts`, full file.

**Code shown:**
```ts
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, { /* ... */ });
```

**Narration:**
> "`headers()` is a Next.js config hook that attaches these four headers to
> *every* response — blocking framing (`X-Frame-Options: DENY`), stopping MIME
> sniffing, tightening the referrer sent to other sites, and disabling camera,
> microphone, and geolocation entirely, since this app needs none of them. And
> the whole config gets wrapped in `withSentryConfig`, which is what turns build
> output into something Sentry can map stack traces against — the same Sentry
> instance `global-error.tsx` reports to in Episode 7."

---

## Scene 4 — Deployment, in one line (4:00–4:45)

**Visual:** Open `vercel.json`, full file (3 lines).

**Code shown:**
```json
{
  "buildCommand": "prisma generate && next build"
}
```

**Narration:**
> "The entire Vercel-specific configuration is one build command: regenerate the
> Prisma client from the current schema, then run the normal Next.js build. No
> other Vercel-specific wiring is needed — environment variables, the Postgres
> connection, and everything else are ordinary project settings, not code."

---

## Scene 5 — Being honest: no caching, no revalidation (4:45–6:00)

**Visual:** A grep result across the repo for `revalidatePath`, `revalidateTag`,
and fetch `cache` options — no matches in `app/` or `src/`.

**Narration:**
> "Worth saying plainly, the way we did for window functions back in Playlist D:
> this app uses none of Next.js's data-caching or revalidation features —
> `revalidatePath`, `revalidateTag`, or a fetch call's `cache`/`next.revalidate`
> options. Every list, every report, every dashboard screen fetches fresh on every
> load. For an internal society-management tool, where an admin needs to see a
> payment that was just recorded thirty seconds ago, stale cached data would be a
> worse failure than a slightly slower request. If a future read-heavy, rarely-
> changing screen showed up — a public society directory, say — that's the point
> where reaching for revalidation would earn its place. It hasn't been needed
> yet."

---

## Outro / CTA (6:00–6:30)

**Visual:** End card, closing the playlist.

**Narration:**
> "That's Playlist E. We went from folders that don't show up in a URL, to the
> server/client boundary, to the request pipeline itself, to how the browser
> actually talks back, to what happens when any of it fails, to what runs before
> a single line of your code does. Every choice here — including the ones this
> app deliberately didn't make, like caching — came from what this specific
> application actually needed."

---

## Production Notes

- **Screen recordings needed:** `proxy.ts` (comment block + `proxy` function,
  lines ~1–60), `next.config.ts` (full file), `vercel.json` (full file, 3 lines).
- **Source material:** the files above, plus a grep for
  `revalidatePath|revalidateTag|cache:\s*["']` across `app/` and `src/` (no
  matches found as of 2026-09-23), read directly from the repository.
- **B-roll:** none required.
- **Series note:** this closes the initial 8-episode run of Playlist E. All items
  from the blueprint's Playlist E topic list are covered (routing, server/client
  boundaries, Route Handlers, request/response handling, authentication,
  authorization, forms, data fetching, hooks, URL/query state, error handling,
  caching/revalidation, deployment), with one honest scoping note: caching/
  revalidation has no real example in this codebase and Episode 8 says so
  explicitly rather than forcing one.
