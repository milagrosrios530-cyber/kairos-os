import { z } from "zod";

import {
  CONTACT_CHANNELS,
  CRM_ACTIVITY_KINDS,
  CRM_CURRENCY,
  CUSTOMER_TYPES,
  DOCUMENT_TYPES,
  EVENT_MODALITIES,
  LEAD_SOURCES,
  OPPORTUNITY_DATE_NATURE,
  PIPELINE_STATUSES,
  PROPOSED_PRICE_NATURE,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  VISIT_MODALITIES,
  VISIT_STATUSES,
} from "@/lib/crm/constants";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

function emptyToUndefined(value: unknown) {
  if (value === null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

function optionalText(maxLength: number) {
  return z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(maxLength).optional(),
  );
}

function optionalUuid() {
  return z.preprocess(emptyToUndefined, z.string().uuid().optional());
}

function optionalDateTime() {
  return z.preprocess(
    emptyToUndefined,
    z.string().datetime({ offset: true }).optional(),
  );
}

export function normalizePhoneE164(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /[^\d+().\s-]/.test(trimmed)) {
    return null;
  }

  const international = trimmed.startsWith("00")
    ? `+${trimmed.slice(2)}`
    : trimmed;
  const hasExplicitCountryCode = international.startsWith("+");
  const digits = international.replace(/\D/g, "");

  let candidate: string;
  if (hasExplicitCountryCode) {
    candidate = `+${digits}`;
  } else if (/^9\d{8}$/.test(digits)) {
    candidate = `+51${digits}`;
  } else if (/^51\d{9}$/.test(digits)) {
    candidate = `+${digits}`;
  } else {
    return null;
  }

  return E164_PATTERN.test(candidate) ? candidate : null;
}

export const phoneE164Schema = z
  .string()
  .trim()
  .min(1, "Ingresa un telefono.")
  .transform((value, context) => {
    const normalized = normalizePhoneE164(value);
    if (!normalized) {
      context.addIssue({
        code: "custom",
        message: "Ingresa un telefono valido con codigo de pais.",
      });
      return z.NEVER;
    }

    return normalized;
  });

const optionalPhoneE164Schema = z.preprocess(
  emptyToUndefined,
  phoneE164Schema.optional(),
);

const optionalEmailSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .email("Ingresa un correo valido.")
    .max(254)
    .transform((value) => value.toLowerCase())
    .optional(),
);

export const tentativeDateSchema = z
  .string()
  .regex(ISO_DATE_PATTERN, "Usa una fecha con formato AAAA-MM-DD.")
  .refine(
    (value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
    },
    { message: "Ingresa una fecha real." },
  );

export const moneyCentsSchema = z
  .number()
  .int("El importe debe expresarse en centimos enteros.")
  .nonnegative("El importe no puede ser negativo.")
  .max(Number.MAX_SAFE_INTEGER, "El importe excede el limite tecnico seguro.");

const documentNumberSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[\p{L}\d-]+$/u, "Usa solo letras, numeros o guion.")
    .transform((value) => value.toUpperCase())
    .optional(),
);

export const customerIntakeSchema = z
  .strictObject({
    fullName: z.string().trim().min(3).max(160),
    customerType: z.enum(CUSTOMER_TYPES),
    phoneE164: phoneE164Schema,
    secondaryPhoneE164: optionalPhoneE164Schema,
    email: optionalEmailSchema,
    documentType: z.preprocess(
      emptyToUndefined,
      z.enum(DOCUMENT_TYPES).optional(),
    ),
    documentNumber: documentNumberSchema,
    organizationName: optionalText(160),
    district: optionalText(100),
    city: optionalText(100),
    preferredContactChannel: z.enum(CONTACT_CHANNELS).default("whatsapp"),
    marketingConsent: z.boolean().default(false),
    marketingConsentAt: optionalDateTime(),
    marketingConsentTextVersion: optionalText(80),
    internalNotes: optionalText(4_000),
    assignedTo: optionalUuid(),
  })
  .superRefine((value, context) => {
    const hasDocumentType = value.documentType !== undefined;
    const hasDocumentNumber = value.documentNumber !== undefined;

    if (hasDocumentType !== hasDocumentNumber) {
      context.addIssue({
        code: "custom",
        path: hasDocumentType ? ["documentNumber"] : ["documentType"],
        message: "Completa el tipo y numero de documento juntos.",
      });
    }

    if (value.documentType === "dni" && !/^\d{8}$/.test(value.documentNumber ?? "")) {
      context.addIssue({
        code: "custom",
        path: ["documentNumber"],
        message: "El DNI debe contener exactamente 8 digitos.",
      });
    }

    if (value.documentType === "ruc" && !/^\d{11}$/.test(value.documentNumber ?? "")) {
      context.addIssue({
        code: "custom",
        path: ["documentNumber"],
        message: "El RUC debe contener exactamente 11 digitos.",
      });
    }

    if (value.secondaryPhoneE164 === value.phoneE164) {
      context.addIssue({
        code: "custom",
        path: ["secondaryPhoneE164"],
        message: "El telefono secundario debe ser diferente.",
      });
    }

    if (
      value.marketingConsent &&
      (!value.marketingConsentAt || !value.marketingConsentTextVersion)
    ) {
      context.addIssue({
        code: "custom",
        path: ["marketingConsent"],
        message: "Registra fecha y version del consentimiento de marketing.",
      });
    }
  });

const serviceOfInterestSchema = z.string().trim().min(2).max(80);

export const crmServiceDetailSchema = z.strictObject({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(2).max(120),
  quantity: z.number().positive().max(100_000).optional(),
  unit: optionalText(40),
  details: optionalText(2_000),
});

export const opportunityIntakeSchema = z
  .strictObject({
    customerId: z.string().uuid(),
    eventTypeId: z.string().uuid(),
    assignedTo: optionalUuid(),
    desiredDate: tentativeDateSchema,
    dateNature: z.literal(OPPORTUNITY_DATE_NATURE).default(OPPORTUNITY_DATE_NATURE),
    alternateDates: z.array(tentativeDateSchema).max(3).default([]),
    tentativeStartTime: z.preprocess(
      emptyToUndefined,
      z.string().regex(ISO_TIME_PATTERN).optional(),
    ),
    tentativeEndTime: z.preprocess(
      emptyToUndefined,
      z.string().regex(ISO_TIME_PATTERN).optional(),
    ),
    adultGuests: z.number().int().nonnegative().optional(),
    minorGuests: z.number().int().nonnegative().optional(),
    totalGuests: z.number().int().positive(),
    modality: z.enum(EVENT_MODALITIES),
    servicesOfInterest: z.array(serviceOfInterestSchema).max(20).default([]),
    proposedPriceCents: moneyCentsSchema.optional(),
    priceCurrency: z.literal(CRM_CURRENCY).default(CRM_CURRENCY),
    priceNature: z
      .literal(PROPOSED_PRICE_NATURE)
      .default(PROPOSED_PRICE_NATURE),
    source: z.enum(LEAD_SOURCES),
    firstContactAt: optionalDateTime(),
    nextActionAt: optionalDateTime(),
    decisionMaker: optionalText(160),
    notes: optionalText(4_000),
    pipelineStatus: z.literal("nuevo").default("nuevo"),
    duplicateOverrideReason: optionalText(500),
  })
  .superRefine((value, context) => {
    const uniqueAlternateDates = new Set(value.alternateDates);
    if (uniqueAlternateDates.size !== value.alternateDates.length) {
      context.addIssue({
        code: "custom",
        path: ["alternateDates"],
        message: "Las fechas alternativas no pueden repetirse.",
      });
    }

    if (uniqueAlternateDates.has(value.desiredDate)) {
      context.addIssue({
        code: "custom",
        path: ["alternateDates"],
        message: "Una alternativa no puede repetir la fecha principal.",
      });
    }

    if (
      (value.tentativeStartTime === undefined) !==
      (value.tentativeEndTime === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: value.tentativeStartTime
          ? ["tentativeEndTime"]
          : ["tentativeStartTime"],
        message: "Completa la hora tentativa de inicio y fin.",
      });
    }

    if (
      value.tentativeStartTime &&
      value.tentativeStartTime === value.tentativeEndTime
    ) {
      context.addIssue({
        code: "custom",
        path: ["tentativeEndTime"],
        message: "Las horas tentativas deben ser diferentes.",
      });
    }

    if (value.adultGuests !== undefined || value.minorGuests !== undefined) {
      const detailedTotal = (value.adultGuests ?? 0) + (value.minorGuests ?? 0);
      if (detailedTotal !== value.totalGuests) {
        context.addIssue({
          code: "custom",
          path: ["totalGuests"],
          message: "El total debe coincidir con adultos y menores.",
        });
      }
    }

    if (new Set(value.servicesOfInterest).size !== value.servicesOfInterest.length) {
      context.addIssue({
        code: "custom",
        path: ["servicesOfInterest"],
        message: "No repitas servicios de interes.",
      });
    }
  });

export const crmActivityIntakeSchema = z
  .strictObject({
    customerId: optionalUuid(),
    opportunityId: optionalUuid(),
    kind: z.enum(CRM_ACTIVITY_KINDS),
    description: z.string().trim().min(3).max(4_000),
    occurredAt: optionalDateTime(),
  })
  .refine((value) => value.customerId || value.opportunityId, {
    path: ["customerId"],
    message: "Vincula la actividad con un cliente o una oportunidad.",
  });

export const opportunityTransitionSchema = z
  .strictObject({
    opportunityId: z.string().uuid(),
    fromStatus: z.enum(PIPELINE_STATUSES),
    toStatus: z.enum(PIPELINE_STATUSES),
    reason: optionalText(500),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
  })
  .superRefine((value, context) => {
    if (value.fromStatus === value.toStatus) {
      context.addIssue({
        code: "custom",
        path: ["toStatus"],
        message: "La oportunidad ya se encuentra en esa etapa.",
      });
    }

    if (value.toStatus === "ganado") {
      context.addIssue({
        code: "custom",
        path: ["toStatus"],
        message: "Ganado requiere una reserva confirmada y no se habilita en Hito 2.",
      });
    }

    if (
      (value.toStatus === "perdido" || value.toStatus === "descartado") &&
      !value.reason
    ) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Registra el motivo de cierre.",
      });
    }
  });

export const taskIntakeSchema = z.strictObject({
  opportunityId: z.string().uuid(),
  assigneeId: optionalUuid(),
  type: z.enum(TASK_TYPES),
  title: z.string().trim().min(3).max(160),
  description: optionalText(2_000),
  dueAt: z.string().datetime({ offset: true }),
  priority: z.enum(TASK_PRIORITIES).default("media"),
  status: z.literal("pendiente").default("pendiente"),
});

export const taskTransitionSchema = z
  .strictObject({
    taskId: z.string().uuid(),
    fromStatus: z.enum(TASK_STATUSES),
    toStatus: z.enum(TASK_STATUSES),
    result: optionalText(2_000),
    reason: optionalText(500),
    nextAction: optionalText(500),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
  })
  .superRefine((value, context) => {
    if (value.fromStatus === value.toStatus) {
      context.addIssue({
        code: "custom",
        path: ["toStatus"],
        message: "La tarea ya se encuentra en ese estado.",
      });
    }

    if (value.toStatus === "completada" && !value.result) {
      context.addIssue({
        code: "custom",
        path: ["result"],
        message: "Completar una tarea requiere registrar el resultado.",
      });
    }

    if (value.toStatus === "cancelada" && !value.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Cancelar una tarea requiere un motivo.",
      });
    }
  });

export const taskRescheduleSchema = z.strictObject({
  taskId: z.string().uuid(),
  newDueAt: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(3).max(500),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
});

export const visitIntakeSchema = z
  .strictObject({
    customerId: z.string().uuid(),
    opportunityId: z.string().uuid(),
    staffId: optionalUuid(),
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    participantsCount: z.number().int().positive().optional(),
    mode: z.enum(VISIT_MODALITIES).default("presencial"),
    status: z.literal("programada").default("programada"),
    notes: optionalText(2_000),
  })
  .refine((value) => Date.parse(value.endAt) > Date.parse(value.startAt), {
    path: ["endAt"],
    message: "La visita debe terminar despues de iniciar.",
  });

export const visitTransitionSchema = z
  .strictObject({
    visitId: z.string().uuid(),
    fromStatus: z.enum(VISIT_STATUSES),
    toStatus: z.enum(VISIT_STATUSES),
    reason: optionalText(500),
    notes: optionalText(2_000),
    nextSteps: optionalText(1_000),
    replacementStartAt: optionalDateTime(),
    replacementEndAt: optionalDateTime(),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
  })
  .superRefine((value, context) => {
    if (value.fromStatus === value.toStatus) {
      context.addIssue({
        code: "custom",
        path: ["toStatus"],
        message: "La visita ya se encuentra en ese estado.",
      });
    }

    if (
      (value.toStatus === "cancelada" || value.toStatus === "reprogramada") &&
      !value.reason
    ) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Registra el motivo del cambio.",
      });
    }

    if (
      value.toStatus === "reprogramada" &&
      (!value.replacementStartAt || !value.replacementEndAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["replacementStartAt"],
        message: "Registra el nuevo horario de la visita.",
      });
    }

    if (
      value.replacementStartAt &&
      value.replacementEndAt &&
      Date.parse(value.replacementEndAt) <= Date.parse(value.replacementStartAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["replacementEndAt"],
        message: "La nueva visita debe terminar despues de iniciar.",
      });
    }
  });

export const customerDuplicateCheckSchema = z
  .strictObject({
    phoneE164: optionalPhoneE164Schema,
    email: optionalEmailSchema,
  })
  .refine((value) => value.phoneE164 || value.email, {
    path: ["phoneE164"],
    message: "Ingresa un telefono o correo para buscar coincidencias.",
  });

const firstTaskSchema = z.strictObject({
  type: z.enum(TASK_TYPES),
  title: z.string().trim().min(3).max(160),
  description: optionalText(2_000),
  dueAt: z.string().datetime({ offset: true }),
  priority: z.enum(TASK_PRIORITIES),
});

const firstVisitSchema = z
  .strictObject({
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    participantsCount: z.number().int().positive().optional(),
    mode: z.enum(VISIT_MODALITIES),
    notes: optionalText(2_000),
  })
  .refine((value) => Date.parse(value.endAt) > Date.parse(value.startAt), {
    path: ["endAt"],
    message: "La visita debe terminar despues de iniciar.",
  });

export const crmIntakeRequestSchema = z
  .strictObject({
    existingCustomerId: optionalUuid(),
    fullName: z.string().trim().min(3).max(160),
    customerType: z.enum(CUSTOMER_TYPES),
    phone: phoneE164Schema,
    secondaryPhone: optionalPhoneE164Schema,
    email: optionalEmailSchema,
    documentType: z.preprocess(
      emptyToUndefined,
      z.enum(DOCUMENT_TYPES).optional(),
    ),
    documentNumber: documentNumberSchema,
    affiliationName: optionalText(160),
    district: optionalText(100),
    city: optionalText(100),
    preferredContactChannel: z.enum(CONTACT_CHANNELS),
    internalNotes: optionalText(4_000),
    eventTypeId: z.string().uuid(),
    eventDetail: optionalText(160),
    desiredDate: tentativeDateSchema,
    guestsAdults: z.number().int().nonnegative().optional(),
    guestsChildren: z.number().int().nonnegative().optional(),
    guestsTotal: z.number().int().positive(),
    modality: z.enum(EVENT_MODALITIES),
    source: z.enum(LEAD_SOURCES),
    sourceDetail: optionalText(160),
    serviceInterests: z.array(crmServiceDetailSchema).max(30),
    proposedAmountCents: moneyCentsSchema.optional(),
    proposalServicesSummary: optionalText(2_000),
    opportunityNotes: optionalText(4_000),
    duplicateOverrideReason: z.preprocess(
      emptyToUndefined,
      z.string().trim().min(3).max(500).optional(),
    ),
    assignedTo: optionalUuid(),
    firstTask: firstTaskSchema.optional(),
    firstVisit: firstVisitSchema.optional(),
    idempotencyKey: z.string().uuid(),
  })
  .superRefine((value, context) => {
    const hasDocumentType = value.documentType !== undefined;
    const hasDocumentNumber = value.documentNumber !== undefined;
    if (hasDocumentType !== hasDocumentNumber) {
      context.addIssue({
        code: "custom",
        path: hasDocumentType ? ["documentNumber"] : ["documentType"],
        message: "Completa el tipo y numero de documento juntos.",
      });
    }

    if (value.documentType === "dni" && !/^\d{8}$/.test(value.documentNumber ?? "")) {
      context.addIssue({
        code: "custom",
        path: ["documentNumber"],
        message: "El DNI debe contener exactamente 8 digitos.",
      });
    }

    if (value.documentType === "ruc" && !/^\d{11}$/.test(value.documentNumber ?? "")) {
      context.addIssue({
        code: "custom",
        path: ["documentNumber"],
        message: "El RUC debe contener exactamente 11 digitos.",
      });
    }

    if (value.secondaryPhone === value.phone) {
      context.addIssue({
        code: "custom",
        path: ["secondaryPhone"],
        message: "El telefono secundario debe ser diferente.",
      });
    }

    if (value.guestsAdults !== undefined || value.guestsChildren !== undefined) {
      const detailedTotal =
        (value.guestsAdults ?? 0) + (value.guestsChildren ?? 0);
      if (detailedTotal !== value.guestsTotal) {
        context.addIssue({
          code: "custom",
          path: ["guestsTotal"],
          message: "El total debe coincidir con adultos y menores.",
        });
      }
    }

    if (value.source === "otro" && !value.sourceDetail) {
      context.addIssue({
        code: "custom",
        path: ["sourceDetail"],
        message: "Detalla el origen del contacto.",
      });
    }

    const serviceLabels = value.serviceInterests.map((service) =>
      service.label.toLocaleLowerCase("es-PE"),
    );
    if (new Set(serviceLabels).size !== serviceLabels.length) {
      context.addIssue({
        code: "custom",
        path: ["serviceInterests"],
        message: "No repitas servicios de interes.",
      });
    }
  })
  .transform(({ phone, secondaryPhone, ...value }) => ({
    ...value,
    phoneE164: phone,
    secondaryPhoneE164: secondaryPhone,
    dateNature: OPPORTUNITY_DATE_NATURE,
    proposalNature: PROPOSED_PRICE_NATURE,
    proposalCurrency: CRM_CURRENCY,
    pipelineStatus: "nuevo" as const,
  }));

export const opportunityServicesUpdateSchema = z
  .strictObject({
    services: z.array(crmServiceDetailSchema).min(1).max(30),
    expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
    idempotencyKey: z.string().uuid(),
  })
  .superRefine((value, context) => {
    const labels = value.services.map((service) =>
      service.label.toLocaleLowerCase("es-PE"),
    );
    if (new Set(labels).size !== labels.length) {
      context.addIssue({
        code: "custom",
        path: ["services"],
        message: "No repitas servicios.",
      });
    }
  });

export type CustomerIntake = z.infer<typeof customerIntakeSchema>;
export type OpportunityIntake = z.infer<typeof opportunityIntakeSchema>;
export type CrmActivityIntake = z.infer<typeof crmActivityIntakeSchema>;
export type OpportunityTransition = z.infer<typeof opportunityTransitionSchema>;
export type TaskIntake = z.infer<typeof taskIntakeSchema>;
export type TaskTransition = z.infer<typeof taskTransitionSchema>;
export type TaskReschedule = z.infer<typeof taskRescheduleSchema>;
export type VisitIntake = z.infer<typeof visitIntakeSchema>;
export type VisitTransition = z.infer<typeof visitTransitionSchema>;
export type CrmIntakeRequest = z.infer<typeof crmIntakeRequestSchema>;
export type CrmServiceDetail = z.infer<typeof crmServiceDetailSchema>;
export type OpportunityServicesUpdate = z.infer<
  typeof opportunityServicesUpdateSchema
>;
