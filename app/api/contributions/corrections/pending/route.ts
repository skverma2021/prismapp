import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireAdminRole } from "@/src/lib/authz";
import { listPendingCorrections } from "@/src/modules/contributions/contributions.service";

export async function GET(request: Request) {
  try {
    await requireAdminRole(request);
    const data = await listPendingCorrections();
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
