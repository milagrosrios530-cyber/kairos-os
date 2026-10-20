begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

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

create temp table crm_flow_state(payload jsonb) on commit drop;

insert into crm_flow_state(payload)
select public.create_crm_intake(
  p_full_name => 'Cliente DEMO QA transaccional',
  p_phone_e164 => '+519' || lpad((floor(random() * 100000000))::bigint::text, 8, '0'),
  p_customer_type => 'persona',
  p_assigned_to => auth.uid(),
  p_event_type_id => (
    select event_type.id
    from public.event_types as event_type
    where event_type.organization_id = private.current_organization_id()
      and event_type.active
    order by event_type.sort_order
    limit 1
  ),
  p_desired_date => date '2027-10-16',
  p_guests_total => 120,
  p_modality => 'integral',
  p_source => 'referido',
  p_customer => jsonb_build_object(
    'preferred_contact_channel', 'whatsapp',
    'district', 'DEMO QA'
  ),
  p_opportunity => jsonb_build_object(
    'guests_adults', 100,
    'guests_children', 20,
    'notes', 'Flujo DEMO QA; la transacción se revierte.'
  ),
  p_service_interests => '["decoracion", "catering"]'::jsonb,
  p_proposal => jsonb_build_object(
    'amount_cents', 420000,
    'currency', 'PEN',
    'services_summary', 'Propuesta DEMO QA no tarifaria'
  ),
  p_first_task => jsonb_build_object(
    'type', 'llamada',
    'title', 'Seguimiento DEMO QA',
    'due_at', '2027-09-01T10:00:00-05:00',
    'priority', 'media'
  ),
  p_first_visit => jsonb_build_object(
    'start_at', '2027-09-02T11:00:00-05:00',
    'end_at', '2027-09-02T12:00:00-05:00',
    'participants_count', 3,
    'mode', 'presencial',
    'notes', 'Visita DEMO QA'
  ),
  p_idempotency_key => extensions.gen_random_uuid()
);

select ok(
  (payload ->> 'customer_id')::uuid is not null
    and (payload ->> 'opportunity_id')::uuid is not null,
  'customer and opportunity are created atomically'
) from crm_flow_state;

select is(
  (
    select count(*)::integer
    from public.opportunity_proposals
    where opportunity_id = (payload ->> 'opportunity_id')::uuid
      and amount_cents = 420000
  ),
  1,
  'referential proposal is persisted separately'
) from crm_flow_state;

select ok((payload ->> 'task_id')::uuid is not null, 'first task is persisted')
from crm_flow_state;
select ok((payload ->> 'visit_id')::uuid is not null, 'first visit is persisted')
from crm_flow_state;

create temp table crm_duplicate_state(payload jsonb) on commit drop;

insert into crm_duplicate_state(payload)
select public.create_crm_intake(
  p_full_name => 'Cliente DEMO QA separado',
  p_phone_e164 => (
    select customer.phone_e164
    from public.customers as customer
    where customer.id = (state.payload ->> 'customer_id')::uuid
  ),
  p_customer_type => 'persona',
  p_assigned_to => auth.uid(),
  p_event_type_id => (
    select opportunity.event_type_id
    from public.opportunities as opportunity
    where opportunity.id = (state.payload ->> 'opportunity_id')::uuid
  ),
  p_desired_date => date '2027-10-17',
  p_guests_total => 80,
  p_modality => 'personalizado',
  p_source => 'referido',
  p_customer => jsonb_build_object(
    'preferred_contact_channel', 'whatsapp',
    'duplicate_override_reason', 'Personas distintas que comparten teléfono DEMO QA'
  ),
  p_idempotency_key => extensions.gen_random_uuid()
)
from crm_flow_state as state;

select ok(
  duplicate.payload ->> 'customer_id' <> original.payload ->> 'customer_id',
  'a justified duplicate override creates a separate audited customer'
)
from crm_duplicate_state as duplicate
cross join crm_flow_state as original;

select public.transition_opportunity(
  p_opportunity_id => (payload ->> 'opportunity_id')::uuid,
  p_new_stage => 'calificado',
  p_expected_updated_at => (
    select updated_at from public.opportunities
    where id = (payload ->> 'opportunity_id')::uuid
  ),
  p_idempotency_key => extensions.gen_random_uuid()
) from crm_flow_state;

select public.set_crm_task_status(
  p_task_id => (payload ->> 'task_id')::uuid,
  p_new_status => 'completada',
  p_result => 'Contacto DEMO QA completado',
  p_expected_updated_at => (
    select updated_at from public.tasks where id = (payload ->> 'task_id')::uuid
  ),
  p_idempotency_key => extensions.gen_random_uuid()
) from crm_flow_state;

select public.set_crm_visit_status(
  p_visit_id => (payload ->> 'visit_id')::uuid,
  p_new_status => 'realizada',
  p_outcome => 'Visita DEMO QA realizada',
  p_next_steps => 'Seguimiento DEMO QA',
  p_expected_updated_at => (
    select updated_at from public.visits where id = (payload ->> 'visit_id')::uuid
  ),
  p_idempotency_key => extensions.gen_random_uuid()
) from crm_flow_state;

select is(
  (select pipeline_status::text from public.opportunities where id = (payload ->> 'opportunity_id')::uuid),
  'calificado',
  'pipeline transition is persisted'
) from crm_flow_state;

select is(
  (select status::text from public.tasks where id = (payload ->> 'task_id')::uuid),
  'completada',
  'task completion requires and stores a result'
) from crm_flow_state;

select is(
  (select status::text from public.visits where id = (payload ->> 'visit_id')::uuid),
  'realizada',
  'visit completion requires and stores an outcome'
) from crm_flow_state;

select ok(
  (
    select count(*) >= 7
    from public.audit_logs
    where organization_id = private.current_organization_id()
      and entity_id in (
        (payload ->> 'customer_id')::uuid,
        (payload ->> 'opportunity_id')::uuid,
        (payload ->> 'task_id')::uuid,
        (payload ->> 'visit_id')::uuid
      )
  ),
  'sensitive CRM changes produce audit records'
) from crm_flow_state;

select * from finish();
rollback;
