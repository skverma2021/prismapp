import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { listContributionHeadLookups } from "@/src/modules/contribution-heads/contribution-heads.service";

export async function GET(request: Request) {
  try {
    await requireReadRole(request);
    const data = await listContributionHeadLookups();
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
