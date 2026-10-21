"use client";

import { UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import { createUserSchema } from "@/lib/validation/auth";

type ApiResult = {
  error?: {
    message?: string;
    details?: unknown;
  };
};

const FIELD_NAMES = [
  "fullName",
  "dni",
  "email",
  "password",
  "confirmPassword",
  "role",
] as const;

type FieldName = (typeof FIELD_NAMES)[number];
type FieldErrors = Partial<Record<FieldName, string[]>>;

function extractFieldErrors(details: unknown): FieldErrors {
  if (!details || typeof details !== "object" || Array.isArray(details)) return {};

  const result: FieldErrors = {};
  const record = details as Record<string, unknown>;

  for (const field of FIELD_NAMES) {
    const messages = record[field];
    if (Array.isArray(messages)) {
      result[field] = messages.filter(
        (message): message is string => typeof message === "string" && message.length > 0,
      );
    }
  }

  return result;
}

function firstFieldError(errors: FieldErrors) {
  for (const field of FIELD_NAMES) {
    const message = errors[field]?.[0];
    if (message) return message;
  }

  return null;
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;

  return (
    <div aria-live="polite" className="space-y-1" id={id}>
      {messages.map((error) => (
        <p className="text-xs font-medium text-destructive" key={error}>
          {error}
        </p>
      ))}
    </div>
  );
}

export function CreateUserForm({ allowedRoles }: { allowedRoles: readonly AppRole[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setFieldErrors({});

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      fullName: form.get("fullName"),
      email: form.get("email"),
      dni: form.get("dni"),
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
      role: form.get("role"),
    };
    const clientValidation = createUserSchema.safeParse(payload);

    if (!clientValidation.success) {
      const errors = extractFieldErrors(clientValidation.error.flatten().fieldErrors);
      const firstError = firstFieldError(errors);
      setFieldErrors(errors);
      setMessage({
        kind: "error",
        text: firstError
          ? `No se creó el usuario: ${firstError}`
          : "Revisa los campos marcados.",
      });
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientValidation.data),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok) {
        const errors = extractFieldErrors(result.error?.details);
        const firstError = firstFieldError(errors);
        setFieldErrors(errors);
        setMessage({
          kind: "error",
          text: firstError
            ? `No se creó el usuario: ${firstError}`
            : (result.error?.message ?? "No se pudo crear el usuario."),
        });
        setPending(false);
        return;
      }
    } catch {
      setMessage({
        kind: "error",
        text: "No hubo conexión con el servidor. Inténtalo nuevamente.",
      });
      setPending(false);
      return;
    }

    formElement.reset();
    setMessage({
      kind: "success",
      text: "Usuario creado. Ya puede ingresar con su correo o DNI y contraseña.",
    });
    setPending(false);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {message ? (
        <Alert
          aria-live="polite"
          className={message.kind === "success" ? "border-emerald-200 bg-emerald-50" : undefined}
          variant={message.kind === "error" ? "destructive" : "default"}
        >
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input
            aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
            aria-invalid={Boolean(fieldErrors.fullName)}
            autoComplete="name"
            className="h-11 rounded-xl bg-white"
            disabled={pending}
            id="fullName"
            name="fullName"
            onChange={() => clearFieldError("fullName")}
            placeholder="Nombre y apellidos"
            required
          />
          <FieldError id="fullName-error" messages={fieldErrors.fullName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dni">DNI</Label>
          <Input
            aria-describedby={fieldErrors.dni ? "dni-error" : "dni-help"}
            aria-invalid={Boolean(fieldErrors.dni)}
            className="h-11 rounded-xl bg-white"
            disabled={pending}
            id="dni"
            inputMode="numeric"
            maxLength={8}
            minLength={8}
            name="dni"
            onChange={() => clearFieldError("dni")}
            pattern="[0-9]{8}"
            placeholder="8 dígitos"
            required
          />
          <FieldError id="dni-error" messages={fieldErrors.dni} />
          <p className="text-xs leading-5 text-muted-foreground" id="dni-help">
            Se protege en el servidor y solo se mostrarán sus últimos cuatro dígitos.
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Correo de acceso</Label>
          <Input
            aria-describedby={fieldErrors.email ? "email-error" : "email-help"}
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="email"
            className="h-11 rounded-xl bg-white"
            disabled={pending}
            id="email"
            inputMode="email"
            name="email"
            onChange={() => clearFieldError("email")}
            placeholder="nombre@recepcioneskairos.com"
            required
            type="email"
          />
          <FieldError id="email-error" messages={fieldErrors.email} />
          <p className="text-xs leading-5 text-muted-foreground" id="email-help">
            Se crea directamente como usuario de Supabase Auth; no debes registrarlo antes en
            Supabase. Solo necesita un buzón real si usará la recuperación por correo.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña inicial</Label>
          <PasswordInput
            aria-describedby={fieldErrors.password ? "password-error" : "password-help"}
            aria-invalid={Boolean(fieldErrors.password)}
            autoComplete="new-password"
            disabled={pending}
            id="password"
            minLength={12}
            name="password"
            onChange={() => clearFieldError("password")}
            required
          />
          <FieldError id="password-error" messages={fieldErrors.password} />
          <p className="text-xs leading-5 text-muted-foreground" id="password-help">
            Mínimo 12 caracteres, con mayúscula, minúscula y número.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <PasswordInput
            aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            autoComplete="new-password"
            disabled={pending}
            id="confirmPassword"
            minLength={12}
            name="confirmPassword"
            onChange={() => clearFieldError("confirmPassword")}
            required
          />
          <FieldError id="confirmPassword-error" messages={fieldErrors.confirmPassword} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Rol inicial</Label>
        <select
          aria-describedby={fieldErrors.role ? "role-error" : undefined}
          aria-invalid={Boolean(fieldErrors.role)}
          className="flex h-11 w-full rounded-xl border border-input bg-white px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          defaultValue="COMERCIAL"
          disabled={pending}
          id="role"
          name="role"
          onChange={() => clearFieldError("role")}
        >
          {allowedRoles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <FieldError id="role-error" messages={fieldErrors.role} />
      </div>

      <div className="flex flex-col gap-3 border-t border-black/[0.055] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          No se enviará invitación. La cuenta quedará activa inmediatamente y la creación será auditada.
        </p>
        <Button className="h-11 shrink-0 rounded-xl px-4" disabled={pending} type="submit">
          <UserRoundPlus aria-hidden="true" />
          {pending ? "Creando…" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
