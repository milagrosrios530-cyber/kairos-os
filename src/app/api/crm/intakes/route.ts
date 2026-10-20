import { NextResponse, type NextRequest } from "next/server";

import { crmIntakeRequestSchema } from "@/lib/validation/crm";
import { createCrmIntake } from "@/server/crm/mutations";
import {
  apiErrorResponse,
  invalidJsonResponse,
  validationErrorResponse,
} from "@/server/http/api-response";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return invalidJsonResponse(requestId);
    }

    const payload = crmIntakeRequestSchema.safeParse(body);
    if (!payload.success) {
      return validationErrorResponse(
        requestId,
        payload.error.flatten().fieldErrors,
      );
    }

    const result = await createCrmIntake(payload.data);
    return NextResponse.json(
      { data: result, request_id: requestId },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      requestId,
      "No se pudo guardar el cliente y la oportunidad.",
    );
  }
}
