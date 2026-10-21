-- Hito 3 follow-up: every CRM intake with a requested date atomically creates
-- a 24-hour calendar hold. The proposal remains commercial reference data and
-- is never copied into a booking total.

alter table public.schedule_allocations
  add column if not exists opportunity_id uuid null;

update public.schedule_allocations as allocation
set opportunity_id = booking.opportunity_id
from public.bookings as booking
where allocation.booking_id = booking.id
  and allocation.organization_id = booking.organization_id
  and allocation.opportunity_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'schedule_allocations_opportunity_org_fk'
      and conrelid = 'public.schedule_allocations'::regclass
  ) then
    alter table public.schedule_allocations
      add constraint schedule_allocations_opportunity_org_fk
      foreign key (opportunity_id, organization_id)
      references public.opportunities(id, organization_id)
      on delete restrict;
  end if;
end
$$;

do $$
declare
  v_constraint_name text;
begin
  select constraint_row.conname
  into v_constraint_name
  from pg_constraint as constraint_row
  where constraint_row.conrelid = 'public.schedule_allocations'::regclass
    and constraint_row.contype = 'c'
    and pg_get_constraintdef(constraint_row.oid) ilike '%kind%'
    and pg_get_constraintdef(constraint_row.oid) ilike '%booking_id%'
    and pg_get_constraintdef(constraint_row.oid) ilike '%hold_expires_at%'
  order by constraint_row.conname
  limit 1;

  if v_constraint_name is not null then
    execute format(
      'alter table public.schedule_allocations drop constraint %I',
      v_constraint_name
    );
  end if;
end
$$;

alter table public.schedule_allocations
  drop constraint if exists schedule_allocations_shape_check;
alter table public.schedule_allocations
  add constraint schedule_allocations_shape_check check (
    (
      kind = 'blackout'
      and booking_id is null
      and opportunity_id is null
      and hold_expires_at is null
    )
    or (
      kind = 'hold'
      and booking_id is null
      and opportunity_id is not null
      and hold_expires_at is not null
    )
    or (
      kind = 'hold'
      and booking_id is not null
      and opportunity_id is not null
      and hold_expires_at is not null
    )
    or (
      kind = 'booking'
      and booking_id is not null
      and opportunity_id is not null
      and hold_expires_at is null
    )
  );

create unique index if not exists schedule_allocations_active_opportunity_unique_idx
  on public.schedule_allocations (opportunity_id)
  where opportunity_id is not null and blocking;
create index if not exists schedule_allocations_opportunity_org_idx
  on public.schedule_allocations (opportunity_id, organization_id)
  where opportunity_id is not null;

-- KAIROS currently operates one celebration per organization and calendar day,
-- independently of how many venue rows may exist in configuration.
alter table public.schedule_allocations
  drop constraint if exists schedule_allocations_no_overlap;
alter table public.schedule_allocations
  add constraint schedule_allocations_no_overlap
  exclude using gist (
    organization_id with =,
    occupied_during with &&
  ) where (blocking)
  deferrable initially immediate;

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
  -- p_venue_id remains in the signature for backwards compatibility. Since the
  -- operating rule is one event per organization/day, cleanup covers the whole
  -- organization before every new allocation attempt.
  with released as (
    update public.schedule_allocations
    set blocking = false,
        released_at = now(),
        released_by = p_actor_id,
        reason = coalesce(reason, 'Hold vencido automáticamente'),
        updated_at = now()
    where organization_id = p_organization_id
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
    where booking.id in (
        select released.booking_id
        from released
        where released.booking_id is not null
      )
      and booking.organization_id = p_organization_id
      and booking.status in ('held', 'pending_verification')
    returning booking.id
  )
  select count(*)::integer into v_count from released;

  return v_count;
end;
$$;

create or replace function private.ensure_opportunity_calendar_hold(
  p_opportunity_id uuid,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opportunity public.opportunities%rowtype;
  v_venue_id uuid;
  v_timezone text;
  v_allocation_id uuid;
  v_hold_expires_at timestamptz := now() + interval '24 hours';
begin
  select opportunity.*
  into v_opportunity
  from public.opportunities as opportunity
  where opportunity.id = p_opportunity_id
  for update;

  if v_opportunity.id is null then
    raise exception 'Opportunity not found' using errcode = 'P0002';
  end if;
  if v_opportunity.archived_at is not null
    or v_opportunity.pipeline_status in ('ganado', 'perdido', 'descartado') then
    raise exception 'Closed opportunities cannot retain dates'
      using errcode = '23514';
  end if;

  select organization.timezone
  into v_timezone
  from public.organizations as organization
  where organization.id = v_opportunity.organization_id;

  if v_opportunity.desired_date < (now() at time zone v_timezone)::date then
    raise exception 'Event date cannot be in the past' using errcode = '23514';
  end if;

  perform 1
  from public.profiles as profile
  where profile.user_id = p_actor_id
    and profile.organization_id = v_opportunity.organization_id
    and profile.status = 'active';
  if not found then
    raise exception 'Active actor profile is required' using errcode = '42501';
  end if;

  select venue.id
  into v_venue_id
  from public.venues as venue
  where venue.organization_id = v_opportunity.organization_id
    and venue.active
    and venue.exclusive_day_policy
  order by venue.created_at, venue.id
  limit 1
  for update;
  if v_venue_id is null then
    raise exception 'No active venue is configured for exclusive-day booking'
      using errcode = '23503';
  end if;

  perform private.expire_stale_booking_holds(
    v_opportunity.organization_id,
    v_venue_id,
    p_actor_id
  );

  select allocation.id
  into v_allocation_id
  from public.schedule_allocations as allocation
  where allocation.organization_id = v_opportunity.organization_id
    and allocation.opportunity_id = v_opportunity.id
    and allocation.blocking
  limit 1;
  if v_allocation_id is not null then
    return v_allocation_id;
  end if;

  if exists (
    select 1
    from public.bookings as booking
    where booking.organization_id = v_opportunity.organization_id
      and booking.opportunity_id = v_opportunity.id
      and booking.status in ('held', 'pending_verification', 'confirmed')
  ) then
    raise exception 'Opportunity already has an active booking'
      using errcode = '23505';
  end if;

  insert into public.schedule_allocations (
    organization_id,
    venue_id,
    opportunity_id,
    kind,
    local_date,
    occupied_during,
    blocking,
    hold_expires_at,
    reason,
    created_by
  ) values (
    v_opportunity.organization_id,
    v_venue_id,
    v_opportunity.id,
    'hold',
    v_opportunity.desired_date,
    private.booking_day_range(v_opportunity.desired_date, v_timezone),
    true,
    v_hold_expires_at,
    'Hold automático desde el registro CRM',
    p_actor_id
  )
  returning id into v_allocation_id;

  return v_allocation_id;
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
      'opportunity_id', p_row -> 'opportunity_id',
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

create or replace function public.create_crm_intake_v2(
  p_full_name text,
  p_phone_e164 text,
  p_customer_type public.customer_type,
  p_assigned_to uuid,
  p_event_type_id uuid,
  p_desired_date date,
  p_guests_total integer,
  p_modality public.event_modality,
  p_source public.lead_source,
  p_existing_customer_id uuid default null,
  p_customer jsonb default '{}'::jsonb,
  p_opportunity jsonb default '{}'::jsonb,
  p_alternate_dates jsonb default '[]'::jsonb,
  p_service_interests jsonb default '[]'::jsonb,
  p_proposal jsonb default null,
  p_first_task jsonb default null,
  p_first_visit jsonb default null,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
  v_labels jsonb;
  v_response jsonb;
  v_opportunity_id uuid;
  v_occasion_detail text := nullif(btrim(p_opportunity ->> 'occasion_detail'), '');
  v_cached jsonb;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if jsonb_typeof(p_service_interests) <> 'array'
    or jsonb_array_length(p_service_interests) > 30 then
    raise exception 'Invalid services payload' using errcode = '22023';
  end if;
  if v_occasion_detail is not null and char_length(v_occasion_detail) > 160 then
    raise exception 'Occasion detail is too long' using errcode = '22023';
  end if;

  v_cached := private.claim_crm_idempotency(
    v_organization_id,
    v_actor,
    'create_crm_intake_v2',
    p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(btrim(case
      when jsonb_typeof(service.value) = 'string' then service.value #>> '{}'
      else service.value ->> 'label'
    end))),
    '[]'::jsonb
  )
  into v_labels
  from jsonb_array_elements(p_service_interests) as service(value);

  v_response := public.create_crm_intake(
    p_full_name,
    p_phone_e164,
    p_customer_type,
    p_assigned_to,
    p_event_type_id,
    p_desired_date,
    p_guests_total,
    p_modality,
    p_source,
    p_existing_customer_id,
    p_customer,
    p_opportunity,
    p_alternate_dates,
    v_labels,
    p_proposal,
    p_first_task,
    p_first_visit,
    p_idempotency_key
  );

  if v_response ? 'opportunity_id' then
    v_opportunity_id := (v_response ->> 'opportunity_id')::uuid;

    if v_occasion_detail is not null then
      update public.opportunities
      set occasion_detail = v_occasion_detail,
          updated_by = v_actor
      where id = v_opportunity_id
        and organization_id = v_organization_id;
    end if;

    if jsonb_array_length(p_service_interests) > 0 then
      perform public.upsert_opportunity_service_details(
        v_opportunity_id,
        p_service_interests,
        null,
        p_idempotency_key
      );
    end if;

    -- The hold is part of the same transaction as the customer/opportunity.
    -- A GiST collision aborts everything, so the caller receives one conflict
    -- and no partially registered lead remains.
    perform private.ensure_opportunity_calendar_hold(v_opportunity_id, v_actor);
  end if;

  perform private.complete_crm_idempotency(
    v_organization_id,
    v_actor,
    'create_crm_intake_v2',
    p_idempotency_key,
    v_response
  );
  return v_response;
end;
$$;

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
  v_crm_hold_id uuid;
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

  select allocation.id
  into v_crm_hold_id
  from public.schedule_allocations as allocation
  where allocation.organization_id = v_org
    and allocation.opportunity_id = p_opportunity_id
    and allocation.booking_id is null
    and allocation.kind = 'hold'
    and allocation.blocking
  for update;

  v_booking_id := extensions.gen_random_uuid();
  v_booking_code := private.next_booking_code(
    v_org,
    extract(year from p_event_date)::integer
  );

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

  if v_crm_hold_id is not null then
    update public.schedule_allocations
    set venue_id = p_venue_id,
        booking_id = v_booking_id,
        local_date = p_event_date,
        occupied_during = private.booking_day_range(p_event_date, v_timezone),
        hold_expires_at = v_hold_expires_at,
        reason = 'Hold CRM convertido en reserva pendiente de abono',
        updated_at = now()
    where id = v_crm_hold_id
      and organization_id = v_org;
  else
    insert into public.schedule_allocations (
      organization_id, venue_id, booking_id, opportunity_id, kind, local_date,
      occupied_during, blocking, hold_expires_at, created_by
    ) values (
      v_org, p_venue_id, v_booking_id, p_opportunity_id, 'hold', p_event_date,
      private.booking_day_range(p_event_date, v_timezone), true,
      v_hold_expires_at, v_actor
    );
  end if;

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

revoke all on function private.ensure_opportunity_calendar_hold(uuid, uuid)
  from public, anon, authenticated;

comment on function private.ensure_opportunity_calendar_hold(uuid, uuid) is
  'Crea el hold CRM de 24 horas dentro de la misma transacción del alta; la exclusión GiST aborta el alta si la fecha ya está ocupada.';
comment on table public.bookings is
  'Reserva contractual. Un hold CRM puede convertirse aquí solo con un total contractual explícito; una propuesta nunca se copia como tarifa.';
comment on table public.schedule_allocations is
  'Fuente única de ocupación para oportunidades, reservas y bloqueos; una exclusión GiST impide más de un evento por organización y día.';
