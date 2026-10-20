"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { apiErrorMessage, readApiBody, type FormNotice } from "@/components/crm/api-form";
import { FormFeedback } from "@/components/crm/form-elements";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function TaskOutcomeForm({
  opportunityId,
  taskId,
  expectedUpdatedAt,
}: {
  expectedUpdatedAt: string;
  opportunityId: string;
  taskId: string;
}) {
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<FormNotice | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    idempotencyKey.current ??= crypto.randomUUID();

    try {
      const response = await fetch(
        `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/tasks/${encodeURIComponent(taskId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "completada",
            result: form.get("result"),
            expectedUpdatedAt,
            idempotencyKey: idempotencyKey.current,
          }),
        },
      );
      const body = await readApiBody(response);
      if (!response.ok) {
        setNotice({ kind: "error", text: apiErrorMessage(body, "No se pudo completar la tarea.") });
        return;
      }
      idempotencyKey.current = null;
      setNotice({ kind: "success", text: "Tarea completada con resultado registrado." });
      router.refresh();
    } catch {
      setNotice({ kind: "error", text: "No hubo conexión con el servidor." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-3 space-y-3" onSubmit={submit}>
      <FormFeedback notice={notice} />
      <Textarea
        aria-label="Resultado de la tarea"
        disabled={pending}
        name="result"
        placeholder="Resultado real del seguimiento"
        required
        rows={2}
      />
      <Button className="h-10 w-full rounded-xl sm:w-auto" disabled={pending} type="submit" variant="outline">
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <CheckCircle2 aria-hidden="true" />}
        Marcar completada
      </Button>
    </form>
  );
}
