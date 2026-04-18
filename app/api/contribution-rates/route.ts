import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import {
  createContributionRate,
  listContributionRates,
} from "@/src/modules/contribution-rates/contribution-rates.service";
import { parseCreateContributionRateInput } from "@/src/modules/contribution-rates/contribution-rates.schemas";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listContributionRates(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function POST(request: Request) {
  try {
    await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateContributionRateInput(payload);
    const data = await createContributionRate(input);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
