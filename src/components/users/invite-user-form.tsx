"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/auth/roles";

type ApiResult = {
  error?: { message?: string };
};

export function InviteUserForm() {
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
    let response: Response;
    let result: ApiResult;

    try {
      response = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          role: form.get("role"),
        }),
      });
      result = (await response.json()) as ApiResult;
    } catch {
      setMessage({
        kind: "error",
        text: "No hubo conexión con el servidor. Inténtalo nuevamente.",
      });
      setPending(false);
      return;
    }

    if (!response.ok) {
      setMessage({
        kind: "error",
        text: result.error?.message ?? "No se pudo enviar la invitación.",
      });
      setPending(false);
      return;
    }

    formElement.reset();
    setMessage({
      kind: "success",
      text: "Invitación enviada y rol registrado con auditoría.",
    });
    setPending(false);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {message ? (
        <Alert variant={message.kind === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" name="fullName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo de trabajo</Label>
          <Input id="email" name="email" type="email" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Rol inicial</Label>
        <select
          className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          defaultValue="COMERCIAL"
          id="role"
          name="role"
        >
          {APP_ROLES.map((role: AppRole) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </div>
      <Button disabled={pending} type="submit">
        <Send /> {pending ? "Enviando…" : "Enviar invitación"}
      </Button>
    </form>
  );
}
