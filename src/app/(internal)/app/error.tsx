"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[65vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-[24px] border border-black/[0.06] bg-white p-7 text-center shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
        <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
          No pudimos cargar esta vista
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          La información no se modificó. Comprueba tu conexión e inténtalo nuevamente.
        </p>
        <Button className="mt-6 h-11 rounded-xl px-4" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
