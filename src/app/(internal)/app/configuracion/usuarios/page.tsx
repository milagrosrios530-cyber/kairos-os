import { ChevronDown, ShieldCheck, UserPlus, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { InviteUserForm } from "@/components/users/invite-user-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/permissions";
import { ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, type Viewer } from "@/server/auth/session";

type ProfileRow = {
  user_id: string;
  full_name: string;
  status: "invited" | "active" | "disabled";
  created_at: string;
};

type RoleRow = {
  user_id: string;
  role: AppRole;
};

const statusLabel: Record<ProfileRow["status"], string> = {
  invited: "Invitación pendiente",
  active: "Activo",
  disabled: "Deshabilitado",
};

const statusClass: Record<ProfileRow["status"], string> = {
  invited: "border-0 bg-amber-50 text-amber-700",
  active: "border-0 bg-emerald-50 text-emerald-700",
  disabled: "border-0 bg-neutral-100 text-neutral-600",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

export default async function UsersPage() {
  let viewer: Viewer;

  try {
    viewer = await requirePermission("users:view");
  } catch {
    redirect("/app/sin-permiso");
  }

  const supabase = await createClient();
  const [profilesResult, rolesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, full_name, status, created_at")
      .eq("organization_id", viewer.organizationId)
      .order("full_name"),
    supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("organization_id", viewer.organizationId),
  ]);

  if (profilesResult.error || rolesResult.error) {
    throw new Error("No se pudo consultar el equipo de la organización.");
  }

  const profileRows = (profilesResult.data ?? []) as ProfileRow[];
  const roleRows = (rolesResult.data ?? []) as RoleRow[];
  const canInvite = hasPermission(viewer.roles, "users:invite");
  const activeCount = profileRows.filter((profile) => profile.status === "active").length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">
            Configuración
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-[40px]">
            Equipo y permisos
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            Las cuentas internas se crean exclusivamente por invitación. Cada rol
            se valida en servidor y toda asignación queda auditada.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-sm">
            <p className="text-2xl font-semibold tracking-[-0.03em]">{activeCount}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">usuarios activos</p>
          </div>
        </div>
      </section>

      {canInvite ? (
        <details className="group overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_10px_36px_rgba(0,0,0,0.045)]" open>
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#f2ead9] text-[#80602c]">
              <UserPlus aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Invitar integrante</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Expande o contrae este formulario cuando lo necesites.
              </p>
            </div>
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-black/[0.055] px-5 py-5 sm:px-6 sm:py-6">
            <InviteUserForm />
          </div>
        </details>
      ) : (
        <div className="flex gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 text-sm shadow-sm">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#8b672f]" />
          <p className="leading-6 text-muted-foreground">
            Puedes consultar el equipo, pero la delegación de invitaciones a
            administradores aún requiere aprobación de Dirección.
          </p>
        </div>
      )}

      <Card className="rounded-[24px] border-0 shadow-[0_10px_36px_rgba(0,0,0,0.045)] ring-1 ring-black/[0.055]">
        <CardHeader className="border-b border-black/[0.055] pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
            <Users aria-hidden="true" className="size-5 text-[#8b672f]" />
            Integrantes registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profileRows.length === 0 ? (
            <div className="py-10 text-center">
              <Users aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Aún no hay integrantes</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Usa el formulario de invitación para crear el primer acceso.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.055]">
              {profileRows.map((profile) => {
                const profileRoles = roleRows.filter(
                  (role) => role.user_id === profile.user_id,
                );

                return (
                  <div
                    className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                    key={profile.user_id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold sm:text-[15px]">
                          {profile.full_name}
                        </p>
                        <Badge className={statusClass[profile.status]} variant="outline">
                          {statusLabel[profile.status]}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Registrado el {formatDate(profile.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {profileRoles.map(({ role }) => (
                        <Badge
                          className="border-black/8 bg-[#f5f5f7] text-[#48484a]"
                          key={role}
                          variant="outline"
                        >
                          {ROLE_LABELS[role]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
