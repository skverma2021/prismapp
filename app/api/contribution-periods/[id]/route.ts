import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { getContributionPeriodById } from "@/src/modules/contribution-periods/contribution-periods.service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireReadRole(_request);
    const { id } = await params;
    const data = await getContributionPeriodById(id);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
