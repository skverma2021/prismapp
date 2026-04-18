import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import { getContributionRateById, updateContributionRate } from "@/src/modules/contribution-rates/contribution-rates.service";
import { parseUpdateContributionRateInput } from "@/src/modules/contribution-rates/contribution-rates.schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireReadRole(_request);
    const { id } = await params;
    const data = await getContributionRateById(id);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(_request)));
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireMutationRole(request);
    const payload = await request.json();
    const input = parseUpdateContributionRateInput(payload);
    const { id } = await params;
    const data = await updateContributionRate(id, input);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
