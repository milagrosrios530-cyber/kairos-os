import "server-only";

import { createHmac } from "node:crypto";

import type { AppRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffLoginSecret } from "@/lib/server-env";
import { requirePermission } from "@/server/auth/session";
import { ApplicationError, AuthorizationError } from "@/server/errors";

type CreateEmployeeInput = {
  email: string;
  fullName: string;
  dni: string;
  password: string;
  role: AppRole;
  requestId: string;
};

const ADMIN_CREATABLE_ROLES: readonly AppRole[] = [
  "COMERCIAL",
  "COORDINADOR",
  "FINANZAS",
  "CONSULTA",
];

function secureLookupHash(value: string) {
  return createHmac("sha256", getStaffLoginSecret())
    .update(value)
    .digest("hex");
}

async function consumeLoginAttempt(key: string, maximum: number) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_staff_login_rate_limit", {
    p_key_hash: secureLookupHash(`rate:${key}`),
    p_max_attempts: maximum,
    p_window_seconds: 900,
  });
  return !error && data === true;
}

export async function resolveStaffLoginEmail(
  identifier: string,
  ipAddress?: string | null,
) {
  const normalized = identifier.trim().toLowerCase();
  if (normalized.includes("@")) return normalized;
  if (!/^\d{8}$/.test(normalized)) return null;

  const identifierAllowed = await consumeLoginAttempt(`dni:${normalized}`, 6);
  const ipAllowed = ipAddress
    ? await consumeLoginAttempt(`ip:${ipAddress}`, 30)
    : true;
  if (!identifierAllowed || !ipAllowed) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("resolve_staff_login_email", {
    p_dni: normalized,
    p_lookup_hash: secureLookupHash(`dni:${normalized}`),
  });

  if (error || !data) return null;
  return data as string;
}
export async function createEmployee(input: CreateEmployeeInput) {
  const viewer = await requirePermission("users:create");
  const isSuperadmin = viewer.roles.includes("SUPERADMIN");

  if (!isSuperadmin && !ADMIN_CREATABLE_ROLES.includes(input.role)) {
    throw new AuthorizationError();
  }

  const admin = createAdminClient();
  const normalizedEmail = input.email.trim().toLowerCase();
  const dniLookupHash = secureLookupHash(`dni:${input.dni}`);
  const { data: existingIdentifier, error: identifierError } = await admin.rpc(
    "resolve_staff_login_email",
    { p_dni: input.dni, p_lookup_hash: dniLookupHash },
  );

  if (identifierError) {
    throw new ApplicationError(
      "STAFF_IDENTIFIER_LOOKUP_FAILED",
      500,
      "No se pudo validar el DNI de acceso.",
    );
  }
  if (existingIdentifier) {
    throw new ApplicationError(
      "STAFF_DNI_ALREADY_EXISTS",
      409,
      "El DNI ya pertenece a una cuenta interna.",
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      organization_id: viewer.organizationId,
      provisioned_by: viewer.userId,
    },
  });

  if (createError || !created.user) {
    const isExisting = createError?.message.toLowerCase().includes("already");
    throw new ApplicationError(
      isExisting ? "USER_ALREADY_EXISTS" : "USER_CREATION_FAILED",
      isExisting ? 409 : 502,
      isExisting
        ? "El correo ya pertenece a un usuario."
        : "Supabase no pudo crear la cuenta interna.",
    );
  }

  const { error: assignmentError } = await admin.rpc(
    "complete_employee_provisioning",
    {
      p_user_id: created.user.id,
      p_organization_id: viewer.organizationId,
      p_full_name: input.fullName,
      p_work_email: normalizedEmail,
      p_dni: input.dni,
      p_dni_lookup_hash: dniLookupHash,
      p_dni_last4: input.dni.slice(-4),
      p_role: input.role,
      p_actor_id: viewer.userId,
      p_request_id: input.requestId,
    },
  );

  if (assignmentError) {
    await admin.auth.admin.deleteUser(created.user.id);
    const conflict = assignmentError.code === "23505";
    throw new ApplicationError(
      conflict ? "STAFF_ACCOUNT_CONFLICT" : "STAFF_ASSIGNMENT_FAILED",
      conflict ? 409 : 500,
      conflict
        ? "El correo o DNI ya pertenece a otra cuenta interna."
        : "La cuenta no pudo asociarse con su rol y fue revertida.",
    );
  }

  return { userId: created.user.id };
}

