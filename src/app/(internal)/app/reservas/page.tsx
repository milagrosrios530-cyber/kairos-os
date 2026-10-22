import { CalendarCheck2, Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationNav } from "@/components/layout/pagination-nav";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  longDate,
  soles,
} from "@/lib/bookings/presentation";
import { listBookings } from "@/server/bookings/queries";

type SearchParams = Promise<{ pagina?: string }>;

export default async function BookingsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const bookings = await listBookings({ page: Number.parseInt(params.pagina ?? "1", 10) });
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">Control de fechas</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-[40px]">Reservas</h1><p className="mt-3 text-sm text-muted-foreground">Historial persistente de holds, confirmaciones, vencimientos y cancelaciones.</p></div>
        <Button render={<Link href="/app/reservas/nueva" />}><Plus /> Retener fecha</Button>
      </section>
      {bookings.items.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {bookings.items.map((booking) => (
            <Link className="rounded-[22px] border border-black/[0.06] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" href={`/app/reservas/${booking.id}`} key={booking.id}>
              <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b672f]">{booking.code}</p><h2 className="mt-2 text-lg font-semibold">{booking.customerName}</h2><p className="mt-1 text-sm text-muted-foreground">{booking.eventType} · {booking.venueName}</p></div><Badge className={BOOKING_STATUS_STYLES[booking.status]} variant="outline">{BOOKING_STATUS_LABELS[booking.status] ?? booking.status}</Badge></div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/[0.05] pt-4 text-sm"><div><p className="text-xs text-muted-foreground">Fecha</p><p className="mt-1 font-medium capitalize">{longDate(booking.eventDate)}</p></div><div><p className="text-xs text-muted-foreground">Total contractual</p><p className="mt-1 font-medium">{soles(booking.totalContractCents)}</p></div></div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="rounded-[24px] border border-black/[0.06] bg-white px-5 py-14 text-center shadow-sm"><CalendarCheck2 className="mx-auto size-9 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">Todavía no hay reservas</h2><p className="mt-2 text-sm text-muted-foreground">Crea el primer hold desde el calendario o desde una oportunidad.</p></section>
      )}
      <PaginationNav label="reservas" page={bookings.page} pageSize={bookings.pageSize} pathname="/app/reservas" total={bookings.total} />
    </div>
  );
}
