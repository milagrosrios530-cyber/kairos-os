import { ShieldX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="w-full max-w-md rounded-[24px] border border-black/[0.06] bg-white p-7 text-center shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
        <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldX aria-hidden="true" className="size-5" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">Sin permiso</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tu sesión es válida, pero el rol asignado no autoriza esta función.
          La API aplica la misma restricción aunque se escriba la URL
          directamente.
        </p>
        <Button className="mt-6 h-11 rounded-xl px-4" render={<Link href="/app" />}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
