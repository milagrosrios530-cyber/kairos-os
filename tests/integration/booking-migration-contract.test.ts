import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261020230000_booking_engine_hito3.sql",
  ),
  "utf8",
).toLowerCase();
const rlsHelperGrantMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261021103000_booking_rls_helper_grants.sql",
  ),
  "utf8",
).toLowerCase();
const crmCalendarHoldMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261021120000_crm_calendar_auto_hold.sql",
  ),
  "utf8",
).toLowerCase();

describe("booking engine migration contract", () => {
  it.each(["bookings", "schedule_allocations", "booking_deposit_records"])(
    "forces RLS for %s",
    (table) => {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`alter table public.${table} force row level security`);
    },
  );

  it("protects the venue with a partial GiST exclusion constraint", () => {
    expect(migration).toContain("constraint schedule_allocations_no_overlap");
    expect(migration).toContain("exclude using gist");
    expect(migration).toContain("occupied_during with &&");
    expect(migration).toContain("where (blocking)");
  });

  it("expires stale holds in the same transaction before inserting", () => {
    expect(migration).toContain("private.expire_stale_booking_holds");
    expect(migration).toContain("perform private.expire_stale_booking_holds");
  });

  it("keeps writes behind guarded RPCs", () => {
    expect(migration).toContain("revoke all on public.bookings from anon, authenticated");
    expect(migration).toContain("grant select on public.bookings to authenticated");
    expect(migration).not.toContain("grant insert on public.bookings to authenticated");
  });

  it("pins every privileged function search path", () => {
    const privileged = migration.match(/security definer/g) ?? [];
    const pinned = migration.match(/set search_path = ''/g) ?? [];
    expect(privileged.length).toBeGreaterThan(0);
    expect(pinned.length).toBeGreaterThanOrEqual(privileged.length);
  });

  it("allows authenticated RLS evaluation without exposing mutating helpers", () => {
    expect(rlsHelperGrantMigration).toContain(
      "grant execute on function private.can_view_booking_calendar(uuid)",
    );
    expect(rlsHelperGrantMigration).toContain(
      "grant execute on function private.can_access_booking(uuid)",
    );
    expect(rlsHelperGrantMigration).not.toContain("expire_stale_booking_holds");
  });

  it("creates a CRM hold atomically and keeps proposals out of booking totals", () => {
    expect(crmCalendarHoldMigration).toContain(
      "perform private.ensure_opportunity_calendar_hold(v_opportunity_id, v_actor)",
    );
    expect(crmCalendarHoldMigration).toContain("now() + interval '24 hours'");
    expect(crmCalendarHoldMigration).toContain("opportunity_id uuid null");
    expect(crmCalendarHoldMigration).toContain(
      "constraint schedule_allocations_no_overlap",
    );
    expect(crmCalendarHoldMigration).toContain("organization_id with =");
    expect(crmCalendarHoldMigration).not.toContain(
      "p_proposal ->> 'amount_cents'",
    );
  });

  it("converts the opportunity hold instead of creating a second allocation", () => {
    expect(crmCalendarHoldMigration).toContain("v_crm_hold_id uuid");
    expect(crmCalendarHoldMigration).toContain(
      "hold crm convertido en reserva pendiente de abono",
    );
    expect(crmCalendarHoldMigration).toContain("booking_id = v_booking_id");
  });

  it("keeps the CRM hold helper private", () => {
    expect(crmCalendarHoldMigration).toContain(
      "revoke all on function private.ensure_opportunity_calendar_hold(uuid, uuid)",
    );
    expect(crmCalendarHoldMigration).not.toContain(
      "grant execute on function private.ensure_opportunity_calendar_hold",
    );
  });
});
