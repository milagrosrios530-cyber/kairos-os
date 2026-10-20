import { CalendarDays, Filter, Plus, Search, Sparkles, UsersRound } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  type PipelineStatus,
} from "@/lib/crm/constants";
import { listOpportunities } from "@/server/crm/queries";

type SearchParams = Promise<{ q?: string; etapa?: string; pagina?: string }>;

function formatDate(value: string | null) {
  if (!value) return "Por definir";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function OpportunityCard({
  item,
}: {
  item: Awaited<ReturnType<typeof listOpportunities>>["items"][number];
}) {
  return (
    <Link
      className="block rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.035)] outline-none transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"
      href={`/app/crm/${item.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.customerName}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{item.code}</p>
        </div>
        <Badge className="shrink-0 border-0 bg-[#f2ead9] text-[#765522]" variant="outline">
          {item.eventType}
        </Badge>
      </div>
      <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="size-3.5 text-[#9b773f]" />
          {formatDate(item.desiredDate)} · tentativa
        </p>
        <p className="flex items-center gap-2">
          <UsersRound aria-hidden="true" className="size-3.5 text-[#9b773f]" />
          {item.guestsTotal ? `${item.guestsTotal} invitados estimados` : "Invitados por definir"}
        </p>
      </div>
      <p className="mt-4 border-t border-black/[0.055] pt-3 text-[11px] text-muted-foreground">
        Asesor: {item.adviserName}
      </p>
    </Link>
  );
}

export default async function CrmPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const stage = PIPELINE_STATUSES.includes(params.etapa as PipelineStatus)
    ? params.etapa
    : undefined;
  const page = Number.parseInt(params.pagina ?? "1", 10);
  const result = await listOpportunities({ query: params.q, stage, page });
  const visibleStages = stage ? [stage as PipelineStatus] : PIPELINE_STATUSES;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">Comercial</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-[40px]">CRM y prospectos</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Organiza oportunidades, seguimientos y visitas. Las fechas aquí son solicitudes tentativas y no ocupan el salón.
          </p>
        </div>
        <Button className="h-11 w-full rounded-xl px-4 sm:w-auto" render={<Link href="/app/crm/nueva" />}>
          <Plus aria-hidden="true" /> Nuevo prospecto
        </Button>
      </section>

      <form className="grid gap-3 rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px_auto]" method="get">
        <label className="relative">
          <span className="sr-only">Buscar por nombre o teléfono</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-11 rounded-xl pl-10" defaultValue={params.q} name="q" placeholder="Buscar cliente o teléfono" />
        </label>
        <label className="relative">
          <span className="sr-only">Filtrar por etapa</span>
          <Filter aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" defaultValue={stage ?? ""} name="etapa">
            <option value="">Todas las etapas</option>
            {PIPELINE_STATUSES.map((status) => (
              <option key={status} value={status}>{PIPELINE_STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>
        <Button className="h-11 rounded-xl px-5" type="submit">Aplicar</Button>
      </form>

      {result.items.length === 0 ? (
        <section className="rounded-[24px] border border-black/[0.06] bg-white px-5 py-14 text-center shadow-sm">
          <Sparkles aria-hidden="true" className="mx-auto size-9 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No hay oportunidades para este filtro</h2>
          <p className="mt-2 text-sm text-muted-foreground">Crea un prospecto real o cambia la búsqueda.</p>
        </section>
      ) : (
        <>
          <section className="space-y-3 lg:hidden" aria-label="Lista de oportunidades">
            {result.items.map((item) => (
              <div key={item.id}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {PIPELINE_STATUS_LABELS[item.stage as PipelineStatus] ?? item.stage}
                </p>
                <OpportunityCard item={item} />
              </div>
            ))}
          </section>

          <section aria-label="Embudo comercial" className="hidden overflow-x-auto pb-3 lg:block">
            <div className="grid min-w-max auto-cols-[300px] grid-flow-col gap-4">
              {visibleStages.map((status) => {
                const items = result.items.filter((item) => item.stage === status);
                return (
                  <div className="rounded-[22px] bg-black/[0.025] p-3 ring-1 ring-black/[0.05]" key={status}>
                    <div className="flex items-center justify-between gap-3 px-1 pb-3">
                      <h2 className="text-sm font-semibold">{PIPELINE_STATUS_LABELS[status]}</h2>
                      <Badge className="border-0 bg-white text-muted-foreground" variant="outline">{items.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {items.length ? items.map((item) => <OpportunityCard item={item} key={item.id} />) : (
                        <div className="rounded-2xl border border-dashed border-black/10 px-4 py-8 text-center text-xs text-muted-foreground">Sin registros</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {result.total > result.pageSize ? (
        <nav aria-label="Paginación" className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-black/[0.055]">
          <span className="text-muted-foreground">Página {result.page} · {result.total} registros</span>
          <div className="flex gap-2">
            {result.page > 1 ? <Button render={<Link href={{ pathname: "/app/crm", query: { q: params.q, etapa: stage, pagina: result.page - 1 } }} />} variant="outline">Anterior</Button> : null}
            {result.page * result.pageSize < result.total ? <Button render={<Link href={{ pathname: "/app/crm", query: { q: params.q, etapa: stage, pagina: result.page + 1 } }} />} variant="outline">Siguiente</Button> : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
