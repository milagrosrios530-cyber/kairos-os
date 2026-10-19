-- KAIROS OS - Hito 1: identidad, organizaciones, sedes, roles y auditoría.
-- No contiene clientes, reservas ni tarifas.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;

do $$
begin
  create type public.app_role as enum (
    'SUPERADMIN',
    'ADMINISTRADOR',
    'COMERCIAL',
    'COORDINADOR',
    'FINANZAS',
    'CONSULTA'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.profile_status as enum ('invited', 'active', 'disabled');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 160),
  timezone text not null default 'America/Lima' check (char_length(timezone) > 0),
  contact_phone text null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 160),
  capacity_declared integer null check (capacity_declared > 0),
  capacity_authorized integer null check (capacity_authorized > 0),
  exclusive_day_policy boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  full_name text not null check (char_length(btrim(full_name)) between 3 and 120),
  status public.profile_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create table if not exists public.user_roles (
  user_id uuid not null,
  organization_id uuid not null,
  role public.app_role not null,
  granted_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, organization_id, role),
  foreign key (user_id, organization_id)
    references public.profiles(user_id, organization_id)
    on delete restrict
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_id uuid null references auth.users(id) on delete set null,
  action text not null check (char_length(btrim(action)) between 3 and 100),
  entity_type text not null check (char_length(btrim(entity_type)) between 2 and 80),
  entity_id uuid null,
  before_json jsonb null,
  after_json jsonb null,
  occurred_at timestamptz not null default now(),
  request_id uuid not null default extensions.gen_random_uuid()
);

create index if not exists venues_organization_id_idx
  on public.venues (organization_id, active);
create index if not exists profiles_organization_id_idx
  on public.profiles (organization_id, status);
create index if not exists user_roles_lookup_idx
  on public.user_roles (user_id, organization_id, role);
create index if not exists audit_logs_org_occurred_idx
  on public.audit_logs (organization_id, occurred_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

drop trigger if exists venues_set_updated_at on public.venues;
create trigger venues_set_updated_at
before update on public.venues
for each row execute function private.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create or replace function private.prevent_audit_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only' using errcode = '42501';
end;
$$;

drop trigger if exists audit_logs_append_only on public.audit_logs;
create trigger audit_logs_append_only
before update or delete on public.audit_logs
for each row execute function private.prevent_audit_mutation();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_text text;
  organization_uuid uuid;
  employee_name text;
begin
  organization_text := new.raw_user_meta_data ->> 'organization_id';
  employee_name := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');

  if organization_text is null or employee_name is null then
    return new;
  end if;

  begin
    organization_uuid := organization_text::uuid;
  exception
    when invalid_text_representation then return new;
  end;

  if exists (
    select 1 from public.organizations where id = organization_uuid
  ) then
    insert into public.profiles (user_id, organization_id, full_name, status)
    values (new.id, organization_uuid, employee_name, 'invited')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id
  from public.profiles as p
  where p.user_id = (select auth.uid())
    and p.status = 'active'
  limit 1
$$;

create or replace function private.has_any_role(required_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles as ur
    join public.profiles as p
      on p.user_id = ur.user_id
     and p.organization_id = ur.organization_id
    where ur.user_id = (select auth.uid())
      and ur.organization_id = private.current_organization_id()
      and ur.role = any(required_roles)
      and p.status = 'active'
  )
$$;

revoke execute on function private.current_organization_id() from public, anon;
revoke execute on function private.has_any_role(public.app_role[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.current_organization_id() to authenticated;
grant execute on function private.has_any_role(public.app_role[]) to authenticated;

create or replace function public.complete_employee_invitation(
  p_user_id uuid,
  p_organization_id uuid,
  p_full_name text,
  p_role public.app_role,
  p_actor_id uuid,
  p_request_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.user_roles
    where user_id = p_actor_id
      and organization_id = p_organization_id
      and role = 'SUPERADMIN'
  ) then
    raise exception 'Only a superadmin can invite employees'
      using errcode = '42501';
  end if;

  insert into public.profiles (
    user_id,
    organization_id,
    full_name,
    status
  ) values (
    p_user_id,
    p_organization_id,
    btrim(p_full_name),
    'active'
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        status = 'active',
        updated_at = now()
    where profiles.organization_id = excluded.organization_id;

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
  )
  on conflict do nothing;

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
    'employee.invited',
    'profile',
    p_user_id,
    jsonb_build_object('role', p_role, 'status', 'active'),
    p_request_id
  );
end;
$$;

revoke all on function public.complete_employee_invitation(
  uuid, uuid, text, public.app_role, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.complete_employee_invitation(
  uuid, uuid, text, public.app_role, uuid, uuid
) to service_role;

alter table public.organizations enable row level security;
alter table public.venues enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
on public.organizations for select to authenticated
using (id = (select private.current_organization_id()));

drop policy if exists venues_select_member on public.venues;
create policy venues_select_member
on public.venues for select to authenticated
using (organization_id = (select private.current_organization_id()));

drop policy if exists profiles_select_scoped on public.profiles;
create policy profiles_select_scoped
on public.profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    organization_id = (select private.current_organization_id())
    and (select private.has_any_role(
      array['SUPERADMIN', 'ADMINISTRADOR']::public.app_role[]
    ))
  )
);

drop policy if exists user_roles_select_scoped on public.user_roles;
create policy user_roles_select_scoped
on public.user_roles for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    organization_id = (select private.current_organization_id())
    and (select private.has_any_role(
      array['SUPERADMIN', 'ADMINISTRADOR']::public.app_role[]
    ))
  )
);

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin
on public.audit_logs for select to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (select private.has_any_role(
    array['SUPERADMIN', 'ADMINISTRADOR']::public.app_role[]
  ))
);

revoke all on public.organizations from anon, authenticated;
revoke all on public.venues from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;

grant select on public.organizations to authenticated;
grant select on public.venues to authenticated;
grant select on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;

comment on table public.audit_logs is
  'Registro append-only de cambios sensibles. No almacenar secretos ni PII completa.';
comment on column public.venues.capacity_authorized is
  'Debe permanecer NULL hasta que Dirección registre el aforo autorizado.';
