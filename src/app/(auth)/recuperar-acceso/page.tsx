import { AuthShell } from "@/components/auth/auth-shell";
import { ResetRequestForm } from "@/components/auth/reset-request-form";

export default function RecoverAccessPage() {
  return (
    <AuthShell
      title="Recuperar acceso"
      description="Te enviaremos instrucciones sin revelar si el correo existe en el sistema."
      backToLogin
    >
      <ResetRequestForm />
    </AuthShell>
  );
}
