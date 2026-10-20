"use client";

import {
  CalendarDays,
  GripVertical,
  LoaderCircle,
  LockKeyhole,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type DragEvent, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  type PipelineStatus,
} from "@/lib/crm/constants";
import {
  canMoveOpportunityTo,
  isPipelineStatus,
  pipelineMoveRequiresReason,
} from "@/lib/crm/pipeline";
import { cn } from "@/lib/utils";

export type PipelineBoardItem = {
  id: string;
  code: string;
  customerName: string;
  eventType: string;
  adviserName: string;
  stage: string;
  desiredDate: string | null;
  guestsTotal: number | null;
  updatedAt: string;
};

type StageResponse = {
  data?: {
    opportunity_id?: string;
    pipeline_status?: string;
    updated_at?: string;
  };
  error?: { message?: string };
};

function formatDate(value: string | null) {
  if (!value) return "Por definir";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
export function PipelineBoard({
  initialItems,
  visibleStages,
}: {
  initialItems: readonly PipelineBoardItem[];
  visibleStages: readonly PipelineStatus[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(() => [...initialItems]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<PipelineStatus | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [closeMove, setCloseMove] = useState<{
    opportunityId: string;
    stage: PipelineStatus;
  } | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  function requestMove(opportunityId: string, stage: PipelineStatus) {
    const item = items.find((candidate) => candidate.id === opportunityId);
    if (!item || item.stage === stage || pendingId || !canMoveOpportunityTo(stage)) return;

    if (pipelineMoveRequiresReason(stage)) {
      setCloseMove({ opportunityId, stage });
      setCloseReason("");
      return;
    }
    void moveOpportunity(opportunityId, stage);
  }

  async function moveOpportunity(
    opportunityId: string,
    stage: PipelineStatus,
    reason?: string,
  ) {
    const current = items.find((item) => item.id === opportunityId);
    if (!current || current.stage === stage) return;

    const previousStage = current.stage;
    const previousUpdatedAt = current.updatedAt;
    setPendingId(opportunityId);
    setNotice(null);
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === opportunityId ? { ...item, stage } : item,
      ),
    );

    try {
      const response = await fetch(
        `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/stage`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pipelineStatus: stage,
            lossReason: reason,
            expectedUpdatedAt: previousUpdatedAt,
            idempotencyKey: crypto.randomUUID(),
          }),
        },
      );
      const body = (await response.json()) as StageResponse;
      if (!response.ok) {
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === opportunityId
              ? { ...item, stage: previousStage, updatedAt: previousUpdatedAt }
              : item,
          ),
        );
        setNotice({
          kind: "error",
          text: body.error?.message ?? "No se pudo mover la oportunidad.",
        });
        setPendingId(null);
        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === opportunityId
            ? {
                ...item,
                stage: body.data?.pipeline_status ?? stage,
                updatedAt: body.data?.updated_at ?? item.updatedAt,
              }
            : item,
        ),
      );
      setNotice({
        kind: "success",
        text: `Oportunidad movida a ${PIPELINE_STATUS_LABELS[stage]}.`,
      });
      router.refresh();
    } catch {
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === opportunityId
            ? { ...item, stage: previousStage, updatedAt: previousUpdatedAt }
            : item,
        ),
      );
      setNotice({
        kind: "error",
        text: "No hubo conexión. La etapa no fue modificada.",
      });
    } finally {
      setPendingId(null);
    }
  }

  function dropped(event: DragEvent, stage: PipelineStatus) {
    event.preventDefault();
    setOverStage(null);
    const opportunityId = event.dataTransfer.getData("text/plain") || draggedId;
    setDraggedId(null);
    if (opportunityId) requestMove(opportunityId, stage);
  }

  function confirmClose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!closeMove || closeReason.trim().length < 3) return;
    const move = closeMove;
    setCloseMove(null);
    void moveOpportunity(move.opportunityId, move.stage, closeReason.trim());
  }

  return (
    <>
      <div aria-live="polite" className="min-h-5 text-sm">
        {notice ? (
          <p className={notice.kind === "error" ? "text-destructive" : "text-emerald-700"}>
            {notice.text}
          </p>
        ) : null}
      </div>

      <section aria-label="Embudo comercial" className="overflow-x-auto pb-3">
        <div className="grid min-w-max auto-cols-[minmax(280px,310px)] grid-flow-col gap-4">
          {visibleStages.map((status) => {
            const stageItems = items.filter((item) => item.stage === status);
            const locked = !canMoveOpportunityTo(status);
            return (
              <div
                className={cn(
                  "min-h-56 rounded-[22px] bg-black/[0.025] p-3 ring-1 ring-black/[0.05] transition",
                  overStage === status && !locked && "bg-[#f7f0df] ring-[#b58a43]/50",
                )}
                key={status}
                onDragEnter={() => {
                  if (!locked) setOverStage(status);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setOverStage(null);
                  }
                }}
                onDragOver={(event) => {
                  if (!locked) event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!locked) dropped(event, status);
                }}
              >
                <div className="flex items-center justify-between gap-3 px-1 pb-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    {PIPELINE_STATUS_LABELS[status]}
                    {locked ? <LockKeyhole aria-label="Requiere reserva confirmada" className="size-3.5 text-muted-foreground" /> : null}
                  </h2>
                  <Badge className="border-0 bg-white text-muted-foreground" variant="outline">
                    {stageItems.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {stageItems.length ? (
                    stageItems.map((item) => (
                      <article
                        className={cn(
                          "rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.035)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] motion-reduce:transform-none",
                          draggedId === item.id && "opacity-45",
                        )}
                        draggable={!pendingId}
                        key={item.id}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setOverStage(null);
                        }}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", item.id);
                          setDraggedId(item.id);
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <Link
                            className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            href={`/app/crm/${item.id}`}
                          >
                            <p className="truncate text-sm font-semibold">{item.customerName}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{item.code}</p>
                          </Link>
                          <span aria-label="Arrastrar oportunidad" className="cursor-grab rounded-lg p-1 text-muted-foreground active:cursor-grabbing">
                            {pendingId === item.id ? (
                              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                            ) : (
                              <GripVertical aria-hidden="true" className="size-4" />
                            )}
                          </span>
                        </div>

                        <Badge className="mt-3 border-0 bg-[#f2ead9] text-[#765522]" variant="outline">
                          {item.eventType}
                        </Badge>
                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <CalendarDays aria-hidden="true" className="size-3.5 text-[#9b773f]" />
                            {formatDate(item.desiredDate)} · tentativa
                          </p>
                          <p className="flex items-center gap-2">
                            <UsersRound aria-hidden="true" className="size-3.5 text-[#9b773f]" />
                            {item.guestsTotal
                              ? `${item.guestsTotal} invitados estimados`
                              : "Invitados por definir"}
                          </p>
                        </div>

                        <div className="mt-4 border-t border-black/[0.055] pt-3">
                          <p className="mb-2 text-[11px] text-muted-foreground">
                            Asesor: {item.adviserName}
                          </p>
                          <label className="block">
                            <span className="sr-only">Mover {item.customerName} a otra etapa</span>
                            <select
                              className="h-9 w-full rounded-xl border border-input bg-white px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              disabled={pendingId !== null}
                              onChange={(event) => {
                                if (isPipelineStatus(event.target.value)) {
                                  requestMove(item.id, event.target.value);
                                }
                              }}
                              value={item.stage}
                            >
                              {PIPELINE_STATUSES.map((option) => (
                                <option
                                  disabled={!canMoveOpportunityTo(option)}
                                  key={option}
                                  value={option}
                                >
                                  {PIPELINE_STATUS_LABELS[option]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-black/10 px-4 py-8 text-center text-xs text-muted-foreground">
                      {locked ? "Se completa desde una reserva confirmada" : "Suelta aquí una oportunidad"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {closeMove ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 backdrop-blur-sm sm:items-center">
          <form
            aria-labelledby="close-stage-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-[24px] bg-white p-5 shadow-2xl sm:p-6"
            onSubmit={confirmClose}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8b672f]">
                  Cierre comercial
                </p>
                <h2 className="mt-2 text-xl font-semibold" id="close-stage-title">
                  Mover a {PIPELINE_STATUS_LABELS[closeMove.stage]}
                </h2>
              </div>
              <Button
                aria-label="Cancelar cambio"
                onClick={() => setCloseMove(null)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <label className="mt-5 block text-sm font-medium" htmlFor="closeReason">
              Motivo del cierre
            </label>
            <Textarea
              autoFocus
              className="mt-2"
              id="closeReason"
              maxLength={500}
              onChange={(event) => setCloseReason(event.target.value)}
              placeholder="Registra por qué se perdió o descartó la oportunidad"
              required
              rows={4}
              value={closeReason}
            />
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button onClick={() => setCloseMove(null)} type="button" variant="outline">
                Cancelar
              </Button>
              <Button disabled={closeReason.trim().length < 3} type="submit">
                Guardar cambio
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

