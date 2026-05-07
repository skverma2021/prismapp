import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { listBlockLookups } from "@/src/modules/blocks/blocks.service";

export async function GET(request: Request) {
  try {
    await requireReadRole(request);
    const data = await listBlockLookups();
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
