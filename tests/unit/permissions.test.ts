import { describe, expect, it } from "vitest";

import { hasPermission } from "@/lib/auth/permissions";
import { getPrimaryRole } from "@/lib/auth/roles";

describe("role permissions", () => {
  it("allows only the superadmin to invite users in Hito 1", () => {
    expect(hasPermission(["SUPERADMIN"], "users:invite")).toBe(true);
    expect(hasPermission(["ADMINISTRADOR"], "users:invite")).toBe(false);
    expect(hasPermission(["COMERCIAL"], "users:invite")).toBe(false);
  });

  it("does not grant settings access to commercial staff", () => {
    expect(hasPermission(["COMERCIAL"], "settings:manage")).toBe(false);
  });

  it("chooses the most privileged role for display without changing access", () => {
    expect(getPrimaryRole(["COMERCIAL", "ADMINISTRADOR"])).toBe(
      "ADMINISTRADOR",
    );
  });
});
