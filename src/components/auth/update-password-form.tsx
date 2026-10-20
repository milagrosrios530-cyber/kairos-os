"use client";

import { useActionState } from "react";

import { updatePasswordAction } from "@/app/(auth)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { initialAuthState } from "@/lib/auth/action-state";

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    initialAuthState,
  );

  return (
    <form action={action} className="space-y-5">
      {state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <PasswordInput
          autoFocus
          id="password"
          name="password"
          autoComplete="new-password"
          required
        />
        {state.fieldErrors?.password?.map((message) => (
          <p className="text-sm text-destructive" key={message}>
            {message}
          </p>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Repite la contraseña</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
        />
        {state.fieldErrors?.confirmPassword?.map((message) => (
          <p className="text-sm text-destructive" key={message}>
            {message}
          </p>
        ))}
      </div>
      <Button className="h-11 w-full rounded-xl shadow-sm" disabled={pending} type="submit">
        {pending ? "Guardando…" : "Definir contraseña"}
      </Button>
    </form>
  );
}
