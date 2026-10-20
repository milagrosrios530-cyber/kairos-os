"use client";

import { CalendarPlus, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import {
  apiErrorMessage,
  localDateTimeToIso,
  optionalText,
  readApiBody,
  type FormNotice,
} from "@/components/crm/api-form";
import {
  controlClassName,
  FormFeedback,
  FormField,
} from "@/components/crm/form-elements";
import type { CrmOption } from "@/components/crm/new-lead-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type TaskFormProps = {
  assignees?: readonly CrmOption[];
  canAssign?: boolean;
  className?: string;
  onSaved?: () => void;
  opportunityId: string;
};

export function TaskForm({
  assignees = [],
  canAssign = false,
  className,
  onSaved,
  opportunityId,
}: TaskFormProps) {
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
        `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: form.get("type"),
            title: form.get("title"),
            description: optionalText(form.get("description")),
            dueAt: localDateTimeToIso(form.get("dueAt")),
            priority: form.get("priority"),
            assigneeId: canAssign ? optionalText(form.get("assigneeId")) : undefined,
            idempotencyKey: idempotencyKey.current,
          }),
        },
      );
      const body = await readApiBody(response);

      if (!response.ok) {
        setNotice({ kind: "error", text: apiErrorMessage(body, "No se pudo crear la tarea.") });
        setPending(false);
        return;
      }

      element.reset();
      idempotencyKey.current = null;
      setNotice({ kind: "success", text: "Tarea creada y asociada a la oportunidad." });
      onSaved?.();
      router.refresh();
    } catch {
      setNotice({
        kind: "error",
        text: "No hubo conexión con el servidor. La tarea no se creó.",
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
          <CalendarPlus aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em]">Nueva tarea</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Programa el siguiente contacto con responsable y vencimiento.</p>
        </div>
      </div>

      <FormFeedback notice={notice} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <FormField label="Tipo" name="type" required>
          <NativeSelect disabled={pending} id="type" name="type">
            <option value="llamada">Llamada</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="visita">Visita</option>
            <option value="enviar_cotizacion">Enviar cotización</option>
            <option value="verificar_pago">Verificar pago</option>
            <option value="otro">Otro</option>
          </NativeSelect>
        </FormField>
        <FormField label="Prioridad" name="priority" required>
          <NativeSelect defaultValue="media" disabled={pending} id="priority" name="priority">
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </NativeSelect>
        </FormField>
        <FormField label="Título" name="title" required>
          <Input
            className={controlClassName}
            disabled={pending}
            id="title"
            name="title"
            placeholder="Ej. Confirmar cantidad de invitados"
            required
          />
        </FormField>
        <FormField label="Fecha y hora de vencimiento" name="dueAt" required>
          <Input className={controlClassName} disabled={pending} id="dueAt" name="dueAt" required type="datetime-local" />
        </FormField>
        {canAssign ? (
          <FormField label="Responsable" name="assigneeId">
            <NativeSelect disabled={pending} id="assigneeId" name="assigneeId">
              <option value="">Asignarme a mí</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        ) : null}
        <div className={canAssign ? "sm:col-span-2" : "sm:col-span-2"}>
          <FormField label="Descripción" name="description">
            <Textarea disabled={pending} id="description" name="description" placeholder="Contexto y resultado esperado" />
          </FormField>
        </div>
      </div>

      <div className="mt-5 flex justify-end border-t border-black/[0.055] pt-4">
        <Button className="h-11 w-full rounded-xl px-4 sm:w-auto" disabled={pending} type="submit">
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
          {pending ? "Creando…" : "Crear tarea"}
        </Button>
      </div>
    </form>
  );
}

