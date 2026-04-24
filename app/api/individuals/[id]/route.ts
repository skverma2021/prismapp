import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import {
  deleteIndividual,
  getIndividualById,
  updateIndividual,
} from "@/src/modules/individuals/individuals.service";
import { parseUpdateIndividualInput } from "@/src/modules/individuals/individuals.schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireReadRole(_request);
    const { id } = await params;
    const data = await getIndividualById(id, auth.role);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(_request)));
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireMutationRole(request);
    const { id } = await params;
    const payload = await request.json();
    const input = parseUpdateIndividualInput(payload);
    const data = await updateIndividual(id, input, actor);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireMutationRole(_request);
    const { id } = await params;
    await deleteIndividual(id, actor);
    return new Response(null, { status: 204 });
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(_request)));
  }
}
