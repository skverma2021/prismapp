import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

/**
 * GET /api/health
 *
 * Public endpoint — no auth required.
 * Used by Vercel health checks, uptime monitors, and load balancers.
 *
 * Returns 200 { status: "ok", ... } when the app and database are reachable.
 * Returns 503 { status: "degraded", ... } when the database is unreachable.
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    // Minimal query — just confirms DB connectivity and query round-trip.
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        timestamp,
        db: "ok",
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";

    return NextResponse.json(
      {
        status: "degraded",
        timestamp,
        db: "unreachable",
        detail: message,
      },
      { status: 503 },
    );
  }
}
