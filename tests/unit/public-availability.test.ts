import { describe, expect, it } from "vitest";

import {
  normalizePublicCalendarMonth,
  publicCalendarNavigation,
  sanitizePublicAvailability,
} from "@/lib/public-availability";

describe("public availability", () => {
  it("limits navigation to the current month and eleven following months", () => {
    expect(normalizePublicCalendarMonth("2026-12", "2026-10")).toBe("2026-12");
    expect(normalizePublicCalendarMonth("2026-09", "2026-10")).toBe("2026-10");
    expect(normalizePublicCalendarMonth("2027-10", "2026-10")).toBe("2026-10");
    expect(publicCalendarNavigation("2026-10", "2026-10")).toMatchObject({
      canGoPrevious: false,
      canGoNext: true,
    });
    expect(publicCalendarNavigation("2027-09", "2026-10")).toMatchObject({
      canGoPrevious: true,
      canGoNext: false,
    });
  });

  it("returns only confirmed dates and times without personal or commercial fields", () => {
    const rows = [
      {
        event_date: "2026-12-12",
        event_start_time: "12:00:00",
        event_end_time: "22:00:00",
        status: "confirmed",
        customer_name: "No debe salir",
        total_contract_cents: 550000,
      },
      {
        event_date: "2026-12-13",
        event_start_time: "15:00:00",
        event_end_time: null,
        status: "held",
      },
    ];

    expect(sanitizePublicAvailability(rows)).toEqual([
      {
        date: "2026-12-12",
        startTime: "12:00",
        endTime: "22:00",
        status: "reserved",
      },
    ]);
  });
});
