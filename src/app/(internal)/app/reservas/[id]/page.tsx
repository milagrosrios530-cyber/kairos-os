import { ArrowLeft, CalendarDays, Clock3, FileText, UsersRound, WalletCards } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingActions } from "@/components/bookings/booking-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  longDate,
  shortTime,
  soles,
} from "@/lib/bookings/presentation";
import { getBookingDetail } from "@/server/bookings/queries";

type Params = Promise<{ id: string }>;

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(value));
}

export default async function BookingDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const booking = await getBookingDetail(id);
  if (!booking) notFound();
  const remaining = booking.totalContractCents - booking.depositVerifiedCents;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-3"><Button render={<Link href="/app/calendario" />} variant="ghost"><ArrowLeft /> Calendario</Button><Button render={<Link href={`/app/crm/${booking.opportunityId}`} />} variant="outline">Ver oportunidad</Button></div>
      <section className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b672f]">{booking.code}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{booking.customerName}</h1><p className="mt-2 text-sm text-muted-foreground">{booking.eventType} · Asesor: {booking.adviserName}</p></div><Badge className={`w-fit ${BOOKING_STATUS_STYLES[booking.status]}`} variant="outline">{BOOKING_STATUS_LABELS[booking.status] ?? booking.status}</Badge></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-[#f5f5f7] p-4"><CalendarDays className="size-4 text-[#9b773f]" /><p className="mt-3 text-xs text-muted-foreground">Fecha</p><p className="mt-1 text-sm font-semibold capitalize">{longDate(booking.eventDate)}</p></div>
          <div className="rounded-2xl bg-[#f5f5f7] p-4"><Clock3 className="size-4 text-[#9b773f]" /><p className="mt-3 text-xs text-muted-foreground">Horario</p><p className="mt-1 text-sm font-semibold">{shortTime(booking.eventStartTime)}{booking.eventEndTime ? ` – ${shortTime(booking.eventEndTime)}` : ""}</p></div>
          <div className="rounded-2xl bg-[#f5f5f7] p-4"><UsersRound className="size-4 text-[#9b773f]" /><p className="mt-3 text-xs text-muted-foreground">Invitados</p><p className="mt-1 text-sm font-semibold">{booking.guestCount ?? "Por definir"}</p></div>
          <div className="rounded-2xl bg-[#f5f5f7] p-4"><WalletCards className="size-4 text-[#9b773f]" /><p className="mt-3 text-xs text-muted-foreground">Total contractual</p><p className="mt-1 text-sm font-semibold">{soles(booking.totalContractCents)}</p></div>
        </div>
        {booking.holdExpiresAt ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950"><strong>Hold vigente hasta:</strong> {dateTime(booking.holdExpiresAt)}. Registrar un comprobante no amplía automáticamente el plazo.</div> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm"><p className="text-xs text-muted-foreground">Abono verificado</p><p className="mt-2 text-2xl font-semibold">{soles(booking.depositVerifiedCents)}</p><p className="mt-2 text-xs text-muted-foreground">Mínimo para confirmar: S/500.00</p></div>
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm"><p className="text-xs text-muted-foreground">Saldo actual</p><p className="mt-2 text-2xl font-semibold">{soles(remaining)}</p><p className="mt-2 text-xs text-muted-foreground">Total menos pagos verificados.</p></div>
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm"><p className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="size-4" /> Contrato</p><p className="mt-2 text-sm font-semibold">{booking.status === "confirmed" ? "Pendiente de enviar / registrar" : "Disponible después de confirmar"}</p><p className="mt-2 text-xs text-muted-foreground">La confirmación con S/500 no espera la firma.</p></div>
      </section>

      {booking.status === "confirmed" ? (
        <section className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Calendario de pagos acordado</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#f5f5f7] p-4"><p className="text-xs text-muted-foreground">50% del saldo base</p><p className="mt-2 text-xl font-semibold">{soles(booking.intermediateDueCents)}</p><p className="mt-1 text-xs text-muted-foreground">Vence: {booking.intermediateDueDate ? longDate(booking.intermediateDueDate) : "—"}</p></div><div className="rounded-2xl bg-[#f5f5f7] p-4"><p className="text-xs text-muted-foreground">Remanente programado</p><p className="mt-2 text-xl font-semibold">{soles(booking.finalScheduledCents)}</p><p className="mt-1 text-xs text-muted-foreground">Vence: {dateTime(booking.finalDueAt)} (2 horas antes)</p></div></div></section>
      ) : null}

      <BookingActions bookingId={booking.id} canManage={booking.canManage} canSubmitDeposit={booking.canSubmitDeposit} deposits={booking.deposits} eventDate={booking.eventDate} eventEndTime={booking.eventEndTime} eventStartTime={booking.eventStartTime} status={booking.status} />

      {booking.deposits.length ? (
        <section className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Abonos registrados</h2><div className="mt-4 divide-y divide-black/[0.055]">{booking.deposits.map((deposit) => <div className="flex items-center justify-between gap-3 py-3 text-sm" key={deposit.id}><div><p className="font-semibold">{soles(deposit.amountCents)} · {deposit.paymentMethod}</p><p className="mt-1 text-xs text-muted-foreground">{deposit.paymentReference ?? "Sin referencia"} · {dateTime(deposit.submittedAt)}</p></div><Badge variant="outline">{deposit.status === "verified" ? "Verificado" : deposit.status === "submitted" ? "Por verificar" : deposit.status}</Badge></div>)}</div></section>
      ) : null}
    </div>
  );
}
