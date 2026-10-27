import { CalendarCheck2, ChevronLeft, ChevronRight, Clock3, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

import { ShareAvailabilityButton } from "@/components/bookings/share-availability-button";
import { Button } from "@/components/ui/button";
import {
  calendarMonthGrid,
  calendarMonthLabel,
  instantDateKey,
} from "@/lib/crm/calendar";
import { publicCalendarNavigation } from "@/lib/public-availability";
import { ApplicationError } from "@/server/errors";
import {
  getPublicAvailabilityMonth,
  publicRequestKey,
} from "@/server/public-availability";

export const metadata: Metadata = {
  title: "Fechas reservadas",
  description: "Calendario público de fechas y horarios reservados de Kairós.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ mes?: string }>;
const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function PublicAvailabilityError({ rateLimited }: { rateLimited: boolean }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-5 py-12">
      <section className="w-full rounded-[28px] border border-black/[0.06] bg-white p-7 text-center shadow-[0_18px_70px_rgba(0,0,0,0.08)] sm:p-10">
        <Image alt="Kairós Salón de Recepciones" className="mx-auto h-auto w-28 object-contain mix-blend-multiply" height={220} priority src="/brand/kairos-logo.png" width={220} />
        <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">Calendario temporalmente no disponible</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          {rateLimited
            ? "Se alcanzó el límite temporal de consultas. Inténtalo nuevamente en unos minutos."
            : "No pudimos cargar las fechas reservadas. Vuelve a intentarlo más tarde."}
        </p>
      </section>
    </main>
  );
}

export default async function PublicAvailabilityPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestHeaders = await headers();
  let availability;

  try {
    availability = await getPublicAvailabilityMonth(
      params.mes,
      publicRequestKey(requestHeaders),
    );
  } catch (error) {
    return (
      <PublicAvailabilityError
        rateLimited={error instanceof ApplicationError && error.status === 429}
      />
    );
  }

  const grid = calendarMonthGrid(availability.month);
  const today = instantDateKey(new Date().toISOString(), availability.timezone);
  const byDate = new Map(availability.entries.map((entry) => [entry.date, entry]));
  const navigation = publicCalendarNavigation(
    availability.month,
    availability.currentMonth,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fffaf0_0,#f5f5f7_38%,#f5f5f7_100%)] px-3 py-5 sm:px-6 sm:py-9">
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-7">
        <header className="rounded-[28px] border border-black/[0.055] bg-white/92 px-5 py-5 shadow-[0_16px_65px_rgba(0,0,0,0.065)] backdrop-blur sm:px-8 sm:py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image alt="Kairós Salón de Recepciones" className="h-auto w-20 object-contain mix-blend-multiply sm:w-24" height={200} priority src="/brand/kairos-logo.png" width={200} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b672f]">Calendario público</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">Fechas reservadas</h1>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{availability.organizationName}</p>
              </div>
            </div>
            <ShareAvailabilityButton month={availability.month} />
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">
            Consulta qué días tienen una reserva confirmada y su horario. Por privacidad, esta vista no muestra clientes, importes, asesores ni detalles del evento.
          </p>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-black/[0.055] bg-white shadow-[0_16px_65px_rgba(0,0,0,0.055)]">
          <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 border-b border-black/[0.055] px-3 py-4 sm:px-6 sm:py-5">
            {navigation.canGoPrevious ? (
              <Button aria-label="Mes anterior" render={<Link href={{ pathname: "/disponibilidad", query: { mes: navigation.previousMonth } }} prefetch={false} />} size="icon" variant="outline"><ChevronLeft /></Button>
            ) : <span aria-hidden="true" />}
            <div className="text-center">
              <h2 className="text-lg font-semibold sm:text-xl">{calendarMonthLabel(availability.month)}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Zona horaria: {availability.timezone}</p>
            </div>
            {navigation.canGoNext ? (
              <Button aria-label="Mes siguiente" render={<Link href={{ pathname: "/disponibilidad", query: { mes: navigation.nextMonth } }} prefetch={false} />} size="icon" variant="outline"><ChevronRight /></Button>
            ) : <span aria-hidden="true" />}
          </header>

          <div className="grid grid-cols-7 border-b border-black/[0.055] bg-[#fafafa]">
            {weekDays.map((day) => <div className="px-1 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:text-[11px]" key={day}>{day}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: grid.leadingBlanks }, (_, index) => <div className="min-h-20 border-b border-r border-black/[0.045] bg-black/[0.015] sm:min-h-32" key={`blank-${index}`} />)}
            {grid.days.map((day) => {
              const entry = byDate.get(day.dateKey);
              const isPast = day.dateKey < today;
              const time = entry
                ? entry.endTime
                  ? `${entry.startTime}–${entry.endTime}`
                  : `Desde ${entry.startTime}`
                : null;
              return (
                <div className={`min-h-20 border-b border-r border-black/[0.045] p-1.5 sm:min-h-32 sm:p-2.5 ${isPast ? "bg-black/[0.012]" : ""}`} key={day.dateKey}>
                  <span className={`flex size-6 items-center justify-center rounded-full text-[11px] font-semibold sm:size-7 sm:text-xs ${day.dateKey === today ? "bg-[#1d1d1f] text-white" : isPast ? "text-muted-foreground" : ""}`}>{day.day}</span>
                  {entry ? (
                    <div className="mt-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-1.5 py-2 text-emerald-950 sm:mt-2 sm:px-2.5">
                      <span className="block text-[9px] font-bold uppercase tracking-[0.04em] sm:text-[11px]">Reservado</span>
                      <span className="mt-1 flex items-center gap-1 text-[9px] font-medium sm:text-[11px]"><Clock3 className="size-3" /> {time}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-950"><CalendarCheck2 className="mt-0.5 size-4 shrink-0" /><span><strong>Reservado:</strong> la fecha tiene una reserva confirmada y está bloqueada para otro evento.</span></div>
          <div className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-xs leading-5 text-zinc-800"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><span><strong>Privacidad:</strong> los días sin etiqueta deben consultarse con el equipo; esta vista no confirma disponibilidad por sí sola.</span></div>
        </section>
      </div>
    </main>
  );
}
