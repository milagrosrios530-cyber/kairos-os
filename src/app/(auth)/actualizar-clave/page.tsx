import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Definir contraseña" };

export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="Define tu contraseña"
      description="Usa al menos 12 caracteres, con mayúscula, minúscula y número."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
