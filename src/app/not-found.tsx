import { SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-5">
      <div className="w-full max-w-md rounded-[28px] border border-black/[0.06] bg-white p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.07)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#f2ead9] text-[#80602c]">
          <SearchX aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">
          Error 404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Esta página no existe
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Revisa el enlace o vuelve al acceso principal de KAIROS OS.
        </p>
        <Button className="mt-6 h-11 rounded-xl px-4" render={<Link href="/" />}>
          Volver al inicio
        </Button>
      </div>
    </main>
  );
}
