import { NextResponse, type NextRequest } from "next/server";

import { normalizeCalendarMonth } from "@/lib/crm/calendar";
import { getBookingCalendarMonth } from "@/server/bookings/queries";
import { requirePermission } from "@/server/auth/session";
import { apiErrorResponse } from "@/server/http/api-response";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    await requirePermission("calendar:view");
    const month = normalizeCalendarMonth(request.nextUrl.searchParams.get("mes") ?? undefined);
    const data = await getBookingCalendarMonth(month);
    return NextResponse.json({ data, request_id: requestId });
  } catch (error) {
    return apiErrorResponse(error, requestId, "No se pudo consultar el calendario.");
  }
}
