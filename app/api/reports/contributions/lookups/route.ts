import type { NextRequest } from "next/server";

import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import { getContributionReportLookups } from "@/src/modules/reports/contributions-reports.service";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await getContributionReportLookups();
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}