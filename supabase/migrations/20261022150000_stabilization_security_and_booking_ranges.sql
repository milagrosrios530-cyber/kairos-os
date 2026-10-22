-- KAIROS OS - Estabilización de seguridad y ocupación real de eventos.
-- 1. El acceso por DNI usa una huella HMAC indexada y rate limit persistente.
-- 2. Una reserva conserva exclusividad del día de inicio y, si cruza medianoche,
--    ocupa también el tramo real del día siguiente.

alter table public.staff_login_identifiers
  add column if not exists identifier_lookup_hash text null;

alter table public.staff_login_identifiers
  drop constraint if exists staff_login_identifiers_lookup_hash_check;
alter table public.staff_login_identifiers
  add constraint staff_login_identifiers_lookup_hash_check
    check (
      identifier_lookup_hash is null
      or identifier_lookup_hash ~ '^[0-9a-f]{64}$'
    );

create unique index if not exists staff_login_identifiers_lookup_hash_unique_idx
  on public.staff_login_identifiers (identifier_lookup_hash)
  where identifier_lookup_hash is not null;

create table if not exists private.staff_login_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1 check (attempts > 0),
  updated_at timestamptz not null default now()
);

create or replace function public.consume_staff_login_rate_limit(
  p_key_hash text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
    or p_max_attempts not between 1 and 1000
    or p_window_seconds not between 60 and 86400 then
    raise exception 'Invalid rate limit parameters' using errcode = '22023';
  end if;

  insert into private.staff_login_rate_limits as limits (
    key_hash, window_started_at, attempts, updated_at
  ) values (
    p_key_hash, now(), 1, now()
  )
  on conflict (key_hash) do update
    set window_started_at = case
          when limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
            then now()
          else limits.window_started_at
        end,
        attempts = case
          when limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
            then 1
          else limits.attempts + 1
        end,
        updated_at = now()
  returning attempts into v_attempts;

  delete from private.staff_login_rate_limits
  where updated_at < now() - interval '2 days';

  return v_attempts <= p_max_attempts;
end;
$$;

revoke all on function public.consume_staff_login_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_staff_login_rate_limit(text, integer, integer)
  to service_role;

drop function if exists public.resolve_staff_login_email(text);
create or replace function public.resolve_staff_login_email(
  p_dni text,
  p_lookup_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_email text;
begin
  if p_dni !~ '^[0-9]{8}$' or p_lookup_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;

  select login.user_id, login.auth_email
  into v_user_id, v_email
  from public.staff_login_identifiers as login
  join public.profiles as profile
    on profile.user_id = login.user_id
   and profile.organization_id = login.organization_id
  where login.identifier_lookup_hash = p_lookup_hash
    and profile.status = 'active'
  limit 1;

  if v_email is not null then
    return v_email;
  end if;

  -- Compatibilidad controlada: la primera autenticación de un usuario anterior
  -- encuentra su BCrypt, persiste la huella indexada y elimina escaneos futuros.
  select login.user_id, login.auth_email
  into v_user_id, v_email
  from public.staff_login_identifiers as login
  join public.profiles as profile
    on profile.user_id = login.user_id
   and profile.organization_id = login.organization_id
  where login.identifier_lookup_hash is null
    and extensions.crypt(p_dni, login.identifier_hash) = login.identifier_hash
    and profile.status = 'active'
  limit 1;

  if v_user_id is not null then
    update public.staff_login_identifiers
    set identifier_lookup_hash = p_lookup_hash
    where user_id = v_user_id
      and identifier_lookup_hash is null;
  end if;

  return v_email;
end;
$$;

revoke all on function public.resolve_staff_login_email(text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_staff_login_email(text, text)
  to service_role;

drop function if exists public.complete_employee_provisioning(
  uuid, uuid, text, text, text, text, public.app_role, uuid, uuid
);
create function public.complete_employee_provisioning(
  p_user_id uuid,
  p_organization_id uuid,
  p_full_name text,
  p_work_email text,
  p_dni text,
  p_dni_lookup_hash text,
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
    or p_dni_lookup_hash !~ '^[0-9a-f]{64}$'
    or p_dni_last4 !~ '^[0-9]{4}$'
    or right(p_dni, 4) <> p_dni_last4 then
    raise exception 'A valid protected DNI identifier is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('kairos:staff-dni:' || p_dni_lookup_hash, 731953)
  );
  if exists (
    select 1 from public.staff_login_identifiers as existing
    where existing.identifier_lookup_hash = p_dni_lookup_hash
      or extensions.crypt(p_dni, existing.identifier_hash) = existing.identifier_hash
  ) then
    raise exception 'DNI already belongs to an internal account'
      using errcode = '23505';
  end if;

  insert into public.profiles (
    user_id, organization_id, full_name, status, work_email, dni_last4
  ) values (
    p_user_id, p_organization_id, btrim(p_full_name), 'active',
    lower(btrim(p_work_email)), p_dni_last4
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
    user_id, organization_id, role, granted_by
  ) values (
    p_user_id, p_organization_id, p_role, p_actor_id
  );

  insert into public.staff_login_identifiers (
    user_id, organization_id, identifier_hash, identifier_lookup_hash,
    auth_email, created_by
  ) values (
    p_user_id, p_organization_id,
    extensions.crypt(p_dni, extensions.gen_salt('bf', 12)),
    p_dni_lookup_hash, lower(btrim(p_work_email)), p_actor_id
  );

  insert into public.audit_logs (
    organization_id, actor_id, action, entity_type, entity_id,
    after_json, request_id
  ) values (
    p_organization_id, p_actor_id, 'employee.created', 'profile', p_user_id,
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
  uuid, uuid, text, text, text, text, text, public.app_role, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.complete_employee_provisioning(
  uuid, uuid, text, text, text, text, text, public.app_role, uuid, uuid
) to service_role;

create or replace function private.booking_occupied_range(
  p_event_date date,
  p_event_start_time time,
  p_event_end_time time,
  p_timezone text
)
returns tstzrange
language sql
immutable
set search_path = ''
as $$
  select tstzrange(
    p_event_date::timestamp at time zone p_timezone,
    greatest(
      (p_event_date + 1)::timestamp at time zone p_timezone,
      case
        when p_event_end_time is not null
          and p_event_end_time <= p_event_start_time
        then (p_event_date + 1 + p_event_end_time)::timestamp at time zone p_timezone
        else (p_event_date + 1)::timestamp at time zone p_timezone
      end
    ),
    '[)'
  );
$$;

alter table public.schedule_allocations
  drop constraint if exists schedule_allocations_no_overlap;
alter table public.schedule_allocations
  add constraint schedule_allocations_no_overlap
  exclude using gist (
    organization_id with =,
    occupied_during with &&
  ) where (blocking)
  deferrable initially immediate;

create or replace function private.sync_booking_allocation_range()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_range tstzrange;
begin
  select timezone into v_timezone
  from public.organizations
  where id = new.organization_id;

  v_range := private.booking_occupied_range(
    new.event_date,
    new.event_start_time,
    new.event_end_time,
    v_timezone
  );

  update public.schedule_allocations
  set local_date = new.event_date,
      occupied_during = v_range,
      updated_at = now()
  where booking_id = new.id
    and organization_id = new.organization_id
    and blocking
    and (
      local_date is distinct from new.event_date
      or occupied_during is distinct from v_range
    );
  return new;
end;
$$;

create or replace function private.sync_allocation_booking_range()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_timezone text;
  v_range tstzrange;
begin
  if new.booking_id is null or not new.blocking then
    return new;
  end if;

  select * into v_booking
  from public.bookings
  where id = new.booking_id
    and organization_id = new.organization_id;
  if v_booking.id is null then
    return new;
  end if;

  select timezone into v_timezone
  from public.organizations
  where id = new.organization_id;
  v_range := private.booking_occupied_range(
    v_booking.event_date,
    v_booking.event_start_time,
    v_booking.event_end_time,
    v_timezone
  );

  if new.local_date is distinct from v_booking.event_date
    or new.occupied_during is distinct from v_range then
    update public.schedule_allocations
    set local_date = v_booking.event_date,
        occupied_during = v_range,
        updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_sync_allocation_range on public.bookings;
create trigger bookings_sync_allocation_range
after insert or update of event_date, event_start_time, event_end_time
on public.bookings
for each row execute function private.sync_booking_allocation_range();

drop trigger if exists schedule_allocations_sync_booking_range
  on public.schedule_allocations;
create trigger schedule_allocations_sync_booking_range
after insert or update of booking_id, local_date, occupied_during, blocking
on public.schedule_allocations
for each row execute function private.sync_allocation_booking_range();

update public.schedule_allocations as allocation
set local_date = booking.event_date,
    occupied_during = private.booking_occupied_range(
      booking.event_date,
      booking.event_start_time,
      booking.event_end_time,
      organization.timezone
    ),
    updated_at = now()
from public.bookings as booking
join public.organizations as organization
  on organization.id = booking.organization_id
where allocation.booking_id = booking.id
  and allocation.organization_id = booking.organization_id
  and allocation.blocking;

revoke execute on function private.booking_occupied_range(date, time, time, text)
  from public, anon, authenticated;
revoke execute on function private.sync_booking_allocation_range()
  from public, anon, authenticated;
revoke execute on function private.sync_allocation_booking_range()
  from public, anon, authenticated;

comment on column public.staff_login_identifiers.identifier_lookup_hash is
  'Huella HMAC no reversible usada para búsquedas indexadas de DNI; la clave permanece solo en servidor.';
comment on function private.booking_occupied_range(date, time, time, text) is
  'Protege todo el día de inicio y amplía la ocupación al día siguiente cuando el evento cruza medianoche.';
