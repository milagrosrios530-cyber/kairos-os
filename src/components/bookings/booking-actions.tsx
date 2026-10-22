"use client";

import {
  BadgeCheck,
  CalendarSync,
  CircleDollarSign,
  ClockArrowUp,
  LoaderCircle,
  ShieldX,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiErrorMessage, readApiBody, solesToCents, type FormNotice } from "@/components/crm/api-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { soles } from "@/lib/bookings/presentation";
import { PAYMENT_METHODS } from "@/lib/validation/bookings";

type Deposit = {
  id: string;
  amountCents: number;
  paymentMethod: string;
  paymentReference: string | null;
  status: string;
  submittedAt: string;
};

const paymentMethodLabels: Record<string, string> = {
  transferencia: "Transferencia",
  yape: "Yape",
  plin: "Plin",
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

class ApiRequestError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

async function postJson(
  url: string,
  payload: Record<string, unknown>,
  idempotencyKey: string,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, idempotencyKey }),
  });
  const body = await readApiBody(response);
  if (!response.ok) throw new ApiRequestError(apiErrorMessage(body), false);
  return body;
}

export function BookingActions({
  bookingId,
  status,
  canManage,
  canSubmitDeposit,
  deposits,
  eventDate,
  eventStartTime,
  eventEndTime,
}: {
  bookingId: string;
  status: string;
  canManage: boolean;
  canSubmitDeposit: boolean;
  deposits: Deposit[];
  eventDate: string;
  eventStartTime: string;
  eventEndTime: string | null;
}) {
  const router = useRouter();
  const [idempotencyKeys] = useState(() => new Map<string, string>());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const activeHold = ["held", "pending_verification"].includes(status);
  const submittedDeposits = deposits.filter((deposit) => deposit.status === "submitted");

  async function run(key: string, url: string, payload: Record<string, unknown>, success: string) {
    setBusy(key);
    setNotice(null);
    const idempotencyKey = idempotencyKeys.get(key) ?? crypto.randomUUID();
    idempotencyKeys.set(key, idempotencyKey);
    try {
      await postJson(url, payload, idempotencyKey);
      idempotencyKeys.delete(key);
      setNotice({ kind: "success", text: success });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiRequestError && !error.retryable) {
        idempotencyKeys.delete(key);
      }
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "No se pudo completar la operación.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function submitDeposit(formData: FormData) {
    const amountCents = solesToCents(formData.get("amount"));
    await run(
      "deposit",
      `/api/bookings/${bookingId}/deposits`,
      {
        amountCents,
        paymentMethod: String(formData.get("paymentMethod") ?? ""),
        paymentReference: String(formData.get("paymentReference") ?? "").trim() || undefined,
        note: String(formData.get("note") ?? "").trim() || undefined,
      },
      "Abono registrado. Administración debe verificarlo antes de confirmar la fecha.",
    );
  }

  async function release(formData: FormData) {
    await run(
      "release",
      `/api/bookings/${bookingId}/release`,
      { reason: String(formData.get("reason") ?? "") },
      "El hold fue liberado y la fecha vuelve a estar disponible.",
    );
  }

  async function rejectDeposit(depositId: string, formData: FormData) {
    await run(
      `reject-${depositId}`,
      `/api/bookings/${bookingId}/deposits/${depositId}/reject`,
      { reason: String(formData.get("reason") ?? "") },
      "El comprobante fue rechazado y permanece en el historial.",
    );
  }

  async function cancel(formData: FormData) {
    await run(
      "cancel",
      `/api/bookings/${bookingId}/cancel`,
      { reason: String(formData.get("reason") ?? "") },
      "La reserva fue cancelada y quedó registrada en auditoría.",
    );
  }

  async function reschedule(formData: FormData) {
    await run(
      "reschedule",
      `/api/bookings/${bookingId}/reschedule`,
      {
        eventDate: String(formData.get("eventDate") ?? ""),
        eventStartTime: String(formData.get("eventStartTime") ?? ""),
        eventEndTime: String(formData.get("eventEndTime") ?? "") || undefined,
        reason: String(formData.get("reason") ?? ""),
      },
      "La reserva fue reprogramada sin perder su historial.",
    );
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <Alert variant={notice.kind === "error" ? "destructive" : "default"}>
          <AlertTitle>{notice.kind === "error" ? "No se completó" : "Operación registrada"}</AlertTitle>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      ) : null}

      {activeHold && canSubmitDeposit ? (
        <details className="group rounded-2xl border border-black/[0.07] bg-white p-4" open={status === "held"}>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
            <CircleDollarSign className="size-4 text-[#9b773f]" /> Registrar abono recibido
          </summary>
          <form action={submitDeposit} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deposit-amount">Importe (S/)</Label>
              <Input defaultValue="500.00" id="deposit-amount" min="500" name="amount" required step="0.01" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Medio de pago</Label>
              <NativeSelect id="payment-method" name="paymentMethod" required>
                {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{paymentMethodLabels[method]}</option>)}
              </NativeSelect>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="payment-reference">Operación o referencia</Label>
              <Input id="payment-reference" maxLength={180} name="paymentReference" placeholder="Código de operación (opcional en efectivo)" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="payment-note">Nota</Label>
              <Textarea id="payment-note" maxLength={1000} name="note" rows={2} />
            </div>
            <Button className="sm:col-span-2 sm:w-fit" disabled={busy !== null} type="submit">
              {busy === "deposit" ? <LoaderCircle className="animate-spin" /> : <CircleDollarSign />}
              Guardar para verificación
            </Button>
          </form>
        </details>
      ) : null}

      {activeHold && canManage ? (
        <details className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-amber-950">
            <ClockArrowUp className="size-4" /> Extender hold 24 horas
          </summary>
          <form
            action={async (formData) => {
              await run(
                "extend",
                `/api/bookings/${bookingId}/extend`,
                { reason: String(formData.get("reason") ?? "") },
                "El hold fue extendido por 24 horas y quedó auditado.",
              );
            }}
            className="mt-4 space-y-3"
          >
            <Label htmlFor="extend-reason">Motivo obligatorio</Label>
            <Textarea id="extend-reason" minLength={3} name="reason" required rows={2} />
            <Button disabled={busy !== null} type="submit" variant="outline">
              {busy === "extend" ? <LoaderCircle className="animate-spin" /> : <ClockArrowUp />}
              Extender 24 horas
            </Button>
          </form>
        </details>
      ) : null}

      {canManage && submittedDeposits.length ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
            <BadgeCheck className="size-4" /> Verificar y confirmar fecha
          </h3>
          <p className="mt-1 text-xs leading-5 text-emerald-900/75">
            Confirma únicamente después de comprobar el ingreso. La fecha pasará a RESERVADA y el contrato se envía después.
          </p>
          <div className="mt-3 space-y-2">
            {submittedDeposits.map((deposit) => (
              <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between" key={deposit.id}>
                <div>
                  <p className="text-sm font-semibold">{soles(deposit.amountCents)} · {paymentMethodLabels[deposit.paymentMethod]}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{deposit.paymentReference ?? "Sin referencia"}</p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Button
                    disabled={busy !== null}
                    onClick={() => run(
                      `confirm-${deposit.id}`,
                      `/api/bookings/${bookingId}/confirm`,
                      { depositId: deposit.id },
                      "Abono verificado y fecha confirmada.",
                    )}
                    type="button"
                  >
                    {busy === `confirm-${deposit.id}` ? <LoaderCircle className="animate-spin" /> : <BadgeCheck />}
                    Verificar y confirmar
                  </Button>
                  <details className="w-full sm:w-56">
                    <summary className="cursor-pointer text-right text-xs font-medium text-red-700">Rechazar comprobante</summary>
                    <form action={rejectDeposit.bind(null, deposit.id)} className="mt-2 space-y-2">
                      <Textarea aria-label="Motivo de rechazo" minLength={3} name="reason" placeholder="Motivo obligatorio" required rows={2} />
                      <Button className="w-full" disabled={busy !== null} size="sm" type="submit" variant="destructive">
                        {busy === `reject-${deposit.id}` ? <LoaderCircle className="animate-spin" /> : <XCircle />}
                        Rechazar
                      </Button>
                    </form>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeHold && canSubmitDeposit ? (
        <details className="rounded-2xl border border-black/[0.07] bg-white p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ShieldX className="size-4" /> Liberar este hold
          </summary>
          <form action={release} className="mt-4 space-y-3">
            <Label htmlFor="release-reason">Motivo obligatorio</Label>
            <Textarea id="release-reason" minLength={3} name="reason" required rows={2} />
            <Button disabled={busy !== null} type="submit" variant="outline">
              {busy === "release" ? <LoaderCircle className="animate-spin" /> : <ShieldX />}
              Liberar fecha
            </Button>
          </form>
        </details>
      ) : null}

      {canManage && status === "confirmed" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <details className="rounded-2xl border border-black/[0.07] bg-white p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
              <CalendarSync className="size-4 text-sky-700" /> Reprogramar
            </summary>
            <form action={reschedule} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label htmlFor="reschedule-date">Nueva fecha</Label><Input defaultValue={eventDate} id="reschedule-date" name="eventDate" required type="date" /></div>
                <div><Label htmlFor="reschedule-start">Inicio</Label><Input defaultValue={eventStartTime.slice(0, 5)} id="reschedule-start" name="eventStartTime" required type="time" /></div>
                <div><Label htmlFor="reschedule-end">Término</Label><Input defaultValue={eventEndTime?.slice(0, 5) ?? ""} id="reschedule-end" name="eventEndTime" type="time" /></div>
              </div>
              <Label htmlFor="reschedule-reason">Motivo obligatorio</Label>
              <Textarea id="reschedule-reason" minLength={3} name="reason" required rows={2} />
              <Button disabled={busy !== null} type="submit" variant="outline">
                {busy === "reschedule" ? <LoaderCircle className="animate-spin" /> : <CalendarSync />}
                Comprobar y reprogramar
              </Button>
            </form>
          </details>

          <details className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-red-900">
              <XCircle className="size-4" /> Cancelar reserva
            </summary>
            <form action={cancel} className="mt-4 space-y-3">
              <Label htmlFor="cancel-reason">Motivo obligatorio</Label>
              <Textarea id="cancel-reason" minLength={3} name="reason" required rows={2} />
              <Button disabled={busy !== null} type="submit" variant="destructive">
                {busy === "cancel" ? <LoaderCircle className="animate-spin" /> : <XCircle />}
                Cancelar y liberar fecha
              </Button>
            </form>
          </details>
        </div>
      ) : null}
    </div>
  );
}
