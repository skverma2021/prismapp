import type { NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { getContributionMonthLedger } from "@/src/modules/contributions/contributions.service";

export async function GET(request: NextRequest) {
  try {
    const data = await getContributionMonthLedger(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
