begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(32);

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

select ok(
  to_regclass('public.staff_login_identifiers') is not null,
  'staff login identifier table exists'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.staff_login_identifiers'::regclass),
  'staff login identifiers have RLS'
);

select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.staff_login_identifiers'::regclass),
  'staff login identifiers force RLS'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_login_identifiers'
      and policyname = 'staff_login_identifiers_deny_clients'
  ),
  'staff login identifiers declare an explicit deny policy'
);

select ok(
  to_regclass('public.staff_login_identifiers_created_by_idx') is not null,
  'staff login creator foreign key has a covering index'
);

select ok(
  not has_table_privilege('anon', 'public.staff_login_identifiers', 'SELECT'),
  'anonymous users cannot resolve a DNI'
);

select ok(
  not has_table_privilege('authenticated', 'public.staff_login_identifiers', 'SELECT'),
  'authenticated users cannot resolve another DNI'
);

select ok(
  not has_table_privilege('authenticated', 'public.staff_login_identifiers', 'INSERT'),
  'authenticated users cannot create DNI aliases directly'
);

select ok(
  has_table_privilege('service_role', 'public.staff_login_identifiers', 'SELECT'),
  'service role can resolve protected login aliases'
);

select ok(
  to_regprocedure(
    'public.complete_employee_provisioning(uuid,uuid,text,text,text,text,public.app_role,uuid,uuid)'
  ) is not null,
  'direct employee provisioning RPC exists'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.complete_employee_provisioning(uuid,uuid,text,text,text,text,public.app_role,uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated clients cannot call direct provisioning RPC'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.complete_employee_provisioning(uuid,uuid,text,text,text,text,public.app_role,uuid,uuid)',
    'EXECUTE'
  ),
  'service role can complete direct provisioning'
);

select ok(
  to_regprocedure('public.resolve_staff_login_email(text)') is not null,
  'protected DNI resolver RPC exists'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.resolve_staff_login_email(text)',
    'EXECUTE'
  ),
  'authenticated clients cannot resolve DNI aliases'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.resolve_staff_login_email(text)',
    'EXECUTE'
  ),
  'service role can resolve protected DNI aliases'
);

select * from finish();
rollback;
