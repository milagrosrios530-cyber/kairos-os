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

type ApiResult = {
  error?: { message?: string };
};

export function CreateUserForm({ allowedRoles }: { allowedRoles: readonly AppRole[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          dni: form.get("dni"),
          password: form.get("password"),
          confirmPassword: form.get("confirmPassword"),
          role: form.get("role"),
        }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok) {
        setMessage({
          kind: "error",
          text: result.error?.message ?? "No se pudo crear el usuario.",
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
            autoComplete="name"
            className="h-11 rounded-xl bg-white"
            disabled={pending}
            id="fullName"
            name="fullName"
            placeholder="Nombre y apellidos"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dni">DNI</Label>
          <Input
            className="h-11 rounded-xl bg-white"
            disabled={pending}
            id="dni"
            inputMode="numeric"
            maxLength={8}
            minLength={8}
            name="dni"
            pattern="[0-9]{8}"
            placeholder="8 dígitos"
            required
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Se protege en el servidor y solo se mostrarán sus últimos cuatro dígitos.
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Correo corporativo</Label>
          <Input
            autoComplete="email"
            className="h-11 rounded-xl bg-white"
            disabled={pending}
            id="email"
            inputMode="email"
            name="email"
            placeholder="nombre@recepcioneskairos.com"
            required
            type="email"
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Crea el acceso en KAIROS OS. El buzón de correo debe existir en el proveedor corporativo para recuperar la clave.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña inicial</Label>
          <PasswordInput
            autoComplete="new-password"
            disabled={pending}
            id="password"
            minLength={12}
            name="password"
            required
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Mínimo 12 caracteres, con mayúscula, minúscula y número.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <PasswordInput
            autoComplete="new-password"
            disabled={pending}
            id="confirmPassword"
            minLength={12}
            name="confirmPassword"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Rol inicial</Label>
        <select
          className="flex h-11 w-full rounded-xl border border-input bg-white px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          defaultValue="COMERCIAL"
          disabled={pending}
          id="role"
          name="role"
        >
          {allowedRoles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
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
