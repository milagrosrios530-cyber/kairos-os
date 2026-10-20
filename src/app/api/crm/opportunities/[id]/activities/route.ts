import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { CRM_ACTIVITY_KINDS } from "@/lib/crm/constants";
import {
  apiErrorResponse,
  invalidJsonResponse,
  validationErrorResponse,
} from "@/server/http/api-response";
import { createOpportunityActivity } from "@/server/crm/mutations";

const payloadSchema = z.strictObject({
  kind: z.enum(CRM_ACTIVITY_KINDS),
  description: z.string().trim().min(1).max(10_000),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return invalidJsonResponse(requestId);
    }
    const payload = payloadSchema.safeParse(body);
    const params = z.object({ id: z.string().uuid() }).safeParse(await context.params);
    if (!payload.success || !params.success) {
      return validationErrorResponse(requestId, {
        ...(payload.success ? {} : payload.error.flatten().fieldErrors),
        ...(params.success ? {} : { opportunityId: ["Identificador inválido."] }),
      });
    }
    await createOpportunityActivity(params.data.id, {
      ...payload.data,
      idempotencyKey: payload.data.idempotencyKey ?? requestId,
    });
    return NextResponse.json(
      { data: { saved: true }, request_id: requestId },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, requestId, "No se pudo registrar la actividad.");
  }
}
