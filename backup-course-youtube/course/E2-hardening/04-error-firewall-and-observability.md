# E-04 — Error Firewall and Observability

---

## Slide 1 of 3 — `fromUnknownError`: The Classification Firewall

**Headline:** Every unhandled error passes through one function. That function decides what the client sees.

**Talking points:**
- Route handlers catch all errors in a single try/catch. Whatever the error — domain violation, Prisma error, unexpected crash — it ends up in one place:

```typescript
export async function POST(request: NextRequest) {
  try {
    ...
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
```

- `fromUnknownError` accepts `unknown` and returns an `HttpError`. It is a classifier:

```typescript
export function fromUnknownError(error: unknown, requestId?: string): HttpError {

  // 1. Already a known domain error — pass through unchanged
  if (error instanceof HttpError) {
    logServerError(error, requestId);
    return error;
  }

  // 2. Prisma unique constraint violation — 409 CONFLICT
  if (prismaCode === "P2002") {
    return new HttpError(409, "CONFLICT", "Unique constraint violated.", meta);
  }

  // 3. Prisma referential integrity violation — 409 CONFLICT
  if (prismaCode === "P2003") {
    return new HttpError(409, "CONFLICT", "Operation violates a related data constraint.", meta);
  }

  // 4. Prisma record not found — 404 NOT_FOUND
  if (prismaCode === "P2025") {
    return new HttpError(404, "NOT_FOUND", "Record not found.");
  }

  // 5. Prisma write conflict (transaction) — 503 SERVICE_UNAVAILABLE + retryable
  if (prismaCode === "P2034") {
    return new HttpError(503, "SERVICE_UNAVAILABLE", "Concurrent conflict. Please retry.", meta);
  }

  // 6. Database connectivity failure — 503 SERVICE_UNAVAILABLE
  if (isConnectivityFailure(error) || isRetryableDatabaseFailure(error)) {
    return new HttpError(503, "SERVICE_UNAVAILABLE", "Database temporarily unavailable.");
  }

  // 7. Anything else — 500 INTERNAL_ERROR
  logServerError(error, requestId);
  return new HttpError(500, "INTERNAL_ERROR", "Unexpected server error.");
}
```

- The consequence: **the client always receives a structured `ApiEnvelope` response, never a raw Prisma error, never a stack trace, never a 500 with an HTML error page.**
- Without this firewall, a duplicate `description` in a block insert would leak `"Unique constraint failed on the fields: (\`description\`)"` — an internal Prisma message that exposes schema details.
- The firewall also sets the `retryable` flag in the error envelope for 429 and 503. The `fetchJsonWithRetry` client utility reads this flag and retries automatically.

**Visual:** Classification flowchart with 7 branches, each showing: error type → output HTTP status + error code. Annotate cases 2–4 as "Prisma errors transparently mapped." Annotate case 7 as "Last resort — logged but never leaked."

**Takeaway: One function transforms every unknown error into a structured, client-safe response. The client never sees raw internals.**

---

## Slide 2 of 3 — Structured Logging

**Headline:** Log messages that machines can read are more useful than messages that only humans can read.

**Talking points:**
- When a 500 error occurs, `logServerError` writes a structured JSON object to stdout:

```typescript
function logServerError(error: unknown, requestId?: string) {
  if (error instanceof HttpError) {
    if (error.status >= 500) {
      console.error(JSON.stringify({
        level:     "error",
        requestId, // ← the correlation key
        status:    error.status,
        code:      error.code,
        message:   error.message,
      }));
    }
    return;
  }

  if (/* prisma-like error */) {
    console.error(JSON.stringify({
      level:     "error",
      requestId,
      code:      prismaLikeError.code,    // e.g., "P1001"
      message:   prismaLikeError.message,
    }));
    return;
  }

  if (error instanceof Error) {
    console.error("[api] Unknown error", {
      name:    error.name,
      message: error.message,
      stack:   error.stack,
    });
  }
}
```

- Why JSON? Vercel (and most cloud log platforms) can parse structured JSON log lines. You can filter `level = "error"` or search `requestId = "abc-123"` as a first-class field — not with a regex on a plain text message.
- The `requestId` in the log is the same UUID injected by the proxy and returned to the client in the response headers. This is the key connection: the user sees the requestId in the browser; the developer searches the Vercel log for that requestId; one log line appears.
- What is NOT logged: 400-level errors (validation errors, auth failures). These are expected domain outcomes, not server-side failures. Logging every 400 would produce noise that drowns out actual errors. Only 500+ errors and database errors are logged server-side.

**Visual:** Two log lines side by side — unstructured: `"Error in block creation: ..."` (plaintext). Structured: `{"level":"error","requestId":"abc-123","status":500,"code":"INTERNAL_ERROR","message":"..."}`. Annotate: "Machine-readable. Filterable. Searchable."

**Takeaway: Log errors as structured JSON. The `requestId` field is the link between a client error report and the server log entry.**

---

## Slide 3 of 3 — Sentry Integration

**Headline:** Structured logs tell you what happened. Sentry tells you when it's happening repeatedly.

**Talking points:**
- Structured logs are reactive — you look at them after a problem is reported. Sentry is proactive — it aggregates errors across requests and alerts when error rates spike.
- PrismApp's Sentry integration uses two files:

```typescript
// instrumentation.ts — Next.js 15+ instrumentation hook

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

```typescript
// sentry.server.config.ts

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
});
```

- `onRequestError = Sentry.captureRequestError` — this is a Next.js 15+ hook. It fires on any unhandled request error before the framework sends the response. Sentry receives the error without requiring any manual `Sentry.captureException` calls inside route handlers.
- `tracesSampleRate: 0.1` in production — only 10% of requests are performance-traced. Sentry charges by transaction volume; 10% captures enough for latency analysis without high cost.
- In development, `tracesSampleRate: 1.0` — trace every request. Useful for catching slow queries during development.
- The `dsn` (Data Source Name) is read from `NEXT_PUBLIC_SENTRY_DSN`. It must be in Vercel's environment variables. If it is not set, `Sentry.init` with `dsn: undefined` silently does nothing — no errors thrown, no crashes.
- What Sentry adds beyond logs: error grouping (50 instances of the same error become one issue), stack traces with source maps, user context (which userId triggered the error), and alerting rules (e.g., "email me if INTERNAL_ERROR count exceeds 5 in 5 minutes").

**Visual:** Three-layer observability diagram. Bottom: structured console logs (Vercel log dashboard). Middle: `x-request-id` correlation (client ↔ server). Top: Sentry (error aggregation, alerting, stack traces). Label: "Each layer adds something the one below it cannot provide."

**Takeaway: Structured logs are the foundation. Request IDs are the correlation layer. Sentry is the alerting and aggregation layer. All three are present in PrismApp from day one.**
