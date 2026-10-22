import "server-only";

import { z } from "zod";

import { getPublicEnv } from "@/lib/env";

const serverSecretSchema = z.string().min(20);
const staffLookupSecretSchema = z.string().min(32);

export function getServerEnv() {
  const publicEnv = getPublicEnv();
  const secret = serverSecretSchema.safeParse(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (!secret.success) {
    throw new Error("La configuración segura de Supabase está incompleta.");
  }
  return {
    ...publicEnv,
    SUPABASE_SERVICE_ROLE_KEY: secret.data,
  };
}

export function getStaffLoginSecret() {
  const secret = staffLookupSecretSchema.safeParse(
    process.env.STAFF_DNI_LOOKUP_SECRET,
  );
  if (!secret.success) {
    throw new Error("La clave de búsqueda segura para accesos internos está incompleta.");
  }
  return secret.data;
}
