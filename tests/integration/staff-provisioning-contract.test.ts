import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261020190000_staff_direct_provisioning.sql",
  ),
  "utf8",
).toLowerCase();
const passwordHashingMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261020204000_staff_dni_password_hashing.sql",
  ),
  "utf8",
).toLowerCase();
const staffProvisioningService = readFileSync(
  join(process.cwd(), "src", "server", "users", "staff-login.ts"),
  "utf8",
).toLowerCase();

describe("direct staff provisioning contract", () => {
  it("stores only a protected identifier and a four-digit hint", () => {
    expect(migration).toContain("identifier_hash text not null unique");
    expect(migration).toContain("dni_last4");
    expect(migration).not.toContain("dni_number");
  });

  it("denies identifier lookup to browser roles", () => {
    expect(migration).toContain(
      "revoke all on public.staff_login_identifiers from public, anon, authenticated",
    );
    expect(migration).not.toContain(
      "grant select on public.staff_login_identifiers to authenticated",
    );
  });

  it("limits direct account completion to the service role and audits creation", () => {
    expect(migration).toContain("to service_role");
    expect(migration).toContain("employee.created");
    expect(migration).toContain("administrators cannot create privileged administrators");
  });

  it("uses a durable salted hash and a server-only resolver", () => {
    expect(passwordHashingMigration).toContain("extensions.gen_salt('bf', 12)");
    expect(passwordHashingMigration).toContain("resolve_staff_login_email");
    expect(passwordHashingMigration).toContain("from public, anon, authenticated");
    expect(passwordHashingMigration).not.toContain("supabase_service_role_key");
  });

  it("creates the Supabase Auth identity directly and rolls it back if provisioning fails", () => {
    expect(staffProvisioningService).toContain("admin.auth.admin.createuser");
    expect(staffProvisioningService).toContain("email_confirm: true");
    expect(staffProvisioningService).toContain('admin.rpc(\n    "complete_employee_provisioning"');
    expect(staffProvisioningService).toContain("admin.auth.admin.deleteuser");
  });
});
