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
> "Everything so far has been what happens once a request reaches a page or a Route Handler.
>
> This episode is about what runs *before* that.
>
> It also covers what happens after `next build` finishes, when this app actually goes live on Vercel."

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
> "If you have used an older Next.js version, you will recognize this as middleware.
>
> It is code that runs before a request reaches any route or page. Next.js 16 renamed the convention to `proxy.ts`. But the idea is identical. This function runs ahead of everything else.
>
> Here, it does exactly one job. It watches for repeated `POST` attempts against the credentials sign-in callback. It rate-limits them per IP address.
>
> This closes off a brute-force login vector. It happens before the request ever reaches the handler of next-auth."

---

## Scene 2 — Deliberately simple, and the comment says why (1:45–2:45)

**Visual:** Highlight the code comment above `RATE_LIMIT_MAX`.

**Narration:**
> "The rate limit state is an in-memory `Map`. It is not Redis, and it is not a database table.
>
> The comment explains the trade-off explicitly.
>
> It says: 'a new function instance resets state — sufficient to deter automated scripts without requiring an external dependency.'
>
> It adds that this is for 'a single-region internal deployment.'
>
> That is an honest, written-down engineering decision. It is not an oversight.
>
> It is a simple defense that matches this app's actual deployment shape. And the reasoning stays in the code for whoever reads it next."

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
> "`headers()` is a Next.js config hook. It attaches these four headers to *every* response.
>
> The first blocks framing, with `X-Frame-Options: DENY`. The second stops MIME sniffing. The third tightens the referrer sent to other sites. The fourth disables camera, microphone, and geolocation entirely, since this app needs none of them.
>
> Then the whole config gets wrapped in `withSentryConfig`.
>
> That turns build output into something Sentry can map stack traces against. It is the same Sentry instance that `global-error.tsx` reports to in Episode 7."

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
> "The entire Vercel-specific configuration is one build command.
>
> It regenerates the Prisma client from the current schema. Then it runs the normal Next.js build.
>
> No other Vercel-specific wiring is needed.
>
> Environment variables, the Postgres connection, and everything else are ordinary project settings. They are not code."

---

## Scene 5 — Being honest: no caching, no revalidation (4:45–6:00)

**Visual:** A grep result across the repo for `revalidatePath`, `revalidateTag`,
and fetch `cache` options — no matches in `app/` or `src/`.

**Narration:**
> "It is worth saying plainly, the way we did for window functions back in Playlist D.
>
> This app uses none of the data-caching or revalidation features of Next.js. That means `revalidatePath`, `revalidateTag`, and the `cache` or `next.revalidate` options of a fetch call.
>
> Every list, every report, and every dashboard screen fetches fresh on every load.
>
> This is an internal society-management tool. An admin needs to see a payment that was recorded thirty seconds ago. Stale cached data would be a worse failure than a slightly slower request.
>
> Suppose a future screen is read-heavy and rarely changes. A public society directory is one example. That is the point where revalidation would become useful.
>
> It has not been needed yet."

---

## Outro / CTA (6:00–6:30)

**Visual:** End card, closing the playlist.

**Narration:**
> "That is Playlist E.
>
> We went from folders that do not show up in a URL, to the server and client boundary. Then to the request pipeline itself. Then to how the browser talks back. Then to what happens when any of it fails. And finally to what runs before a single line of your code does.
>
> Every choice here came from what this specific application needed. That includes the ones this app deliberately did not make, like caching."

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
