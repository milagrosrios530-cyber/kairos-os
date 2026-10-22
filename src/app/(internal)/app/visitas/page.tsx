import { CalendarDays, MapPinned } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationNav } from "@/components/layout/pagination-nav";
import { formatDateTimeInZone } from "@/lib/dates/timezone";
import { listCrmVisits } from "@/server/crm/queries";

type SearchParams = Promise<{ pagina?: string; vista?: string }>;

export default async function VisitsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const history = params.vista === "historial";
  const visits = await listCrmVisits({
    history,
    page: Number.parseInt(params.pagina ?? "1", 10),
  });
  return (
    <div className="space-y-6">
      <section><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">Agenda comercial</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-[40px]">Visitas</h1><p className="mt-3 text-sm text-muted-foreground">Recorridos y reuniones. Esta agenda no bloquea fechas del salón.</p></section>
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-900">Una visita programada no es una reserva ni confirma disponibilidad.</div>
      <div className="flex gap-2"><Button render={<Link href="/app/visitas" />} variant={history ? "outline" : "default"}>Próximas</Button><Button render={<Link href="/app/visitas?vista=historial" />} variant={history ? "default" : "outline"}>Historial</Button></div>
      {visits.items.length ? <section className="space-y-3">{visits.items.map((visit) => (
        <Link className="grid gap-3 rounded-[22px] border border-black/[0.06] bg-white p-5 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" href={`/app/crm/${visit.opportunityId}`} key={visit.id}>
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{visit.customerName}</h2><Badge variant="outline">{visit.status}</Badge><Badge className="border-0 bg-[#f2ead9] text-[#765522]" variant="outline">{visit.mode}</Badge></div><p className="mt-2 text-sm text-muted-foreground">Responsable: {visit.staffName} · {visit.participantsCount ?? "—"} participantes</p>{visit.outcome ? <p className="mt-2 text-xs">Resultado: {visit.outcome}</p> : null}</div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays aria-hidden="true" className="size-4" />{formatDateTimeInZone(visit.startAt, visits.timezone)}</p>
        </Link>
      ))}</section> : <section className="rounded-[24px] border border-black/[0.06] bg-white py-14 text-center"><MapPinned aria-hidden="true" className="mx-auto size-9 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">No hay visitas programadas</h2><p className="mt-2 text-sm text-muted-foreground">Puedes programarlas desde una oportunidad.</p></section>}
      <PaginationNav label="visitas" page={visits.page} pageSize={visits.pageSize} pathname="/app/visitas" query={{ vista: history ? "historial" : undefined }} total={visits.total} />
    </div>
  );
}
