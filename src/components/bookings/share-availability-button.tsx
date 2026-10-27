"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ShareAvailabilityButton({
  compact = false,
  month,
}: {
  compact?: boolean;
  month?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL("/disponibilidad", window.location.origin);
    if (month) url.searchParams.set("mes", month);
    const shareData = {
      title: "Fechas reservadas · Kairós",
      text: "Consulta las fechas y horarios reservados del Salón de Recepciones Kairós.",
      url: url.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url.toString());
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      } catch {
        setCopied(false);
      }
    }
  }

  return (
    <Button
      aria-live="polite"
      className={compact ? "h-10 rounded-xl" : "h-11 rounded-xl px-4"}
      onClick={share}
      type="button"
      variant="outline"
    >
      {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
      {copied ? "Enlace copiado" : "Compartir calendario"}
    </Button>
  );
}
