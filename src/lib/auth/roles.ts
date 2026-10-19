export const APP_ROLES = [
  "SUPERADMIN",
  "ADMINISTRADOR",
  "COMERCIAL",
  "COORDINADOR",
  "FINANZAS",
  "CONSULTA",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPERADMIN: "Superadministración",
  ADMINISTRADOR: "Administración",
  COMERCIAL: "Comercial",
  COORDINADOR: "Coordinación",
  FINANZAS: "Finanzas",
  CONSULTA: "Solo lectura",
};

const ROLE_PRIORITY: Record<AppRole, number> = {
  SUPERADMIN: 60,
  ADMINISTRADOR: 50,
  FINANZAS: 40,
  COORDINADOR: 30,
  COMERCIAL: 20,
  CONSULTA: 10,
};

export function getPrimaryRole(roles: readonly AppRole[]) {
  return [...roles].sort(
    (left, right) => ROLE_PRIORITY[right] - ROLE_PRIORITY[left],
  )[0];
}
