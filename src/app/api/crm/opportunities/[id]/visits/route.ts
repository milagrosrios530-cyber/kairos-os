import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { VISIT_MODALITIES } from "@/lib/crm/constants";
import { createOpportunityVisit } from "@/server/crm/mutations";
import { requirePermission } from "@/server/auth/session";
import {
  apiErrorResponse,
  invalidJsonResponse,
  validationErrorResponse,
} from "@/server/http/api-response";

const payloadSchema = z
  .strictObject({
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    mode: z.enum(VISIT_MODALITIES).default("presencial"),
    participantsCount: z.number().int().positive().optional(),
    notes: z.string().trim().min(1).max(5_000).optional(),
    staffId: z.string().uuid().optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .refine((value) => Date.parse(value.endAt) > Date.parse(value.startAt), {
    path: ["endAt"],
    message: "La visita debe terminar después de iniciar.",
  });

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    await requirePermission("visits:create");
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
    await createOpportunityVisit(params.data.id, {
      ...payload.data,
      idempotencyKey: payload.data.idempotencyKey ?? requestId,
    });
    return NextResponse.json(
      { data: { saved: true }, request_id: requestId },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, requestId, "No se pudo programar la visita.");
  }
}
