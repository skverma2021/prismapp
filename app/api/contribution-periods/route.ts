import type { NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { listContributionPeriods } from "@/src/modules/contribution-periods/contribution-periods.service";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listContributionPeriods(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
