import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Rate limiting — POST /api/auth/callback/credentials only
// Closes OWASP A05-GAP-2 (security misconfiguration) and A07-GAP-1 (brute-force).
// In-memory Map is acceptable for a single-region internal deployment.
// A new function instance resets state — sufficient to deter automated scripts
// without requiring an external dependency.
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 10; // attempts per window
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest): string {
  // On Vercel, the real client IP is in x-forwarded-for.
  // request.ip was removed in Next.js 16; headers are the portable approach.
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, retryAfterSec: 0 };
  }

  entry.count += 1;

  if (entry.count > RATE_LIMIT_MAX) {
    return {
      limited: true,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { limited: false, retryAfterSec: 0 };
}

// ---------------------------------------------------------------------------
// Proxy (Next.js 16 middleware equivalent)
// ---------------------------------------------------------------------------
export function proxy(request: NextRequest) {
  // --- Rate limit credential submissions -----------------------------------
  if (
    request.method === "POST" &&
    request.nextUrl.pathname === "/api/auth/callback/credentials"
  ) {
    const ip = getClientIp(request);
    const { limited, retryAfterSec } = checkRateLimit(ip);

    if (limited) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      );
    }
  }

  // --- Request ID propagation ----------------------------------------------
  const requestId =
    request.headers.get("x-request-id") ?? crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("x-request-id", requestId);

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
