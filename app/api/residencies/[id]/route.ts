import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import {
  deleteResidency,
  getResidencyById,
  updateResidency,
} from "@/src/modules/residencies/residencies.service";
import { parseUpdateResidencyInput } from "@/src/modules/residencies/residencies.schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireReadRole(_request);
    const { id } = await params;
    const data = await getResidencyById(id);
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
    const input = parseUpdateResidencyInput(payload);
    const data = await updateResidency(id, input, actor);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireMutationRole(_request);
    const { id } = await params;
    await deleteResidency(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(_request)));
  }
}
