import type { NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { createBlock, listBlocks } from "@/src/modules/blocks/blocks.service";
import { parseCreateBlockInput } from "@/src/modules/blocks/blocks.schemas";

export async function GET(request: NextRequest) {
  try {
    const data = await listBlocks(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = parseCreateBlockInput(payload);
    const data = await createBlock(input);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
