import { describe, expect, it } from "vitest";

import {
  formatDateTimeInZone,
  localDateTimeToIsoInZone,
} from "@/lib/dates/timezone";

describe("organization timezone helpers", () => {
  it("interprets datetime-local values in the organization timezone", () => {
    expect(
      localDateTimeToIsoInZone("2026-12-12T20:30", "America/Lima"),
    ).toBe("2026-12-13T01:30:00.000Z");
  });

  it("does not depend on the runtime machine timezone when formatting", () => {
    expect(
      formatDateTimeInZone("2026-12-13T01:30:00.000Z", "America/Lima"),
    ).toMatch(/12 dic\.? 2026/);
  });

  it("rejects malformed local date times", () => {
    expect(localDateTimeToIsoInZone("12/12/2026 20:30", "America/Lima"))
      .toBeUndefined();
  });
});
