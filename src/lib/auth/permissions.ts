import type { AppRole } from "@/lib/auth/roles";

export const PERMISSIONS = [
  "app:view",
  "users:invite",
  "users:view",
  "audit:view",
  "settings:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  SUPERADMIN: PERMISSIONS,
  ADMINISTRADOR: ["app:view", "users:view", "audit:view"],
  COMERCIAL: ["app:view"],
  COORDINADOR: ["app:view"],
  FINANZAS: ["app:view"],
  CONSULTA: ["app:view"],
};

export function hasPermission(
  roles: readonly AppRole[],
  permission: Permission,
) {
  return roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}
