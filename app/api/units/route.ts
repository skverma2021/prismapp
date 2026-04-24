import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import { createUnit, listUnits } from "@/src/modules/units/units.service";
import { parseCreateUnitInput } from "@/src/modules/units/units.schemas";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listUnits(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateUnitInput(payload);
    const data = await createUnit(input, actor);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
