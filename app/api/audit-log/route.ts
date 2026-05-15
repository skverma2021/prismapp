import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireAdminRole } from "@/src/lib/authz";
import { listAuditLog } from "@/src/modules/audit-log/audit-log.service";

export async function GET(request: NextRequest) {
  try {
    await requireAdminRole(request);
    const data = await listAuditLog(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
