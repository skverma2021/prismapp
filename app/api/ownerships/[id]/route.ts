import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import {
  deleteOwnership,
  getOwnershipById,
  updateOwnership,
} from "@/src/modules/ownerships/ownerships.service";
import { parseUpdateOwnershipInput } from "@/src/modules/ownerships/ownerships.schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireReadRole(_request);
    const { id } = await params;
    const data = await getOwnershipById(id);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireMutationRole(request);
    const { id } = await params;
    const payload = await request.json();
    const input = parseUpdateOwnershipInput(payload);
    const data = await updateOwnership(id, input);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireMutationRole(_request);
    const { id } = await params;
    await deleteOwnership(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
