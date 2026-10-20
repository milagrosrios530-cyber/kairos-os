import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { hasSupabasePublicEnv } from "@/lib/env";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  const configured = hasSupabasePublicEnv();

  return (
    <AuthShell
      title="Acceso del equipo"
      description="Ingresa con la cuenta que administración te invitó a usar."
    >
      {!configured ? (
        <Alert className="mb-5">
          <AlertTitle>Entorno sin conectar</AlertTitle>
          <AlertDescription>
            Configura las variables de Supabase para habilitar el acceso real.
          </AlertDescription>
        </Alert>
      ) : null}
      <LoginForm />
    </AuthShell>
  );
}
