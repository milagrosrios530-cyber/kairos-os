import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/auth/roles";
import { ApplicationError } from "@/server/errors";
import { requirePermission } from "@/server/auth/session";

type InviteEmployeeInput = {
  email: string;
  fullName: string;
  role: AppRole;
  redirectOrigin: string;
  requestId: string;
};

export async function inviteEmployee(input: InviteEmployeeInput) {
  const viewer = await requirePermission("users:invite");
  const admin = createAdminClient();

  const { data: invitation, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(input.email, {
      data: {
        full_name: input.fullName,
        organization_id: viewer.organizationId,
      },
      redirectTo: `${input.redirectOrigin}/auth/callback?next=/actualizar-clave`,
    });

  if (inviteError || !invitation.user) {
    const isExisting = inviteError?.message.toLowerCase().includes("already");
    throw new ApplicationError(
      isExisting ? "USER_ALREADY_EXISTS" : "INVITATION_FAILED",
      isExisting ? 409 : 502,
      isExisting
        ? "El correo ya pertenece a un usuario."
        : "Supabase no pudo enviar la invitación.",
    );
  }

  const { error: assignmentError } = await admin.rpc(
    "complete_employee_invitation",
    {
      p_user_id: invitation.user.id,
      p_organization_id: viewer.organizationId,
      p_full_name: input.fullName,
      p_role: input.role,
      p_actor_id: viewer.userId,
      p_request_id: input.requestId,
    },
  );

  if (assignmentError) {
    await admin.auth.admin.deleteUser(invitation.user.id);
    throw new ApplicationError(
      "INVITATION_ASSIGNMENT_FAILED",
      500,
      "La invitación no pudo asociarse con un rol y fue revertida.",
    );
  }

  return { userId: invitation.user.id };
}
