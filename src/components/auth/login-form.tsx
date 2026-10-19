"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction } from "@/app/(auth)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialAuthState } from "@/lib/auth/action-state";

export function LoginForm() {
  const [state, action, pending] = useActionState(
    loginAction,
    initialAuthState,
  );

  return (
    <form action={action} className="space-y-5">
      {state.message ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Correo de trabajo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email?.map((message) => (
          <p className="text-sm text-destructive" key={message}>
            {message}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="password">Contraseña</Label>
          <Link
            className="text-sm font-medium text-[#8b672f] underline-offset-4 hover:underline"
            href="/recuperar-acceso"
          >
            Recuperar acceso
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
      </div>

      <Button className="h-11 w-full" disabled={pending} type="submit">
        {pending ? "Validando…" : "Ingresar"}
      </Button>

      <p className="text-center text-xs leading-5 text-muted-foreground">
        No existe registro público. El acceso se habilita únicamente mediante
        invitación interna.
      </p>
    </form>
  );
}
