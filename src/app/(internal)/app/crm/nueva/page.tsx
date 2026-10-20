import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { NewLeadForm } from "@/components/crm/new-lead-form";
import { Button } from "@/components/ui/button";
import { getCrmFormOptions } from "@/server/crm/queries";

type SearchParams = Promise<{ fecha?: string }>;

export default async function NewCrmLeadPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const options = await getCrmFormOptions();
  const initialDesiredDate = /^\d{4}-\d{2}-\d{2}$/.test(params.fecha ?? "")
    ? params.fecha
    : undefined;

  return (
    <div className="space-y-6">
      <Button className="-ml-2" render={<Link href="/app/crm" />} variant="ghost">
        <ArrowLeft aria-hidden="true" /> Volver al CRM
      </Button>

      <section className="rounded-[28px] border border-black/[0.06] bg-white px-5 py-7 shadow-[0_16px_50px_rgba(0,0,0,0.045)] sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">Alta rápida</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-[40px]">Nuevo cliente y oportunidad</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Registra la consulta, el evento solicitado, asesor, invitados, servicios de interés y seguimiento. Todo se valida y persiste en Supabase.
        </p>
        <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>La fecha es tentativa y el monto ofrecido es una propuesta referencial. Ninguno confirma disponibilidad, tarifa o reserva.</p>
        </div>
      </section>

      <NewLeadForm
        advisers={options.advisers}
        canAssign={options.canAssign}
        eventTypes={options.eventTypes.map((eventType) => ({ id: eventType.id, name: eventType.name }))}
        initialDesiredDate={initialDesiredDate}
      />
    </div>
  );
}
