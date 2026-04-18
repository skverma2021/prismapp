import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { listIndividualLookups } from "@/src/modules/individuals/individuals.service";

export async function GET(request: Request) {
  try {
    await requireReadRole(request);
    const data = await listIndividualLookups();
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
