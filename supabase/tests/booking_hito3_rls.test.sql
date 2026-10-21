begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(26);

select ok(to_regclass('public.bookings') is not null, 'bookings exists');
select ok(to_regclass('public.schedule_allocations') is not null, 'allocations exists');
select ok(to_regclass('public.booking_deposit_records') is not null, 'deposits exists');

select ok((select relrowsecurity from pg_class where oid = 'public.bookings'::regclass), 'bookings has RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.bookings'::regclass), 'bookings forces RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.schedule_allocations'::regclass), 'allocations has RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.schedule_allocations'::regclass), 'allocations force RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.booking_deposit_records'::regclass), 'deposits have RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.booking_deposit_records'::regclass), 'deposits force RLS');

select ok(not has_table_privilege('anon', 'public.bookings', 'SELECT'), 'anon cannot read bookings');
select ok(not has_table_privilege('anon', 'public.schedule_allocations', 'SELECT'), 'anon cannot read allocations');
select ok(not has_table_privilege('anon', 'public.booking_deposit_records', 'SELECT'), 'anon cannot read deposits');

select ok(has_table_privilege('authenticated', 'public.bookings', 'SELECT'), 'authenticated reads bookings through RLS');
select ok(has_table_privilege('authenticated', 'public.schedule_allocations', 'SELECT'), 'authenticated reads allocations through RLS');
select ok(has_table_privilege('authenticated', 'public.booking_deposit_records', 'SELECT'), 'authenticated reads deposits through RLS');

select ok(not has_table_privilege('authenticated', 'public.bookings', 'INSERT'), 'authenticated cannot insert bookings directly');
select ok(not has_table_privilege('authenticated', 'public.bookings', 'UPDATE'), 'authenticated cannot update bookings directly');
select ok(not has_table_privilege('authenticated', 'public.bookings', 'DELETE'), 'authenticated cannot delete bookings');
select ok(not has_table_privilege('authenticated', 'public.schedule_allocations', 'INSERT'), 'authenticated cannot insert allocations directly');
select ok(not has_table_privilege('authenticated', 'public.schedule_allocations', 'UPDATE'), 'authenticated cannot alter allocations directly');
select ok(not has_table_privilege('authenticated', 'public.booking_deposit_records', 'INSERT'), 'authenticated cannot forge deposits directly');

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_booking_hold(uuid,uuid,date,time without time zone,time without time zone,bigint,text,uuid)',
    'EXECUTE'
  ),
  'authenticated can call guarded hold RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_booking_hold(uuid,uuid,date,time without time zone,time without time zone,bigint,text,uuid)',
    'EXECUTE'
  ),
  'anonymous cannot create holds'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.expire_stale_booking_holds(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'clients cannot call private expiry helper'
);

select ok(
  has_function_privilege(
    'authenticated',
    'private.can_view_booking_calendar(uuid)',
    'EXECUTE'
  ),
  'authenticated can evaluate the calendar RLS helper'
);
select ok(
  has_function_privilege(
    'authenticated',
    'private.can_access_booking(uuid)',
    'EXECUTE'
  ),
  'authenticated can evaluate the booking RLS helper'
);

select * from finish();
rollback;
