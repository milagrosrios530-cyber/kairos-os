import { describe, expect, it } from "vitest";

import { hasPermission } from "@/lib/auth/permissions";
import { getPrimaryRole } from "@/lib/auth/roles";

describe("role permissions", () => {
  it("allows only the superadmin to invite users in Hito 1", () => {
    expect(hasPermission(["SUPERADMIN"], "users:invite")).toBe(true);
    expect(hasPermission(["ADMINISTRADOR"], "users:invite")).toBe(false);
    expect(hasPermission(["COMERCIAL"], "users:invite")).toBe(false);
  });

  it("allows administrators to provision operational users", () => {
    expect(hasPermission(["SUPERADMIN"], "users:create")).toBe(true);
    expect(hasPermission(["ADMINISTRADOR"], "users:create")).toBe(true);
    expect(hasPermission(["COMERCIAL"], "users:create")).toBe(false);
  });

  it("does not grant settings access to commercial staff", () => {
    expect(hasPermission(["COMERCIAL"], "settings:manage")).toBe(false);
  });

  it("gives superadmin and administrator global Hito 2 access", () => {
    for (const role of ["SUPERADMIN", "ADMINISTRADOR"] as const) {
      expect(hasPermission([role], "crm:view")).toBe(true);
      expect(hasPermission([role], "crm:create")).toBe(true);
      expect(hasPermission([role], "crm:manage_all")).toBe(true);
      expect(hasPermission([role], "tasks:view")).toBe(true);
      expect(hasPermission([role], "tasks:create")).toBe(true);
      expect(hasPermission([role], "visits:view")).toBe(true);
      expect(hasPermission([role], "visits:create")).toBe(true);
      expect(hasPermission([role], "dashboard:view_global")).toBe(true);
    }
  });

  it("limits commercial staff to assigned CRM work", () => {
    expect(hasPermission(["COMERCIAL"], "crm:view")).toBe(true);
    expect(hasPermission(["COMERCIAL"], "crm:create")).toBe(true);
    expect(hasPermission(["COMERCIAL"], "tasks:view")).toBe(true);
    expect(hasPermission(["COMERCIAL"], "tasks:create")).toBe(true);
    expect(hasPermission(["COMERCIAL"], "visits:view")).toBe(true);
    expect(hasPermission(["COMERCIAL"], "visits:create")).toBe(true);
    expect(hasPermission(["COMERCIAL"], "crm:manage_all")).toBe(false);
    expect(hasPermission(["COMERCIAL"], "dashboard:view_global")).toBe(false);
  });

  it("does not grant CRM writes to non-commercial roles by default", () => {
    for (const role of ["COORDINADOR", "FINANZAS", "CONSULTA"] as const) {
      expect(hasPermission([role], "crm:create")).toBe(false);
      expect(hasPermission([role], "tasks:create")).toBe(false);
      expect(hasPermission([role], "visits:create")).toBe(false);
    }
  });

  it("chooses the most privileged role for display without changing access", () => {
    expect(getPrimaryRole(["COMERCIAL", "ADMINISTRADOR"])).toBe(
      "ADMINISTRADOR",
    );
  });
});
