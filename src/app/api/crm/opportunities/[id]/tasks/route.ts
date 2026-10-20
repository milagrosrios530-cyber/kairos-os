import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { TASK_PRIORITIES, TASK_TYPES } from "@/lib/crm/constants";
import { createOpportunityTask } from "@/server/crm/mutations";
import {
  apiErrorResponse,
  invalidJsonResponse,
  validationErrorResponse,
} from "@/server/http/api-response";

const payloadSchema = z.strictObject({
  type: z.enum(TASK_TYPES),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(1).max(5_000).optional(),
  dueAt: z.string().datetime({ offset: true }),
  priority: z.enum(TASK_PRIORITIES).default("media"),
  assigneeId: z.string().uuid().optional(),
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
    await createOpportunityTask(params.data.id, {
      ...payload.data,
      idempotencyKey: payload.data.idempotencyKey ?? requestId,
    });
    return NextResponse.json(
      { data: { saved: true }, request_id: requestId },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, requestId, "No se pudo crear la tarea.");
  }
}
