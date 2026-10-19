import { describe, expect, it } from "vitest";

import {
  inviteUserSchema,
  loginSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";

describe("authentication validation", () => {
  it("rejects malformed login data", () => {
    expect(loginSchema.safeParse({ email: "no-es-correo", password: "" }).success).toBe(
      false,
    );
  });

  it("accepts an internal invitation with a declared role", () => {
    expect(
      inviteUserSchema.safeParse({
        email: "asesor@example.test",
        fullName: "Asesor Demo",
        role: "COMERCIAL",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown roles supplied directly to the API", () => {
    expect(
      inviteUserSchema.safeParse({
        email: "asesor@example.test",
        fullName: "Asesor Demo",
        role: "OWNER",
      }).success,
    ).toBe(false);
  });

  it("requires a strong matching replacement password", () => {
    expect(
      updatePasswordSchema.safeParse({
        password: "ClaveSegura2026",
        confirmPassword: "ClaveSegura2026",
      }).success,
    ).toBe(true);
    expect(
      updatePasswordSchema.safeParse({
        password: "ClaveSegura2026",
        confirmPassword: "otra",
      }).success,
    ).toBe(false);
  });
});
