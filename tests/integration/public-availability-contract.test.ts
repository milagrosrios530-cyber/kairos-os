import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const service = readFileSync(
  join(process.cwd(), "src", "server", "public-availability.ts"),
  "utf8",
);

describe("public availability security contract", () => {
  it("queries only confirmed booking schedule fields and keeps rate limiting server-side", () => {
    expect(service).toContain(
      '.select("event_date, event_start_time, event_end_time, status")',
    );
    expect(service).toContain('.eq("status", "confirmed")');
    expect(service).toContain('admin.rpc("consume_staff_login_rate_limit"');
    expect(service).not.toContain("customer_id");
    expect(service).not.toContain("customerName");
    expect(service).not.toContain("total_contract_cents");
    expect(service).not.toContain("assigned_to");
  });
});
