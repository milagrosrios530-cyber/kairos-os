begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(17);

select set_config(
  'request.jwt.claim.sub',
  (
    select profile.user_id::text
    from public.profiles as profile
    join public.user_roles as role_row
      on role_row.user_id = profile.user_id
     and role_row.organization_id = profile.organization_id
    where profile.status = 'active'
      and role_row.role in ('SUPERADMIN', 'ADMINISTRADOR')
    order by case role_row.role when 'SUPERADMIN' then 1 else 2 end
    limit 1
  ),
  true
);

select has_table('public', 'bookings', 'bookings exists');
select has_table('public', 'schedule_allocations', 'schedule allocations exists');
select has_table('public', 'booking_deposit_records', 'deposit evidence exists');
select has_function('public', 'create_booking_hold', array['uuid','uuid','date','time without time zone','time without time zone','bigint','text','uuid'], 'hold RPC exists');
select has_function('public', 'verify_booking_deposit_and_confirm', array['uuid','uuid','text','uuid'], 'confirmation RPC exists');

create temp table booking_flow_state (
  first_opportunity_id uuid,
  second_opportunity_id uuid,
  first_booking_id uuid,
  deposit_id uuid
) on commit drop;

with first_intake as (
  select public.create_crm_intake_v2(
    p_full_name => 'Cliente DEMO QA reserva uno',
    p_phone_e164 => '+51911111111',
    p_customer_type => 'persona',
    p_assigned_to => auth.uid(),
    p_event_type_id => (
      select id from public.event_types
      where organization_id = private.current_organization_id() and active
      order by sort_order limit 1
    ),
    p_desired_date => date '2027-11-30',
    p_guests_total => 100,
    p_modality => 'integral',
    p_source => 'otro',
    p_customer => jsonb_build_object('preferred_contact_channel', 'whatsapp'),
    p_opportunity => '{}'::jsonb,
    p_service_interests => '[]'::jsonb,
    p_idempotency_key => extensions.gen_random_uuid()
  ) as payload
), second_intake as (
  select public.create_crm_intake_v2(
    p_full_name => 'Cliente DEMO QA reserva dos',
    p_phone_e164 => '+51922222222',
    p_customer_type => 'persona',
    p_assigned_to => auth.uid(),
    p_event_type_id => (
      select id from public.event_types
      where organization_id = private.current_organization_id() and active
      order by sort_order limit 1
    ),
    p_desired_date => date '2027-11-30',
    p_guests_total => 80,
    p_modality => 'integral',
    p_source => 'otro',
    p_customer => jsonb_build_object('preferred_contact_channel', 'whatsapp'),
    p_opportunity => '{}'::jsonb,
    p_service_interests => '[]'::jsonb,
    p_idempotency_key => extensions.gen_random_uuid()
  ) as payload
)
insert into booking_flow_state(first_opportunity_id, second_opportunity_id)
select
  (first_intake.payload ->> 'opportunity_id')::uuid,
  (second_intake.payload ->> 'opportunity_id')::uuid
from first_intake cross join second_intake;

update booking_flow_state
set first_booking_id = (
  select (public.create_booking_hold(
    p_opportunity_id => first_opportunity_id,
    p_venue_id => (
      select id from public.venues
      where organization_id = private.current_organization_id() and active
      order by created_at limit 1
    ),
    p_event_date => date '2027-11-30',
    p_event_start_time => time '18:00',
    p_event_end_time => time '04:00',
    p_total_contract_cents => 1550000,
    p_internal_notes => 'DEMO QA rollback',
    p_idempotency_key => extensions.gen_random_uuid()
  ) ->> 'booking_id')::uuid
);

select is(
  (select status::text from public.bookings where id = (select first_booking_id from booking_flow_state)),
  'held',
  'new booking starts as held'
);
select ok(
  (select hold_expires_at between now() + interval '23 hours 59 minutes' and now() + interval '24 hours 1 minute'
   from public.bookings where id = (select first_booking_id from booking_flow_state)),
  'hold lasts 24 hours'
);

select throws_ok(
  format(
    $$select public.create_booking_hold('%s','%s',date '2027-11-30',time '17:00',time '03:00',900000,null,'%s')$$,
    (select second_opportunity_id from booking_flow_state),
    (select id from public.venues where organization_id = private.current_organization_id() and active order by created_at limit 1),
    extensions.gen_random_uuid()
  ),
  '23P01',
  null,
  'database rejects a second blocking allocation for the same day'
);

update booking_flow_state
set deposit_id = (
  select (public.submit_booking_deposit(
    p_booking_id => first_booking_id,
    p_amount_cents => 50000,
    p_payment_method => 'transferencia',
    p_payment_reference => 'DEMO-QA-BOOKING-500',
    p_note => 'DEMO QA rollback',
    p_idempotency_key => extensions.gen_random_uuid()
  ) ->> 'deposit_id')::uuid
);

select is(
  (select status::text from public.bookings where id = (select first_booking_id from booking_flow_state)),
  'pending_verification',
  'submitted evidence does not confirm the booking'
);

select public.verify_booking_deposit_and_confirm(
  p_booking_id => first_booking_id,
  p_deposit_id => deposit_id,
  p_review_note => 'Verificado DEMO QA',
  p_idempotency_key => extensions.gen_random_uuid()
)
from booking_flow_state;

select is(
  (select status::text from public.bookings where id = (select first_booking_id from booking_flow_state)),
  'confirmed',
  'verified S/500 confirms the booking'
);
select is(
  (select kind::text from public.schedule_allocations where booking_id = (select first_booking_id from booking_flow_state) and blocking),
  'booking',
  'hold allocation becomes a permanent booking allocation'
);
select is(
  (select pipeline_status::text from public.opportunities where id = (select first_opportunity_id from booking_flow_state)),
  'ganado',
  'confirmed booking wins the opportunity'
);
select is(
  (select balance_after_initial_cents from public.bookings where id = (select first_booking_id from booking_flow_state)),
  1500000::bigint,
  'S/500 is included and leaves S/15,000'
);
select is(
  (select intermediate_due_cents from public.bookings where id = (select first_booking_id from booking_flow_state)),
  750000::bigint,
  'intermediate installment is half of the remaining balance'
);
select is(
  (select final_scheduled_cents from public.bookings where id = (select first_booking_id from booking_flow_state)),
  750000::bigint,
  'final scheduled installment is the other half'
);
select is(
  (select intermediate_due_date from public.bookings where id = (select first_booking_id from booking_flow_state)),
  date '2027-11-15',
  'intermediate installment is due 15 days before'
);
select is(
  (select final_due_at from public.bookings where id = (select first_booking_id from booking_flow_state)),
  timestamptz '2027-11-30 16:00:00-05',
  'final installment is due two hours before the event'
);

select * from finish();
rollback;
