import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { TASK_STATUSES } from "@/lib/crm/constants";
import { setCrmTaskStatus } from "@/server/crm/mutations";
import {
  apiErrorResponse,
  invalidJsonResponse,
  validationErrorResponse,
} from "@/server/http/api-response";

const payloadSchema = z
  .strictObject({
    status: z.enum(TASK_STATUSES),
    result: z.string().trim().min(1).max(3_000).optional(),
    reason: z.string().trim().min(3).max(1_000).optional(),
    nextAction: z.string().trim().min(1).max(1_000).optional(),
    expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .superRefine((value, context) => {
    if (value.status === "completada" && !value.result) {
      context.addIssue({
        code: "custom",
        path: ["result"],
        message: "Completar una tarea requiere un resultado.",
      });
    }
    if (value.status === "cancelada" && !value.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Cancelar una tarea requiere un motivo.",
      });
    }
  });

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> },
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
      .object({ id: z.string().uuid(), taskId: z.string().uuid() })
      .safeParse(await context.params);
    if (!payload.success || !params.success) {
      return validationErrorResponse(requestId, {
        ...(payload.success ? {} : payload.error.flatten().fieldErrors),
        ...(params.success ? {} : { taskId: ["Identificador inválido."] }),
      });
    }
    await setCrmTaskStatus(params.data.taskId, {
      status: payload.data.status,
      result: payload.data.result,
      reason: payload.data.reason,
      nextAction: payload.data.nextAction,
      expectedUpdatedAt: payload.data.expectedUpdatedAt,
      idempotencyKey: payload.data.idempotencyKey ?? requestId,
    });
    return NextResponse.json({ data: { saved: true }, request_id: requestId });
  } catch (error) {
    return apiErrorResponse(error, requestId, "No se pudo actualizar la tarea.");
  }
}
