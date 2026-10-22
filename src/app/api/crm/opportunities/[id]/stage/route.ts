import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { PIPELINE_STATUSES } from "@/lib/crm/constants";
import { transitionOpportunity } from "@/server/crm/mutations";
import { requirePermission } from "@/server/auth/session";
import {
  apiErrorResponse,
  invalidJsonResponse,
  validationErrorResponse,
} from "@/server/http/api-response";

const payloadSchema = z
  .strictObject({
    pipelineStatus: z.enum(PIPELINE_STATUSES),
    lossReason: z.string().trim().min(3).max(1_000).optional(),
    expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .superRefine((value, context) => {
    if (value.pipelineStatus === "ganado") {
      context.addIssue({
        code: "custom",
        path: ["pipelineStatus"],
        message: "Ganado requiere una reserva confirmada y no está habilitado en Hito 2.",
      });
    }
    if (
      ["perdido", "descartado"].includes(value.pipelineStatus) &&
      !value.lossReason
    ) {
      context.addIssue({
        code: "custom",
        path: ["lossReason"],
        message: "Registra el motivo de cierre.",
      });
    }
  });

export async function PATCH(
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
    const payload = payloadSchema.safeParse(body);
    const params = z.object({ id: z.string().uuid() }).safeParse(await context.params);
    if (!payload.success || !params.success) {
      return validationErrorResponse(requestId, {
        ...(payload.success ? {} : payload.error.flatten().fieldErrors),
        ...(params.success ? {} : { opportunityId: ["Identificador inválido."] }),
      });
    }
    const changed = await transitionOpportunity(params.data.id, {
      stage: payload.data.pipelineStatus,
      reason: payload.data.lossReason,
      expectedUpdatedAt: payload.data.expectedUpdatedAt,
      idempotencyKey: payload.data.idempotencyKey ?? requestId,
    });
    return NextResponse.json({ data: changed, request_id: requestId });
  } catch (error) {
    return apiErrorResponse(error, requestId, "No se pudo cambiar la etapa.");
  }
}
