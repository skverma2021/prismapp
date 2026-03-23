import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { getContributionRateById } from "@/src/modules/contribution-rates/contribution-rates.service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getContributionRateById(id);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
