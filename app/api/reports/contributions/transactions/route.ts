import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import {
  getContributionTransactionsReport,
  parseTransactionsReportParams,
} from "@/src/modules/reports/contributions-reports.service";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const params = parseTransactionsReportParams(request.nextUrl.searchParams);
    const data = await getContributionTransactionsReport(params);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
