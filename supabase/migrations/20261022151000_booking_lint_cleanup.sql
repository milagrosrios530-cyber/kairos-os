-- Conserva la firma histórica mientras deja explícito que la expiración es
-- organizacional porque KAIROS admite un solo evento por día.
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
  perform p_venue_id;

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
  select count(*)::integer into v_count from expired;

  return v_count;
end;
$$;

revoke execute on function private.expire_stale_booking_holds(uuid, uuid, uuid)
  from public, anon, authenticated;
