-- Hito 3: reject invalid deposit evidence without deleting financial history.

create or replace function public.reject_booking_deposit(
  p_booking_id uuid,
  p_deposit_id uuid,
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
  v_operation text := 'reject_booking_deposit:' || p_deposit_id::text;
begin
  if v_actor is null or v_org is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.is_booking_admin(v_org) then
    raise exception 'Only an administrator can reject deposit evidence'
      using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Rejection reason is required' using errcode = '23514';
  end if;
  v_cached := private.claim_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;

  select * into v_booking from public.bookings
  where id = p_booking_id and organization_id = v_org for update;
  if v_booking.id is null then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if v_booking.status not in ('held', 'pending_verification') then
    raise exception 'Deposit can no longer be rejected in this booking state'
      using errcode = '23514';
  end if;

  update public.booking_deposit_records
  set status = 'rejected',
      verified_at = now(),
      verified_by = v_actor,
      review_note = btrim(p_reason)
  where id = p_deposit_id
    and booking_id = p_booking_id
    and organization_id = v_org
    and status = 'submitted';
  if not found then
    raise exception 'Deposit is not pending verification' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.booking_deposit_records
    where booking_id = p_booking_id
      and organization_id = v_org
      and status = 'submitted'
  ) then
    update public.bookings
    set status = 'held', updated_by = v_actor
    where id = p_booking_id and organization_id = v_org;
  end if;

  v_response := jsonb_build_object(
    'booking_id', p_booking_id,
    'deposit_id', p_deposit_id,
    'status', 'rejected'
  );
  perform private.complete_booking_idempotency(
    v_org, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

revoke all on function public.reject_booking_deposit(uuid, uuid, text, uuid)
  from public, anon;
grant execute on function public.reject_booking_deposit(uuid, uuid, text, uuid)
  to authenticated;

comment on function public.reject_booking_deposit(uuid, uuid, text, uuid) is
  'Rejects submitted evidence with an audited reason; never deletes the record.';
