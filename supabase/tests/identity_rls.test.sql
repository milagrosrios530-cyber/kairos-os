begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(17);

select ok(to_regclass('public.organizations') is not null, 'organizations exists');
select ok(to_regclass('public.venues') is not null, 'venues exists');
select ok(to_regclass('public.profiles') is not null, 'profiles exists');
select ok(to_regclass('public.user_roles') is not null, 'user_roles exists');
select ok(to_regclass('public.audit_logs') is not null, 'audit_logs exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.organizations'::regclass),
  'organizations has RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.venues'::regclass),
  'venues has RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_roles'::regclass),
  'user_roles has RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.audit_logs'::regclass),
  'audit_logs has RLS'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anon cannot read profiles'
);
select ok(
  not has_table_privilege('anon', 'public.user_roles', 'SELECT'),
  'anon cannot read user roles'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_roles', 'INSERT'),
  'authenticated users cannot directly grant roles'
);
select ok(
  not has_table_privilege('authenticated', 'public.audit_logs', 'INSERT'),
  'authenticated users cannot forge audit events'
);

select ok(
  not has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE')
  and not has_function_privilege(
    'authenticated',
    'public.rls_auto_enable()',
    'EXECUTE'
  )
  and not has_function_privilege(
    'service_role',
    'public.rls_auto_enable()',
    'EXECUTE'
  ),
  'exposed roles cannot execute the RLS event trigger function'
);

select ok(
  to_regclass('public.audit_logs_actor_id_idx') is not null,
  'audit actor foreign key has a covering index'
);

select ok(
  to_regclass('public.user_roles_granted_by_idx') is not null,
  'role grant actor foreign key has a covering index'
);

select * from finish();
rollback;
