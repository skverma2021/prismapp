import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireMutationRole } from "@/src/lib/authz";
import { parseTransferOwnershipInput } from "@/src/modules/ownerships/ownerships.schemas";
import { transferOwnership } from "@/src/modules/ownerships/ownerships.service";

export async function POST(request: Request) {
  try {
    requireMutationRole(request);
    const payload = await request.json();
    const input = parseTransferOwnershipInput(payload);
    const data = await transferOwnership(input);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
