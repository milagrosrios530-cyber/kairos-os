import { describe, expect, it } from "vitest";

import {
  broadUtcMonthRange,
  calendarMonthGrid,
  calendarMonthLabel,
  instantDateKey,
  normalizeCalendarMonth,
  shiftCalendarMonth,
} from "@/lib/crm/calendar";

describe("CRM calendar helpers", () => {
  it("normalizes, labels and shifts calendar months", () => {
    expect(normalizeCalendarMonth("2026-12")).toBe("2026-12");
    expect(normalizeCalendarMonth("invalid", new Date("2026-10-20T12:00:00Z"))).toBe(
      "2026-10",
    );
    expect(calendarMonthLabel("2026-12")).toBe("Diciembre de 2026");
    expect(shiftCalendarMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftCalendarMonth("2026-01", -1)).toBe("2025-12");
  });

  it("builds a Monday-first month grid", () => {
    const december = calendarMonthGrid("2026-12");
    expect(december.leadingBlanks).toBe(1);
    expect(december.days).toHaveLength(31);
    expect(december.days[11]).toEqual({ day: 12, dateKey: "2026-12-12" });
  });

  it("maps instants to the organization timezone", () => {
    expect(instantDateKey("2026-12-01T03:00:00Z", "America/Lima")).toBe(
      "2026-11-30",
    );
    const range = broadUtcMonthRange("2026-12");
    expect(range.start).toBe("2026-11-30T00:00:00.000Z");
    expect(range.end).toBe("2027-01-02T00:00:00.000Z");
  });
});
