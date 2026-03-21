import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { deleteBlock, getBlockById, updateBlock } from "@/src/modules/blocks/blocks.service";
import { parseUpdateBlockInput } from "@/src/modules/blocks/blocks.schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getBlockById(id);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const input = parseUpdateBlockInput(payload);
    const data = await updateBlock(id, input);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteBlock(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
