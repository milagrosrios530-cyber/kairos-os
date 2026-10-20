"use client";

import { StatusActionButton } from "./status-action-button";

export type PipelineStage =
  | "nuevo"
  | "contactado"
  | "calificado"
  | "visita_programada"
  | "visita_realizada"
  | "cotizacion_enviada"
  | "negociacion"
  | "ganado"
  | "perdido"
  | "descartado";

type OpportunityStageButtonProps = {
  className?: string;
  disabled?: boolean;
  endpoint?: string;
  expectedUpdatedAt?: string;
  label: string;
  lossReason?: string;
  onUpdated?: () => void;
  opportunityId: string;
  stage: PipelineStage;
};

export function OpportunityStageButton({
  className,
  disabled,
  endpoint,
  expectedUpdatedAt,
  label,
  lossReason,
  onUpdated,
  opportunityId,
  stage,
}: OpportunityStageButtonProps) {
  const terminal = stage === "perdido" || stage === "descartado";

  return (
    <StatusActionButton
      body={{
        pipelineStatus: stage,
        lossReason: lossReason || undefined,
        expectedUpdatedAt,
      }}
      className={className}
      confirmMessage={
        terminal ? `¿Confirmas que deseas marcar la oportunidad como ${label.toLowerCase()}?` : undefined
      }
      disabled={disabled || (terminal && !lossReason?.trim()) || stage === "ganado"}
      endpoint={endpoint ?? `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/stage`}
      label={stage === "ganado" ? "Ganado solo con reserva" : label}
      onUpdated={onUpdated}
      successMessage={`Etapa actualizada a ${label}.`}
      variant={terminal ? "destructive" : "outline"}
    />
  );
}

