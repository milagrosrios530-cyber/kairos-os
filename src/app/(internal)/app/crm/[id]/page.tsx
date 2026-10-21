import {
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Mail,
  MessageSquareText,
  Phone,
  ShieldAlert,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ActivityForm } from "@/components/crm/activity-form";
import { OpportunityStageButton, type PipelineStage } from "@/components/crm/opportunity-stage-button";
import { ServiceDetailsForm } from "@/components/crm/service-details-form";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskOutcomeForm } from "@/components/tasks/task-outcome-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VisitForm } from "@/components/visits/visit-form";
import { VisitOutcomeForm } from "@/components/visits/visit-outcome-form";
import { PIPELINE_STATUS_LABELS, type PipelineStatus } from "@/lib/crm/constants";
import { getCrmFormOptions, getOpportunityDetail } from "@/server/crm/queries";

const quickStages: PipelineStage[] = [
  "contactado",
  "calificado",
  "visita_programada",
  "visita_realizada",
  "cotizacion_enviada",
  "negociacion",
];

function tentativeDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
    : "Por definir";
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function money(value: number | null, currency: string) {
  if (value === null) return "Monto por definir";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(value / 100);
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = z.string().uuid().safeParse((await params).id);
  if (!parsed.success) notFound();
  const [opportunity, options] = await Promise.all([
    getOpportunityDetail(parsed.data),
    getCrmFormOptions(),
  ]);
  if (!opportunity) notFound();

  return (
    <div className="space-y-6">
      <Button className="-ml-2" render={<Link href="/app/crm" />} variant="ghost"><ArrowLeft aria-hidden="true" /> Volver al CRM</Button>

      <section className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_16px_50px_rgba(0,0,0,0.045)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">{opportunity.code}</p><Badge className="border-0 bg-[#f2ead9] text-[#765522]" variant="outline">{PIPELINE_STATUS_LABELS[opportunity.stage as PipelineStatus] ?? opportunity.stage}</Badge></div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-[40px]">{opportunity.customer?.fullName ?? "Cliente autorizado"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{opportunity.eventType}{opportunity.occasionDetail ? ` · ${opportunity.occasionDetail}` : ""} · Asesor: {opportunity.adviserName}</p>
          </div>
          {opportunity.customer ? <div className="flex flex-wrap gap-2">{opportunity.canCreate && !["ganado", "perdido", "descartado"].includes(opportunity.stage) ? <Button render={<Link href={{ pathname: "/app/reservas/nueva", query: { oportunidad: opportunity.id, fecha: opportunity.desiredDate ?? undefined } }} />}><CalendarCheck2 aria-hidden="true" /> Retener fecha</Button> : null}<Button render={<a href={`tel:${opportunity.customer.phone}`} />} variant="outline"><Phone aria-hidden="true" /> Llamar</Button>{opportunity.customer.email ? <Button render={<a href={`mailto:${opportunity.customer.email}`} />} variant="outline"><Mail aria-hidden="true" /> Correo</Button> : null}<Button render={<Link href={`/app/clientes/${opportunity.customer.id}`} />} variant="outline"><UserRound aria-hidden="true" /> Ver cliente</Button></div> : null}
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-[#f5f5f7] p-4"><p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><CalendarDays aria-hidden="true" className="size-4 text-[#8b672f]" />Fecha solicitada</p><p className="mt-2 text-sm font-semibold">{tentativeDate(opportunity.desiredDate)}</p><p className="mt-1 text-[11px] text-amber-700">Tentativa · no reserva</p></div>
          <div className="rounded-2xl bg-[#f5f5f7] p-4"><p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><UsersRound aria-hidden="true" className="size-4 text-[#8b672f]" />Invitados</p><p className="mt-2 text-sm font-semibold">{opportunity.guestsTotal ?? "Por definir"}</p><p className="mt-1 text-[11px] text-muted-foreground">Cantidad estimada</p></div>
          <div className="rounded-2xl bg-[#f5f5f7] p-4"><p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ShieldAlert aria-hidden="true" className="size-4 text-[#8b672f]" />Modalidad</p><p className="mt-2 text-sm font-semibold">{opportunity.modality ?? "Por definir"}</p><p className="mt-1 text-[11px] text-muted-foreground">Interés comercial</p></div>
          <div className="rounded-2xl bg-[#f5f5f7] p-4"><p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><MessageSquareText aria-hidden="true" className="size-4 text-[#8b672f]" />Origen</p><p className="mt-2 text-sm font-semibold">{opportunity.source}</p><p className="mt-1 text-[11px] text-muted-foreground">Canal registrado</p></div>
        </div>

        <div className="mt-6 border-t border-black/[0.055] pt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Actualizar etapa</p><div className="flex flex-wrap gap-2">{quickStages.filter((stage) => stage !== opportunity.stage).map((stage) => <OpportunityStageButton expectedUpdatedAt={opportunity.updatedAt} key={stage} label={PIPELINE_STATUS_LABELS[stage]} opportunityId={opportunity.id} stage={stage} />)}</div><p className="mt-3 text-[11px] text-muted-foreground">“Ganado” seguirá bloqueado hasta existir una reserva confirmada en el hito correspondiente.</p></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><CircleDollarSign aria-hidden="true" className="size-5 text-[#8b672f]" /><h2 className="text-lg font-semibold">Propuestas registradas</h2></div>
          <div className="mt-4 space-y-3">{opportunity.proposals.length ? opportunity.proposals.map((proposal) => <article className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4" key={proposal.id}><p className="text-lg font-semibold">{money(proposal.amountCents, proposal.currency)}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-800">Propuesta referencial · no es tarifa oficial</p>{proposal.servicesSummary ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{proposal.servicesSummary}</p> : null}{proposal.notes ? <p className="mt-3 rounded-xl border border-amber-200/80 bg-white/70 p-3 text-xs leading-5 text-amber-950">{proposal.notes}</p> : null}<p className="mt-3 text-[11px] text-muted-foreground">{proposal.recordedByName} · {dateTime(proposal.createdAt)}</p></article>) : <p className="rounded-2xl border border-dashed border-black/10 p-6 text-sm text-muted-foreground">No se registró propuesta inicial.</p>}</div>
        </div>
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Servicios y detalles</h2>
          <div className="mt-4 space-y-2">{opportunity.serviceInterests.length ? opportunity.serviceInterests.map((service) => <article className="rounded-2xl border border-black/[0.06] bg-[#f8f8fa] p-3" key={service.id}><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{service.label}</p>{service.quantity !== null ? <Badge className="border-0 bg-[#f2ead9] text-[#765522]" variant="outline">{service.quantity} {service.unit ?? "unidad(es)"}</Badge> : null}</div>{service.details ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{service.details}</p> : null}</article>) : <span className="text-sm text-muted-foreground">Sin servicios marcados.</span>}</div>
          {opportunity.notes ? <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-[#f5f5f7] p-4 text-sm leading-6">{opportunity.notes}</p> : null}
          <ServiceDetailsForm expectedUpdatedAt={opportunity.updatedAt} opportunityId={opportunity.id} services={opportunity.serviceInterests} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2"><TaskForm assignees={options.advisers} canAssign={options.canAssign} opportunityId={opportunity.id} /><VisitForm opportunityId={opportunity.id} /></section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Tareas</h2><div className="mt-4 space-y-3">{opportunity.tasks.length ? opportunity.tasks.map((task) => <article className="rounded-2xl border border-black/[0.06] p-4" key={task.id}><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{task.title}</p><Badge variant="outline">{task.status}</Badge><Badge className="border-0 bg-[#f2ead9] text-[#765522]" variant="outline">{task.priority}</Badge></div><p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 aria-hidden="true" className="size-3.5" />{dateTime(task.dueAt)} · {task.assigneeName}</p>{task.description ? <p className="mt-3 text-sm leading-6">{task.description}</p> : null}{task.result ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Resultado: {task.result}</p> : ["pendiente", "en_progreso"].includes(task.status) ? <TaskOutcomeForm expectedUpdatedAt={task.updatedAt} opportunityId={opportunity.id} taskId={task.id} /> : null}</article>) : <p className="rounded-2xl border border-dashed border-black/10 p-6 text-sm text-muted-foreground">Sin tareas.</p>}</div></div>
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Visitas</h2><div className="mt-4 space-y-3">{opportunity.visits.length ? opportunity.visits.map((visit) => <article className="rounded-2xl border border-black/[0.06] p-4" key={visit.id}><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{dateTime(visit.startAt)}</p><Badge variant="outline">{visit.status}</Badge><Badge className="border-0 bg-sky-50 text-sky-800" variant="outline">{visit.mode}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{visit.staffName} · {visit.participantsCount ?? "—"} participantes</p>{visit.notes ? <p className="mt-3 text-sm leading-6">{visit.notes}</p> : null}{visit.outcome ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Resultado: {visit.outcome}{visit.nextSteps ? ` · Próximo: ${visit.nextSteps}` : ""}</p> : visit.status === "programada" ? <VisitOutcomeForm expectedUpdatedAt={visit.updatedAt} opportunityId={opportunity.id} visitId={visit.id} /> : null}</article>) : <p className="rounded-2xl border border-dashed border-black/10 p-6 text-sm text-muted-foreground">Sin visitas.</p>}</div></div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <ActivityForm opportunityId={opportunity.id} />
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Línea de tiempo</h2><div className="mt-4 space-y-4">{opportunity.activities.length ? opportunity.activities.map((activity) => <article className="border-l-2 border-[#d8bd80] pl-4" key={activity.id}><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{activity.kind}</Badge><span className="text-[11px] text-muted-foreground">{dateTime(activity.occurredAt)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{activity.description}</p><p className="mt-1 text-[11px] text-muted-foreground">{activity.authorName}</p></article>) : <p className="text-sm text-muted-foreground">La actividad aparecerá aquí.</p>}</div></div>
      </section>
    </div>
  );
}
