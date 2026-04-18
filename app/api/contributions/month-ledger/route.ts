import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { getContributionMonthLedger } from "@/src/modules/contributions/contributions.service";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await getContributionMonthLedger(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
