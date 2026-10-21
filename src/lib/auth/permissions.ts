import type { AppRole } from "@/lib/auth/roles";

export const PERMISSIONS = [
  "app:view",
  "users:invite",
  "users:create",
  "users:view",
  "audit:view",
  "settings:manage",
  "crm:view",
  "crm:create",
  "crm:manage_all",
  "tasks:view",
  "tasks:create",
  "visits:view",
  "visits:create",
  "dashboard:view_global",
  "calendar:view",
  "bookings:view",
  "bookings:create",
  "bookings:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  SUPERADMIN: PERMISSIONS,
  ADMINISTRADOR: [
    "app:view",
    "users:create",
    "users:view",
    "audit:view",
    "crm:view",
    "crm:create",
    "crm:manage_all",
    "tasks:view",
    "tasks:create",
    "visits:view",
    "visits:create",
    "dashboard:view_global",
    "calendar:view",
    "bookings:view",
    "bookings:create",
    "bookings:manage",
  ],
  COMERCIAL: [
    "app:view",
    "crm:view",
    "crm:create",
    "tasks:view",
    "tasks:create",
    "visits:view",
    "visits:create",
    "calendar:view",
    "bookings:view",
    "bookings:create",
  ],
  COORDINADOR: ["app:view", "calendar:view", "bookings:view"],
  FINANZAS: ["app:view", "calendar:view", "bookings:view"],
  CONSULTA: ["app:view", "calendar:view"],
};

export function hasPermission(
  roles: readonly AppRole[],
  permission: Permission,
) {
  return roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}
