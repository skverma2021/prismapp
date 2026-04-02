import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { getContributionRateById } from "@/src/modules/contribution-rates/contribution-rates.service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireReadRole(_request);
    const { id } = await params;
    const data = await getContributionRateById(id);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
