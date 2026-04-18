import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { listUnitLookups } from "@/src/modules/units/units.service";

export async function GET(request: Request) {
  try {
    await requireReadRole(request);
    const data = await listUnitLookups();
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
