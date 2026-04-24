import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole } from "@/src/lib/authz";
import { parseTransferOwnershipInput } from "@/src/modules/ownerships/ownerships.schemas";
import { transferOwnership } from "@/src/modules/ownerships/ownerships.service";

export async function POST(request: Request) {
  try {
    const actor = await requireMutationRole(request);
    const payload = await request.json();
    const input = parseTransferOwnershipInput(payload);
    const data = await transferOwnership(input, actor);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
