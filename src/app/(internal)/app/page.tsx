import {
  ArrowRight,
  CalendarClock,
  ContactRound,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/permissions";
import {
  PIPELINE_STATUS_LABELS,
  type PipelineStatus,
} from "@/lib/crm/constants";
import { requireViewer } from "@/server/auth/session";
import { getCrmDashboard } from "@/server/crm/queries";

function formatTentativeDate(value: string | null) {
  if (!value) return "Fecha por definir";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function DashboardPage() {
  const viewer = await requireViewer();
  if (!hasPermission(viewer.roles, "crm:view")) {
    return (
      <section className="rounded-[28px] border border-black/[0.06] bg-white px-5 py-10 shadow-[0_16px_50px_rgba(0,0,0,0.045)] sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">
          KAIROS OS
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-[42px]">
          Hola, {viewer.fullName.split(" ")[0]}.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          Tu sesión está activa. Los módulos de tu rol se habilitarán únicamente cuando tengan permisos y datos reales definidos; no mostramos paneles simulados.
        </p>
      </section>
    );
  }
  const dashboard = await getCrmDashboard();
  const metrics = [
    {
      label: "Clientes activos",
      value: dashboard.customers,
      help: dashboard.scope === "global" ? "Toda la organización" : "Propios o asignados",
      icon: ContactRound,
    },
    {
      label: "Oportunidades abiertas",
      value: dashboard.openOpportunities,
      help: "Sin contar cierres",
      icon: Sparkles,
    },
    {
      label: "Tareas próximas",
      value: dashboard.pendingTasks,
      help: "Pendientes en 7 días",
      icon: ListChecks,
    },
    {
      label: "Visitas próximas",
      value: dashboard.upcomingVisits,
      help: "Agenda comercial · 7 días",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white px-5 py-7 shadow-[0_16px_50px_rgba(0,0,0,0.045)] sm:px-8 sm:py-9">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">
              Resumen comercial
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-[42px] sm:leading-[1.08]">
              Hola, {viewer.fullName.split(" ")[0]}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              {dashboard.scope === "global"
                ? "Estás viendo la actividad comercial autorizada de toda la organización."
                : "Estás viendo únicamente los clientes y oportunidades propios o asignados."}
            </p>
          </div>
          <Button
            className="h-11 w-full rounded-xl px-4 sm:w-auto"
            render={<Link href="/app/crm/nueva" />}
          >
            Nuevo prospecto
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </section>

      <section aria-label="Indicadores comerciales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            className="rounded-2xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.045)] ring-1 ring-black/[0.055]"
            key={metric.label}
          >
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <metric.icon aria-hidden="true" className="size-4 text-[#9b773f]" />
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-[-0.04em]">{metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.help}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="rounded-[24px] border-0 shadow-[0_10px_36px_rgba(0,0,0,0.045)] ring-1 ring-black/[0.055]">
          <CardHeader className="flex-row items-center justify-between border-b border-black/[0.055] pb-4">
            <CardTitle className="text-lg font-semibold tracking-[-0.02em]">
              Oportunidades recientes
            </CardTitle>
            <Button render={<Link href="/app/crm" />} variant="ghost">
              Ver CRM
              <ArrowRight aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent>
            {dashboard.recentOpportunities.length === 0 ? (
              <div className="py-10 text-center">
                <Sparkles aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Aún no hay oportunidades</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  El primer registro aparecerá aquí después de guardarse en Supabase.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.055]">
                {dashboard.recentOpportunities.map((opportunity) => (
                  <Link
                    className="flex min-h-16 items-center justify-between gap-4 py-4 outline-none transition-colors hover:text-[#765522] focus-visible:ring-2 focus-visible:ring-ring"
                    href={`/app/crm/${opportunity.id}`}
                    key={opportunity.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{opportunity.customerName}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {opportunity.eventType} · {formatTentativeDate(opportunity.desiredDate)}
                      </p>
                    </div>
                    <Badge className="shrink-0 border-black/8 bg-[#f5f5f7] text-[#48484a]" variant="outline">
                      {PIPELINE_STATUS_LABELS[opportunity.stage as PipelineStatus] ?? opportunity.stage}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-0 shadow-[0_10px_36px_rgba(0,0,0,0.045)] ring-1 ring-black/[0.055]">
          <CardHeader className="border-b border-black/[0.055] pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
              <ShieldCheck aria-hidden="true" className="size-5 text-emerald-600" />
              Lectura correcta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Todos los números de esta pantalla provienen de registros persistentes y respetan tu alcance de permisos.</p>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              Una fecha solicitada crea un hold automático de 24 horas. Si vence sin una reserva confirmada, vuelve a quedar disponible.
            </div>
            <p className="text-xs">
              Los importes propuestos tampoco se contabilizan como ventas, ingresos o utilidad.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
