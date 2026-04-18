import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import { createResidency, listResidencies } from "@/src/modules/residencies/residencies.service";
import { parseCreateResidencyInput } from "@/src/modules/residencies/residencies.schemas";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listResidencies(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function POST(request: Request) {
  try {
    await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateResidencyInput(payload);
    const data = await createResidency(input);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
