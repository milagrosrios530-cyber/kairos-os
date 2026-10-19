import { UserPlus } from "lucide-react";
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

export default async function UsersPage() {
  let viewer: Viewer | null = null;

  try {
    viewer = await requirePermission("users:view");
  } catch {
    redirect("/app/sin-permiso");
  }

  const supabase = await createClient();
  const [{ data: profiles }, { data: roles }] = await Promise.all([
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

  const profileRows = (profiles ?? []) as ProfileRow[];
  const roleRows = (roles ?? []) as RoleRow[];
  const canInvite = hasPermission(viewer.roles, "users:invite");

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-[#8b672f]">Configuración</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Equipo y permisos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Las cuentas se crean por invitación. No existe registro público para
          trabajadores y cada asignación queda auditada.
        </p>
      </section>

      {canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-[#9b773f]" /> Invitar integrante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InviteUserForm />
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-xl border border-[#ddd3c4] bg-white/45 p-4 text-sm text-muted-foreground">
          Puedes consultar el equipo, pero la delegación de invitaciones a
          administradores aún requiere aprobación de Dirección.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Integrantes registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {profileRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay integrantes registrados en esta organización.
            </p>
          ) : (
            <div className="divide-y divide-[#e5dccf]">
              {profileRows.map((profile) => {
                const profileRoles = roleRows.filter(
                  (role) => role.user_id === profile.user_id,
                );
                return (
                  <div
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    key={profile.user_id}
                  >
                    <div>
                      <p className="font-semibold">{profile.full_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Estado: {profile.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profileRoles.map(({ role }) => (
                        <Badge key={role} variant="secondary">
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
