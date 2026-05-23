# E-02 — Rate Limiting and Request Tracing

---

## Slide 1 of 3 — Why Login Needs Rate Limiting

**Headline:** Without rate limiting, a login form is an open invitation for brute-force attacks.

**Talking points:**
- OWASP A07: Identification and Authentication Failures. A login endpoint that allows unlimited attempts lets an attacker try every password in a dictionary. Given enough time and attempts, weak passwords will be found.
- PrismApp's login endpoint is `POST /api/auth/callback/credentials` — this is the next-auth route that receives email and password. It is the only endpoint in the system that can be brute-forced to gain access.
- The rate limiting logic lives in `proxy.ts` — Next.js 16's middleware equivalent:

```typescript
// proxy.ts — rate limit on login only

const RATE_LIMIT_MAX = 10;                      // 10 attempts
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;   // per 15 minutes

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, retryAfterSec: 0 };
  }

  entry.count += 1;

  if (entry.count > RATE_LIMIT_MAX) {
    return { limited: true, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { limited: false, retryAfterSec: 0 };
}
```

- The IP is read from `x-forwarded-for` — on Vercel, this is the real client IP, set by the edge network. The raw `request.ip` property was removed in Next.js 16; the header is the portable approach.
- The 429 response includes a `Retry-After` header. Well-behaved clients use this to know when to try again.
- The check only fires on `POST /api/auth/callback/credentials`. Every other endpoint is unaffected — no performance overhead on normal API traffic.

**Visual:** Timeline diagram — 10 failed logins in 5 minutes → 11th attempt → 429 Too Many Requests with `Retry-After: 847`. Label: "Automated scripts are stopped after 10 attempts. Manual brute force is impractical."

**Takeaway: Rate limit only the sensitive endpoint. Keep the implementation simple. 10 attempts / 15 minutes is enough to stop scripts without frustrating legitimate users.**

---

## Slide 2 of 3 — `x-request-id`: Request Correlation

**Headline:** When something breaks, you need to connect the client error to the server log. The request ID is that connection.

**Talking points:**
- Every request to `/api/*` passes through `proxy.ts`. After the rate limit check, the proxy injects a request ID:

```typescript
// proxy.ts — request ID propagation

export function proxy(request: NextRequest) {
  // ... rate limit check ...

  const requestId =
    request.headers.get("x-request-id") ?? crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);   // also in response headers

  return response;
}
```

- If the caller already sent an `x-request-id` (e.g., from an internal service or a test harness), it is preserved. Otherwise, a UUID is generated. This means every request has an ID.
- In the route handler, `getRequestId(request)` reads the header:

```typescript
// src/lib/api-response.ts

export function getRequestId(request: Request): string {
  return request.headers.get("x-request-id") ?? "unknown";
}
```

- And is passed into `fromUnknownError`:

```typescript
// app/api/blocks/route.ts

export async function GET(request: NextRequest) {
  try {
    ...
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
```

- `fromUnknownError` passes the requestId to `logServerError`, which includes it in the structured JSON log. The same requestId is visible in the response headers to the client. With Vercel's log dashboard, you can filter by requestId and see exactly which server log corresponds to a client error report.
- Without this: a user reports "I got an error at 2:34pm." You have thousands of log lines. You cannot tell which one is theirs.
- With this: the user's browser (or the NoticeStack) shows the requestId. You filter Vercel logs by `requestId = "8f3a-..."`. One log entry.

**Visual:** Sequence diagram — Client sends request → proxy injects `x-request-id: abc-123` → Route Handler logs `{ requestId: "abc-123", error: "..." }` → response headers include `x-request-id: abc-123`. Bottom: "User sees abc-123. Dev searches Vercel logs for abc-123."

**Takeaway: The request ID is the thread that connects a client error to a server log. It costs one UUID per request and saves hours of debugging.**

---

## Slide 3 of 3 — The Known Limitation of In-Memory Rate Limiting

**Headline:** The rate limit works for V1. Know exactly where it breaks before you need to scale.

**Talking points:**
- The `rateLimitStore` is a JavaScript `Map` declared at module scope:

```typescript
const rateLimitStore = new Map<string, RateLimitEntry>();
```

- On Vercel, each serverless function invocation is a separate process. There is no shared memory between invocations. If 11 login attempts arrive simultaneously and are distributed across three function instances, each instance sees only a fraction of the attempts — none of them reaches the `RATE_LIMIT_MAX` threshold.

- The code comment in `proxy.ts` acknowledges this directly:
  > "In-memory Map is acceptable for a single-region internal deployment. A new function instance resets state — sufficient to deter automated scripts without requiring an external dependency."

- In practice, for a society management app with a small number of operators, the window for a race condition across concurrent invocations is very narrow. Automated brute-force scripts are stopped because they generate high-volume sequential traffic — most requests will hit a warm instance with an existing counter.

- The production alternative is an external counter — Redis or Upstash (serverless Redis). The counter would be shared across all function instances:

```typescript
// Future production pattern (not in V1)
import { Redis } from "@upstash/redis";
const redis = Redis.fromEnv();

const key = `rate:${ip}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, RATE_LIMIT_WINDOW_MS / 1000);
if (count > RATE_LIMIT_MAX) { /* reject */ }
```

- The lesson: **document the known limitation at the time you make the trade-off.** The in-memory approach is correct for V1. Choosing it without documenting why is a trap for the next person who reads the code.

**Visual:** Two deployment diagrams side by side. Left: three Vercel instances each with their own `Map` (label: "V1 — in-memory, per-instance. Good enough for internal deployment"). Right: three Vercel instances all reading one Redis counter (label: "V2+ option — shared counter, true global rate limit"). Annotate the left with "documented limitation."

**Takeaway: Know the limitation. Document it. The in-memory approach is correct for now. Upgrade the mechanism when volume justifies it.**
