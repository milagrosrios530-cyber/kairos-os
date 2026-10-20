"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction } from "@/app/(auth)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { initialAuthState } from "@/lib/auth/action-state";

export function LoginForm() {
  const [state, action, pending] = useActionState(
    loginAction,
    initialAuthState,
  );

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="identifier">Correo corporativo o DNI</Label>
        <Input
          autoFocus
          className="h-11 rounded-xl bg-white"
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          placeholder="nombre@empresa.com o 12345678"
          aria-invalid={Boolean(state.fieldErrors?.identifier)}
        />
        {state.fieldErrors?.identifier?.map((message) => (
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
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        {state.fieldErrors?.password?.map((message) => (
          <p className="text-sm text-destructive" key={message}>
            {message}
          </p>
        ))}
      </div>

      <Button className="h-11 w-full rounded-xl shadow-sm" disabled={pending} type="submit">
        {pending ? "Validando…" : "Ingresar"}
      </Button>

      <p className="border-t pt-4 text-center text-xs leading-5 text-muted-foreground">
        No existe registro público. Solo un administrador autorizado puede crear
        cuentas internas.
      </p>
    </form>
  );
}
