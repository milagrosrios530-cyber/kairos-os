"use client";

import { StatusActionButton } from "@/components/crm/status-action-button";

type VisitStatus = "programada" | "realizada" | "no_asistio" | "reprogramada" | "cancelada";

type VisitStatusButtonProps = {
  className?: string;
  endpoint?: string;
  expectedUpdatedAt?: string;
  label: string;
  notes?: string;
  onUpdated?: () => void;
  opportunityId: string;
  status: VisitStatus;
  visitId: string;
};

export function VisitStatusButton({
  className,
  endpoint,
  expectedUpdatedAt,
  label,
  notes,
  onUpdated,
  opportunityId,
  status,
  visitId,
}: VisitStatusButtonProps) {
  const requiresNotes = status === "realizada" || status === "no_asistio" || status === "cancelada";

  return (
    <StatusActionButton
      body={{ status, notes: notes || undefined, expectedUpdatedAt }}
      className={className}
      confirmMessage={status === "cancelada" ? "¿Confirmas que deseas cancelar esta visita?" : undefined}
      disabled={requiresNotes && !notes?.trim()}
      endpoint={
        endpoint ??
        `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/visits/${encodeURIComponent(visitId)}`
      }
      label={requiresNotes && !notes?.trim() ? "Añade una nota para continuar" : label}
      onUpdated={onUpdated}
      successMessage="Estado de la visita actualizado."
      variant={status === "cancelada" ? "destructive" : "outline"}
    />
  );
}

