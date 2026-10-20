import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MapPinned,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  calendarMonthGrid,
  calendarMonthLabel,
  normalizeCalendarMonth,
  shiftCalendarMonth,
} from "@/lib/crm/calendar";
import { getCrmCalendarMonth } from "@/server/crm/queries";

type SearchParams = Promise<{ mes?: string }>;

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const kindStyles = {
  solicitud: "border-amber-200 bg-amber-50 text-amber-900",
  visita: "border-sky-200 bg-sky-50 text-sky-900",
  tarea: "border-violet-200 bg-violet-50 text-violet-900",
} as const;

const kindLabels = {
  solicitud: "Fecha solicitada",
  visita: "Visita",
  tarea: "Tarea",
} as const;

function timeLabel(value: string | null, timeZone: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}
export default async function AgendaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const month = normalizeCalendarMonth(params.mes);
  const agenda = await getCrmCalendarMonth(month);
  const grid = calendarMonthGrid(month);
  const entriesByDate = new Map<string, typeof agenda.entries>();
  for (const entry of agenda.entries) {
    entriesByDate.set(entry.dateKey, [
      ...(entriesByDate.get(entry.dateKey) ?? []),
      entry,
    ]);
  }
  const occupiedDays = grid.days.filter((day) => (entriesByDate.get(day.dateKey)?.length ?? 0) > 0);
  const total = agenda.counts.requestedDates + agenda.counts.visits + agenda.counts.tasks;
  const previousMonth = shiftCalendarMonth(month, -1);
  const nextMonth = shiftCalendarMonth(month, 1);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">
            Vista general
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-[40px]">
            Agenda comercial
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Reúne fechas solicitadas, visitas y tareas del mes. Las solicitudes son tentativas y no representan disponibilidad ni una reserva.
          </p>
        </div>
        {agenda.canCreate ? (
          <Button className="h-11 rounded-xl px-4" render={<Link href="/app/crm/nueva" />}>
            <Plus aria-hidden="true" /> Nuevo prospecto
          </Button>
        ) : null}
      </section>

      <section aria-label="Resumen del mes" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Total de agendas</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{total}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="size-4 text-amber-700" /> Fechas solicitadas</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{agenda.counts.requestedDates}</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><MapPinned className="size-4 text-sky-700" /> Visitas programadas</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{agenda.counts.visits}</p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><ClipboardCheck className="size-4 text-violet-700" /> Tareas pendientes</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{agenda.counts.tasks}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_10px_36px_rgba(0,0,0,0.045)]">
        <header className="flex items-center justify-between gap-3 border-b border-black/[0.055] px-4 py-4 sm:px-6">
          <Button aria-label="Mes anterior" render={<Link href={{ pathname: "/app/agenda", query: { mes: previousMonth } }} />} size="icon" variant="outline">
            <ChevronLeft aria-hidden="true" />
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">{calendarMonthLabel(month)}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Zona horaria: {agenda.timezone}</p>
          </div>
          <Button aria-label="Mes siguiente" render={<Link href={{ pathname: "/app/agenda", query: { mes: nextMonth } }} />} size="icon" variant="outline">
            <ChevronRight aria-hidden="true" />
          </Button>
        </header>

        <div className="hidden overflow-x-auto md:block">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-7 border-b border-black/[0.055] bg-[#fafafa]">
              {weekDays.map((day) => (
                <div className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground" key={day}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: grid.leadingBlanks }, (_, index) => (
                <div className="min-h-40 border-b border-r border-black/[0.045] bg-black/[0.015]" key={`blank-${index}`} />
              ))}
              {grid.days.map((day) => {
                const dayEntries = entriesByDate.get(day.dateKey) ?? [];
                return (
                  <div className="min-h-40 border-b border-r border-black/[0.045] p-2" key={day.dateKey}>
                    <div className="flex items-center justify-between">
                      <span className="flex size-7 items-center justify-center rounded-full text-xs font-semibold">{day.day}</span>
                      {dayEntries.length ? <Badge className="border-0 bg-[#f5f5f7] text-muted-foreground" variant="outline">{dayEntries.length}</Badge> : null}
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {dayEntries.slice(0, 4).map((entry) => (
                        <Link
                          className={`block rounded-xl border px-2.5 py-2 text-[11px] leading-4 outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring ${kindStyles[entry.kind]}`}
                          href={`/app/crm/${entry.opportunityId}`}
                          key={entry.id}
                        >
                          <span className="block font-semibold">{timeLabel(entry.startsAt, agenda.timezone) ? `${timeLabel(entry.startsAt, agenda.timezone)} · ` : ""}{entry.title}</span>
                          <span className="mt-0.5 block truncate opacity-75">{kindLabels[entry.kind]} · {entry.detail}</span>
                        </Link>
                      ))}
                      {dayEntries.length > 4 ? <p className="px-2 text-[11px] text-muted-foreground">+{dayEntries.length - 4} más</p> : null}
                    </div>
                    {agenda.canCreate && dayEntries.length === 0 ? (
                      <Link className="mt-5 block rounded-xl border border-dashed border-black/10 px-2 py-2 text-center text-[11px] text-muted-foreground hover:bg-black/[0.02]" href={`/app/crm/nueva?fecha=${day.dateKey}`}>
                        Registrar consulta
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="divide-y divide-black/[0.055] md:hidden">
          {occupiedDays.length ? occupiedDays.map((day) => {
            const dayEntries = entriesByDate.get(day.dateKey) ?? [];
            return (
              <section className="p-4" key={day.dateKey}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${day.dateKey}T00:00:00Z`))}</h3>
                  <Badge variant="outline">{dayEntries.length}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {dayEntries.map((entry) => (
                    <Link className={`block rounded-xl border p-3 text-xs ${kindStyles[entry.kind]}`} href={`/app/crm/${entry.opportunityId}`} key={entry.id}>
                      <p className="font-semibold">{timeLabel(entry.startsAt, agenda.timezone) ? `${timeLabel(entry.startsAt, agenda.timezone)} · ` : ""}{entry.title}</p>
                      <p className="mt-1 opacity-75">{kindLabels[entry.kind]} · {entry.detail}</p>
                      <p className="mt-1 opacity-60">Responsable: {entry.adviserName}</p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          }) : (
            <div className="px-5 py-12 text-center">
              <Sparkles aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold">No hay agendas en este mes</p>
              <p className="mt-1 text-xs text-muted-foreground">Cambia de mes o registra una nueva consulta.</p>
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        <span><strong>Importante:</strong> esta es una agenda comercial.</span>
        <span>Fecha solicitada ≠ reserva confirmada.</span>
        <span>Las visitas y tareas tampoco bloquean el salón.</span>
      </div>
    </div>
  );
}

