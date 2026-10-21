-- Cover Hito 3 foreign keys used by authorization, history and cleanup.

create index if not exists bookings_venue_org_idx
  on public.bookings (venue_id, organization_id);
create index if not exists bookings_customer_org_idx
  on public.bookings (customer_id, organization_id);
create index if not exists bookings_opportunity_customer_org_idx
  on public.bookings (opportunity_id, customer_id, organization_id);
create index if not exists bookings_event_type_org_idx
  on public.bookings (event_type_id, organization_id);
create index if not exists bookings_assigned_org_idx
  on public.bookings (assigned_to, organization_id);
create index if not exists bookings_created_org_idx
  on public.bookings (created_by, organization_id);
create index if not exists bookings_updated_org_idx
  on public.bookings (updated_by, organization_id);
create index if not exists bookings_confirmed_org_idx
  on public.bookings (confirmed_by, organization_id)
  where confirmed_by is not null;
create index if not exists bookings_cancelled_org_idx
  on public.bookings (cancelled_by, organization_id)
  where cancelled_by is not null;

create index if not exists schedule_allocations_venue_org_idx
  on public.schedule_allocations (venue_id, organization_id);
create index if not exists schedule_allocations_booking_org_idx
  on public.schedule_allocations (booking_id, organization_id)
  where booking_id is not null;
create index if not exists schedule_allocations_created_org_idx
  on public.schedule_allocations (created_by, organization_id);
create index if not exists schedule_allocations_released_org_idx
  on public.schedule_allocations (released_by, organization_id)
  where released_by is not null;

create index if not exists booking_deposits_booking_org_idx
  on public.booking_deposit_records (booking_id, organization_id);
create index if not exists booking_deposits_submitted_org_idx
  on public.booking_deposit_records (submitted_by, organization_id);
create index if not exists booking_deposits_verified_org_idx
  on public.booking_deposit_records (verified_by, organization_id)
  where verified_by is not null;

create index if not exists booking_idempotency_actor_idx
  on private.booking_idempotency_keys (actor_id);
