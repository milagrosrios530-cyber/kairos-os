import { NextResponse, type NextRequest } from "next/server";

import { createBlackoutSchema } from "@/lib/validation/bookings";
import { createCalendarBlackout } from "@/server/bookings/mutations";
import {
  apiErrorResponse,
  invalidJsonResponse,
  validationErrorResponse,
} from "@/server/http/api-response";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return invalidJsonResponse(requestId); }
    const payload = createBlackoutSchema.safeParse(body);
    if (!payload.success) {
      return validationErrorResponse(requestId, payload.error.flatten().fieldErrors);
    }
    const result = await createCalendarBlackout(payload.data);
    return NextResponse.json({ data: result, request_id: requestId }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, requestId, "No se pudo bloquear la fecha.");
  }
}
