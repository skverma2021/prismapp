import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { listOwnershipLookups } from "@/src/modules/ownerships/ownerships.service";

export async function GET(request: Request) {
  try {
    await requireReadRole(request);
    const data = await listOwnershipLookups();
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
