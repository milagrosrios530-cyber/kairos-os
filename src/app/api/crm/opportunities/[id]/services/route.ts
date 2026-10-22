import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { opportunityServicesUpdateSchema } from "@/lib/validation/crm";
import { updateOpportunityServices } from "@/server/crm/mutations";
import { requirePermission } from "@/server/auth/session";
import {
  apiErrorResponse,
  invalidJsonResponse,
  validationErrorResponse,
} from "@/server/http/api-response";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();

  try {
    await requirePermission("crm:create");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return invalidJsonResponse(requestId);
    }

    const payload = opportunityServicesUpdateSchema.safeParse({
      ...(typeof body === "object" && body !== null ? body : {}),
      idempotencyKey:
        typeof body === "object" &&
        body !== null &&
        "idempotencyKey" in body &&
        typeof body.idempotencyKey === "string"
          ? body.idempotencyKey
          : requestId,
    });
    const params = z.object({ id: z.string().uuid() }).safeParse(await context.params);

    if (!payload.success || !params.success) {
      return validationErrorResponse(requestId, {
        ...(payload.success ? {} : payload.error.flatten().fieldErrors),
        ...(params.success ? {} : { opportunityId: ["Identificador inválido."] }),
      });
    }

    const result = await updateOpportunityServices(params.data.id, payload.data);
    return NextResponse.json({ data: result, request_id: requestId });
  } catch (error) {
    return apiErrorResponse(
      error,
      requestId,
      "No se pudieron actualizar los servicios.",
    );
  }
}
