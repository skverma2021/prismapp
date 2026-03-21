import type { NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { createUnit, listUnits } from "@/src/modules/units/units.service";
import { parseCreateUnitInput } from "@/src/modules/units/units.schemas";

export async function GET(request: NextRequest) {
  try {
    const data = await listUnits(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = parseCreateUnitInput(payload);
    const data = await createUnit(input);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
