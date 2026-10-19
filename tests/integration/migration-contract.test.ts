import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261019010000_identity_and_access.sql",
  ),
  "utf8",
).toLowerCase();

describe("identity migration contract", () => {
  it.each([
    "organizations",
    "venues",
    "profiles",
    "user_roles",
    "audit_logs",
  ])("enables RLS for %s", (table) => {
    expect(migration).toContain(`alter table public.${table} enable row level security`);
  });

  it("keeps anonymous users away from internal tables", () => {
    expect(migration).toContain("revoke all on public.profiles from anon");
    expect(migration).toContain("revoke all on public.user_roles from anon");
    expect(migration).not.toContain("grant select on public.profiles to anon");
  });

  it("prevents direct role grants by authenticated clients", () => {
    expect(migration).toContain("grant select on public.user_roles to authenticated");
    expect(migration).not.toContain("grant insert on public.user_roles to authenticated");
  });

  it("makes audit history append-only", () => {
    expect(migration).toContain("create trigger audit_logs_append_only");
    expect(migration).toContain("audit_logs is append-only");
  });

  it("pins search_path on privileged helper functions", () => {
    const privilegedFunctions = migration.match(/security definer/g) ?? [];
    const pinnedSearchPaths = migration.match(/set search_path = ''/g) ?? [];
    expect(privilegedFunctions.length).toBeGreaterThan(0);
    expect(pinnedSearchPaths.length).toBeGreaterThanOrEqual(
      privilegedFunctions.length,
    );
  });
});
