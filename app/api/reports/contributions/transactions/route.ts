import type { NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireRole } from "@/src/lib/authz";
import {
  getContributionTransactionsReport,
  parseTransactionsReportParams,
} from "@/src/modules/reports/contributions-reports.service";

export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["SOCIETY_ADMIN", "MANAGER", "READ_ONLY"]);
    const params = parseTransactionsReportParams(request.nextUrl.searchParams);
    const data = await getContributionTransactionsReport(params);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
