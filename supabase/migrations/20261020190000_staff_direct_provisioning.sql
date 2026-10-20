-- KAIROS OS - Provisionamiento directo de cuentas internas y acceso por DNI.
-- El DNI completo nunca se almacena: la aplicación envía una huella HMAC y solo
-- se conservan los últimos cuatro dígitos para identificación administrativa.

alter table public.profiles
  add column if not exists work_email text null,
  add column if not exists dni_last4 text null;

alter table public.profiles
  drop constraint if exists profiles_work_email_format_check,
  add constraint profiles_work_email_format_check
    check (
      work_email is null
      or (
        work_email = lower(btrim(work_email))
        and char_length(work_email) between 5 and 254
        and work_email like '%@%'
      )
    ),
  drop constraint if exists profiles_dni_last4_check,
  add constraint profiles_dni_last4_check
    check (dni_last4 is null or dni_last4 ~ '^[0-9]{4}$');

create unique index if not exists profiles_organization_work_email_unique_idx
  on public.profiles (organization_id, lower(work_email))
  where work_email is not null;

create table if not exists public.staff_login_identifiers (
  user_id uuid primary key references auth.users(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  identifier_kind text not null default 'dni' check (identifier_kind = 'dni'),
  identifier_hash text not null unique check (identifier_hash ~ '^[0-9a-f]{64}$'),
  auth_email text not null check (
    auth_email = lower(btrim(auth_email))
    and char_length(auth_email) between 5 and 254
    and auth_email like '%@%'
  ),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (user_id, organization_id),
  foreign key (user_id, organization_id)
    references public.profiles(user_id, organization_id)
    on delete restrict
);

create index if not exists staff_login_identifiers_organization_idx
  on public.staff_login_identifiers (organization_id, user_id);

alter table public.staff_login_identifiers enable row level security;
alter table public.staff_login_identifiers force row level security;

revoke all on public.staff_login_identifiers from public, anon, authenticated;
grant select, insert, update on public.staff_login_identifiers to service_role;

create or replace function public.complete_employee_provisioning(
  p_user_id uuid,
  p_organization_id uuid,
  p_full_name text,
  p_work_email text,
  p_identifier_hash text,
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

  if p_identifier_hash !~ '^[0-9a-f]{64}$' or p_dni_last4 !~ '^[0-9]{4}$' then
    raise exception 'A valid protected DNI identifier is required' using errcode = '22023';
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
    p_identifier_hash,
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

comment on table public.staff_login_identifiers is
  'Identificadores internos protegidos para resolver el acceso por DNI. Sin lectura para anon o authenticated.';
comment on column public.staff_login_identifiers.identifier_hash is
  'Huella HMAC-SHA256 calculada exclusivamente en servidor; no contiene el DNI en texto claro.';
comment on column public.profiles.work_email is
  'Correo corporativo usado por Supabase Auth. KAIROS OS no crea el buzón externo.';
