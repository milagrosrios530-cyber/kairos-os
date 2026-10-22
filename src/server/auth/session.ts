import "server-only";

import { cache } from "react";

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

type ViewerContext = {
  user_id: string;
  email: string | null;
  organization_id: string;
  organization_name: string;
  timezone: string;
  full_name: string;
  roles: string[];
};

async function getViewerUncached(): Promise<Viewer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_viewer_context");
  if (error?.code === "42501" || error?.code === "PGRST301") {
    return null;
  }
  if (error) {
    throw new Error("No se pudo validar el perfil interno.");
  }
  if (!data) {
    throw new AuthorizationError();
  }
  const context = data as ViewerContext;
  const roles = (context.roles ?? [])
    .filter((role): role is AppRole => APP_ROLES.includes(role as AppRole));

  if (roles.length === 0) {
    throw new AuthorizationError();
  }

  return {
    userId: context.user_id,
    email: context.email,
    organizationId: context.organization_id,
    organizationName: context.organization_name,
    timezone: context.timezone,
    fullName: context.full_name,
    roles,
  };
}

// React cache deduplicates the session/profile lookup across layouts and pages
// participating in the same server render. Route handlers and server actions
// still execute a fresh authorization check for every request.
export const getViewer = cache(getViewerUncached);

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
