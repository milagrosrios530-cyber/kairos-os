import { ArrowLeft, CalendarDays, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PIPELINE_STATUS_LABELS, type PipelineStatus } from "@/lib/crm/constants";
import { getCustomerDetail } from "@/server/crm/queries";

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "Por definir";
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerDetail(id);
  if (!customer) notFound();
  const whatsapp = customer.phone.replace(/\D/g, "");

  return (
    <div className="space-y-6">
      <Button className="-ml-2" render={<Link href="/app/clientes" />} variant="ghost"><ArrowLeft aria-hidden="true" /> Volver a clientes</Button>
      <section className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">Ficha protegida</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{customer.fullName}</h1><p className="mt-2 text-sm text-muted-foreground">Asesor: {customer.adviserName}</p></div>
          <Badge className="w-fit border-0 bg-[#f2ead9] text-[#765522]" variant="outline">{customer.customerType}</Badge>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <a className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#f5f5f7] px-4 text-sm" href={`tel:${customer.phone}`}><Phone aria-hidden="true" className="size-4 text-[#8b672f]" />{customer.phone}</a>
          <a className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#f5f5f7] px-4 text-sm" href={`https://wa.me/${whatsapp}`} rel="noreferrer" target="_blank"><MessageCircle aria-hidden="true" className="size-4 text-emerald-600" />Abrir WhatsApp</a>
          <div className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#f5f5f7] px-4 text-sm"><Mail aria-hidden="true" className="size-4 text-[#8b672f]" /><span className="truncate">{customer.email ?? "Sin correo"}</span></div>
          <div className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#f5f5f7] px-4 text-sm"><MapPin aria-hidden="true" className="size-4 text-[#8b672f]" />{customer.location ?? "Sin ubicación"}</div>
        </div>
        {customer.identifiers.length ? <div className="mt-5 flex flex-wrap gap-2">{customer.identifiers.map((identifier) => <Badge key={identifier.id} variant="outline"><ShieldCheck aria-hidden="true" /> {identifier.type.toUpperCase()} {identifier.maskedNumber}</Badge>)}</div> : null}
        {customer.internalNotes ? <div className="mt-5 rounded-2xl border border-black/[0.06] p-4 text-sm leading-6"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notas internas</p><p className="mt-2 whitespace-pre-wrap">{customer.internalNotes}</p></div> : null}
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-[-0.02em]">Oportunidades</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {customer.opportunities.length ? customer.opportunities.map((opportunity) => (
            <Link className="rounded-[22px] border border-black/[0.06] bg-white p-5 shadow-sm" href={`/app/crm/${opportunity.id}`} key={opportunity.id}>
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{opportunity.eventType}</p><p className="mt-1 text-xs text-muted-foreground">{opportunity.code}</p></div><Badge variant="outline">{PIPELINE_STATUS_LABELS[opportunity.stage as PipelineStatus] ?? opportunity.stage}</Badge></div>
              <p className="mt-4 flex items-center gap-2 text-sm"><CalendarDays aria-hidden="true" className="size-4 text-[#8b672f]" />{date(opportunity.desiredDate)} · tentativa</p>
              <p className="mt-2 text-xs text-muted-foreground">{opportunity.guestsTotal ?? "—"} invitados · {opportunity.adviserName}</p>
            </Link>
          )) : <div className="rounded-[22px] border border-dashed border-black/10 bg-white p-8 text-sm text-muted-foreground">No hay oportunidades asociadas.</div>}
        </div>
      </section>
    </div>
  );
}
