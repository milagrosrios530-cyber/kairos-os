import { createClient } from "@supabase/supabase-js";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "KAIROS_ADMIN_EMAIL",
  "KAIROS_ADMIN_NAME",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Falta la variable requerida ${key}.`);
  }
}

if (process.env.KAIROS_BOOTSTRAP_CONFIRM !== "KAIROS_INITIAL_SUPERADMIN") {
  throw new Error(
    "Define KAIROS_BOOTSTRAP_CONFIRM=KAIROS_INITIAL_SUPERADMIN para confirmar el bootstrap.",
  );
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const organizationName =
  process.env.KAIROS_ORGANIZATION_NAME ?? "Salón de Recepciones Kairós";

let { data: organization, error: organizationReadError } = await supabase
  .from("organizations")
  .select("id")
  .eq("name", organizationName)
  .maybeSingle();

if (organizationReadError) throw organizationReadError;

if (!organization) {
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: organizationName,
      timezone: "America/Lima",
      settings: { commercial_decisions: "pending_approval" },
    })
    .select("id")
    .single();
  if (error) throw error;
  organization = data;
}

const { error: venueError } = await supabase.from("venues").upsert(
  {
    organization_id: organization.id,
    name: "Salón principal",
    capacity_declared: null,
    capacity_authorized: null,
    exclusive_day_policy: true,
    active: true,
  },
  { onConflict: "organization_id,name", ignoreDuplicates: true },
);
if (venueError) throw venueError;

const { data: invitation, error: invitationError } =
  await supabase.auth.admin.inviteUserByEmail(process.env.KAIROS_ADMIN_EMAIL, {
    data: {
      full_name: process.env.KAIROS_ADMIN_NAME,
      organization_id: organization.id,
    },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/actualizar-clave`,
  });

if (invitationError || !invitation.user) {
  throw invitationError ?? new Error("Supabase no devolvió el usuario invitado.");
}

try {
  const { error: profileError } = await supabase.from("profiles").upsert({
    user_id: invitation.user.id,
    organization_id: organization.id,
    full_name: process.env.KAIROS_ADMIN_NAME,
    status: "active",
  });
  if (profileError) throw profileError;

  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: invitation.user.id,
    organization_id: organization.id,
    role: "SUPERADMIN",
    granted_by: null,
  });
  if (roleError) throw roleError;

  const { error: auditError } = await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_id: null,
    action: "bootstrap.superadmin_created",
    entity_type: "profile",
    entity_id: invitation.user.id,
    after_json: { role: "SUPERADMIN", status: "active" },
  });
  if (auditError) throw auditError;
} catch (error) {
  await supabase.auth.admin.deleteUser(invitation.user.id);
  throw error;
}

console.log("Bootstrap completado. Revisa el correo de invitación configurado.");
