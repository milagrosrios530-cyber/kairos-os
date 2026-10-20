"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { apiErrorMessage, readApiBody, type FormNotice } from "@/components/crm/api-form";
import { FormFeedback } from "@/components/crm/form-elements";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function VisitOutcomeForm({
  opportunityId,
  visitId,
  expectedUpdatedAt,
}: {
  expectedUpdatedAt: string;
  opportunityId: string;
  visitId: string;
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
        `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/visits/${encodeURIComponent(visitId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "realizada",
            notes: form.get("outcome"),
            nextSteps: form.get("nextSteps") || undefined,
            expectedUpdatedAt,
            idempotencyKey: idempotencyKey.current,
          }),
        },
      );
      const body = await readApiBody(response);
      if (!response.ok) {
        setNotice({ kind: "error", text: apiErrorMessage(body, "No se pudo cerrar la visita.") });
        return;
      }
      idempotencyKey.current = null;
      setNotice({ kind: "success", text: "Visita realizada y resultado registrado." });
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
      <Textarea aria-label="Resultado de la visita" disabled={pending} name="outcome" placeholder="Qué ocurrió y qué acordaron" required rows={2} />
      <Textarea aria-label="Próximos pasos" disabled={pending} name="nextSteps" placeholder="Próximos pasos (opcional)" rows={2} />
      <Button className="h-10 w-full rounded-xl sm:w-auto" disabled={pending} type="submit" variant="outline">
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <CheckCircle2 aria-hidden="true" />}
        Marcar realizada
      </Button>
    </form>
  );
}
