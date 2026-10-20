import { describe, expect, it } from "vitest";

import {
  crmActivityIntakeSchema,
  crmIntakeRequestSchema,
  customerDuplicateCheckSchema,
  customerIntakeSchema,
  normalizePhoneE164,
  opportunityIntakeSchema,
  opportunityTransitionSchema,
  taskIntakeSchema,
  taskRescheduleSchema,
  taskTransitionSchema,
  visitIntakeSchema,
  visitTransitionSchema,
} from "@/lib/validation/crm";

const customerId = "11111111-1111-4111-8111-111111111111";
const opportunityId = "22222222-2222-4222-8222-222222222222";
const eventTypeId = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";
const idempotencyKey = "55555555-5555-4555-8555-555555555555";
const updatedAt = "2026-10-20T09:00:00-05:00";

const validCustomer = {
  fullName: "Cliente DEMO",
  customerType: "persona" as const,
  phoneE164: "987 654 321",
  preferredContactChannel: "whatsapp" as const,
};

const validOpportunity = {
  customerId,
  eventTypeId,
  desiredDate: "2027-09-18",
  totalGuests: 120,
  modality: "integral" as const,
  source: "referido" as const,
};

const validCrmIntake = {
  fullName: "Cliente integral DEMO",
  customerType: "persona" as const,
  phone: "987 654 321",
  preferredContactChannel: "whatsapp" as const,
  eventTypeId,
  desiredDate: "2027-09-18",
  guestsAdults: 100,
  guestsChildren: 20,
  guestsTotal: 120,
  modality: "integral" as const,
  source: "referido" as const,
  serviceInterests: ["decoracion", "catering"],
  proposedAmountCents: 420_000,
  proposalServicesSummary: "Propuesta referencial DEMO",
  idempotencyKey,
};

describe("CRM phone normalization", () => {
  it("normalizes a Peruvian mobile number and explicit international numbers", () => {
    expect(normalizePhoneE164("987 654 321")).toBe("+51987654321");
    expect(normalizePhoneE164("51987654321")).toBe("+51987654321");
    expect(normalizePhoneE164("+1 (415) 555-2671")).toBe("+14155552671");
    expect(normalizePhoneE164("0034 612 34 56 78")).toBe("+34612345678");
  });

  it("rejects ambiguous, short or alphabetic values", () => {
    expect(normalizePhoneE164("1234567")).toBeNull();
    expect(normalizePhoneE164("987-ABC-321")).toBeNull();
    expect(normalizePhoneE164(" ")).toBeNull();
  });
});

describe("customer intake validation", () => {
  it("normalizes phone and accepts an optional, coherent DNI", () => {
    const result = customerIntakeSchema.parse({
      ...validCustomer,
      documentType: "dni",
      documentNumber: "12345678",
    });

    expect(result.phoneE164).toBe("+51987654321");
    expect(result.documentNumber).toBe("12345678");
    expect(result.marketingConsent).toBe(false);
  });

  it("requires document type and number together and validates DNI length", () => {
    expect(
      customerIntakeSchema.safeParse({
        ...validCustomer,
        documentType: "dni",
      }).success,
    ).toBe(false);
    expect(
      customerIntakeSchema.safeParse({
        ...validCustomer,
        documentType: "dni",
        documentNumber: "1234567",
      }).success,
    ).toBe(false);
  });

  it("requires evidence when marketing consent is true", () => {
    expect(
      customerIntakeSchema.safeParse({
        ...validCustomer,
        marketingConsent: true,
      }).success,
    ).toBe(false);
    expect(
      customerIntakeSchema.safeParse({
        ...validCustomer,
        marketingConsent: true,
        marketingConsentAt: "2026-10-20T09:00:00-05:00",
        marketingConsentTextVersion: "privacy-v1",
      }).success,
    ).toBe(true);
  });

  it("rejects forged authority fields instead of silently accepting them", () => {
    expect(
      customerIntakeSchema.safeParse({
        ...validCustomer,
        organizationId: customerId,
        createdBy: userId,
      }).success,
    ).toBe(false);
  });

  it("checks duplicate candidates without making the phone globally unique", () => {
    const result = customerDuplicateCheckSchema.parse({
      phoneE164: "987654321",
    });
    expect(result.phoneE164).toBe("+51987654321");
    expect(customerDuplicateCheckSchema.safeParse({}).success).toBe(false);
  });
});

describe("opportunity intake validation", () => {
  it("marks dates and proposed prices as tentative and referential", () => {
    const result = opportunityIntakeSchema.parse({
      ...validOpportunity,
      proposedPriceCents: 420_000,
    });

    expect(result.dateNature).toBe("tentativa");
    expect(result.priceNature).toBe("referencial");
    expect(result.priceCurrency).toBe("PEN");
    expect(result.pipelineStatus).toBe("nuevo");
  });

  it("rejects invalid calendar dates, official prices and fractional cents", () => {
    expect(
      opportunityIntakeSchema.safeParse({
        ...validOpportunity,
        desiredDate: "2027-02-30",
      }).success,
    ).toBe(false);
    expect(
      opportunityIntakeSchema.safeParse({
        ...validOpportunity,
        priceNature: "oficial",
      }).success,
    ).toBe(false);
    expect(
      opportunityIntakeSchema.safeParse({
        ...validOpportunity,
        proposedPriceCents: 10.5,
      }).success,
    ).toBe(false);
  });

  it("limits and deduplicates alternate dates and services", () => {
    expect(
      opportunityIntakeSchema.safeParse({
        ...validOpportunity,
        alternateDates: ["2027-09-19", "2027-09-19"],
      }).success,
    ).toBe(false);
    expect(
      opportunityIntakeSchema.safeParse({
        ...validOpportunity,
        servicesOfInterest: ["catering", "catering"],
      }).success,
    ).toBe(false);
  });

  it("keeps detailed guest counts consistent with the total", () => {
    expect(
      opportunityIntakeSchema.safeParse({
        ...validOpportunity,
        adultGuests: 100,
        minorGuests: 20,
      }).success,
    ).toBe(true);
    expect(
      opportunityIntakeSchema.safeParse({
        ...validOpportunity,
        adultGuests: 99,
        minorGuests: 20,
      }).success,
    ).toBe(false);
  });
});

describe("CRM intake API contract", () => {
  it("accepts a complete request and emits normalized, non-contractual data", () => {
    const result = crmIntakeRequestSchema.parse({
      ...validCrmIntake,
      firstTask: {
        type: "llamada",
        title: "Confirmar datos DEMO",
        dueAt: "2026-10-21T09:00:00-05:00",
        priority: "media",
      },
      firstVisit: {
        startAt: "2026-10-22T11:00:00-05:00",
        endAt: "2026-10-22T12:00:00-05:00",
        participantsCount: 3,
        mode: "presencial",
      },
    });

    expect(result.phoneE164).toBe("+51987654321");
    expect(result).not.toHaveProperty("phone");
    expect(result.dateNature).toBe("tentativa");
    expect(result.proposalNature).toBe("referencial");
    expect(result.proposalCurrency).toBe("PEN");
    expect(result.firstVisit?.participantsCount).toBe(3);
  });

  it("validates duplicate rationale, source detail and guest totals", () => {
    expect(
      crmIntakeRequestSchema.safeParse({
        ...validCrmIntake,
        duplicateOverrideReason: "x",
      }).success,
    ).toBe(false);
    expect(
      crmIntakeRequestSchema.safeParse({
        ...validCrmIntake,
        source: "otro",
      }).success,
    ).toBe(false);
    expect(
      crmIntakeRequestSchema.safeParse({
        ...validCrmIntake,
        guestsAdults: 99,
      }).success,
    ).toBe(false);
  });
});

describe("activity and pipeline transitions", () => {
  it("requires an activity relation and rejects client-supplied authors", () => {
    expect(
      crmActivityIntakeSchema.safeParse({
        kind: "nota",
        description: "Nota DEMO",
      }).success,
    ).toBe(false);
    expect(
      crmActivityIntakeSchema.safeParse({
        opportunityId,
        kind: "nota",
        description: "Nota DEMO",
        authorId: userId,
      }).success,
    ).toBe(false);
  });

  it("blocks won without a confirmed booking and requires closure reasons", () => {
    expect(
      opportunityTransitionSchema.safeParse({
        opportunityId,
        fromStatus: "negociacion",
        toStatus: "ganado",
        expectedUpdatedAt: updatedAt,
      }).success,
    ).toBe(false);
    expect(
      opportunityTransitionSchema.safeParse({
        opportunityId,
        fromStatus: "negociacion",
        toStatus: "perdido",
        expectedUpdatedAt: updatedAt,
      }).success,
    ).toBe(false);
    expect(
      opportunityTransitionSchema.safeParse({
        opportunityId,
        fromStatus: "negociacion",
        toStatus: "perdido",
        reason: "Eligio otra fecha",
        expectedUpdatedAt: updatedAt,
      }).success,
    ).toBe(true);
  });
});

describe("task validation", () => {
  it("only creates pending tasks", () => {
    expect(
      taskIntakeSchema.safeParse({
        opportunityId,
        type: "llamada",
        title: "Seguimiento DEMO",
        dueAt: "2026-10-21T09:00:00-05:00",
      }).success,
    ).toBe(true);
    expect(
      taskIntakeSchema.safeParse({
        opportunityId,
        type: "llamada",
        title: "Seguimiento DEMO",
        dueAt: "2026-10-21T09:00:00-05:00",
        status: "completada",
      }).success,
    ).toBe(false);
  });

  it("requires a result to complete and a reason to cancel", () => {
    const base = {
      taskId: customerId,
      fromStatus: "pendiente" as const,
      expectedUpdatedAt: updatedAt,
    };
    expect(
      taskTransitionSchema.safeParse({ ...base, toStatus: "completada" }).success,
    ).toBe(false);
    expect(
      taskTransitionSchema.safeParse({
        ...base,
        toStatus: "completada",
        result: "Cliente contactado",
      }).success,
    ).toBe(true);
    expect(
      taskTransitionSchema.safeParse({ ...base, toStatus: "cancelada" }).success,
    ).toBe(false);
  });

  it("uses a separate reschedule contract with a reason", () => {
    expect(
      taskRescheduleSchema.safeParse({
        taskId: customerId,
        newDueAt: "2026-10-22T09:00:00-05:00",
        reason: "Cliente solicito otra hora",
        expectedUpdatedAt: updatedAt,
      }).success,
    ).toBe(true);
  });
});

describe("visit validation", () => {
  it("requires an ordered interval and a positive participant count", () => {
    const base = {
      customerId,
      opportunityId,
      startAt: "2026-10-22T11:00:00-05:00",
      endAt: "2026-10-22T12:00:00-05:00",
      participantsCount: 3,
    };
    expect(visitIntakeSchema.safeParse(base).success).toBe(true);
    expect(
      visitIntakeSchema.safeParse({
        ...base,
        endAt: "2026-10-22T10:00:00-05:00",
      }).success,
    ).toBe(false);
    expect(
      visitIntakeSchema.safeParse({ ...base, participantsCount: 0 }).success,
    ).toBe(false);
  });

  it("requires a new ordered interval to mark a visit as rescheduled", () => {
    const base = {
      visitId: customerId,
      fromStatus: "programada" as const,
      toStatus: "reprogramada" as const,
      reason: "Cambio solicitado",
      expectedUpdatedAt: updatedAt,
    };
    expect(visitTransitionSchema.safeParse(base).success).toBe(false);
    expect(
      visitTransitionSchema.safeParse({
        ...base,
        replacementStartAt: "2026-10-23T11:00:00-05:00",
        replacementEndAt: "2026-10-23T12:00:00-05:00",
      }).success,
    ).toBe(true);
  });
});
