import "server-only";

import { hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth/session";
import {
  ApplicationError,
  AuthorizationError,
} from "@/server/errors";

type DatabaseError = {
  code?: string;
  message?: string;
};

export type CreateCrmIntakeInput = {
  existingCustomerId?: string;
  duplicateOverrideReason?: string;
  fullName: string;
  customerType: string;
  phoneE164: string;
  secondaryPhoneE164?: string;
  email?: string;
  documentType?: string;
  documentNumber?: string;
  affiliationName?: string;
  district?: string;
  city?: string;
  preferredContactChannel: string;
  internalNotes?: string;
  eventTypeId: string;
  eventDetail?: string;
  desiredDate: string;
  guestsAdults?: number;
  guestsChildren?: number;
  guestsTotal: number;
  modality: string;
  source: string;
  sourceDetail?: string;
  serviceInterests: Array<{
    label: string;
    quantity?: number;
    unit?: string;
    details?: string;
  }>;
  proposedAmountCents?: number;
  proposalServicesSummary?: string;
  opportunityNotes?: string;
  assignedTo?: string;
  firstTask?: {
    type: string;
    title: string;
    description?: string;
    dueAt: string;
    priority: string;
  };
  firstVisit?: {
    startAt: string;
    endAt: string;
    participantsCount?: number;
    mode: string;
    notes?: string;
  };
  idempotencyKey: string;
};

export type CreateActivityInput = {
  kind: string;
  description: string;
  occurredAt?: string;
  idempotencyKey: string;
};

export type CreateTaskInput = {
  type: string;
  title: string;
  description?: string;
  dueAt: string;
  priority: string;
  assigneeId?: string;
  idempotencyKey: string;
};

export type CompleteTaskInput = {
  status?: string;
  result?: string;
  reason?: string;
  completionNote?: string;
  nextAction?: string;
  expectedUpdatedAt?: string;
  idempotencyKey: string;
};

export type CreateVisitInput = {
  startAt: string;
  endAt: string;
  mode: string;
  participantsCount?: number;
  notes?: string;
  staffId?: string;
  idempotencyKey: string;
};

export type SetVisitStatusInput = {
  status: string;
  outcome?: string;
  nextSteps?: string;
  expectedUpdatedAt?: string;
  idempotencyKey: string;
};

export type TransitionOpportunityInput = {
  stage: string;
  reason?: string;
  expectedUpdatedAt?: string;
  idempotencyKey: string;
};

export type UpdateOpportunityServicesInput = {
  services: Array<{
    id?: string;
    label: string;
    quantity?: number;
    unit?: string;
    details?: string;
  }>;
  expectedUpdatedAt?: string;
  idempotencyKey: string;
};

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 4 ? `••• ••• ${digits.slice(-4)}` : "••••";
}

function mapDatabaseError(error: DatabaseError, fallback: string): never {
  if (error.code === "42501") throw new AuthorizationError();
  if (error.code === "P0002") {
    throw new ApplicationError(
      "CRM_RECORD_NOT_FOUND",
      404,
      "El registro no existe o no está disponible para tu usuario.",
    );
  }
  if (error.code === "40001") {
    throw new ApplicationError(
      "STALE_CRM_RECORD",
      409,
      "El registro cambió mientras lo editabas. Actualiza la página e inténtalo nuevamente.",
    );
  }
  if (error.code === "23505") {
    throw new ApplicationError(
      "CRM_CONFLICT",
      409,
      "La operación ya fue registrada o entra en conflicto con otro cambio.",
    );
  }
  if (["22023", "23503", "23514", "P0001"].includes(error.code ?? "")) {
    throw new ApplicationError("CRM_RULE_VIOLATION", 422, fallback);
  }
  throw new ApplicationError("CRM_DATABASE_ERROR", 500, fallback);
}

async function visibleOpportunity(opportunityId: string) {
  const viewer = await requirePermission("crm:view");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, customer_id, assigned_to, pipeline_status, updated_at")
    .eq("organization_id", viewer.organizationId)
    .eq("id", opportunityId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new ApplicationError("CRM_LOOKUP_FAILED", 500, "No se pudo validar la oportunidad.");
  if (!data) {
    throw new ApplicationError(
      "CRM_RECORD_NOT_FOUND",
      404,
      "La oportunidad no existe o no está disponible para tu usuario.",
    );
  }
  return { viewer, supabase, opportunity: data };
}

export async function createCrmIntake(input: CreateCrmIntakeInput) {
  const viewer = await requirePermission("crm:create");
  const supabase = await createClient();
  const canManageAll = hasPermission(viewer.roles, "crm:manage_all");
  const assignedTo = canManageAll && input.assignedTo
    ? input.assignedTo
    : viewer.userId;

  if (!input.existingCustomerId) {
    const { data: matches, error: matchError } = await supabase
      .from("customers")
      .select("id, full_name, phone_e164")
      .eq("organization_id", viewer.organizationId)
      .eq("phone_e164", input.phoneE164)
      .is("archived_at", null)
      .limit(5);

    if (matchError) {
      throw new ApplicationError(
        "CUSTOMER_MATCH_FAILED",
        500,
        "No se pudo comprobar si el cliente ya existe.",
      );
    }

    if ((matches?.length ?? 0) > 0 && !input.duplicateOverrideReason) {
      throw new ApplicationError(
        "CUSTOMER_MATCH_REQUIRES_CHOICE",
        409,
        "Encontramos una ficha con el mismo teléfono.",
        {
          matches: (matches ?? []).map((match) => ({
            id: match.id,
            fullName: match.full_name,
            maskedPhone: maskPhone(match.phone_e164),
          })),
        },
      );
    }
  }

  const { data, error } = await supabase.rpc("create_crm_intake_v2", {
    p_full_name: input.fullName,
    p_phone_e164: input.phoneE164,
    p_customer_type: input.customerType,
    p_assigned_to: assignedTo,
    p_event_type_id: input.eventTypeId,
    p_desired_date: input.desiredDate,
    p_guests_total: input.guestsTotal,
    p_modality: input.modality,
    p_source: input.source,
    p_existing_customer_id: input.existingCustomerId ?? null,
    p_customer: {
      secondary_phone_e164: input.secondaryPhoneE164,
      email: input.email,
      document_type: input.documentType,
      document_number: input.documentNumber,
      affiliation_name: input.affiliationName,
      district: input.district,
      city: input.city,
      preferred_contact_channel: input.preferredContactChannel,
      internal_notes: input.internalNotes,
      duplicate_override_reason: input.duplicateOverrideReason,
    },
    p_opportunity: {
      guests_adults: input.guestsAdults,
      guests_children: input.guestsChildren,
      source_detail: input.sourceDetail,
      occasion_detail: input.eventDetail,
      notes: input.opportunityNotes,
    },
    p_alternate_dates: [],
    p_service_interests: input.serviceInterests,
    p_proposal:
      input.proposedAmountCents !== undefined || input.proposalServicesSummary
        ? {
            amount_cents: input.proposedAmountCents,
            services_summary: input.proposalServicesSummary,
            currency: "PEN",
          }
        : null,
    p_first_task: input.firstTask
      ? {
          type: input.firstTask.type,
          title: input.firstTask.title,
          description: input.firstTask.description,
          due_at: input.firstTask.dueAt,
          priority: input.firstTask.priority,
        }
      : null,
    p_first_visit: input.firstVisit
      ? {
          start_at: input.firstVisit.startAt,
          end_at: input.firstVisit.endAt,
          participants_count: input.firstVisit.participantsCount,
          mode: input.firstVisit.mode,
          notes: input.firstVisit.notes,
        }
      : null,
    p_idempotency_key: input.idempotencyKey,
  });

  if (error) {
    mapDatabaseError(
      error,
      "No se pudo guardar el cliente y la oportunidad. Revisa los datos.",
    );
  }

  const result = data as {
    customer_id: string;
    opportunity_id: string;
    opportunity_code: string;
  };
  return {
    customerId: result.customer_id,
    opportunityId: result.opportunity_id,
    opportunityCode: result.opportunity_code,
  };
}

export async function createOpportunityActivity(
  opportunityId: string,
  input: CreateActivityInput,
) {
  await requirePermission("crm:create");
  const { supabase, opportunity } = await visibleOpportunity(opportunityId);
  const { data, error } = await supabase.rpc("create_crm_activity", {
    p_customer_id: opportunity.customer_id,
    p_opportunity_id: opportunity.id,
    p_kind: input.kind,
    p_description: input.description,
    p_occurred_at: input.occurredAt ?? new Date().toISOString(),
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapDatabaseError(error, "No se pudo registrar la actividad.");
  return data;
}

export async function createOpportunityTask(
  opportunityId: string,
  input: CreateTaskInput,
) {
  const viewer = await requirePermission("tasks:create");
  const { supabase, opportunity } = await visibleOpportunity(opportunityId);
  const canManageAll = hasPermission(viewer.roles, "crm:manage_all");
  const { data, error } = await supabase.rpc("create_crm_task", {
    p_customer_id: opportunity.customer_id,
    p_opportunity_id: opportunity.id,
    p_type: input.type,
    p_title: input.title,
    p_due_at: input.dueAt,
    p_assignee_id: canManageAll && input.assigneeId ? input.assigneeId : viewer.userId,
    p_description: input.description ?? null,
    p_priority: input.priority,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapDatabaseError(error, "No se pudo crear la tarea.");
  return data;
}

export async function completeCrmTask(taskId: string, input: CompleteTaskInput) {
  await requirePermission("tasks:create");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_crm_task", {
    p_task_id: taskId,
    p_result: input.result ?? "",
    p_completion_note: input.completionNote ?? null,
    p_next_action: input.nextAction ?? null,
    p_expected_updated_at: input.expectedUpdatedAt ?? null,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapDatabaseError(error, "No se pudo completar la tarea.");
  return data;
}

export async function setCrmTaskStatus(taskId: string, input: CompleteTaskInput) {
  await requirePermission("tasks:create");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_crm_task_status", {
    p_task_id: taskId,
    p_new_status: input.status ?? "completada",
    p_result: input.result || null,
    p_reason: input.reason ?? null,
    p_next_action: input.nextAction ?? null,
    p_expected_updated_at: input.expectedUpdatedAt ?? null,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapDatabaseError(error, "No se pudo actualizar la tarea.");
  return data;
}

export async function createOpportunityVisit(
  opportunityId: string,
  input: CreateVisitInput,
) {
  const viewer = await requirePermission("visits:create");
  const { supabase, opportunity } = await visibleOpportunity(opportunityId);
  const canManageAll = hasPermission(viewer.roles, "crm:manage_all");
  const { data, error } = await supabase.rpc("create_crm_visit", {
    p_customer_id: opportunity.customer_id,
    p_opportunity_id: opportunity.id,
    p_start_at: input.startAt,
    p_end_at: input.endAt,
    p_mode: input.mode,
    p_staff_id: canManageAll && input.staffId ? input.staffId : viewer.userId,
    p_participants_count: input.participantsCount ?? null,
    p_notes: input.notes ?? null,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapDatabaseError(error, "No se pudo agendar la visita.");
  return data;
}

export async function setCrmVisitStatus(
  visitId: string,
  input: SetVisitStatusInput,
) {
  await requirePermission("visits:create");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_crm_visit_status", {
    p_visit_id: visitId,
    p_new_status: input.status,
    p_outcome: input.outcome ?? null,
    p_next_steps: input.nextSteps ?? null,
    p_expected_updated_at: input.expectedUpdatedAt ?? null,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapDatabaseError(error, "No se pudo actualizar la visita.");
  return data;
}

export async function transitionOpportunity(
  opportunityId: string,
  input: TransitionOpportunityInput,
) {
  await requirePermission("crm:create");
  await visibleOpportunity(opportunityId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("transition_opportunity", {
    p_opportunity_id: opportunityId,
    p_new_stage: input.stage,
    p_reason: input.reason ?? null,
    p_expected_updated_at: input.expectedUpdatedAt ?? null,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapDatabaseError(error, "No se pudo cambiar la etapa de la oportunidad.");
  return data;
}

export async function updateOpportunityServices(
  opportunityId: string,
  input: UpdateOpportunityServicesInput,
) {
  await requirePermission("crm:create");
  const { supabase } = await visibleOpportunity(opportunityId);
  const { data, error } = await supabase.rpc(
    "upsert_opportunity_service_details",
    {
      p_opportunity_id: opportunityId,
      p_services: input.services,
      p_expected_updated_at: input.expectedUpdatedAt ?? null,
      p_idempotency_key: input.idempotencyKey,
    },
  );
  if (error) {
    mapDatabaseError(error, "No se pudieron actualizar los servicios.");
  }
  return data;
}

