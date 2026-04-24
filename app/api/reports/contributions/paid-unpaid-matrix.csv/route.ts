import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId } from "@/src/lib/api-response";
import { requireReadRole } from "@/src/lib/authz";
import {
  getPaidUnpaidMatrixCsv,
  parseMatrixReportParams,
} from "@/src/modules/reports/contributions-reports.service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireReadRole(request);
    const params = parseMatrixReportParams(request.nextUrl.searchParams);
    const csv = await getPaidUnpaidMatrixCsv(params, auth);

    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="contribution-paid-unpaid-matrix-${params.refYear}.csv"`,
      },
    });
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
