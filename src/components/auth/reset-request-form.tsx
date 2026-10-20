"use client";

import { useActionState } from "react";

import { requestPasswordResetAction } from "@/app/(auth)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialAuthState } from "@/lib/auth/action-state";

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    initialAuthState,
  );

  return (
    <form action={action} className="space-y-5">
      {state.message ? (
        <Alert variant={state.status === "error" ? "destructive" : "default"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Correo de trabajo</Label>
        <Input
          autoComplete="email"
          autoFocus
          className="h-11 rounded-xl bg-white"
          id="email"
          inputMode="email"
          name="email"
          placeholder="nombre@empresa.com"
          required
          type="email"
        />
      </div>
      <Button className="h-11 w-full rounded-xl shadow-sm" disabled={pending} type="submit">
        {pending ? "Procesando…" : "Enviar instrucciones"}
      </Button>
    </form>
  );
}
