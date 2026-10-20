import { CalendarRange, Filter, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";

import { PipelineBoard } from "@/components/crm/pipeline-board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  type PipelineStatus,
} from "@/lib/crm/constants";
import { listOpportunities } from "@/server/crm/queries";

type SearchParams = Promise<{ q?: string; etapa?: string; pagina?: string }>;

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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button className="h-11 rounded-xl px-4" render={<Link href="/app/agenda" />} variant="outline">
            <CalendarRange aria-hidden="true" /> Ver agenda
          </Button>
          <Button className="h-11 rounded-xl px-4" render={<Link href="/app/crm/nueva" />}>
            <Plus aria-hidden="true" /> Nuevo prospecto
          </Button>
        </div>
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
        <PipelineBoard
          initialItems={result.items}
          key={result.items.map((item) => `${item.id}:${item.stage}:${item.updatedAt}`).join("|")}
          visibleStages={visibleStages}
        />
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
