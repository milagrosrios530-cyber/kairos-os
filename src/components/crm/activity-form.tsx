"use client";

import { LoaderCircle, MessageSquarePlus, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  apiErrorMessage,
  readApiBody,
  type FormNotice,
} from "./api-form";
import { FormFeedback, FormField } from "./form-elements";

type ActivityFormProps = {
  className?: string;
  defaultKind?:
    | "nota"
    | "llamada"
    | "whatsapp_manual"
    | "reunion"
    | "cambio_etapa"
    | "cambio_asesor"
    | "tarea"
    | "visita"
    | "sistema";
  onSaved?: () => void;
  opportunityId: string;
};

export function ActivityForm({
  className,
  defaultKind = "nota",
  onSaved,
  opportunityId,
}: ActivityFormProps) {
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [kind, setKind] = useState(defaultKind);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    const element = event.currentTarget;
    const form = new FormData(element);
    idempotencyKey.current ??= crypto.randomUUID();

    try {
      const response = await fetch(
        `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/activities`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: form.get("kind"),
            description: form.get("description"),
            idempotencyKey: idempotencyKey.current,
          }),
        },
      );
      const body = await readApiBody(response);

      if (!response.ok) {
        setNotice({
          kind: "error",
          text: apiErrorMessage(body, "No se pudo registrar la actividad."),
        });
        setPending(false);
        return;
      }

      element.reset();
      idempotencyKey.current = null;
      setKind(defaultKind);
      setNotice({ kind: "success", text: "Actividad registrada en la línea de tiempo." });
      onSaved?.();
      router.refresh();
    } catch {
      setNotice({
        kind: "error",
        text: "No hubo conexión con el servidor. La nota no se envió.",
      });
    } finally {
      setPending(false);
    }
  }

  function submitWithShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
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
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[#f2ead9] text-[#80602c]">
          <MessageSquarePlus aria-hidden="true" className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Registrar actividad</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Quedará asociada a tu usuario y hora.</p>
        </div>
      </div>

      <FormFeedback notice={notice} />

      <div className="mt-4 grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <FormField label="Tipo" name="kind" required>
          <NativeSelect
            disabled={pending}
            id="kind"
            name="kind"
            onChange={(event) => setKind(event.target.value as typeof kind)}
            value={kind}
          >
            <option value="nota">Nota</option>
            <option value="llamada">Llamada</option>
            <option value="whatsapp_manual">WhatsApp manual</option>
            <option value="reunion">Reunión</option>
          </NativeSelect>
        </FormField>
        <FormField
          hint={
            kind === "whatsapp_manual"
              ? "Registra lo relevante; los mensajes no se sincronizan sin una integración oficial."
              : "Atajo: Ctrl/⌘ + Enter para guardar."
          }
          label="Detalle"
          name="description"
          required
        >
          <Textarea
            disabled={pending}
            id="description"
            name="description"
            onKeyDown={submitWithShortcut}
            placeholder="Resume la conversación, acuerdo o próximo paso…"
            required
            rows={3}
          />
        </FormField>
      </div>

      <div className="mt-4 flex justify-end">
        <Button className="h-11 w-full rounded-xl px-4 sm:w-auto" disabled={pending} type="submit">
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Send aria-hidden="true" />}
          {pending ? "Guardando…" : "Añadir a la línea de tiempo"}
        </Button>
      </div>
    </form>
  );
}

