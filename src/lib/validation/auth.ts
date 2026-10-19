import { z } from "zod";

import { APP_ROLES } from "@/lib/auth/roles";

export const loginSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido."),
});

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Usa al menos 12 caracteres.")
      .regex(/[A-Z]/, "Incluye una mayúscula.")
      .regex(/[a-z]/, "Incluye una minúscula.")
      .regex(/[0-9]/, "Incluye un número."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

export const inviteUserSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido."),
  fullName: z
    .string()
    .trim()
    .min(3, "Ingresa el nombre completo.")
    .max(120, "El nombre es demasiado largo."),
  role: z.enum(APP_ROLES),
});
