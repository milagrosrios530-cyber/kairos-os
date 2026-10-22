"use client";

import { CalendarCheck2, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { apiErrorMessage, readApiBody, solesToCents, type FormNotice } from "@/components/crm/api-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type OpportunityOption = {
  id: string;
  code: string;
  customerName: string;
  eventType: string;
  desiredDate: string | null;
  guestsTotal: number | null;
  adviserName: string;
};

type VenueOption = { id: string; name: string };

export function BookingHoldForm({
  opportunities,
  venues,
  defaultDate,
  defaultOpportunityId,
}: {
  opportunities: OpportunityOption[];
  venues: VenueOption[];
  defaultDate?: string;
  defaultOpportunityId?: string;
}) {
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const firstOpportunity = opportunities.find((item) => item.id === defaultOpportunityId)
    ?? opportunities[0];
  const [opportunityId, setOpportunityId] = useState(firstOpportunity?.id ?? "");
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [pending, setPending] = useState(false);
  const selected = useMemo(
    () => opportunities.find((item) => item.id === opportunityId),
    [opportunities, opportunityId],
  );

  async function submit(formData: FormData) {
    setPending(true);
    setNotice(null);
    const totalContractCents = solesToCents(formData.get("totalContract"));
    idempotencyKey.current ??= crypto.randomUUID();
    const payload = {
      opportunityId,
      venueId: String(formData.get("venueId") ?? ""),
      eventDate: String(formData.get("eventDate") ?? ""),
      eventStartTime: String(formData.get("eventStartTime") ?? ""),
      eventEndTime: String(formData.get("eventEndTime") ?? "") || undefined,
      totalContractCents,
      internalNotes: String(formData.get("internalNotes") ?? "").trim() || undefined,
      idempotencyKey: idempotencyKey.current,
    };
    try {
      const response = await fetch("/api/holds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await readApiBody(response);
      if (!response.ok) {
        idempotencyKey.current = null;
        setNotice({ kind: "error", text: apiErrorMessage(body, "No se pudo retener la fecha.") });
        return;
      }
      const data = body.data as { booking_id?: string } | undefined;
      if (!data?.booking_id) {
        idempotencyKey.current = null;
        setNotice({ kind: "error", text: "La reserva se registró sin un identificador navegable." });
        return;
      }
      router.push(`/app/reservas/${data.booking_id}`);
      router.refresh();
    } catch {
      setNotice({
        kind: "error",
        text: "La conexión se interrumpió. Puedes reintentar sin duplicar la reserva.",
      });
    } finally {
      setPending(false);
    }
  }

  if (!opportunities.length || !venues.length) {
    return (
      <Alert>
        <AlertTitle>No hay registros disponibles</AlertTitle>
        <AlertDescription>
          Necesitas una oportunidad comercial abierta y un salón activo antes de crear un hold.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={submit} className="space-y-6">
      {notice ? (
        <Alert variant={notice.kind === "error" ? "destructive" : "default"}>
          <AlertTitle>{notice.kind === "error" ? "Revisa la operación" : "Listo"}</AlertTitle>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="opportunityId">Cliente y evento</Label>
          <select
            className="h-12 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="opportunityId"
            onChange={(event) => setOpportunityId(event.target.value)}
            value={opportunityId}
          >
            {opportunities.map((opportunity) => (
              <option key={opportunity.id} value={opportunity.id}>
                {opportunity.customerName} · {opportunity.eventType} · {opportunity.code}
              </option>
            ))}
          </select>
          {selected ? (
            <p className="text-xs leading-5 text-muted-foreground">
              {selected.guestsTotal ? `${selected.guestsTotal} personas · ` : ""}
              Asesor: {selected.adviserName}
              {selected.desiredDate ? ` · Fecha solicitada: ${selected.desiredDate}` : ""}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="eventDate">Fecha del evento</Label>
          <Input defaultValue={defaultDate ?? selected?.desiredDate ?? ""} id="eventDate" name="eventDate" required type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venueId">Espacio</Label>
          <select className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm" defaultValue={venues[0]?.id} id="venueId" name="venueId">
            {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="eventStartTime">Hora de inicio</Label>
          <Input id="eventStartTime" name="eventStartTime" required type="time" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eventEndTime">Hora estimada de término</Label>
          <Input id="eventEndTime" name="eventEndTime" type="time" />
          <p className="text-[11px] text-muted-foreground">Opcional. La fecha completa queda protegida igualmente.</p>
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="totalContract">Total acordado para esta reserva (S/)</Label>
          <Input id="totalContract" inputMode="decimal" min="500" name="totalContract" placeholder="5500.00" required step="0.01" type="number" />
          <p className="text-[11px] leading-5 text-muted-foreground">
            Este importe pertenece a este contrato concreto y no se convierte en tarifa oficial.
          </p>
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="internalNotes">Nota interna</Label>
          <Textarea id="internalNotes" maxLength={5000} name="internalNotes" placeholder="Detalles útiles para administración (opcional)" rows={3} />
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
        <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4" /> Qué ocurrirá</p>
        <p className="mt-1">La fecha quedará retenida durante 24 horas. No estará confirmada hasta que administración verifique un abono mínimo de S/500.</p>
      </div>

      <Button className="h-12 w-full rounded-xl sm:w-auto sm:px-6" disabled={pending} type="submit">
        {pending ? <LoaderCircle className="animate-spin" /> : <CalendarCheck2 />}
        Retener fecha por 24 horas
      </Button>
    </form>
  );
}
