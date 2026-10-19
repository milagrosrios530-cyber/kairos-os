import "server-only";

import type { AppRole } from "@/lib/auth/roles";
import { APP_ROLES } from "@/lib/auth/roles";
import {
  hasPermission,
  type Permission,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  AuthenticationError,
  AuthorizationError,
} from "@/server/errors";

export type Viewer = {
  userId: string;
  email: string | null;
  organizationId: string;
  organizationName: string;
  timezone: string;
  fullName: string;
  roles: AppRole[];
};

type ProfileRow = {
  user_id: string;
  organization_id: string;
  full_name: string;
  status: "invited" | "active" | "disabled";
  organizations: { name: string; timezone: string } | null;
};

export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (authError || typeof userId !== "string") {
    return null;
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(
      "user_id, organization_id, full_name, status, organizations(name, timezone)",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error("No se pudo validar el perfil interno.");
  }

  const profile = profileData as ProfileRow | null;
  if (!profile || profile.status !== "active" || !profile.organizations) {
    throw new AuthorizationError();
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", profile.organization_id);

  if (roleError) {
    throw new Error("No se pudieron validar los permisos del usuario.");
  }

  const roles = (roleRows ?? [])
    .map((row) => row.role)
    .filter((role): role is AppRole => APP_ROLES.includes(role as AppRole));

  if (roles.length === 0) {
    throw new AuthorizationError();
  }

  return {
    userId,
    email:
      typeof authData?.claims?.email === "string"
        ? authData.claims.email
        : null,
    organizationId: profile.organization_id,
    organizationName: profile.organizations.name,
    timezone: profile.organizations.timezone,
    fullName: profile.full_name,
    roles,
  };
}

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) {
    throw new AuthenticationError();
  }
  return viewer;
}

export async function requirePermission(permission: Permission) {
  const viewer = await requireViewer();
  if (!hasPermission(viewer.roles, permission)) {
    throw new AuthorizationError();
  }
  return viewer;
}
