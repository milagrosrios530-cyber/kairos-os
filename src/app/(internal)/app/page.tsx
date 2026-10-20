import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth/session";

type VenueRow = {
  id: string;
  name: string;
  active: boolean;
  exclusive_day_policy: boolean;
};

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select("id, name, active, exclusive_day_policy")
    .eq("organization_id", viewer.organizationId)
    .order("name");

  if (error) {
    throw new Error("No se pudo consultar la configuración de sedes.");
  }

  const venues = (data ?? []) as VenueRow[];
  const activeVenues = venues.filter((venue) => venue.active);
  const canManageUsers = hasPermission(viewer.roles, "users:view");

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white px-5 py-7 shadow-[0_16px_50px_rgba(0,0,0,0.045)] sm:px-8 sm:py-9">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">
              Resumen operativo
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-[42px] sm:leading-[1.08]">
              Hola, {viewer.fullName.split(" ")[0]}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              Esta vista utiliza únicamente información persistida en Supabase.
              Los indicadores comerciales aparecerán cuando el CRM esté implementado.
            </p>
          </div>
          {canManageUsers ? (
            <Button
              className="h-11 w-full rounded-xl px-4 sm:w-auto"
              render={<Link href="/app/configuracion/usuarios" />}
            >
              Gestionar equipo
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </section>

      <section aria-label="Estado de la organización" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.045)] ring-1 ring-black/[0.055]">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <Building2 aria-hidden="true" className="size-4 text-[#9b773f]" />
              Organización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate text-base font-semibold">{viewer.organizationName}</p>
            <p className="mt-1 text-xs text-muted-foreground">Configuración activa</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.045)] ring-1 ring-black/[0.055]">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <MapPin aria-hidden="true" className="size-4 text-[#9b773f]" />
              Sedes activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-[-0.03em]">{activeVenues.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">de {venues.length} configuradas</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.045)] ring-1 ring-black/[0.055]">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <UserRoundCog aria-hidden="true" className="size-4 text-[#9b773f]" />
              Roles asignados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-[-0.03em]">{viewer.roles.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Permisos verificados</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.045)] ring-1 ring-black/[0.055]">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="size-4 text-emerald-600" />
              Acceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="border-0 bg-emerald-50 text-emerald-700" variant="outline">
              Sesión validada
            </Badge>
            <p className="mt-2 text-xs text-muted-foreground">Protección RLS activa</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="rounded-[24px] border-0 shadow-[0_10px_36px_rgba(0,0,0,0.045)] ring-1 ring-black/[0.055]">
          <CardHeader className="border-b border-black/[0.055] pb-4">
            <CardTitle className="text-lg font-semibold tracking-[-0.02em]">
              Sedes configuradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {venues.length === 0 ? (
              <div className="py-8 text-center">
                <MapPin aria-hidden="true" className="mx-auto size-7 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No hay sedes configuradas</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  La configuración debe realizarla una persona autorizada.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.055]">
                {venues.map((venue) => (
                  <div className="flex items-center justify-between gap-4 py-4" key={venue.id}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{venue.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {venue.exclusive_day_policy
                          ? "Política de jornada exclusiva"
                          : "Política horaria por definir"}
                      </p>
                    </div>
                    <Badge
                      className={
                        venue.active
                          ? "border-0 bg-emerald-50 text-emerald-700"
                          : "border-0 bg-neutral-100 text-neutral-600"
                      }
                      variant="outline"
                    >
                      {venue.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-0 shadow-[0_10px_36px_rgba(0,0,0,0.045)] ring-1 ring-black/[0.055]">
          <CardHeader className="border-b border-black/[0.055] pb-4">
            <CardTitle className="text-lg font-semibold tracking-[-0.02em]">
              Estado del sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">Identidad y permisos</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Acceso por invitación, roles y auditoría conectados.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">Base de datos</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Organización y sedes consultadas desde Supabase.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium">CRM y reservas</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Permanecen ocultos hasta completar sus hitos y pruebas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
