import { NextResponse, type NextRequest } from "next/server";

import { getPublicAvailabilityMonth, publicRequestKey } from "@/server/public-availability";
import { apiErrorResponse } from "@/server/http/api-response";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const data = await getPublicAvailabilityMonth(
      request.nextUrl.searchParams.get("mes"),
      publicRequestKey(request.headers),
    );
    return NextResponse.json(
      { data, request_id: requestId },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      requestId,
      "No se pudo consultar la disponibilidad pública.",
    );
  }
}
