-- KAIROS OS - Hash BCrypt persistente para acceso por DNI.
-- Evita que una rotacion de credenciales de Supabase invalide los accesos.

alter table public.staff_login_identifiers
  drop constraint if exists staff_login_identifiers_identifier_hash_check;

alter table public.staff_login_identifiers
  add constraint staff_login_identifiers_identifier_hash_check
    check (
      char_length(identifier_hash) = 60
      and identifier_hash like '$2%'
    );

drop function if exists public.complete_employee_provisioning(
  uuid, uuid, text, text, text, text, public.app_role, uuid, uuid
);

create or replace function public.resolve_staff_login_email(p_dni text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select login.auth_email
  from public.staff_login_identifiers as login
  join public.profiles as profile
    on profile.user_id = login.user_id
   and profile.organization_id = login.organization_id
  where p_dni ~ '^[0-9]{8}$'
    and extensions.crypt(p_dni, login.identifier_hash) = login.identifier_hash
    and profile.status = 'active'
  limit 1;
$$;

revoke all on function public.resolve_staff_login_email(text)
  from public, anon, authenticated;
grant execute on function public.resolve_staff_login_email(text)
  to service_role;

create function public.complete_employee_provisioning(
  p_user_id uuid,
  p_organization_id uuid,
  p_full_name text,
  p_work_email text,
  p_dni text,
  p_dni_last4 text,
  p_role public.app_role,
  p_actor_id uuid,
  p_request_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_is_superadmin boolean := false;
  v_actor_is_admin boolean := false;
begin
  select
    coalesce(bool_or(ur.role = 'SUPERADMIN'), false),
    coalesce(bool_or(ur.role = 'ADMINISTRADOR'), false)
  into v_actor_is_superadmin, v_actor_is_admin
  from public.user_roles as ur
  join public.profiles as profile
    on profile.user_id = ur.user_id
   and profile.organization_id = ur.organization_id
  where ur.user_id = p_actor_id
    and ur.organization_id = p_organization_id
    and profile.status = 'active';

  if not (v_actor_is_superadmin or v_actor_is_admin) then
    raise exception 'Only an authorized administrator can create employees'
      using errcode = '42501';
  end if;

  if not v_actor_is_superadmin and p_role in ('SUPERADMIN', 'ADMINISTRADOR') then
    raise exception 'Administrators cannot create privileged administrators'
      using errcode = '42501';
  end if;

  if nullif(btrim(p_full_name), '') is null
    or char_length(btrim(p_full_name)) not between 3 and 120 then
    raise exception 'A valid employee name is required' using errcode = '22023';
  end if;

  if p_work_email <> lower(btrim(p_work_email))
    or char_length(p_work_email) not between 5 and 254
    or p_work_email not like '%@%' then
    raise exception 'A valid corporate email is required' using errcode = '22023';
  end if;

  if p_dni !~ '^[0-9]{8}$'
    or p_dni_last4 !~ '^[0-9]{4}$'
    or right(p_dni, 4) <> p_dni_last4 then
    raise exception 'A valid protected DNI identifier is required' using errcode = '22023';
  end if;

  -- Serializa altas del mismo DNI sin conservar un identificador reversible.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('kairos:staff-dni:' || p_dni, 731953)
  );

  if exists (
    select 1
    from public.staff_login_identifiers as existing
    where extensions.crypt(p_dni, existing.identifier_hash) = existing.identifier_hash
  ) then
    raise exception 'DNI already belongs to an internal account'
      using errcode = '23505';
  end if;

  insert into public.profiles (
    user_id,
    organization_id,
    full_name,
    status,
    work_email,
    dni_last4
  ) values (
    p_user_id,
    p_organization_id,
    btrim(p_full_name),
    'active',
    lower(btrim(p_work_email)),
    p_dni_last4
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        status = 'active',
        work_email = excluded.work_email,
        dni_last4 = excluded.dni_last4,
        updated_at = now()
    where profiles.organization_id = excluded.organization_id;

  if not found then
    raise exception 'Employee belongs to another organization' using errcode = '42501';
  end if;

  insert into public.user_roles (
    user_id,
    organization_id,
    role,
    granted_by
  ) values (
    p_user_id,
    p_organization_id,
    p_role,
    p_actor_id
  );

  insert into public.staff_login_identifiers (
    user_id,
    organization_id,
    identifier_hash,
    auth_email,
    created_by
  ) values (
    p_user_id,
    p_organization_id,
    extensions.crypt(p_dni, extensions.gen_salt('bf', 12)),
    lower(btrim(p_work_email)),
    p_actor_id
  );

  insert into public.audit_logs (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    after_json,
    request_id
  ) values (
    p_organization_id,
    p_actor_id,
    'employee.created',
    'profile',
    p_user_id,
    jsonb_build_object(
      'role', p_role,
      'status', 'active',
      'login_methods', jsonb_build_array('email', 'dni'),
      'dni_last4', p_dni_last4
    ),
    p_request_id
  );
end;
$$;

revoke all on function public.complete_employee_provisioning(
  uuid, uuid, text, text, text, text, public.app_role, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.complete_employee_provisioning(
  uuid, uuid, text, text, text, text, public.app_role, uuid, uuid
) to service_role;

comment on function public.resolve_staff_login_email(text) is
  'Resuelve un DNI valido contra BCrypt solo para service_role; nunca expone el hash al navegador.';
comment on column public.staff_login_identifiers.identifier_hash is
  'Hash BCrypt salado del DNI, persistente e independiente de credenciales rotables.';
