import { describe, expect, it } from "vitest";

import {
  createBookingHoldSchema,
  submitBookingDepositSchema,
} from "@/lib/validation/bookings";

const validHold = {
  opportunityId: "11111111-1111-4111-8111-111111111111",
  venueId: "22222222-2222-4222-8222-222222222222",
  eventDate: "2026-11-30",
  eventStartTime: "18:00",
  eventEndTime: "04:00",
  totalContractCents: 1_550_000,
  idempotencyKey: "33333333-3333-4333-8333-333333333333",
};

describe("booking validation", () => {
  it("accepts a real contractual amount without treating it as a tariff", () => {
    expect(createBookingHoldSchema.safeParse(validHold).success).toBe(true);
  });

  it("rejects impossible dates and equal start/end times", () => {
    expect(createBookingHoldSchema.safeParse({
      ...validHold,
      eventDate: "2026-02-30",
    }).success).toBe(false);
    expect(createBookingHoldSchema.safeParse({
      ...validHold,
      eventEndTime: "18:00",
    }).success).toBe(false);
  });

  it("requires at least S/500 for the reservation deposit", () => {
    const result = submitBookingDepositSchema.safeParse({
      amountCents: 49_999,
      paymentMethod: "yape",
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
    });
    expect(result.success).toBe(false);
  });
});
