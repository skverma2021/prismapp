import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { listResidencyEligibleUnitIds } from "@/src/modules/ownerships/ownerships.service";

export async function GET(request: Request) {
  try {
    await requireReadRole(request);
    const data = await listResidencyEligibleUnitIds();
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}