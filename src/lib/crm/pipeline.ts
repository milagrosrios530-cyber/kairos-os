import {
  PIPELINE_STATUSES,
  type PipelineStatus,
} from "@/lib/crm/constants";

export const LOCKED_PIPELINE_STAGES: readonly PipelineStatus[] = ["ganado"];
export const CLOSED_PIPELINE_STAGES: readonly PipelineStatus[] = [
  "perdido",
  "descartado",
];

export function isPipelineStatus(value: string): value is PipelineStatus {
  return PIPELINE_STATUSES.includes(value as PipelineStatus);
}
export function canMoveOpportunityTo(stage: PipelineStatus) {
  return !LOCKED_PIPELINE_STAGES.includes(stage);
}

export function pipelineMoveRequiresReason(stage: PipelineStatus) {
  return CLOSED_PIPELINE_STAGES.includes(stage);
}

