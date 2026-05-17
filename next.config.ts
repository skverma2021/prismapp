import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Org and project are read from SENTRY_ORG / SENTRY_PROJECT env vars at build time.
  // Silent: suppress Sentry CLI output in CI logs.
  silent: !process.env.CI,

  // Upload source maps only when SENTRY_AUTH_TOKEN is present (i.e. on Vercel).
  // In local dev (no token) source maps are skipped without breaking the build.
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
