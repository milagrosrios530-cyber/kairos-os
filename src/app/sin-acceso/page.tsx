import { LockKeyhole } from "lucide-react";

import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] p-6">
      <div className="max-w-md text-center">
        <LockKeyhole className="mx-auto size-10 text-[#9b773f]" />
        <h1 className="mt-5 text-3xl font-semibold">Acceso no habilitado</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          La cuenta no tiene un perfil activo o un rol válido. Administración
          debe revisar la invitación sin crear otra cuenta pública.
        </p>
        <form action={logoutAction} className="mt-6">
          <Button type="submit">Cerrar sesión</Button>
        </form>
      </div>
    </main>
  );
}
