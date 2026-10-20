begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(50);

select ok(to_regclass('public.customers') is not null, 'customers exists');
select ok(
  to_regclass('public.customer_identifiers') is not null,
  'customer_identifiers exists'
);
select ok(to_regclass('public.event_types') is not null, 'event_types exists');
select ok(to_regclass('public.opportunities') is not null, 'opportunities exists');
select ok(
  to_regclass('public.opportunity_alternate_dates') is not null,
  'opportunity_alternate_dates exists'
);
select ok(
  to_regclass('public.opportunity_service_interests') is not null,
  'opportunity_service_interests exists'
);
select ok(
  to_regclass('public.opportunity_proposals') is not null,
  'opportunity_proposals exists'
);
select ok(
  to_regclass('public.crm_activities') is not null,
  'crm_activities exists'
);
select ok(to_regclass('public.tasks') is not null, 'tasks exists');
select ok(to_regclass('public.visits') is not null, 'visits exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.customers'::regclass),
  'customers has RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.customer_identifiers'::regclass),
  'customer_identifiers has RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.event_types'::regclass),
  'event_types has RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.opportunities'::regclass),
  'opportunities has RLS'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.opportunity_alternate_dates'::regclass
  ),
  'opportunity_alternate_dates has RLS'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.opportunity_service_interests'::regclass
  ),
  'opportunity_service_interests has RLS'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.opportunity_proposals'::regclass
  ),
  'opportunity_proposals has RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.crm_activities'::regclass),
  'crm_activities has RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.tasks'::regclass),
  'tasks has RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.visits'::regclass),
  'visits has RLS'
);

select ok(
  not exists (
    select 1
    from unnest(array[
      'customers',
      'customer_identifiers',
      'event_types',
      'opportunities',
      'opportunity_alternate_dates',
      'opportunity_service_interests',
      'opportunity_proposals',
      'crm_activities',
      'tasks',
      'visits'
    ]) as t(table_name)
    where has_table_privilege('anon', 'public.' || table_name, 'SELECT')
  ),
  'anonymous users cannot read CRM tables'
);

select ok(
  not exists (
    select 1
    from unnest(array[
      'customers',
      'customer_identifiers',
      'event_types',
      'opportunities',
      'opportunity_alternate_dates',
      'opportunity_service_interests',
      'opportunity_proposals',
      'crm_activities',
      'tasks',
      'visits'
    ]) as t(table_name)
    where has_table_privilege('authenticated', 'public.' || table_name, 'DELETE')
  ),
  'authenticated users cannot hard-delete CRM history'
);

select ok(
  not exists (
    select 1
    from unnest(array[
      'customers',
      'customer_identifiers',
      'event_types',
      'opportunities',
      'opportunity_alternate_dates',
      'opportunity_service_interests',
      'opportunity_proposals',
      'crm_activities',
      'tasks',
      'visits'
    ]) as t(table_name)
    where has_table_privilege(
      'authenticated',
      'public.' || table_name,
      'INSERT,UPDATE'
    )
  ),
  'authenticated users write CRM data only through guarded RPCs'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.opportunity_proposals'::regclass
      and tgname = 'opportunity_proposals_append_only'
      and not tgisinternal
  ),
  'opportunity proposals are append-only'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.crm_activities'::regclass
      and tgname = 'crm_activities_append_only'
      and not tgisinternal
  ),
  'CRM activities are append-only'
);
select ok(
  not (
    private.sanitize_crm_audit(
      'customer_identifiers',
      '{"id":"00000000-0000-0000-0000-000000000001","document_number_normalized":"12345678"}'::jsonb
    ) ? 'document_number_normalized'
  ),
  'document number is removed from audit payloads'
);

select ok(
  to_regprocedure(
    'public.create_crm_intake(text,text,public.customer_type,uuid,uuid,date,integer,public.event_modality,public.lead_source,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,uuid)'
  ) is not null,
  'create_crm_intake exists'
);
select ok(
  to_regprocedure(
    'public.transition_opportunity(uuid,public.opportunity_stage,text,timestamptz,uuid)'
  ) is not null,
  'transition_opportunity exists'
);
select ok(
  to_regprocedure(
    'public.create_crm_task(uuid,uuid,public.task_type,text,timestamptz,uuid,text,public.task_priority,uuid)'
  ) is not null,
  'create_crm_task exists'
);
select ok(
  to_regprocedure(
    'public.set_crm_task_status(uuid,public.task_status,text,text,text,timestamptz,uuid)'
  ) is not null,
  'set_crm_task_status exists'
);
select ok(
  to_regprocedure(
    'public.reschedule_crm_task(uuid,timestamptz,text,uuid,timestamptz,uuid)'
  ) is not null,
  'reschedule_crm_task exists'
);
select ok(
  to_regprocedure(
    'public.create_crm_activity(uuid,uuid,public.crm_activity_kind,text,timestamptz,uuid)'
  ) is not null,
  'create_crm_activity exists'
);
select ok(
  to_regprocedure(
    'public.create_crm_visit(uuid,uuid,timestamptz,timestamptz,public.visit_mode,uuid,integer,text,uuid)'
  ) is not null,
  'create_crm_visit exists'
);
select ok(
  to_regprocedure(
    'public.set_crm_visit_status(uuid,public.visit_status,text,text,timestamptz,uuid)'
  ) is not null,
  'set_crm_visit_status exists'
);
select ok(
  to_regprocedure(
    'public.reschedule_crm_visit(uuid,timestamptz,timestamptz,text,uuid,public.visit_mode,text,timestamptz,uuid)'
  ) is not null,
  'reschedule_crm_visit exists'
);

select ok(
  not has_function_privilege('anon', 'public.find_customer_matches(text)', 'EXECUTE')
  and not has_function_privilege(
    'anon',
    'public.transition_opportunity(uuid,public.opportunity_stage,text,timestamptz,uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.create_crm_task(uuid,uuid,public.task_type,text,timestamptz,uuid,text,public.task_priority,uuid)',
    'EXECUTE'
  ),
  'anonymous users cannot execute CRM RPCs'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.transition_opportunity(uuid,public.opportunity_stage,text,timestamptz,uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.create_crm_task(uuid,uuid,public.task_type,text,timestamptz,uuid,text,public.task_priority,uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.create_crm_visit(uuid,uuid,timestamptz,timestamptz,public.visit_mode,uuid,integer,text,uuid)',
    'EXECUTE'
  ),
  'authenticated users can execute guarded CRM RPCs'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'private.crm_idempotency_keys',
    'SELECT'
  ),
  'idempotency records are private'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.opportunities'::regclass
      and contype = 'f'
      and confrelid = 'public.customers'::regclass
      and array_length(conkey, 1) = 2
  ),
  'opportunities enforce customer organization consistency'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tasks'::regclass
      and contype = 'f'
      and confrelid = 'public.opportunities'::regclass
      and array_length(conkey, 1) = 3
  ),
  'tasks enforce opportunity customer and organization consistency'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.visits'::regclass
      and contype = 'f'
      and confrelid = 'public.opportunities'::regclass
      and array_length(conkey, 1) = 3
  ),
  'visits enforce opportunity customer and organization consistency'
);
select ok(
  not exists (
    select 1
    from pg_constraint as c
    join pg_class as target on target.oid = c.confrelid
    where c.conrelid = 'public.visits'::regclass
      and target.relname = 'schedule_allocations'
  ),
  'visits never block the event calendar'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'customers_select_scoped'
  ),
  'customers have scoped select policy'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunities'
      and policyname = 'opportunities_select_scoped'
  ),
  'opportunities have scoped select policy'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tasks'
      and policyname = 'tasks_select_scoped'
  ),
  'tasks have scoped select policy'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'visits'
      and policyname = 'visits_select_scoped'
  ),
  'visits have scoped select policy'
);

select ok(
  obj_description('public.opportunity_proposals'::regclass, 'pg_class')
    ilike '%nunca es tarifario%',
  'proposed amounts are explicitly not official tariffs'
);
select ok(
  pg_get_functiondef('private.prepare_opportunity_row()'::regprocedure)
    ilike '%confirmed booking is required%',
  'won stage is blocked until reservations exist'
);
select ok(
  pg_get_functiondef(
    'public.set_crm_visit_status(uuid,public.visit_status,text,text,timestamptz,uuid)'::regprocedure
  ) ilike '%outcome is required%',
  'completed visits require an outcome'
);
select ok(
  pg_get_functiondef(
    'public.transition_opportunity(uuid,public.opportunity_stage,text,timestamptz,uuid)'::regprocedure
  ) ilike '%p_expected_updated_at%'
  and pg_get_functiondef(
    'public.set_crm_task_status(uuid,public.task_status,text,text,text,timestamptz,uuid)'::regprocedure
  ) ilike '%p_expected_updated_at%'
  and pg_get_functiondef(
    'public.set_crm_visit_status(uuid,public.visit_status,text,text,timestamptz,uuid)'::regprocedure
  ) ilike '%p_expected_updated_at%',
  'state-changing RPCs implement optimistic concurrency'
);

select * from finish();
rollback;
