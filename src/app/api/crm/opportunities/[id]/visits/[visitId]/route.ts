import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { VISIT_STATUSES } from "@/lib/crm/constants";
import { setCrmVisitStatus } from "@/server/crm/mutations";
import {
  apiErrorResponse,
  invalidJsonResponse,
  validationErrorResponse,
} from "@/server/http/api-response";

const payloadSchema = z
  .strictObject({
    status: z.enum(VISIT_STATUSES),
    notes: z.string().trim().min(1).max(5_000).optional(),
    nextSteps: z.string().trim().min(1).max(3_000).optional(),
    expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .superRefine((value, context) => {
    if (
      ["realizada", "no_asistio", "cancelada"].includes(value.status) &&
      !value.notes
    ) {
      context.addIssue({
        code: "custom",
        path: ["notes"],
        message: "Registra el resultado o motivo de la visita.",
      });
    }
    if (value.status === "reprogramada") {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Reprogramar requiere crear una nueva visita para conservar el historial.",
      });
    }
  });

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; visitId: string }> },
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
    const params = z
      .object({ id: z.string().uuid(), visitId: z.string().uuid() })
      .safeParse(await context.params);
    if (!payload.success || !params.success) {
      return validationErrorResponse(requestId, {
        ...(payload.success ? {} : payload.error.flatten().fieldErrors),
        ...(params.success ? {} : { visitId: ["Identificador inválido."] }),
      });
    }
    await setCrmVisitStatus(params.data.visitId, {
      status: payload.data.status,
      outcome: payload.data.notes,
      nextSteps: payload.data.nextSteps,
      expectedUpdatedAt: payload.data.expectedUpdatedAt,
      idempotencyKey: payload.data.idempotencyKey ?? requestId,
    });
    return NextResponse.json({ data: { saved: true }, request_id: requestId });
  } catch (error) {
    return apiErrorResponse(error, requestId, "No se pudo actualizar la visita.");
  }
}
