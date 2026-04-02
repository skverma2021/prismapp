import { HttpError, fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import { getContributionById } from "@/src/modules/contributions/contributions.service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireReadRole(_request);
    const { id } = await params;
    const data = await getContributionById(id);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function PATCH(request: Request) {
  try {
    await requireMutationRole(request);
    throw new HttpError(412, "PRECONDITION_FAILED", "Posted contributions are immutable. Use correction flow.");
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function DELETE(request: Request) {
  try {
    await requireMutationRole(request);
    throw new HttpError(412, "PRECONDITION_FAILED", "Posted contributions are immutable. Use correction flow.");
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
