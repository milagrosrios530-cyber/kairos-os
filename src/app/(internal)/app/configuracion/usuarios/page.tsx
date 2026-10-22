import { ChevronDown, ShieldCheck, UserPlus, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { CreateUserForm } from "@/components/users/create-user-form";
import { PaginationNav } from "@/components/layout/pagination-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/permissions";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, type Viewer } from "@/server/auth/session";
import { AuthorizationError } from "@/server/errors";

const PAGE_SIZE = 25;

type ProfileRow = {
  user_id: string;
  full_name: string;
  work_email: string | null;
  dni_last4: string | null;
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

type SearchParams = Promise<{ pagina?: string }>;

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const parsedPage = Number.parseInt(params.pagina ?? "1", 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const from = (page - 1) * PAGE_SIZE;
  let viewer: Viewer;

  try {
    viewer = await requirePermission("users:view");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/app/sin-permiso");
    }
    throw error;
  }

  const supabase = await createClient();
  const [profilesResult, activeResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, full_name, work_email, dni_last4, status, created_at", { count: "exact" })
      .eq("organization_id", viewer.organizationId)
      .order("full_name")
      .range(from, from + PAGE_SIZE - 1),
    supabase
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("organization_id", viewer.organizationId)
      .eq("status", "active"),
  ]);

  const profileRows = (profilesResult.data ?? []) as ProfileRow[];
  const profileIds = profileRows.map((profile) => profile.user_id);
  const rolesResult = profileIds.length
    ? await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", viewer.organizationId)
        .in("user_id", profileIds)
    : { data: [], error: null };

  if (profilesResult.error || activeResult.error || rolesResult.error) {
    throw new Error("No se pudo consultar el equipo de la organización.");
  }

  const roleRows = (rolesResult.data ?? []) as RoleRow[];
  const canCreate = hasPermission(viewer.roles, "users:create");
  const allowedRoles = viewer.roles.includes("SUPERADMIN")
    ? APP_ROLES
    : (["COMERCIAL", "COORDINADOR", "FINANZAS", "CONSULTA"] as const);
  const activeCount = activeResult.count ?? 0;

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
            Crea accesos internos con correo corporativo, DNI y contraseña. Cada
            rol se valida en servidor y toda asignación queda auditada.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-sm">
            <p className="text-2xl font-semibold tracking-[-0.03em]">{activeCount}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">usuarios activos</p>
          </div>
        </div>
      </section>

      {canCreate ? (
        <details className="group overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_10px_36px_rgba(0,0,0,0.045)]" open>
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#f2ead9] text-[#80602c]">
              <UserPlus aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Crear usuario interno</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                El acceso queda activo sin enviar una invitación.
              </p>
            </div>
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-black/[0.055] px-5 py-5 sm:px-6 sm:py-6">
            <CreateUserForm allowedRoles={allowedRoles} />
          </div>
        </details>
      ) : (
        <div className="flex gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 text-sm shadow-sm">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#8b672f]" />
          <p className="leading-6 text-muted-foreground">
            Puedes consultar el equipo, pero tu rol no permite crear cuentas.
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
                Usa el formulario superior para crear el primer acceso.
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
                      {profile.work_email || profile.dni_last4 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {profile.work_email ?? "Correo no registrado"}
                          {profile.dni_last4 ? ` · DNI •••• ${profile.dni_last4}` : ""}
                        </p>
                      ) : null}
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
      <PaginationNav label="usuarios" page={page} pageSize={PAGE_SIZE} pathname="/app/configuracion/usuarios" total={profilesResult.count ?? 0} />
    </div>
  );
}
