import type { NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireMutationRole } from "@/src/lib/authz";
import { createIndividual, listIndividuals } from "@/src/modules/individuals/individuals.service";
import { parseCreateIndividualInput } from "@/src/modules/individuals/individuals.schemas";

export async function GET(request: NextRequest) {
  try {
    const data = await listIndividuals(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function POST(request: Request) {
  try {
    requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateIndividualInput(payload);
    const data = await createIndividual(input);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
