import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import { listBookings, createBooking } from "@/src/modules/bookings/bookings.service";
import { parseCreateBookingInput } from "@/src/modules/bookings/bookings.schemas";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listBookings(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireMutationRole(request);
    const payload = await request.json();
    const result = parseCreateBookingInput(payload);
    if (!result.ok) {
      return fail(fromUnknownError(new Error(result.error), getRequestId(request)));
    }
    const data = await createBooking(result.value, actor);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
