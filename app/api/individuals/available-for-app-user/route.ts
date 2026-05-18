import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireAdminRole } from "@/src/lib/authz";
import { listIndividualsAvailableForAppUser } from "@/src/modules/individuals/individuals.service";

export async function GET(request: NextRequest) {
  try {
    await requireAdminRole(request);
    const data = await listIndividualsAvailableForAppUser();
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
