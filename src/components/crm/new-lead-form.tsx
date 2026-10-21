"use client";

import {
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  SearchCheck,
  ShieldAlert,
  UserRoundPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  apiErrorMessage,
  localDateTimeToIso,
  optionalInteger,
  optionalText,
  readApiBody,
  solesToCents,
  type ApiErrorBody,
  type FormNotice,
} from "./api-form";
import {
  controlClassName,
  ExpandableFormSection,
  FormFeedback,
  FormField,
  FormSection,
} from "./form-elements";

export type CrmOption = {
  id: string;
  name: string;
};

type IntakeCreated = {
  customerId: string;
  opportunityId: string;
  opportunityCode: string;
};

type DuplicateMatch = {
  id: string;
  fullName: string;
  maskedPhone: string;
};

type IntakeResponse = ApiErrorBody & {
  data?: IntakeCreated;
};

type NewLeadFormProps = {
  advisers?: readonly CrmOption[];
  canAssign?: boolean;
  className?: string;
  eventTypes: readonly CrmOption[];
  initialDesiredDate?: string;
  onCreated?: (created: IntakeCreated) => void;
  redirectToDetail?: boolean;
};

const serviceOptions = [
  { value: "local", label: "Local", unit: "servicio" },
  { value: "mobiliario", label: "Mobiliario", unit: "mesas" },
  { value: "decoracion", label: "Decoración", unit: "servicio" },
  { value: "mesas_decoradas", label: "Mesas decoradas", unit: "mesas" },
  { value: "catering", label: "Catering", unit: "personas" },
  { value: "mozos", label: "Mozos", unit: "personas" },
  { value: "limpieza", label: "Personal de limpieza", unit: "personas" },
  { value: "coordinacion", label: "Coordinación", unit: "servicio" },
  { value: "sonido", label: "Sonido", unit: "servicio" },
  { value: "dj", label: "DJ", unit: "servicio" },
  { value: "audiovisual", label: "Fotografía y video", unit: "servicio" },
  { value: "ceremonia", label: "Ceremonia", unit: "servicio" },
  { value: "otro", label: "Otro", unit: "unidad" },
] as const;

function duplicateMatchesFrom(body: ApiErrorBody): DuplicateMatch[] {
  const details = body.error?.details;
  if (!details || typeof details !== "object" || !("matches" in details)) return [];
  const matches = (details as { matches?: unknown }).matches;
  if (!Array.isArray(matches)) return [];

  return matches.filter((match): match is DuplicateMatch => {
    if (!match || typeof match !== "object") return false;
    const candidate = match as Record<string, unknown>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.fullName === "string" &&
      typeof candidate.maskedPhone === "string"
    );
  });
}

export function NewLeadForm({
  advisers = [],
  canAssign = false,
  className,
  eventTypes,
  initialDesiredDate,
  onCreated,
  redirectToDetail = true,
}: NewLeadFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const idempotencyKey = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [existingCustomerId, setExistingCustomerId] = useState<string | null>(null);
  const [duplicateOverride, setDuplicateOverride] = useState(false);
  const [withTask, setWithTask] = useState(false);
  const [withVisit, setWithVisit] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);

    const element = event.currentTarget;
    const form = new FormData(element);
    idempotencyKey.current ??= crypto.randomUUID();

    const firstTask = withTask
      ? {
          type: String(form.get("taskType") ?? "llamada"),
          title: String(form.get("taskTitle") ?? ""),
          description: optionalText(form.get("taskDescription")),
          dueAt: localDateTimeToIso(form.get("taskDueAt")),
          priority: String(form.get("taskPriority") ?? "media"),
        }
      : undefined;

    const firstVisit = withVisit
      ? {
          startAt: localDateTimeToIso(form.get("visitStartAt")),
          endAt: localDateTimeToIso(form.get("visitEndAt")),
          participantsCount: optionalInteger(form.get("visitParticipantsCount")),
          mode: String(form.get("visitMode") ?? "presencial"),
          notes: optionalText(form.get("visitNotes")),
        }
      : undefined;

    const payload = {
      existingCustomerId: existingCustomerId ?? undefined,
      duplicateOverrideReason: duplicateOverride
        ? optionalText(form.get("duplicateOverrideReason"))
        : undefined,
      fullName: String(form.get("fullName") ?? ""),
      customerType: String(form.get("customerType") ?? "persona"),
      phone: String(form.get("phone") ?? ""),
      secondaryPhone: optionalText(form.get("secondaryPhone")),
      email: optionalText(form.get("email")),
      documentType: optionalText(form.get("documentType")),
      documentNumber: optionalText(form.get("documentNumber")),
      affiliationName: optionalText(form.get("affiliationName")),
      district: optionalText(form.get("district")),
      city: optionalText(form.get("city")),
      preferredContactChannel: String(
        form.get("preferredContactChannel") ?? "whatsapp",
      ),
      internalNotes: optionalText(form.get("internalNotes")),
      eventTypeId: String(form.get("eventTypeId") ?? ""),
      eventDetail: optionalText(form.get("eventDetail")),
      desiredDate: String(form.get("desiredDate") ?? ""),
      guestsAdults: optionalInteger(form.get("guestsAdults")),
      guestsChildren: optionalInteger(form.get("guestsChildren")),
      guestsTotal: optionalInteger(form.get("guestsTotal")),
      modality: String(form.get("modality") ?? "personalizado"),
      source: String(form.get("source") ?? "whatsapp"),
      sourceDetail: optionalText(form.get("sourceDetail")),
      serviceInterests: serviceOptions
        .filter((service) => selectedServices.includes(service.value))
        .map((service) => {
          const quantityValue = String(
            form.get(`serviceQuantity.${service.value}`) ?? "",
          ).trim();
          return {
            label: service.label,
            quantity: quantityValue ? Number(quantityValue) : undefined,
            unit: optionalText(form.get(`serviceUnit.${service.value}`)),
            details: optionalText(form.get(`serviceDetails.${service.value}`)),
          };
        }),
      proposedAmountCents: solesToCents(form.get("proposedAmount")),
      proposalServicesSummary: optionalText(form.get("proposalServicesSummary")),
      opportunityNotes: optionalText(form.get("opportunityNotes")),
      assignedTo: canAssign ? optionalText(form.get("assignedTo")) : undefined,
      firstTask,
      firstVisit,
      idempotencyKey: idempotencyKey.current,
    };

    try {
      const response = await fetch("/api/crm/intakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await readApiBody(response)) as IntakeResponse;

      if (!response.ok) {
        const matches = response.status === 409 ? duplicateMatchesFrom(body) : [];
        setDuplicates(matches);
        setNotice({
          kind: matches.length > 0 ? "info" : "error",
          text:
            matches.length > 0
              ? "Encontramos una ficha con datos similares. Revísala antes de crear otra."
              : apiErrorMessage(body, "No se pudo registrar la oportunidad."),
        });
        setPending(false);
        return;
      }

      if (!body.data) {
        setNotice({ kind: "error", text: "El servidor no devolvió el registro creado." });
        setPending(false);
        return;
      }

      const created = body.data;
      element.reset();
      idempotencyKey.current = null;
      setDuplicates([]);
      setExistingCustomerId(null);
      setDuplicateOverride(false);
      setSelectedServices([]);
      setWithTask(false);
      setWithVisit(false);
      setNotice({
        kind: "success",
        text: `${created.opportunityCode} se registró correctamente.`,
      });
      onCreated?.(created);
      router.refresh();
      if (redirectToDetail) router.push(`/app/crm/${created.opportunityId}`);
    } catch {
      setNotice({
        kind: "error",
        text: "No hubo conexión con el servidor. Tus datos siguen en el formulario.",
      });
      setPending(false);
      return;
    }

    setPending(false);
  }

  return (
    <form className={cn("space-y-4 sm:space-y-5", className)} onSubmit={submit} ref={formRef}>
      <FormFeedback notice={notice} />

      {duplicates.length > 0 ? (
        <section className="rounded-[22px] border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
          <div className="flex gap-3">
            <SearchCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-amber-950">Posibles clientes existentes</h2>
              <p className="mt-1 text-xs leading-5 text-amber-900/75">
                El teléfono no es único. Vincula la oportunidad solo si reconoces a la persona.
              </p>
              <div className="mt-3 grid gap-2">
                {duplicates.map((match) => (
                  <button
                    className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-left outline-none transition-colors hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-amber-700"
                    key={match.id}
                    onClick={() => {
                      setExistingCustomerId(match.id);
                      setDuplicateOverride(false);
                      setDuplicates([]);
                      setNotice({
                        kind: "info",
                        text: `Se vinculará la nueva oportunidad con ${match.fullName}. Revisa los datos y vuelve a guardar.`,
                      });
                    }}
                    type="button"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{match.fullName}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{match.maskedPhone}</span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-amber-700" />
                  </button>
                ))}
                <button
                  className="min-h-12 rounded-xl border border-dashed border-amber-400 bg-transparent px-3 py-2.5 text-left text-sm font-semibold text-amber-900 outline-none transition-colors hover:bg-amber-100/70 focus-visible:ring-2 focus-visible:ring-amber-700"
                  onClick={() => {
                    setExistingCustomerId(null);
                    setDuplicateOverride(true);
                    setDuplicates([]);
                    setNotice({
                      kind: "info",
                      text: "Crearás una ficha separada. Escribe el motivo para dejar trazabilidad.",
                    });
                  }}
                  type="button"
                >
                  Crear ficha separada con justificación
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {existingCustomerId ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
            <Check aria-hidden="true" className="size-4" />
            Se usará la ficha existente seleccionada.
          </p>
          <Button
            className="h-9 rounded-xl"
            onClick={() => {
              setExistingCustomerId(null);
              setDuplicateOverride(true);
              setNotice({
                kind: "info",
                text: "Si crearás una ficha separada, registra el motivo antes de guardar.",
              });
            }}
            type="button"
            variant="outline"
          >
            No usar esta ficha
          </Button>
        </div>
      ) : null}

      {duplicateOverride ? (
        <section className="rounded-[22px] border border-amber-300 bg-amber-50 p-4 sm:p-5">
          <FormField
            hint="Este motivo se conserva para auditoría; evita datos sensibles innecesarios."
            label="Motivo para crear una ficha separada"
            name="duplicateOverrideReason"
            required
          >
            <Textarea
              disabled={pending}
              id="duplicateOverrideReason"
              name="duplicateOverrideReason"
              placeholder="Ej. Número compartido por integrantes distintos de un comité"
              required
              rows={3}
            />
          </FormField>
        </section>
      ) : null}

      <FormSection
        description="Solo necesitamos un nombre y un teléfono para comenzar. Buscaremos coincidencias al guardar."
        title="1. Cliente"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre completo o razón social" name="fullName" required>
            <Input
              autoComplete="name"
              className={controlClassName}
              disabled={pending}
              id="fullName"
              name="fullName"
              placeholder="Ej. Ana Pérez"
              required
            />
          </FormField>
          <FormField
            hint="Se normalizará al formato internacional cuando corresponda."
            label="WhatsApp o teléfono"
            name="phone"
            required
          >
            <Input
              autoComplete="tel"
              className={controlClassName}
              disabled={pending}
              id="phone"
              inputMode="tel"
              name="phone"
              placeholder="987 654 321"
              required
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        description="Esta información califica la consulta. La fecha solicitada no bloquea ni confirma el salón."
        title="2. Evento solicitado"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tipo de evento" name="eventTypeId" required>
            <NativeSelect disabled={pending || eventTypes.length === 0} id="eventTypeId" name="eventTypeId" required>
              <option value="">Selecciona un tipo</option>
              {eventTypes.map((eventType) => (
                <option key={eventType.id} value={eventType.id}>
                  {eventType.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            hint="Ejemplo: 50 años, promoción 2026 o aniversario de empresa."
            label="Detalle del evento"
            name="eventDetail"
          >
            <Input
              className={controlClassName}
              disabled={pending}
              id="eventDetail"
              maxLength={160}
              name="eventDetail"
              placeholder="50 años"
            />
          </FormField>
          <FormField
            hint="Tentativa · no reserva el salón."
            label="Fecha solicitada"
            name="desiredDate"
            required
          >
            <Input
              className={controlClassName}
              defaultValue={initialDesiredDate}
              disabled={pending}
              id="desiredDate"
              name="desiredDate"
              required
              type="date"
            />
          </FormField>
          <FormField label="Invitados estimados" name="guestsTotal" required>
            <Input
              className={controlClassName}
              disabled={pending}
              id="guestsTotal"
              inputMode="numeric"
              min={1}
              name="guestsTotal"
              placeholder="Ej. 180"
              required
              type="number"
            />
          </FormField>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/75 px-4 py-3">
          <p className="flex items-start gap-2 text-xs leading-5 text-amber-900 sm:text-sm">
            <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Al registrar, esta fecha quedará retenida automáticamente durante 24 horas. Si ya está ocupada, el sistema no guardará el registro y te pedirá elegir otro día.
          </p>
        </div>
      </FormSection>

      <ExpandableFormSection
        description="Los valores más frecuentes ya están seleccionados. Abre solo si necesitas cambiarlos."
        title="Clasificación y responsable"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Tipo de cliente" name="customerType" required>
            <NativeSelect defaultValue="persona" disabled={pending} id="customerType" name="customerType">
              <option value="persona">Persona</option>
              <option value="empresa">Empresa</option>
              <option value="comite">Comité</option>
              <option value="institucion">Institución</option>
            </NativeSelect>
          </FormField>
          <FormField label="Canal preferido" name="preferredContactChannel" required>
            <NativeSelect defaultValue="whatsapp" disabled={pending} id="preferredContactChannel" name="preferredContactChannel">
              <option value="whatsapp">WhatsApp</option>
              <option value="llamada">Llamada</option>
              <option value="correo">Correo</option>
            </NativeSelect>
          </FormField>
          <FormField label="Modalidad" name="modality" required>
            <NativeSelect defaultValue="personalizado" disabled={pending} id="modality" name="modality">
              <option value="solo_local">Solo local</option>
              <option value="integral">Integral</option>
              <option value="personalizado">Personalizado</option>
              <option value="corporativo">Corporativo</option>
            </NativeSelect>
          </FormField>
          <FormField label="Origen de la consulta" name="source" required>
            <NativeSelect defaultValue="whatsapp" disabled={pending} id="source" name="source">
              <option value="whatsapp">WhatsApp</option>
              <option value="facebook_ads">Facebook Ads</option>
              <option value="instagram">Instagram</option>
              <option value="referido">Referido</option>
              <option value="visita_presencial">Visita presencial</option>
              <option value="web_disponibilidad">Web de disponibilidad</option>
              <option value="otro">Otro</option>
            </NativeSelect>
          </FormField>
          <FormField hint="Es obligatorio cuando eliges “Otro”." label="Detalle del origen" name="sourceDetail">
            <Input className={controlClassName} disabled={pending} id="sourceDetail" name="sourceDetail" placeholder="Campaña, persona o canal" />
          </FormField>
          {canAssign ? (
            <FormField hint="Si no eliges uno, se asignará según la regla del servidor." label="Asesor responsable" name="assignedTo">
              <NativeSelect disabled={pending} id="assignedTo" name="assignedTo">
                <option value="">Asignación automática</option>
                {advisers.map((adviser) => (
                  <option key={adviser.id} value={adviser.id}>{adviser.name}</option>
                ))}
              </NativeSelect>
            </FormField>
          ) : null}
        </div>
      </ExpandableFormSection>

      <ExpandableFormSection
        description="Contacto adicional, documento y ubicación. Completa solo lo necesario para la atención."
        title="Más datos del cliente"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Teléfono secundario" name="secondaryPhone">
            <Input className={controlClassName} disabled={pending} id="secondaryPhone" inputMode="tel" name="secondaryPhone" />
          </FormField>
          <FormField label="Correo" name="email">
            <Input autoComplete="email" className={controlClassName} disabled={pending} id="email" name="email" type="email" />
          </FormField>
          <FormField label="Organización, colegio o comité" name="affiliationName">
            <Input className={controlClassName} disabled={pending} id="affiliationName" name="affiliationName" />
          </FormField>
          <FormField label="Tipo de documento" name="documentType">
            <NativeSelect disabled={pending} id="documentType" name="documentType">
              <option value="">Sin registrar</option>
              <option value="dni">DNI</option>
              <option value="ruc">RUC</option>
              <option value="ce">Carné de extranjería</option>
              <option value="pasaporte">Pasaporte</option>
              <option value="otro">Otro documento</option>
            </NativeSelect>
          </FormField>
          <FormField hint="Se mostrará enmascarado fuera del detalle autorizado." label="Número de documento" name="documentNumber">
            <Input className={controlClassName} disabled={pending} id="documentNumber" inputMode="numeric" name="documentNumber" />
          </FormField>
          <FormField label="Distrito" name="district">
            <Input className={controlClassName} disabled={pending} id="district" name="district" />
          </FormField>
          <FormField label="Ciudad" name="city">
            <Input className={controlClassName} defaultValue="Huancayo" disabled={pending} id="city" name="city" />
          </FormField>
          <FormField label="Adultos" name="guestsAdults">
            <Input className={controlClassName} disabled={pending} id="guestsAdults" min={0} name="guestsAdults" type="number" />
          </FormField>
          <FormField label="Menores" name="guestsChildren">
            <Input className={controlClassName} disabled={pending} id="guestsChildren" min={0} name="guestsChildren" type="number" />
          </FormField>
          <div className="sm:col-span-2 lg:col-span-3">
            <FormField label="Notas internas del cliente" name="internalNotes">
              <Textarea disabled={pending} id="internalNotes" name="internalNotes" placeholder="Contexto útil para el equipo autorizado" />
            </FormField>
          </div>
        </div>
      </ExpandableFormSection>

      <ExpandableFormSection
        description="Registra intereses y una conversación preliminar sin convertirla en tarifa oficial."
        title="Servicios y propuesta preliminar"
      >
        <fieldset>
          <legend className="text-sm font-medium">Servicios de interés</legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {serviceOptions.map((service) => (
              <label
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-black/[0.07] bg-[#f8f8fa] px-3 py-2 text-sm transition-colors has-[:checked]:border-[#c5a46d] has-[:checked]:bg-[#f7f0df]"
                key={service.value}
              >
                <input
                  checked={selectedServices.includes(service.value)}
                  className="size-4 accent-[#8b672f]"
                  disabled={pending}
                  onChange={(event) =>
                    setSelectedServices((current) =>
                      event.target.checked
                        ? [...current, service.value]
                        : current.filter((value) => value !== service.value),
                    )
                  }
                  type="checkbox"
                  value={service.value}
                />
                {service.label}
              </label>
            ))}
          </div>
        </fieldset>

        {selectedServices.length ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Cantidad y alcance por servicio
            </p>
            {serviceOptions
              .filter((service) => selectedServices.includes(service.value))
              .map((service) => (
                <div
                  className="grid gap-3 rounded-2xl border border-black/[0.06] bg-[#f8f8fa] p-4 sm:grid-cols-[0.75fr_0.9fr_2fr]"
                  key={service.value}
                >
                  <FormField label={`${service.label}: cantidad`} name={`serviceQuantity.${service.value}`}>
                    <Input
                      className={controlClassName}
                      disabled={pending}
                      id={`serviceQuantity.${service.value}`}
                      max="100000"
                      min="0.01"
                      name={`serviceQuantity.${service.value}`}
                      placeholder="Ej. 2"
                      step="0.01"
                      type="number"
                    />
                  </FormField>
                  <FormField label="Unidad" name={`serviceUnit.${service.value}`}>
                    <Input
                      className={controlClassName}
                      defaultValue={service.unit}
                      disabled={pending}
                      id={`serviceUnit.${service.value}`}
                      maxLength={40}
                      name={`serviceUnit.${service.value}`}
                    />
                  </FormField>
                  <FormField label="Detalle" name={`serviceDetails.${service.value}`}>
                    <Input
                      className={controlClassName}
                      disabled={pending}
                      id={`serviceDetails.${service.value}`}
                      maxLength={2000}
                      name={`serviceDetails.${service.value}`}
                      placeholder="Tipo, distribución o alcance conversado"
                    />
                  </FormField>
                </div>
              ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField
            hint="Este monto no es una tarifa, cotización ni precio contratado."
            label="Monto propuesto (referencial)"
            name="proposedAmount"
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">S/</span>
              <Input
                className={cn(controlClassName, "pl-9")}
                disabled={pending}
                id="proposedAmount"
                inputMode="decimal"
                min="0"
                name="proposedAmount"
                placeholder="0.00"
                step="0.01"
                type="number"
              />
            </div>
          </FormField>
          <FormField label="Resumen de lo conversado" name="proposalServicesSummary">
            <Textarea disabled={pending} id="proposalServicesSummary" name="proposalServicesSummary" placeholder="Alcance preliminar, condiciones por revisar…" />
          </FormField>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <CircleDollarSign aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-xs font-bold tracking-[0.08em] text-amber-900">PROPUESTA · NO ES TARIFA OFICIAL</p>
              <p className="mt-1 text-xs leading-5 text-amber-900/75">
                No confirma precio ni reserva. La cotización aprobada se emitirá en su módulo correspondiente.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <FormField label="Notas de la oportunidad" name="opportunityNotes">
            <Textarea disabled={pending} id="opportunityNotes" name="opportunityNotes" placeholder="Necesidades, decisor, alternativas o próximos pasos" />
          </FormField>
        </div>
      </ExpandableFormSection>

      <ExpandableFormSection
        description="Opcional: deja programado el siguiente contacto sin salir del alta."
        title="Próxima acción"
      >
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-black/[0.07] bg-[#f8f8fa] px-3 py-2.5 text-sm font-medium">
          <input
            checked={withTask}
            className="size-4 accent-[#8b672f]"
            disabled={pending}
            onChange={(event) => setWithTask(event.target.checked)}
            type="checkbox"
          />
          Crear una tarea de seguimiento
        </label>
        {withTask ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label="Tipo" name="taskType" required>
              <NativeSelect disabled={pending} id="taskType" name="taskType">
                <option value="llamada">Llamada</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="visita">Visita</option>
                <option value="enviar_cotizacion">Enviar cotización</option>
                <option value="verificar_pago">Verificar pago</option>
                <option value="otro">Otro</option>
              </NativeSelect>
            </FormField>
            <FormField label="Prioridad" name="taskPriority" required>
              <NativeSelect defaultValue="media" disabled={pending} id="taskPriority" name="taskPriority">
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </NativeSelect>
            </FormField>
            <FormField label="Título" name="taskTitle" required>
              <Input className={controlClassName} disabled={pending} id="taskTitle" name="taskTitle" required={withTask} />
            </FormField>
            <FormField label="Vence" name="taskDueAt" required>
              <Input className={controlClassName} disabled={pending} id="taskDueAt" name="taskDueAt" required={withTask} type="datetime-local" />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Descripción" name="taskDescription">
                <Textarea disabled={pending} id="taskDescription" name="taskDescription" />
              </FormField>
            </div>
          </div>
        ) : null}

        <div className="my-5 border-t border-black/[0.055]" />

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-black/[0.07] bg-[#f8f8fa] px-3 py-2.5 text-sm font-medium">
          <input
            checked={withVisit}
            className="size-4 accent-[#8b672f]"
            disabled={pending}
            onChange={(event) => setWithVisit(event.target.checked)}
            type="checkbox"
          />
          Programar una visita al salón
        </label>
        {withVisit ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label="Inicio" name="visitStartAt" required>
              <Input className={controlClassName} disabled={pending} id="visitStartAt" name="visitStartAt" required={withVisit} type="datetime-local" />
            </FormField>
            <FormField label="Fin" name="visitEndAt" required>
              <Input className={controlClassName} disabled={pending} id="visitEndAt" name="visitEndAt" required={withVisit} type="datetime-local" />
            </FormField>
            <FormField label="Modalidad" name="visitMode" required>
              <NativeSelect disabled={pending} id="visitMode" name="visitMode">
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
                <option value="telefonica">Telefónica</option>
              </NativeSelect>
            </FormField>
            <FormField label="Participantes" name="visitParticipantsCount">
              <Input className={controlClassName} disabled={pending} id="visitParticipantsCount" min={1} name="visitParticipantsCount" type="number" />
            </FormField>
            <div className="sm:col-span-2">
              <FormField hint="La visita no bloquea la fecha del evento." label="Notas" name="visitNotes">
                <Textarea disabled={pending} id="visitNotes" name="visitNotes" />
              </FormField>
            </div>
          </div>
        ) : null}
      </ExpandableFormSection>

      <div className="sticky bottom-3 z-20 rounded-[20px] border border-black/[0.07] bg-white/92 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-4">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground sm:mb-0">
          <Clock3 aria-hidden="true" className="size-4 shrink-0" />
          Los cambios se guardan en la base real al confirmar.
        </div>
        <Button
          className="h-12 w-full rounded-xl px-5 sm:w-auto"
          disabled={pending || eventTypes.length === 0}
          type="submit"
        >
          {pending ? (
            <>
              <LoaderCircle aria-hidden="true" className="animate-spin" />
              Guardando…
            </>
          ) : (
            <>
              <UserRoundPlus aria-hidden="true" />
              Registrar cliente y oportunidad
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

