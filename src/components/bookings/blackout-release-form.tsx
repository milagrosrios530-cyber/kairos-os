"use client";

import { LoaderCircle, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiErrorMessage, readApiBody } from "@/components/crm/api-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BlackoutReleaseForm({ allocationId }: { allocationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/calendar/blackouts/${allocationId}/release`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: String(formData.get("reason") ?? ""),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const body = await readApiBody(response);
      if (!response.ok) {
        setError(apiErrorMessage(body));
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input aria-label="Motivo para liberar" className="h-9" minLength={3} name="reason" placeholder="Motivo para liberar" required />
      <Button className="h-9 shrink-0" disabled={pending} size="sm" type="submit" variant="outline">
        {pending ? <LoaderCircle className="animate-spin" /> : <Unlock />}
        Liberar
      </Button>
      {error ? <span className="text-xs text-destructive sm:col-span-2">{error}</span> : null}
    </form>
  );
}
