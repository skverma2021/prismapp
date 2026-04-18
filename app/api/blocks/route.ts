import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import { createBlock, listBlocks } from "@/src/modules/blocks/blocks.service";
import { parseCreateBlockInput } from "@/src/modules/blocks/blocks.schemas";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listBlocks(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateBlockInput(payload);
    const data = await createBlock(input);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
