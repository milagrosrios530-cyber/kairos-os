import { LockKeyhole } from "lucide-react";

import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-5">
      <div className="w-full max-w-md rounded-[28px] border border-black/[0.06] bg-white p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.07)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#f2ead9] text-[#80602c]">
          <LockKeyhole aria-hidden="true" className="size-5" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">Acceso no habilitado</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          La cuenta no tiene un perfil activo o un rol válido. Administración
          debe revisar la invitación sin crear otra cuenta pública.
        </p>
        <form action={logoutAction} className="mt-6">
          <Button className="h-11 rounded-xl px-4" type="submit">Cerrar sesión</Button>
        </form>
      </div>
    </main>
  );
}
