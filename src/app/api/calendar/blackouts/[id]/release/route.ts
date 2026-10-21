import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { bookingReasonSchema } from "@/lib/validation/bookings";
import { releaseCalendarBlackout } from "@/server/bookings/mutations";
import {
  apiErrorResponse,
  invalidJsonResponse,
  validationErrorResponse,
} from "@/server/http/api-response";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return invalidJsonResponse(requestId); }
    const payload = bookingReasonSchema.safeParse(body);
    const params = z.object({ id: z.string().uuid() }).safeParse(await context.params);
    if (!payload.success || !params.success) {
      return validationErrorResponse(requestId, {
        ...(payload.success ? {} : payload.error.flatten().fieldErrors),
        ...(params.success ? {} : { allocationId: ["Identificador inválido."] }),
      });
    }
    const result = await releaseCalendarBlackout(params.data.id, payload.data);
    return NextResponse.json({ data: result, request_id: requestId });
  } catch (error) {
    return apiErrorResponse(error, requestId, "No se pudo liberar el bloqueo.");
  }
}
