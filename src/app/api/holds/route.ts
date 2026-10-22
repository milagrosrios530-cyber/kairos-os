import { NextResponse, type NextRequest } from "next/server";

import { createBookingHoldSchema } from "@/lib/validation/bookings";
import { createBookingHold } from "@/server/bookings/mutations";
import { requirePermission } from "@/server/auth/session";
import {
  apiErrorResponse,
  invalidJsonResponse,
  validationErrorResponse,
} from "@/server/http/api-response";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    await requirePermission("bookings:create");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return invalidJsonResponse(requestId);
    }
    const payload = createBookingHoldSchema.safeParse(body);
    if (!payload.success) {
      return validationErrorResponse(requestId, payload.error.flatten().fieldErrors);
    }
    const result = await createBookingHold(payload.data);
    return NextResponse.json({ data: result, request_id: requestId }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, requestId, "No se pudo retener la fecha.");
  }
}
