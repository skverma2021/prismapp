import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import {
  deleteIndividual,
  getIndividualById,
  updateIndividual,
} from "@/src/modules/individuals/individuals.service";
import { parseUpdateIndividualInput } from "@/src/modules/individuals/individuals.schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getIndividualById(id);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const input = parseUpdateIndividualInput(payload);
    const data = await updateIndividual(id, input);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteIndividual(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
