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
});
