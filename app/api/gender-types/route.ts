import type { NextRequest } from "next/server";

import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { db } from "@/src/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);

    const data = await db.genderType.findMany({
      orderBy: { id: "asc" },
    });

    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}