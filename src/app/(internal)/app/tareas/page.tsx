import { CalendarClock, ListChecks } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationNav } from "@/components/layout/pagination-nav";
import { formatDateTimeInZone } from "@/lib/dates/timezone";
import { listCrmTasks } from "@/server/crm/queries";

type SearchParams = Promise<{ pagina?: string; vista?: string }>;

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const history = params.vista === "historial";
  const tasks = await listCrmTasks({
    history,
    page: Number.parseInt(params.pagina ?? "1", 10),
  });
  return (
    <div className="space-y-6">
      <section><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">Seguimiento</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-[40px]">Tareas</h1><p className="mt-3 text-sm text-muted-foreground">Pendientes y resultados persistidos según tu alcance.</p></section>
      <div className="flex gap-2"><Button render={<Link href="/app/tareas" />} variant={history ? "outline" : "default"}>Pendientes</Button><Button render={<Link href="/app/tareas?vista=historial" />} variant={history ? "default" : "outline"}>Historial</Button></div>
      {tasks.items.length ? <section className="space-y-3">{tasks.items.map((task) => (
        <Link className="grid gap-3 rounded-[22px] border border-black/[0.06] bg-white p-5 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" href={`/app/crm/${task.opportunityId}`} key={task.id}>
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{task.title}</h2><Badge variant="outline">{task.status}</Badge><Badge className="border-0 bg-[#f2ead9] text-[#765522]" variant="outline">{task.priority}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{task.customerName} · {task.assigneeName}</p>{task.result ? <p className="mt-2 text-xs">Resultado: {task.result}</p> : null}</div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock aria-hidden="true" className="size-4" />{formatDateTimeInZone(task.dueAt, tasks.timezone)}</p>
        </Link>
      ))}</section> : <section className="rounded-[24px] border border-black/[0.06] bg-white py-14 text-center"><ListChecks aria-hidden="true" className="mx-auto size-9 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">No hay tareas</h2><p className="mt-2 text-sm text-muted-foreground">Crea una desde el detalle de una oportunidad.</p></section>}
      <PaginationNav label="tareas" page={tasks.page} pageSize={tasks.pageSize} pathname="/app/tareas" query={{ vista: history ? "historial" : undefined }} total={tasks.total} />
    </div>
  );
}
