"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { apiErrorMessage, readApiBody } from "@/components/crm/api-form";
import { Button } from "@/components/ui/button";
import type { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

type StatusActionButtonProps = {
  body: Record<string, unknown>;
  className?: string;
  confirmMessage?: string;
  disabled?: boolean;
  endpoint: string;
  label: string;
  onUpdated?: () => void;
  successMessage?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
};

export function StatusActionButton({
  body,
  className,
  confirmMessage,
  disabled = false,
  endpoint,
  label,
  onUpdated,
  successMessage,
  variant = "outline",
}: StatusActionButtonProps) {
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function update() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setPending(true);
    setMessage(null);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, idempotencyKey: idempotencyKey.current }),
      });
      const responseBody = await readApiBody(response);

      if (!response.ok) {
        setMessage(apiErrorMessage(responseBody));
        return;
      }

      setMessage(successMessage ?? "Estado actualizado.");
      idempotencyKey.current = null;
      onUpdated?.();
      router.refresh();
    } catch {
      setMessage("No hubo conexión con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <Button
        className={className}
        disabled={disabled || pending}
        onClick={update}
        type="button"
        variant={variant}
      >
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        {pending ? "Actualizando…" : label}
      </Button>
      {message ? (
        <span aria-live="polite" className="max-w-64 text-xs leading-4 text-muted-foreground">
          {message}
        </span>
      ) : null}
    </span>
  );
}

