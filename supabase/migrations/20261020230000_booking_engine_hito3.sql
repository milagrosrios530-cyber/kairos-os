-- KAIROS OS - Hito 3: calendario y reservas transaccionales.
-- Regla aprobada: un evento por día, hold de 24 horas y confirmación con
-- al menos S/500 verificados. No crea ni activa tarifas oficiales.

create extension if not exists btree_gist with schema extensions;

do $$
begin
  create type public.booking_status as enum (
    'held',
    'pending_verification',
    'confirmed',
    'cancelled',
    'expired',
    'completed'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.schedule_allocation_kind as enum (
    'hold',
    'booking',
    'blackout'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.deposit_verification_status as enum (
    'submitted',
    'verified',
    'rejected',
    'reversed'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.payment_method as enum (
    'transferencia',
    'yape',
    'plin',
    'efectivo',
    'tarjeta',
    'otro'
  );
exception when duplicate_object then null;
end
$$;

create unique index if not exists venues_id_organization_unique_idx
  on public.venues (id, organization_id);

create table if not exists public.bookings (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  booking_code text not null
    check (booking_code ~ '^KAI-RES-[0-9]{4}-[0-9]{6}$'),
  venue_id uuid not null,
  customer_id uuid not null,
  opportunity_id uuid not null,
  event_type_id uuid null,
  event_date date not null,
  event_start_time time not null,
  event_end_time time null,
  guest_count integer null check (guest_count > 0),
  assigned_to uuid not null,
  total_contract_cents bigint not null check (total_contract_cents >= 50000),
  currency character(3) not null default 'PEN' check (currency = 'PEN'),
  initial_deposit_required_cents bigint not null default 50000
    check (initial_deposit_required_cents = 50000),
  deposit_verified_cents bigint not null default 0
    check (deposit_verified_cents >= 0),
  balance_after_initial_cents bigint null
    check (balance_after_initial_cents is null or balance_after_initial_cents >= 0),
  intermediate_due_cents bigint null
    check (intermediate_due_cents is null or intermediate_due_cents >= 0),
  intermediate_due_date date null,
  final_scheduled_cents bigint null
    check (final_scheduled_cents is null or final_scheduled_cents >= 0),
  final_due_at timestamptz null,
  status public.booking_status not null default 'held',
  hold_expires_at timestamptz null,
  confirmed_at timestamptz null,
  confirmed_by uuid null,
  contract_sent_at timestamptz null,
  cancelled_at timestamptz null,
  cancelled_by uuid null,
  cancellation_reason text null
    check (
      cancellation_reason is null
      or char_length(btrim(cancellation_reason)) between 3 and 1000
    ),
  internal_notes text null check (internal_notes is null or char_length(internal_notes) <= 5000),
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (booking_code, organization_id),
  foreign key (venue_id, organization_id)
    references public.venues(id, organization_id) on delete restrict,
  foreign key (customer_id, organization_id)
    references public.customers(id, organization_id) on delete restrict,
  foreign key (opportunity_id, customer_id, organization_id)
    references public.opportunities(id, customer_id, organization_id) on delete restrict,
  foreign key (event_type_id, organization_id)
    references public.event_types(id, organization_id) on delete restrict,
  foreign key (assigned_to, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (created_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (updated_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (confirmed_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (cancelled_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  check (
    (status in ('held', 'pending_verification') and hold_expires_at is not null)
    or (status not in ('held', 'pending_verification'))
  ),
  check (
    status <> 'confirmed'
    or (
      confirmed_at is not null
      and confirmed_by is not null
      and deposit_verified_cents >= initial_deposit_required_cents
      and hold_expires_at is null
    )
  )
);

create unique index if not exists bookings_active_opportunity_unique_idx
  on public.bookings (opportunity_id)
  where status in ('held', 'pending_verification', 'confirmed');
create index if not exists bookings_org_date_idx
  on public.bookings (organization_id, event_date, status);
create index if not exists bookings_assignee_idx
  on public.bookings (organization_id, assigned_to, event_date);

create table if not exists public.schedule_allocations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  venue_id uuid not null,
  booking_id uuid null,
  kind public.schedule_allocation_kind not null,
  local_date date not null,
  occupied_during tstzrange not null,
  blocking boolean not null default true,
  hold_expires_at timestamptz null,
  reason text null check (reason is null or char_length(btrim(reason)) between 3 and 1000),
  released_at timestamptz null,
  released_by uuid null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (venue_id, organization_id)
    references public.venues(id, organization_id) on delete restrict,
  foreign key (booking_id, organization_id)
    references public.bookings(id, organization_id) on delete restrict,
  foreign key (released_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (created_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  check (not isempty(occupied_during)),
  check (lower_inc(occupied_during) and not upper_inc(occupied_during)),
  check (
    (kind = 'blackout' and booking_id is null and hold_expires_at is null)
    or (kind = 'hold' and booking_id is not null and hold_expires_at is not null)
    or (kind = 'booking' and booking_id is not null and hold_expires_at is null)
  ),
  check (
    (blocking and released_at is null and released_by is null)
    or (not blocking and released_at is not null)
  )
);

alter table public.schedule_allocations
  drop constraint if exists schedule_allocations_no_overlap;
alter table public.schedule_allocations
  add constraint schedule_allocations_no_overlap
  exclude using gist (
    venue_id with =,
    occupied_during with &&
  ) where (blocking)
  deferrable initially immediate;

create unique index if not exists schedule_allocations_active_booking_unique_idx
  on public.schedule_allocations (booking_id)
  where booking_id is not null and blocking;
create index if not exists schedule_allocations_calendar_idx
  on public.schedule_allocations (organization_id, local_date, blocking);
create index if not exists schedule_allocations_hold_expiry_idx
  on public.schedule_allocations (venue_id, hold_expires_at)
  where blocking and kind = 'hold';

create table if not exists public.booking_deposit_records (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  booking_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency character(3) not null default 'PEN' check (currency = 'PEN'),
  payment_method public.payment_method not null,
  payment_reference text null
    check (payment_reference is null or char_length(btrim(payment_reference)) between 3 and 180),
  status public.deposit_verification_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  submitted_by uuid not null,
  verified_at timestamptz null,
  verified_by uuid null,
  review_note text null check (review_note is null or char_length(review_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (booking_id, organization_id)
    references public.bookings(id, organization_id) on delete restrict,
  foreign key (submitted_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (verified_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  check (
    (status = 'verified' and verified_at is not null and verified_by is not null)
    or (status <> 'verified')
  )
);

create index if not exists booking_deposits_booking_idx
  on public.booking_deposit_records (booking_id, status, submitted_at desc);
create unique index if not exists booking_deposits_reference_unique_idx
  on public.booking_deposit_records (organization_id, lower(payment_reference))
  where payment_reference is not null and status in ('submitted', 'verified');

create table if not exists private.booking_counters (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  year integer not null check (year between 2020 and 2200),
  last_value bigint not null default 0 check (last_value >= 0),
  primary key (organization_id, year)
);

create table if not exists private.booking_idempotency_keys (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  operation text not null check (char_length(operation) between 3 and 180),
  idempotency_key uuid not null,
  response jsonb null,
  created_at timestamptz not null default now(),
  primary key (organization_id, actor_id, operation, idempotency_key)
);

create or replace function private.booking_day_range(
  p_event_date date,
  p_timezone text
)
returns tstzrange
language sql
immutable
set search_path = ''
as $$
  select tstzrange(
    p_event_date::timestamp at time zone p_timezone,
    (p_event_date + 1)::timestamp at time zone p_timezone,
    '[)'
  )
$$;

create or replace function private.is_booking_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_organization_id = private.current_organization_id()
    and private.has_any_role(
      array['SUPERADMIN', 'ADMINISTRADOR']::public.app_role[]
    )
$$;

create or replace function private.can_view_booking_calendar(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_organization_id = private.current_organization_id()
    and private.has_any_role(
      array[
        'SUPERADMIN', 'ADMINISTRADOR', 'COMERCIAL',
        'COORDINADOR', 'FINANZAS', 'CONSULTA'
      ]::public.app_role[]
    )
$$;

create or replace function private.can_access_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings as b
    where b.id = p_booking_id
      and b.organization_id = private.current_organization_id()
      and (
        private.is_booking_admin(b.organization_id)
        or (
          private.has_any_role(array['COMERCIAL']::public.app_role[])
          and b.assigned_to = (select auth.uid())
        )
        or private.has_any_role(
          array['COORDINADOR', 'FINANZAS']::public.app_role[]
        )
      )
  )
$$;

create or replace function private.next_booking_code(
  p_organization_id uuid,
  p_year integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_value bigint;
begin
  insert into private.booking_counters (organization_id, year, last_value)
  values (p_organization_id, p_year, 1)
  on conflict (organization_id, year)
  do update set last_value = private.booking_counters.last_value + 1
  returning last_value into v_value;

  return format(
    'KAI-RES-%s-%s',
    p_year,
    lpad(v_value::text, 6, '0')
  );
end;
$$;

create or replace function private.claim_booking_idempotency(
  p_organization_id uuid,
  p_actor_id uuid,
  p_operation text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_response jsonb;
begin
  insert into private.booking_idempotency_keys (
    organization_id, actor_id, operation, idempotency_key
  ) values (
    p_organization_id, p_actor_id, p_operation, p_idempotency_key
  )
  on conflict do nothing;

  if not found then
    select response into v_response
    from private.booking_idempotency_keys
    where organization_id = p_organization_id
      and actor_id = p_actor_id
      and operation = p_operation
      and idempotency_key = p_idempotency_key;

    if v_response is null then
      raise exception 'Booking operation is already in progress'
        using errcode = '40001';
    end if;
    return v_response;
  end if;
  return null;
end;
$$;

create or replace function private.complete_booking_idempotency(
  p_organization_id uuid,
  p_actor_id uuid,
  p_operation text,
  p_idempotency_key uuid,
  p_response jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.booking_idempotency_keys
  set response = p_response
  where organization_id = p_organization_id
    and actor_id = p_actor_id
    and operation = p_operation
    and idempotency_key = p_idempotency_key
$$;

create or replace function private.expire_stale_booking_holds(
  p_organization_id uuid,
  p_venue_id uuid,
  p_actor_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  with released as (
    update public.schedule_allocations
    set blocking = false,
        released_at = now(),
        released_by = p_actor_id,
        reason = coalesce(reason, 'Hold vencido automáticamente'),
        updated_at = now()
    where organization_id = p_organization_id
      and venue_id = p_venue_id
      and kind = 'hold'
      and blocking
      and hold_expires_at <= now()
    returning booking_id
  ), expired as (
    update public.bookings as booking
    set status = 'expired',
        hold_expires_at = null,
        updated_by = p_actor_id,
        updated_at = now()
    where booking.id in (select booking_id from released)
      and booking.organization_id = p_organization_id
      and booking.status in ('held', 'pending_verification')
    returning booking.id
  )
  select count(*)::integer into v_count from expired;

  return v_count;
end;
$$;

create or replace function private.sanitize_booking_audit(
  p_table_name text,
  p_row jsonb
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case p_table_name
    when 'bookings' then jsonb_strip_nulls(jsonb_build_object(
      'booking_code', p_row -> 'booking_code',
      'venue_id', p_row -> 'venue_id',
      'event_date', p_row -> 'event_date',
      'event_start_time', p_row -> 'event_start_time',
      'assigned_to', p_row -> 'assigned_to',
      'total_contract_cents', p_row -> 'total_contract_cents',
      'deposit_verified_cents', p_row -> 'deposit_verified_cents',
      'status', p_row -> 'status',
      'hold_expires_at', p_row -> 'hold_expires_at',
      'confirmed_at', p_row -> 'confirmed_at',
      'cancelled_at', p_row -> 'cancelled_at'
    ))
    when 'schedule_allocations' then jsonb_strip_nulls(jsonb_build_object(
      'venue_id', p_row -> 'venue_id',
      'booking_id', p_row -> 'booking_id',
      'kind', p_row -> 'kind',
      'local_date', p_row -> 'local_date',
      'occupied_during', p_row -> 'occupied_during',
      'blocking', p_row -> 'blocking',
      'hold_expires_at', p_row -> 'hold_expires_at',
      'released_at', p_row -> 'released_at'
    ))
    when 'booking_deposit_records' then jsonb_strip_nulls(jsonb_build_object(
      'booking_id', p_row -> 'booking_id',
      'amount_cents', p_row -> 'amount_cents',
      'payment_method', p_row -> 'payment_method',
      'status', p_row -> 'status',
      'submitted_at', p_row -> 'submitted_at',
      'verified_at', p_row -> 'verified_at'
    ))
    else '{}'::jsonb
  end
$$;

create or replace function private.audit_booking_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_before jsonb;
  v_after jsonb;
  v_org uuid;
  v_entity_id uuid;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_org := (v_row ->> 'organization_id')::uuid;
  v_entity_id := (v_row ->> 'id')::uuid;
  v_before := case when tg_op = 'INSERT' then null
    else private.sanitize_booking_audit(tg_table_name, to_jsonb(old)) end;
  v_after := case when tg_op = 'DELETE' then null
    else private.sanitize_booking_audit(tg_table_name, to_jsonb(new)) end;

  insert into public.audit_logs (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    before_json,
    after_json
  ) values (
    v_org,
    auth.uid(),
    lower(tg_op) || '_' || tg_table_name,
    case tg_table_name
      when 'bookings' then 'booking'
      when 'schedule_allocations' then 'schedule_allocation'
      else 'booking_deposit'
    end,
    v_entity_id,
    v_before,
    v_after
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Allow only the confirmation RPC to move an opportunity to Ganado.
create or replace function private.prepare_opportunity_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
begin
  if new.pipeline_status = 'ganado'
    and (tg_op = 'INSERT' or old.pipeline_status <> 'ganado')
    and coalesce(current_setting('kairos.booking_confirmation', true), '') <> 'on' then
    raise exception 'A confirmed booking is required before marking an opportunity as won'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    if v_actor is not null then
      new.organization_id := v_organization_id;
      new.created_by := v_actor;
      new.updated_by := v_actor;
      new.assigned_to := coalesce(new.assigned_to, v_actor);
    end if;
    if new.opportunity_code is null or btrim(new.opportunity_code) = '' then
      new.opportunity_code := private.next_opportunity_code(
        new.organization_id,
        extract(year from new.created_at)::integer
      );
    end if;
  else
    if new.id <> old.id
      or new.organization_id <> old.organization_id
      or new.customer_id <> old.customer_id
      or new.opportunity_code <> old.opportunity_code
      or new.created_by <> old.created_by then
      raise exception 'Immutable opportunity identity fields cannot change'
        using errcode = '22023';
    end if;
    if new.pipeline_status <> old.pipeline_status
      and coalesce(current_setting('kairos.crm_stage_transition', true), '') <> 'on' then
      raise exception 'Use transition_opportunity to change pipeline status'
        using errcode = '42501';
    end if;
    if v_actor is not null then
      new.updated_by := v_actor;
      if not private.is_crm_admin(old.organization_id) then
        if new.assigned_to <> old.assigned_to
          or new.archived_at is distinct from old.archived_at
          or new.archived_by is distinct from old.archived_by then
          raise exception 'Commercial users cannot reassign or archive opportunities'
            using errcode = '42501';
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function private.set_updated_at();

drop trigger if exists schedule_allocations_set_updated_at on public.schedule_allocations;
create trigger schedule_allocations_set_updated_at
before update on public.schedule_allocations
for each row execute function private.set_updated_at();

drop trigger if exists booking_deposits_set_updated_at on public.booking_deposit_records;
create trigger booking_deposits_set_updated_at
before update on public.booking_deposit_records
for each row execute function private.set_updated_at();

drop trigger if exists bookings_audit on public.bookings;
create trigger bookings_audit
after insert or update on public.bookings
for each row execute function private.audit_booking_row();

drop trigger if exists schedule_allocations_audit on public.schedule_allocations;
create trigger schedule_allocations_audit
after insert or update on public.schedule_allocations
for each row execute function private.audit_booking_row();

drop trigger if exists booking_deposits_audit on public.booking_deposit_records;
create trigger booking_deposits_audit
after insert or update on public.booking_deposit_records
for each row execute function private.audit_booking_row();

create or replace function public.create_booking_hold(
  p_opportunity_id uuid,
  p_venue_id uuid,
  p_event_date date,
  p_event_start_time time,
  p_event_end_time time,
  p_total_contract_cents bigint,
  p_internal_notes text default null,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := private.current_organization_id();
  v_timezone text;
  v_booking_id uuid;
  v_booking_code text;
  v_customer_id uuid;
  v_event_type_id uuid;
  v_assigned_to uuid;
  v_guest_count integer;
  v_hold_expires_at timestamptz := now() + interval '24 hours';
  v_cached jsonb;
  v_response jsonb;
begin
  if v_actor is null or v_org is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.has_any_role(
    array['SUPERADMIN', 'ADMINISTRADOR', 'COMERCIAL']::public.app_role[]
  ) then
    raise exception 'Booking creation denied' using errcode = '42501';
  end if;
  if p_total_contract_cents < 50000 then
    raise exception 'Contract total must be at least S/500' using errcode = '23514';
  end if;
  if p_event_date < (now() at time zone 'America/Lima')::date then
    raise exception 'Event date cannot be in the past' using errcode = '23514';
  end if;
  if p_event_end_time is not null and p_event_end_time = p_event_start_time then
    raise exception 'Start and end time cannot be equal' using errcode = '23514';
  end if;

  v_cached := private.claim_booking_idempotency(
    v_org, v_actor, 'create_booking_hold', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;

  select organization.timezone into v_timezone
  from public.organizations as organization
  where organization.id = v_org;

  perform 1
  from public.venues as venue
  where venue.id = p_venue_id
    and venue.organization_id = v_org
    and venue.active
    and venue.exclusive_day_policy
  for update;
  if not found then
    raise exception 'Venue is not active or does not use exclusive days'
      using errcode = '23503';
  end if;

  perform private.expire_stale_booking_holds(v_org, p_venue_id, v_actor);

  select
    opportunity.customer_id,
    opportunity.event_type_id,
    opportunity.assigned_to,
    opportunity.guests_total
  into
    v_customer_id,
    v_event_type_id,
    v_assigned_to,
    v_guest_count
  from public.opportunities as opportunity
  where opportunity.id = p_opportunity_id
    and opportunity.organization_id = v_org
    and opportunity.archived_at is null
    and opportunity.pipeline_status not in ('ganado', 'perdido', 'descartado')
    and private.can_access_opportunity(opportunity.id)
  for update;
  if v_customer_id is null then
    raise exception 'Opportunity not found or cannot be booked'
      using errcode = 'P0002';
  end if;

  v_booking_id := extensions.gen_random_uuid();
  v_booking_code := private.next_booking_code(v_org, extract(year from p_event_date)::integer);

  insert into public.bookings (
    id, organization_id, booking_code, venue_id, customer_id,
    opportunity_id, event_type_id, event_date, event_start_time,
    event_end_time, guest_count, assigned_to, total_contract_cents,
    status, hold_expires_at, internal_notes, created_by, updated_by
  ) values (
    v_booking_id, v_org, v_booking_code, p_venue_id, v_customer_id,
    p_opportunity_id, v_event_type_id, p_event_date, p_event_start_time,
    p_event_end_time, v_guest_count, v_assigned_to, p_total_contract_cents,
    'held', v_hold_expires_at, nullif(btrim(p_internal_notes), ''), v_actor, v_actor
  );

  insert into public.schedule_allocations (
    organization_id, venue_id, booking_id, kind, local_date,
    occupied_during, blocking, hold_expires_at, created_by
  ) values (
    v_org, p_venue_id, v_booking_id, 'hold', p_event_date,
    private.booking_day_range(p_event_date, v_timezone), true,
    v_hold_expires_at, v_actor
  );

  v_response := jsonb_build_object(
    'booking_id', v_booking_id,
    'booking_code', v_booking_code,
    'status', 'held',
    'event_date', p_event_date,
    'hold_expires_at', v_hold_expires_at
  );
  perform private.complete_booking_idempotency(
    v_org, v_actor, 'create_booking_hold', p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.submit_booking_deposit(
  p_booking_id uuid,
  p_amount_cents bigint,
  p_payment_method public.payment_method,
  p_payment_reference text default null,
  p_note text default null,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := private.current_organization_id();
  v_booking public.bookings%rowtype;
  v_deposit_id uuid;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'submit_booking_deposit:' || p_booking_id::text;
begin
  if v_actor is null or v_org is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.can_access_booking(p_booking_id) then
    raise exception 'Booking not found or not visible' using errcode = 'P0002';
  end if;
  if p_amount_cents < 50000 then
    raise exception 'The reservation deposit must be at least S/500'
      using errcode = '23514';
  end if;

  v_cached := private.claim_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id and organization_id = v_org
  for update;
  perform 1 from public.venues where id = v_booking.venue_id for update;
  perform private.expire_stale_booking_holds(v_org, v_booking.venue_id, v_actor);
  select * into v_booking
  from public.bookings
  where id = p_booking_id and organization_id = v_org;

  if v_booking.status = 'expired' then
    v_response := jsonb_build_object('booking_id', p_booking_id, 'status', 'expired');
    perform private.complete_booking_idempotency(
      v_org, v_actor, v_operation, p_idempotency_key, v_response
    );
    return v_response;
  end if;
  if v_booking.status not in ('held', 'pending_verification') then
    raise exception 'Only an active hold can receive a reservation deposit'
      using errcode = '23514';
  end if;

  insert into public.booking_deposit_records (
    organization_id, booking_id, amount_cents, payment_method,
    payment_reference, status, submitted_by, review_note
  ) values (
    v_org, p_booking_id, p_amount_cents, p_payment_method,
    nullif(btrim(p_payment_reference), ''), 'submitted', v_actor,
    nullif(btrim(p_note), '')
  ) returning id into v_deposit_id;

  update public.bookings
  set status = 'pending_verification', updated_by = v_actor
  where id = p_booking_id and organization_id = v_org;

  v_response := jsonb_build_object(
    'booking_id', p_booking_id,
    'deposit_id', v_deposit_id,
    'status', 'pending_verification',
    'hold_expires_at', v_booking.hold_expires_at
  );
  perform private.complete_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.verify_booking_deposit_and_confirm(
  p_booking_id uuid,
  p_deposit_id uuid,
  p_review_note text default null,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := private.current_organization_id();
  v_booking public.bookings%rowtype;
  v_deposit public.booking_deposit_records%rowtype;
  v_timezone text;
  v_verified_total bigint;
  v_balance bigint;
  v_intermediate bigint;
  v_intermediate_date date;
  v_final_due timestamptz;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'confirm_booking:' || p_booking_id::text;
begin
  if v_actor is null or v_org is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.is_booking_admin(v_org) then
    raise exception 'Only an administrator can verify a deposit'
      using errcode = '42501';
  end if;

  v_cached := private.claim_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id and organization_id = v_org
  for update;
  if v_booking.id is null then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  perform 1 from public.venues where id = v_booking.venue_id for update;
  perform private.expire_stale_booking_holds(v_org, v_booking.venue_id, v_actor);
  select * into v_booking
  from public.bookings
  where id = p_booking_id and organization_id = v_org;

  if v_booking.status = 'confirmed' then
    v_response := jsonb_build_object(
      'booking_id', v_booking.id,
      'booking_code', v_booking.booking_code,
      'status', 'confirmed',
      'confirmed_at', v_booking.confirmed_at
    );
    perform private.complete_booking_idempotency(
      v_org, v_actor, v_operation, p_idempotency_key, v_response
    );
    return v_response;
  end if;
  if v_booking.status = 'expired' then
    v_response := jsonb_build_object('booking_id', p_booking_id, 'status', 'expired');
    perform private.complete_booking_idempotency(
      v_org, v_actor, v_operation, p_idempotency_key, v_response
    );
    return v_response;
  end if;
  if v_booking.status <> 'pending_verification' then
    raise exception 'A submitted deposit is required' using errcode = '23514';
  end if;

  select * into v_deposit
  from public.booking_deposit_records
  where id = p_deposit_id
    and booking_id = p_booking_id
    and organization_id = v_org
  for update;
  if v_deposit.id is null or v_deposit.status <> 'submitted' then
    raise exception 'Deposit is not pending verification' using errcode = 'P0002';
  end if;
  if v_deposit.amount_cents < v_booking.initial_deposit_required_cents then
    raise exception 'Verified deposit is below S/500' using errcode = '23514';
  end if;

  update public.booking_deposit_records
  set status = 'verified',
      verified_at = now(),
      verified_by = v_actor,
      review_note = nullif(btrim(p_review_note), '')
  where id = p_deposit_id and organization_id = v_org;

  select coalesce(sum(amount_cents), 0)::bigint into v_verified_total
  from public.booking_deposit_records
  where booking_id = p_booking_id
    and organization_id = v_org
    and status = 'verified';

  select organization.timezone into v_timezone
  from public.organizations as organization
  where organization.id = v_org;
  v_balance := v_booking.total_contract_cents - v_booking.initial_deposit_required_cents;
  v_intermediate := v_balance / 2;
  v_intermediate_date := greatest(
    v_booking.event_date - 15,
    (now() at time zone v_timezone)::date
  );
  v_final_due := (
    v_booking.event_date + v_booking.event_start_time
  ) at time zone v_timezone - interval '2 hours';

  update public.bookings
  set status = 'confirmed',
      hold_expires_at = null,
      deposit_verified_cents = v_verified_total,
      balance_after_initial_cents = v_balance,
      intermediate_due_cents = v_intermediate,
      intermediate_due_date = v_intermediate_date,
      final_scheduled_cents = v_balance - v_intermediate,
      final_due_at = v_final_due,
      confirmed_at = now(),
      confirmed_by = v_actor,
      updated_by = v_actor
  where id = p_booking_id and organization_id = v_org;

  update public.schedule_allocations
  set kind = 'booking', hold_expires_at = null
  where booking_id = p_booking_id
    and organization_id = v_org
    and blocking;

  perform set_config('kairos.booking_confirmation', 'on', true);
  perform set_config('kairos.crm_stage_transition', 'on', true);
  update public.opportunities
  set pipeline_status = 'ganado',
      closed_at = now(),
      close_reason = null,
      updated_by = v_actor
  where id = v_booking.opportunity_id
    and organization_id = v_org;

  insert into public.crm_activities (
    organization_id, customer_id, opportunity_id, author_id, kind, description
  ) values (
    v_org, v_booking.customer_id, v_booking.opportunity_id, v_actor,
    'sistema', 'Reserva ' || v_booking.booking_code || ' confirmada con abono verificado.'
  );

  v_response := jsonb_build_object(
    'booking_id', v_booking.id,
    'booking_code', v_booking.booking_code,
    'status', 'confirmed',
    'deposit_verified_cents', v_verified_total,
    'intermediate_due_cents', v_intermediate,
    'intermediate_due_date', v_intermediate_date,
    'final_scheduled_cents', v_balance - v_intermediate,
    'final_due_at', v_final_due,
    'confirmed_at', now()
  );
  perform private.complete_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.release_booking_hold(
  p_booking_id uuid,
  p_reason text,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := private.current_organization_id();
  v_booking public.bookings%rowtype;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'release_booking_hold:' || p_booking_id::text;
begin
  if v_actor is null or v_org is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Release reason is required' using errcode = '23514';
  end if;
  if not private.can_access_booking(p_booking_id) then
    raise exception 'Booking not found or not visible' using errcode = 'P0002';
  end if;
  v_cached := private.claim_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;

  select * into v_booking from public.bookings
  where id = p_booking_id and organization_id = v_org for update;
  if v_booking.status not in ('held', 'pending_verification') then
    raise exception 'Only an active hold can be released' using errcode = '23514';
  end if;

  update public.schedule_allocations
  set blocking = false,
      released_at = now(),
      released_by = v_actor,
      reason = btrim(p_reason)
  where booking_id = p_booking_id and organization_id = v_org and blocking;
  update public.bookings
  set status = 'cancelled',
      hold_expires_at = null,
      cancelled_at = now(),
      cancelled_by = v_actor,
      cancellation_reason = btrim(p_reason),
      updated_by = v_actor
  where id = p_booking_id and organization_id = v_org;

  v_response := jsonb_build_object('booking_id', p_booking_id, 'status', 'cancelled');
  perform private.complete_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.cancel_confirmed_booking(
  p_booking_id uuid,
  p_reason text,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := private.current_organization_id();
  v_booking public.bookings%rowtype;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'cancel_confirmed_booking:' || p_booking_id::text;
begin
  if v_actor is null or v_org is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.is_booking_admin(v_org) then
    raise exception 'Only an administrator can cancel a confirmed booking'
      using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Cancellation reason is required' using errcode = '23514';
  end if;
  v_cached := private.claim_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;

  select * into v_booking from public.bookings
  where id = p_booking_id and organization_id = v_org for update;
  if v_booking.id is null then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'Only a confirmed booking can use this cancellation flow'
      using errcode = '23514';
  end if;

  update public.schedule_allocations
  set blocking = false,
      released_at = now(),
      released_by = v_actor,
      reason = btrim(p_reason)
  where booking_id = p_booking_id and organization_id = v_org and blocking;
  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = v_actor,
      cancellation_reason = btrim(p_reason),
      updated_by = v_actor
  where id = p_booking_id and organization_id = v_org;

  insert into public.crm_activities (
    organization_id, customer_id, opportunity_id, author_id, kind, description
  ) values (
    v_org, v_booking.customer_id, v_booking.opportunity_id, v_actor,
    'sistema', 'Reserva ' || v_booking.booking_code || ' cancelada. Motivo registrado.'
  );

  v_response := jsonb_build_object('booking_id', p_booking_id, 'status', 'cancelled');
  perform private.complete_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.reschedule_booking(
  p_booking_id uuid,
  p_event_date date,
  p_event_start_time time,
  p_event_end_time time,
  p_reason text,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := private.current_organization_id();
  v_booking public.bookings%rowtype;
  v_timezone text;
  v_final_due timestamptz;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'reschedule_booking:' || p_booking_id::text;
begin
  if v_actor is null or v_org is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.is_booking_admin(v_org) then
    raise exception 'Only an administrator can reschedule bookings'
      using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Reschedule reason is required' using errcode = '23514';
  end if;
  if p_event_date < (now() at time zone 'America/Lima')::date then
    raise exception 'Event date cannot be in the past' using errcode = '23514';
  end if;
  v_cached := private.claim_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;

  select * into v_booking from public.bookings
  where id = p_booking_id and organization_id = v_org for update;
  if v_booking.id is null then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if v_booking.status not in ('held', 'pending_verification', 'confirmed') then
    raise exception 'Booking cannot be rescheduled in its current state'
      using errcode = '23514';
  end if;
  perform 1 from public.venues where id = v_booking.venue_id for update;
  perform private.expire_stale_booking_holds(v_org, v_booking.venue_id, v_actor);
  select * into v_booking from public.bookings
  where id = p_booking_id and organization_id = v_org;
  if v_booking.status = 'expired' then
    v_response := jsonb_build_object('booking_id', p_booking_id, 'status', 'expired');
    perform private.complete_booking_idempotency(
      v_org, v_actor, v_operation, p_idempotency_key, v_response
    );
    return v_response;
  end if;

  select timezone into v_timezone from public.organizations where id = v_org;
  v_final_due := (p_event_date + p_event_start_time)
    at time zone v_timezone - interval '2 hours';

  update public.schedule_allocations
  set local_date = p_event_date,
      occupied_during = private.booking_day_range(p_event_date, v_timezone)
  where booking_id = p_booking_id and organization_id = v_org and blocking;

  update public.bookings
  set event_date = p_event_date,
      event_start_time = p_event_start_time,
      event_end_time = p_event_end_time,
      intermediate_due_date = case when status = 'confirmed' then greatest(
        p_event_date - 15, (now() at time zone v_timezone)::date
      ) else intermediate_due_date end,
      final_due_at = case when status = 'confirmed' then v_final_due else final_due_at end,
      updated_by = v_actor
  where id = p_booking_id and organization_id = v_org;

  insert into public.crm_activities (
    organization_id, customer_id, opportunity_id, author_id, kind, description
  ) values (
    v_org, v_booking.customer_id, v_booking.opportunity_id, v_actor,
    'sistema', 'Reserva ' || v_booking.booking_code || ' reprogramada. Motivo registrado.'
  );

  v_response := jsonb_build_object(
    'booking_id', p_booking_id,
    'status', v_booking.status,
    'event_date', p_event_date
  );
  perform private.complete_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.create_calendar_blackout(
  p_venue_id uuid,
  p_event_date date,
  p_reason text,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := private.current_organization_id();
  v_timezone text;
  v_allocation_id uuid;
  v_cached jsonb;
  v_response jsonb;
begin
  if v_actor is null or v_org is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.is_booking_admin(v_org) then
    raise exception 'Only an administrator can block dates' using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Blackout reason is required' using errcode = '23514';
  end if;
  v_cached := private.claim_booking_idempotency(
    v_org, v_actor, 'create_calendar_blackout', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;

  select organization.timezone into v_timezone
  from public.organizations as organization where organization.id = v_org;
  perform 1 from public.venues
  where id = p_venue_id and organization_id = v_org and active for update;
  if not found then raise exception 'Venue not found' using errcode = '23503'; end if;
  perform private.expire_stale_booking_holds(v_org, p_venue_id, v_actor);

  insert into public.schedule_allocations (
    organization_id, venue_id, kind, local_date, occupied_during,
    blocking, reason, created_by
  ) values (
    v_org, p_venue_id, 'blackout', p_event_date,
    private.booking_day_range(p_event_date, v_timezone), true,
    btrim(p_reason), v_actor
  ) returning id into v_allocation_id;

  v_response := jsonb_build_object(
    'allocation_id', v_allocation_id,
    'status', 'blocked',
    'event_date', p_event_date
  );
  perform private.complete_booking_idempotency(
    v_org, v_actor, 'create_calendar_blackout', p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

alter table public.bookings enable row level security;
alter table public.bookings force row level security;
alter table public.schedule_allocations enable row level security;
alter table public.schedule_allocations force row level security;
alter table public.booking_deposit_records enable row level security;
alter table public.booking_deposit_records force row level security;

drop policy if exists bookings_select_scoped on public.bookings;
create policy bookings_select_scoped on public.bookings
for select to authenticated
using (private.can_access_booking(id));

drop policy if exists schedule_allocations_select_scoped on public.schedule_allocations;
create policy schedule_allocations_select_scoped on public.schedule_allocations
for select to authenticated
using (private.can_view_booking_calendar(organization_id));

drop policy if exists booking_deposits_select_scoped on public.booking_deposit_records;
create policy booking_deposits_select_scoped on public.booking_deposit_records
for select to authenticated
using (private.can_access_booking(booking_id));

revoke all on public.bookings from anon, authenticated;
revoke all on public.schedule_allocations from anon, authenticated;
revoke all on public.booking_deposit_records from anon, authenticated;
revoke all on private.booking_counters from public, anon, authenticated;
revoke all on private.booking_idempotency_keys from public, anon, authenticated;

grant select on public.bookings to authenticated;
grant select on public.schedule_allocations to authenticated;
grant select on public.booking_deposit_records to authenticated;

revoke execute on function private.booking_day_range(date, text)
  from public, anon, authenticated;
revoke execute on function private.is_booking_admin(uuid)
  from public, anon, authenticated;
revoke execute on function private.can_view_booking_calendar(uuid)
  from public, anon, authenticated;
revoke execute on function private.can_access_booking(uuid)
  from public, anon, authenticated;
revoke execute on function private.next_booking_code(uuid, integer)
  from public, anon, authenticated;
revoke execute on function private.claim_booking_idempotency(uuid, uuid, text, uuid)
  from public, anon, authenticated;
revoke execute on function private.complete_booking_idempotency(uuid, uuid, text, uuid, jsonb)
  from public, anon, authenticated;
revoke execute on function private.expire_stale_booking_holds(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function private.sanitize_booking_audit(text, jsonb)
  from public, anon, authenticated;
revoke execute on function private.audit_booking_row()
  from public, anon, authenticated;

revoke all on function public.create_booking_hold(
  uuid, uuid, date, time, time, bigint, text, uuid
) from public, anon;
revoke all on function public.submit_booking_deposit(
  uuid, bigint, public.payment_method, text, text, uuid
) from public, anon;
revoke all on function public.verify_booking_deposit_and_confirm(
  uuid, uuid, text, uuid
) from public, anon;
revoke all on function public.release_booking_hold(uuid, text, uuid)
  from public, anon;
revoke all on function public.cancel_confirmed_booking(uuid, text, uuid)
  from public, anon;
revoke all on function public.reschedule_booking(
  uuid, date, time, time, text, uuid
) from public, anon;
revoke all on function public.create_calendar_blackout(uuid, date, text, uuid)
  from public, anon;

grant execute on function public.create_booking_hold(
  uuid, uuid, date, time, time, bigint, text, uuid
) to authenticated;
grant execute on function public.submit_booking_deposit(
  uuid, bigint, public.payment_method, text, text, uuid
) to authenticated;
grant execute on function public.verify_booking_deposit_and_confirm(
  uuid, uuid, text, uuid
) to authenticated;
grant execute on function public.release_booking_hold(uuid, text, uuid)
  to authenticated;
grant execute on function public.cancel_confirmed_booking(uuid, text, uuid)
  to authenticated;
grant execute on function public.reschedule_booking(
  uuid, date, time, time, text, uuid
) to authenticated;
grant execute on function public.create_calendar_blackout(uuid, date, text, uuid)
  to authenticated;

comment on table public.bookings is
  'Reserva o hold real. Nunca se crea desde una fecha tentativa del CRM sin una acción explícita.';
comment on table public.schedule_allocations is
  'Fuente de verdad de ocupación. La exclusión GiST impide cruces incluso con solicitudes concurrentes.';
comment on table public.booking_deposit_records is
  'Evidencia de abono inicial. Solo los importes verificados por administrador confirman una fecha.';
comment on column public.bookings.total_contract_cents is
  'Importe acordado para esta reserva concreta; no alimenta ni convierte una propuesta en tarifa oficial.';
