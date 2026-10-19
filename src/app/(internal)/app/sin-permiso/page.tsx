import { ShieldX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="max-w-md text-center">
        <ShieldX className="mx-auto size-10 text-destructive" />
        <h1 className="mt-5 text-3xl font-semibold">Sin permiso</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tu sesión es válida, pero el rol asignado no autoriza esta función.
          La API aplica la misma restricción aunque se escriba la URL
          directamente.
        </p>
        <Button className="mt-6" render={<Link href="/app" />}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
