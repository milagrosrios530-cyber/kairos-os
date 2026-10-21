import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LockKeyhole,
  Plus,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { BlackoutForm } from "@/components/bookings/blackout-form";
import { BlackoutReleaseForm } from "@/components/bookings/blackout-release-form";
import { Button } from "@/components/ui/button";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
} from "@/lib/bookings/presentation";
import {
  calendarMonthGrid,
  calendarMonthLabel,
  instantDateKey,
  normalizeCalendarMonth,
  shiftCalendarMonth,
} from "@/lib/crm/calendar";
import {
  getBookingCalendarMonth,
  getBookingFormOptions,
} from "@/server/bookings/queries";

type SearchParams = Promise<{ mes?: string }>;
const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default async function BookingCalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const month = normalizeCalendarMonth(params.mes);
  const calendar = await getBookingCalendarMonth(month);
  const options = calendar.canManage ? await getBookingFormOptions() : null;
  const grid = calendarMonthGrid(month);
  const today = instantDateKey(new Date().toISOString(), calendar.timezone);
  const byDate = new Map<string, typeof calendar.entries>();
  for (const entry of calendar.entries) {
    byDate.set(entry.dateKey, [...(byDate.get(entry.dateKey) ?? []), entry]);
  }
  const occupied = calendar.entries.length;
  const confirmed = calendar.entries.filter((entry) => entry.status === "confirmed").length;
  const holds = calendar.entries.filter((entry) => ["held", "pending_verification"].includes(entry.status)).length;
  const availableFutureDays = grid.days.filter((day) => day.dateKey >= today && !(byDate.get(day.dateKey)?.length)).length;
  const blackouts = calendar.entries.filter((entry) => entry.kind === "blackout");
  const previousMonth = shiftCalendarMonth(month, -1);
  const nextMonth = shiftCalendarMonth(month, 1);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">Disponibilidad real</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-[40px]">Calendario de eventos</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Una sola celebración por fecha. Los estados de esta vista provienen de reservas y holds reales protegidos por PostgreSQL.
          </p>
        </div>
        {calendar.canCreate ? (
          <Button className="h-11 rounded-xl px-4" render={<Link href="/app/reservas/nueva" />}>
            <Plus aria-hidden="true" /> Retener una fecha
          </Button>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"><p className="text-xs text-muted-foreground">Reservadas</p><p className="mt-2 text-3xl font-semibold">{confirmed}</p></div>
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"><p className="text-xs text-muted-foreground">Holds activos</p><p className="mt-2 text-3xl font-semibold">{holds}</p></div>
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm"><p className="text-xs text-muted-foreground">Días no disponibles</p><p className="mt-2 text-3xl font-semibold">{occupied}</p></div>
        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm"><p className="text-xs text-muted-foreground">Disponibles desde hoy</p><p className="mt-2 text-3xl font-semibold">{availableFutureDays}</p></div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_10px_36px_rgba(0,0,0,0.045)]">
        <header className="flex items-center justify-between gap-3 border-b border-black/[0.055] px-4 py-4 sm:px-6">
          <Button aria-label="Mes anterior" render={<Link href={{ pathname: "/app/calendario", query: { mes: previousMonth } }} />} size="icon" variant="outline"><ChevronLeft /></Button>
          <div className="text-center"><h2 className="text-lg font-semibold">{calendarMonthLabel(month)}</h2><p className="mt-0.5 text-xs text-muted-foreground">Zona horaria: {calendar.timezone}</p></div>
          <Button aria-label="Mes siguiente" render={<Link href={{ pathname: "/app/calendario", query: { mes: nextMonth } }} />} size="icon" variant="outline"><ChevronRight /></Button>
        </header>

        <div className="grid grid-cols-7 border-b border-black/[0.055] bg-[#fafafa]">
          {weekDays.map((day) => <div className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:text-[11px]" key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: grid.leadingBlanks }, (_, index) => <div className="min-h-16 border-b border-r border-black/[0.045] bg-black/[0.015] sm:min-h-36" key={`blank-${index}`} />)}
          {grid.days.map((day) => {
            const entries = byDate.get(day.dateKey) ?? [];
            const entry = entries[0];
            const future = day.dateKey >= today;
            const available = future && !entry;
            const content = entry ? (
              <div className={`mt-1 rounded-lg border px-1.5 py-1.5 text-[9px] leading-3 sm:mt-2 sm:rounded-xl sm:px-2.5 sm:py-2 sm:text-[11px] sm:leading-4 ${BOOKING_STATUS_STYLES[entry.status] ?? BOOKING_STATUS_STYLES.blackout}`}>
                <span className="block font-semibold sm:hidden">{entry.status === "confirmed" ? "RES" : entry.kind === "hold" ? "HOLD" : "NO"}</span>
                <span className="hidden font-semibold sm:block">{BOOKING_STATUS_LABELS[entry.status] ?? "No disponible"}</span>
                {entry.customerName ? <span className="mt-0.5 hidden truncate font-medium sm:block">{entry.customerName}</span> : null}
                <span className="mt-0.5 hidden truncate opacity-75 sm:block">{entry.title}</span>
                {entry.eventStartTime ? <span className="mt-0.5 hidden opacity-65 sm:block">{entry.eventStartTime.slice(0, 5)}</span> : null}
              </div>
            ) : null;
            return (
              <div className={`min-h-16 border-b border-r border-black/[0.045] p-1 sm:min-h-36 sm:p-2 ${available ? "bg-emerald-50/20" : ""}`} key={day.dateKey}>
                <div className="flex items-center justify-between"><span className={`flex size-6 items-center justify-center rounded-full text-[11px] font-semibold sm:size-7 sm:text-xs ${day.dateKey === today ? "bg-[#1d1d1f] text-white" : ""}`}>{day.day}</span>{available ? <span className="size-1.5 rounded-full bg-emerald-500 sm:hidden" /> : null}</div>
                {entry?.bookingId ? (
                  <Link aria-label={`Abrir reserva del ${day.dateKey}`} href={`/app/reservas/${entry.bookingId}`}>{content}</Link>
                ) : entry?.opportunityId ? (
                  <Link aria-label={`Abrir oportunidad del ${day.dateKey}`} href={`/app/crm/${entry.opportunityId}`}>{content}</Link>
                ) : content}
                {available && calendar.canCreate ? (
                  <Link className="mt-2 hidden rounded-xl border border-dashed border-emerald-300 px-2 py-2 text-center text-[11px] font-medium text-emerald-800 hover:bg-emerald-50 sm:block" href={`/app/reservas/nueva?fecha=${day.dateKey}`}>Registrar</Link>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-950"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><span><strong>Reservada:</strong> abono mínimo de S/500 verificado.</span></div>
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950"><Clock3 className="mt-0.5 size-4 shrink-0" /><span><strong>Hold:</strong> retención automática de 24 horas al registrar el prospecto.</span></div>
        <div className="flex gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-5 text-zinc-900"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><span><strong>No disponible:</strong> bloqueo administrativo u operativo.</span></div>
      </section>

      {calendar.canManage && options ? <BlackoutForm venues={options.venues} /> : null}

      {calendar.canManage && blackouts.length ? (
        <section className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Bloqueos operativos activos</h2>
          <div className="mt-3 divide-y divide-black/[0.055]">
            {blackouts.map((entry) => (
              <div className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] sm:items-center" key={entry.id}>
                <div><p className="text-sm font-semibold">{entry.dateKey}</p><p className="mt-1 text-xs text-muted-foreground">{entry.reason ?? "Motivo operativo"}</p></div>
                <BlackoutReleaseForm allocationId={entry.id} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {calendar.canCreate ? (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 text-sm sm:hidden">
          <p className="font-semibold"><CalendarCheck2 className="mr-2 inline size-4" /> Registro móvil</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Los días con punto verde están disponibles. Pulsa “Retener una fecha” y selecciona el día.</p>
        </div>
      ) : null}
    </div>
  );
}
