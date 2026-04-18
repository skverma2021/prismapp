import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { listResidentEligibleUnitIds } from "@/src/modules/residencies/residencies.service";

export async function GET(request: Request) {
  try {
    await requireReadRole(request);
    const data = await listResidentEligibleUnitIds();
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
