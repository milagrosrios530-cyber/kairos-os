"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import type { AuthActionState } from "@/lib/auth/action-state";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  passwordResetRequestSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";
import { resolveStaffLoginEmail } from "@/server/users/staff-login";

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos ingresados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return {
      status: "error",
      message: "Supabase aún no está configurado en este entorno.",
    };
  }

  const email = await resolveStaffLoginEmail(parsed.data.identifier);
  if (!email) {
    return {
      status: "error",
      message: "Correo, DNI o contraseña incorrectos.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });
  if (error) {
    return {
      status: "error",
      message: "Correo, DNI o contraseña incorrectos.",
    };
  }

  redirect("/app");
}

export async function requestPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Ingresa un correo válido.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
    const configuredOrigin =
      process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${configuredOrigin}/auth/callback?next=/actualizar-clave`,
    });
  } catch {
    return {
      status: "error",
      message: "No se pudo procesar la solicitud en este entorno.",
    };
  }

  return {
    status: "success",
    message:
      "Si el correo pertenece a una cuenta habilitada, recibirá instrucciones.",
  };
}

export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "La contraseña no cumple los requisitos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: "El enlace venció o no se pudo actualizar la contraseña.",
    };
  }

  redirect("/app");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
