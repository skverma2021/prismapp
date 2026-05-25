import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { listResources } from "@/src/modules/bookings/bookings.service";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listResources();
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
