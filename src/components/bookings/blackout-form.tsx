"use client";

import { Ban, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { apiErrorMessage, readApiBody, type FormNotice } from "@/components/crm/api-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export function BlackoutForm({ venues }: { venues: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<FormNotice | null>(null);

  async function submit(formData: FormData) {
    setPending(true);
    setNotice(null);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/calendar/blackouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          venueId: String(formData.get("venueId") ?? ""),
          eventDate: String(formData.get("eventDate") ?? ""),
          reason: String(formData.get("reason") ?? ""),
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const body = await readApiBody(response);
      if (!response.ok) {
        idempotencyKey.current = null;
        setNotice({ kind: "error", text: apiErrorMessage(body) });
        return;
      }
      setNotice({ kind: "success", text: "Fecha bloqueada y protegida contra reservas." });
      idempotencyKey.current = null;
      router.refresh();
    } catch {
      setNotice({ kind: "error", text: "La conexión se interrumpió. Puedes reintentar sin duplicar el bloqueo." });
    } finally {
      setPending(false);
    }
  }

  if (!venues.length) return null;
  return (
    <details className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold"><Ban className="size-4" /> Bloqueo operativo</summary>
      <form action={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        {notice ? <Alert variant={notice.kind === "error" ? "destructive" : "default"} className="sm:col-span-2"><AlertDescription>{notice.text}</AlertDescription></Alert> : null}
        <div><Label htmlFor="blackout-date">Fecha</Label><Input id="blackout-date" name="eventDate" required type="date" /></div>
        <div><Label htmlFor="blackout-venue">Espacio</Label><NativeSelect defaultValue={venues[0]?.id} id="blackout-venue" name="venueId">{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</NativeSelect></div>
        <div className="sm:col-span-2"><Label htmlFor="blackout-reason">Motivo</Label><Textarea id="blackout-reason" minLength={3} name="reason" required rows={2} /></div>
        <Button className="sm:col-span-2 sm:w-fit" disabled={pending} type="submit">{pending ? <LoaderCircle className="animate-spin" /> : <Ban />} Bloquear fecha</Button>
      </form>
    </details>
  );
}
