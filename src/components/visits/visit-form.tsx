"use client";

import { CalendarClock, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import {
  apiErrorMessage,
  localDateTimeToIso,
  optionalInteger,
  optionalText,
  readApiBody,
  type FormNotice,
} from "@/components/crm/api-form";
import {
  controlClassName,
  FormFeedback,
  FormField,
} from "@/components/crm/form-elements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type VisitFormProps = {
  className?: string;
  onSaved?: () => void;
  opportunityId: string;
};

export function VisitForm({ className, onSaved, opportunityId }: VisitFormProps) {
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<FormNotice | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    const element = event.currentTarget;
    const form = new FormData(element);
    idempotencyKey.current ??= crypto.randomUUID();

    try {
      const response = await fetch(
        `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/visits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startAt: localDateTimeToIso(form.get("startAt")),
            endAt: localDateTimeToIso(form.get("endAt")),
            participantsCount: optionalInteger(form.get("participantsCount")),
            mode: form.get("mode"),
            notes: optionalText(form.get("notes")),
            idempotencyKey: idempotencyKey.current,
          }),
        },
      );
      const body = await readApiBody(response);

      if (!response.ok) {
        setNotice({ kind: "error", text: apiErrorMessage(body, "No se pudo programar la visita.") });
        setPending(false);
        return;
      }

      element.reset();
      idempotencyKey.current = null;
      setNotice({
        kind: "success",
        text: "Visita programada. No afecta la disponibilidad del salón.",
      });
      onSaved?.();
      router.refresh();
    } catch {
      setNotice({
        kind: "error",
        text: "No hubo conexión con el servidor. La visita no se programó.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className={cn(
        "rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.035)] sm:p-5",
        className,
      )}
      onSubmit={submit}
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-[14px] bg-[#f2ead9] text-[#80602c]">
          <CalendarClock aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em]">Programar visita</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Agenda comercial separada del calendario de eventos.</p>
        </div>
      </div>

      <FormFeedback notice={notice} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <FormField label="Inicio" name="startAt" required>
          <Input className={controlClassName} disabled={pending} id="startAt" name="startAt" required type="datetime-local" />
        </FormField>
        <FormField label="Fin" name="endAt" required>
          <Input className={controlClassName} disabled={pending} id="endAt" name="endAt" required type="datetime-local" />
        </FormField>
        <FormField label="Modalidad" name="mode" required>
          <NativeSelect defaultValue="presencial" disabled={pending} id="mode" name="mode">
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
            <option value="telefonica">Telefónica</option>
          </NativeSelect>
        </FormField>
        <FormField label="Participantes" name="participantsCount">
          <Input className={controlClassName} disabled={pending} id="participantsCount" min={1} name="participantsCount" type="number" />
        </FormField>
        <div className="sm:col-span-2">
          <FormField hint="La visita no bloquea el salón ni confirma la fecha del evento." label="Notas" name="notes">
            <Textarea disabled={pending} id="notes" name="notes" placeholder="Quiénes asistirán, temas a revisar y preparación necesaria" />
          </FormField>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-900">
        Esta agenda organiza recorridos y reuniones. La disponibilidad del evento se gestiona por separado.
      </div>

      <div className="mt-5 flex justify-end border-t border-black/[0.055] pt-4">
        <Button className="h-11 w-full rounded-xl px-4 sm:w-auto" disabled={pending} type="submit">
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
          {pending ? "Programando…" : "Programar visita"}
        </Button>
      </div>
    </form>
  );
}

