import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import {
  deleteContributionHead,
  getContributionHeadById,
  updateContributionHead,
} from "@/src/modules/contribution-heads/contribution-heads.service";
import { parseUpdateContributionHeadInput } from "@/src/modules/contribution-heads/contribution-heads.schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireReadRole(_request);
    const { id } = await params;
    const data = await getContributionHeadById(id);
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
    const input = parseUpdateContributionHeadInput(payload);
    const data = await updateContributionHead(id, input, actor);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireMutationRole(_request);
    const { id } = await params;
    await deleteContributionHead(id, actor);
    return new Response(null, { status: 204 });
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(_request)));
  }
}
