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
        <Input id="email" name="email" type="email" required />
      </div>
      <Button className="h-11 w-full" disabled={pending} type="submit">
        {pending ? "Procesando…" : "Enviar instrucciones"}
      </Button>
    </form>
  );
}
