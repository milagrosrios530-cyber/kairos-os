import { describe, expect, it } from "vitest";

import {
  canMoveOpportunityTo,
  isPipelineStatus,
  pipelineMoveRequiresReason,
} from "@/lib/crm/pipeline";

describe("CRM pipeline movement", () => {
  it("keeps won locked until a confirmed booking exists", () => {
    expect(canMoveOpportunityTo("ganado")).toBe(false);
    expect(canMoveOpportunityTo("negociacion")).toBe(true);
  });

  it("requires a reason for terminal commercial stages", () => {
    expect(pipelineMoveRequiresReason("perdido")).toBe(true);
    expect(pipelineMoveRequiresReason("descartado")).toBe(true);
    expect(pipelineMoveRequiresReason("calificado")).toBe(false);
  });

  it("rejects stage names outside the product contract", () => {
    expect(isPipelineStatus("visita_programada")).toBe(true);
    expect(isPipelineStatus("reservado")).toBe(false);
  });
});
