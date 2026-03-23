import type { NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { listContributionPeriods } from "@/src/modules/contribution-periods/contribution-periods.service";

export async function GET(request: NextRequest) {
  try {
    const data = await listContributionPeriods(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
