import "server-only";

import { z } from "zod";

import { getPublicEnv } from "@/lib/env";

const serverSecretSchema = z.string().min(20);

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
