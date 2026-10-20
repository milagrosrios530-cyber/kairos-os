"use client";

import { ChevronDown, LoaderCircle, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  apiErrorMessage,
  readApiBody,
  type ApiErrorBody,
  type FormNotice,
} from "./api-form";
import { controlClassName, FormFeedback, FormField } from "./form-elements";

type StoredService = {
  id: string;
  label: string;
  quantity: number | null;
  unit: string | null;
  details: string | null;
};

type EditableService = {
  key: string;
  id?: string;
  label: string;
  quantity: string;
  unit: string;
  details: string;
};

function editable(service: StoredService): EditableService {
  return {
    key: service.id,
    id: service.id,
    label: service.label,
    quantity: service.quantity === null ? "" : String(service.quantity),
    unit: service.unit ?? "",
    details: service.details ?? "",
  };
}

export function ServiceDetailsForm({
  expectedUpdatedAt,
  opportunityId,
  services,
}: {
  expectedUpdatedAt: string;
  opportunityId: string;
  services: StoredService[];
}) {
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const [rows, setRows] = useState<EditableService[]>(services.map(editable));
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<FormNotice | null>(null);

  function updateRow(key: string, field: keyof EditableService, value: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        label: "",
        quantity: "",
        unit: "",
        details: "",
      },
    ]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    idempotencyKey.current ??= crypto.randomUUID();

    const payload = {
      services: rows.map((row) => ({
        id: row.id,
        label: row.label,
        quantity: row.quantity.trim() ? Number(row.quantity) : undefined,
        unit: row.unit.trim() || undefined,
        details: row.details.trim() || undefined,
      })),
      expectedUpdatedAt,
      idempotencyKey: idempotencyKey.current,
    };

    try {
      const response = await fetch(`/api/crm/opportunities/${opportunityId}/services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await readApiBody(response)) as ApiErrorBody;
      if (!response.ok) {
        setNotice({
          kind: "error",
          text: apiErrorMessage(body, "No se pudieron actualizar los servicios."),
        });
        setPending(false);
        return;
      }

      idempotencyKey.current = null;
      setNotice({ kind: "success", text: "Servicios actualizados y auditados." });
      router.refresh();
    } catch {
      setNotice({
        kind: "error",
        text: "No se pudo conectar con el servidor. Inténtalo nuevamente.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="group mt-5 overflow-hidden rounded-2xl border border-black/[0.07] bg-[#f8f8fa]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <span className="flex-1">Editar servicios</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>

      <form className="space-y-4 border-t border-black/[0.06] p-4" onSubmit={submit}>
        <FormFeedback notice={notice} />

        {rows.map((row, index) => (
          <fieldset className="rounded-2xl border border-black/[0.07] bg-white p-4" key={row.key}>
            <legend className="px-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Servicio {index + 1}
            </legend>
            <div className="grid gap-3 sm:grid-cols-[1.3fr_0.6fr_0.8fr]">
              <FormField label="Servicio" name={`service-label-${row.key}`} required>
                <Input
                  className={controlClassName}
                  disabled={pending}
                  id={`service-label-${row.key}`}
                  maxLength={120}
                  onChange={(event) => updateRow(row.key, "label", event.target.value)}
                  required
                  value={row.label}
                />
              </FormField>
              <FormField label="Cantidad" name={`service-quantity-${row.key}`}>
                <Input
                  className={controlClassName}
                  disabled={pending}
                  id={`service-quantity-${row.key}`}
                  max="100000"
                  min="0.01"
                  onChange={(event) => updateRow(row.key, "quantity", event.target.value)}
                  step="0.01"
                  type="number"
                  value={row.quantity}
                />
              </FormField>
              <FormField label="Unidad" name={`service-unit-${row.key}`}>
                <Input
                  className={controlClassName}
                  disabled={pending}
                  id={`service-unit-${row.key}`}
                  maxLength={40}
                  onChange={(event) => updateRow(row.key, "unit", event.target.value)}
                  placeholder="personas, mesas, servicio…"
                  value={row.unit}
                />
              </FormField>
            </div>
            <div className="mt-3">
              <FormField label="Detalle" name={`service-details-${row.key}`}>
                <Textarea
                  disabled={pending}
                  id={`service-details-${row.key}`}
                  maxLength={2000}
                  onChange={(event) => updateRow(row.key, "details", event.target.value)}
                  placeholder="Tipo, distribución, alcance o condición conversada"
                  value={row.details}
                />
              </FormField>
            </div>
          </fieldset>
        ))}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button disabled={pending || rows.length >= 30} onClick={addRow} type="button" variant="outline">
            <Plus aria-hidden="true" /> Agregar servicio
          </Button>
          <Button disabled={pending || rows.length === 0} type="submit">
            {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
            Guardar detalles
          </Button>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Guardar agrega una entrada de auditoría. No elimina servicios ni confirma una reserva.
        </p>
      </form>
    </details>
  );
}
