-- Hito 3 follow-up: reversible operational blackouts and audited 24h hold extensions.

create or replace function public.extend_booking_hold(
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
  v_new_expiry timestamptz;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'extend_booking_hold:' || p_booking_id::text;
begin
  if v_actor is null or v_org is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.is_booking_admin(v_org) then
    raise exception 'Only an administrator can extend holds' using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Extension reason is required' using errcode = '23514';
  end if;
  v_cached := private.claim_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;

  select * into v_booking from public.bookings
  where id = p_booking_id and organization_id = v_org for update;
  if v_booking.id is null then raise exception 'Booking not found' using errcode = 'P0002'; end if;
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
  if v_booking.status not in ('held', 'pending_verification') then
    raise exception 'Only an active hold can be extended' using errcode = '23514';
  end if;

  v_new_expiry := greatest(v_booking.hold_expires_at, now()) + interval '24 hours';
  update public.bookings
  set hold_expires_at = v_new_expiry,
      internal_notes = concat_ws(E'\n', internal_notes, 'Extensión de hold: ' || btrim(p_reason)),
      updated_by = v_actor
  where id = p_booking_id and organization_id = v_org;
  update public.schedule_allocations
  set hold_expires_at = v_new_expiry,
      reason = 'Extensión autorizada: ' || btrim(p_reason)
  where booking_id = p_booking_id and organization_id = v_org and blocking;

  v_response := jsonb_build_object(
    'booking_id', p_booking_id,
    'status', v_booking.status,
    'hold_expires_at', v_new_expiry
  );
  perform private.complete_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.release_calendar_blackout(
  p_allocation_id uuid,
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
  v_allocation public.schedule_allocations%rowtype;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'release_calendar_blackout:' || p_allocation_id::text;
begin
  if v_actor is null or v_org is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.is_booking_admin(v_org) then
    raise exception 'Only an administrator can release blackouts' using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Release reason is required' using errcode = '23514';
  end if;
  v_cached := private.claim_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;

  select * into v_allocation
  from public.schedule_allocations
  where id = p_allocation_id
    and organization_id = v_org
    and kind = 'blackout'
  for update;
  if v_allocation.id is null then
    raise exception 'Blackout not found' using errcode = 'P0002';
  end if;
  if not v_allocation.blocking then
    v_response := jsonb_build_object(
      'allocation_id', p_allocation_id,
      'status', 'released'
    );
    perform private.complete_booking_idempotency(
      v_org, v_actor, v_operation, p_idempotency_key, v_response
    );
    return v_response;
  end if;

  update public.schedule_allocations
  set blocking = false,
      released_at = now(),
      released_by = v_actor,
      reason = 'Liberado: ' || btrim(p_reason)
  where id = p_allocation_id and organization_id = v_org;

  v_response := jsonb_build_object(
    'allocation_id', p_allocation_id,
    'status', 'released'
  );
  perform private.complete_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

revoke all on function public.extend_booking_hold(uuid, text, uuid)
  from public, anon;
revoke all on function public.release_calendar_blackout(uuid, text, uuid)
  from public, anon;
grant execute on function public.extend_booking_hold(uuid, text, uuid)
  to authenticated;
grant execute on function public.release_calendar_blackout(uuid, text, uuid)
  to authenticated;

comment on function public.extend_booking_hold(uuid, text, uuid) is
  'Admin extension by one approved 24-hour window, with reason and audit.';
comment on function public.release_calendar_blackout(uuid, text, uuid) is
  'Releases an operational blackout without deleting its history.';
