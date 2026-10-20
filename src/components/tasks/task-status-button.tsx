"use client";

import { StatusActionButton } from "@/components/crm/status-action-button";

type TaskStatus = "pendiente" | "en_progreso" | "completada" | "cancelada";

type TaskStatusButtonProps = {
  className?: string;
  endpoint?: string;
  expectedUpdatedAt?: string;
  label: string;
  onUpdated?: () => void;
  opportunityId: string;
  result?: string;
  status: TaskStatus;
  taskId: string;
};

export function TaskStatusButton({
  className,
  endpoint,
  expectedUpdatedAt,
  label,
  onUpdated,
  opportunityId,
  result,
  status,
  taskId,
}: TaskStatusButtonProps) {
  const needsResult = status === "completada";

  return (
    <StatusActionButton
      body={{ status, result: result || undefined, expectedUpdatedAt }}
      className={className}
      confirmMessage={status === "cancelada" ? "¿Confirmas que deseas cancelar esta tarea?" : undefined}
      disabled={needsResult && !result?.trim()}
      endpoint={
        endpoint ??
        `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/tasks/${encodeURIComponent(taskId)}`
      }
      label={needsResult && !result?.trim() ? "Añade un resultado para completar" : label}
      onUpdated={onUpdated}
      successMessage="Estado de la tarea actualizado."
      variant={status === "cancelada" ? "destructive" : "outline"}
    />
  );
}

