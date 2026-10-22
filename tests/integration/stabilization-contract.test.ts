import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261022150000_stabilization_security_and_booking_ranges.sql",
  ),
  "utf8",
).toLowerCase();
const viewerMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261022152000_current_viewer_context.sql",
  ),
  "utf8",
).toLowerCase();

describe("stabilization database contract", () => {
  it("uses an indexed HMAC lookup and server-side login rate limits", () => {
    expect(migration).toContain("identifier_lookup_hash");
    expect(migration).toContain("consume_staff_login_rate_limit");
    expect(migration).toContain("to service_role");
    expect(migration).not.toContain("grant execute on function public.resolve_staff_login_email(text, text)\n  to authenticated");
  });

  it("protects organization-wide overlaps and cross-midnight ranges", () => {
    expect(migration).toContain("organization_id with =");
    expect(migration).toContain("p_event_end_time <= p_event_start_time");
    expect(migration).toContain("bookings_sync_allocation_range");
    expect(migration).toContain("schedule_allocations_sync_booking_range");
  });

  it("returns only the current authenticated viewer context", () => {
    expect(viewerMigration).toContain("profile.user_id = auth.uid()");
    expect(viewerMigration).toContain("from public, anon");
    expect(viewerMigration).toContain("to authenticated");
  });
});
