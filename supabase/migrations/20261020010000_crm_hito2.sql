-- KAIROS OS - Hito 2: CRM, seguimiento, tareas y visitas.
-- No crea reservas, asignaciones de calendario, tarifas oficiales ni pagos.

do $$
begin
  create type public.customer_type as enum (
    'persona', 'empresa', 'comite', 'institucion'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.contact_channel as enum (
    'whatsapp', 'llamada', 'correo'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.opportunity_stage as enum (
    'nuevo',
    'contactado',
    'calificado',
    'visita_programada',
    'visita_realizada',
    'cotizacion_enviada',
    'negociacion',
    'ganado',
    'perdido',
    'descartado'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.event_modality as enum (
    'solo_local', 'integral', 'personalizado', 'corporativo'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.lead_source as enum (
    'facebook_ads',
    'instagram',
    'whatsapp',
    'referido',
    'visita_presencial',
    'web_disponibilidad',
    'otro'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.crm_activity_kind as enum (
    'nota',
    'llamada',
    'whatsapp_manual',
    'reunion',
    'cambio_etapa',
    'cambio_asesor',
    'tarea',
    'visita',
    'sistema'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.task_type as enum (
    'llamada',
    'whatsapp',
    'visita',
    'enviar_cotizacion',
    'verificar_pago',
    'otro'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.task_priority as enum (
    'baja', 'media', 'alta', 'urgente'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.task_status as enum (
    'pendiente', 'en_progreso', 'completada', 'cancelada'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.visit_mode as enum (
    'presencial', 'virtual', 'telefonica'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.visit_status as enum (
    'programada', 'realizada', 'no_asistio', 'reprogramada', 'cancelada'
  );
exception when duplicate_object then null;
end
$$;

create table if not exists public.customers (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  full_name text not null
    check (char_length(btrim(full_name)) between 2 and 180),
  customer_type public.customer_type not null default 'persona',
  phone_e164 text not null
    check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  secondary_phone_e164 text null
    check (
      secondary_phone_e164 is null
      or secondary_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
    ),
  email text null
    check (
      email is null
      or (
        char_length(email) between 3 and 254
        and position('@' in email) > 1
      )
    ),
  affiliation_name text null
    check (affiliation_name is null or char_length(btrim(affiliation_name)) <= 180),
  district text null
    check (district is null or char_length(btrim(district)) <= 100),
  city text null
    check (city is null or char_length(btrim(city)) <= 100),
  preferred_contact_channel public.contact_channel null,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz null,
  marketing_consent_text_version text null
    check (
      marketing_consent_text_version is null
      or char_length(btrim(marketing_consent_text_version)) between 1 and 80
    ),
  internal_notes text null
    check (internal_notes is null or char_length(internal_notes) <= 5000),
  assigned_to uuid not null,
  created_by uuid not null,
  updated_by uuid not null,
  archived_at timestamptz null,
  archived_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (assigned_to, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (created_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (updated_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (archived_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  check (
    not marketing_consent
    or (
      marketing_consent_at is not null
      and marketing_consent_text_version is not null
    )
  ),
  check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  )
);

create table if not exists public.customer_identifiers (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  document_type text not null
    check (char_length(btrim(document_type)) between 2 and 30),
  document_number_normalized text not null
    check (
      char_length(document_number_normalized) between 4 and 30
      and document_number_normalized = upper(document_number_normalized)
      and document_number_normalized ~ '^[A-Z0-9-]+$'
    ),
  created_by uuid not null,
  updated_by uuid not null,
  archived_at timestamptz null,
  archived_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (customer_id, organization_id)
    references public.customers(id, organization_id) on delete restrict,
  foreign key (created_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (updated_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (archived_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  )
);

create table if not exists public.event_types (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  slug text not null
    check (
      char_length(slug) between 2 and 80
      and slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
    ),
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, slug),
  foreign key (created_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (updated_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict
);

create table if not exists public.opportunities (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  opportunity_code text not null,
  customer_id uuid not null,
  event_type_id uuid null,
  assigned_to uuid not null,
  pipeline_status public.opportunity_stage not null default 'nuevo',
  desired_date date null,
  tentative_start_time time null,
  tentative_end_time time null,
  guests_adults integer null check (guests_adults >= 0),
  guests_children integer null check (guests_children >= 0),
  guests_total integer null check (guests_total > 0),
  modality public.event_modality null,
  source public.lead_source not null default 'otro',
  source_detail text null
    check (source_detail is null or char_length(btrim(source_detail)) <= 300),
  budget_min_cents bigint null check (budget_min_cents >= 0),
  budget_max_cents bigint null check (budget_max_cents >= 0),
  currency character(3) not null default 'PEN'
    check (currency = upper(currency)),
  decision_maker text null
    check (decision_maker is null or char_length(btrim(decision_maker)) <= 180),
  interest_level text null
    check (interest_level is null or char_length(btrim(interest_level)) <= 80),
  probability_percent numeric(5,2) null
    check (probability_percent between 0 and 100),
  first_contact_at timestamptz not null default now(),
  next_action text null
    check (next_action is null or char_length(btrim(next_action)) <= 500),
  next_action_at timestamptz null,
  likely_visit_at timestamptz null,
  notes text null check (notes is null or char_length(notes) <= 10000),
  close_reason text null
    check (close_reason is null or char_length(btrim(close_reason)) between 3 and 1000),
  closed_at timestamptz null,
  created_by uuid not null,
  updated_by uuid not null,
  archived_at timestamptz null,
  archived_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (id, customer_id, organization_id),
  unique (organization_id, opportunity_code),
  foreign key (customer_id, organization_id)
    references public.customers(id, organization_id) on delete restrict,
  foreign key (event_type_id, organization_id)
    references public.event_types(id, organization_id) on delete restrict,
  foreign key (assigned_to, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (created_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (updated_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (archived_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  check (
    budget_min_cents is null
    or budget_max_cents is null
    or budget_max_cents >= budget_min_cents
  ),
  check (
    guests_total is null
    or guests_adults is null
    or guests_children is null
    or guests_total = guests_adults + guests_children
  ),
  check (
    pipeline_status not in (
      'calificado',
      'visita_programada',
      'visita_realizada',
      'cotizacion_enviada',
      'negociacion',
      'ganado'
    )
    or (
      event_type_id is not null
      and desired_date is not null
      and guests_total is not null
    )
  ),
  check (
    pipeline_status not in ('perdido', 'descartado')
    or (close_reason is not null and closed_at is not null)
  ),
  check (
    pipeline_status in ('ganado', 'perdido', 'descartado')
    or closed_at is null
  ),
  check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  )
);

create table if not exists public.opportunity_alternate_dates (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  opportunity_id uuid not null,
  rank smallint not null check (rank between 1 and 3),
  desired_date date not null,
  active boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (opportunity_id, organization_id)
    references public.opportunities(id, organization_id) on delete restrict,
  foreign key (created_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict
);

create table if not exists public.opportunity_service_interests (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  opportunity_id uuid not null,
  service_label text not null
    check (char_length(btrim(service_label)) between 2 and 120),
  details text null check (details is null or char_length(details) <= 2000),
  active boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (opportunity_id, organization_id)
    references public.opportunities(id, organization_id) on delete restrict,
  foreign key (created_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict
);

create table if not exists public.opportunity_proposals (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  opportunity_id uuid not null,
  services_summary text null
    check (services_summary is null or char_length(btrim(services_summary)) <= 5000),
  amount_cents bigint null check (amount_cents >= 0),
  currency character(3) not null default 'PEN'
    check (currency = upper(currency)),
  notes text null check (notes is null or char_length(notes) <= 5000),
  recorded_by uuid not null,
  supersedes_id uuid null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (opportunity_id, organization_id)
    references public.opportunities(id, organization_id) on delete restrict,
  foreign key (recorded_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (supersedes_id, organization_id)
    references public.opportunity_proposals(id, organization_id) on delete restrict,
  check (amount_cents is not null or services_summary is not null)
);

comment on table public.opportunity_proposals is
  'Registro histórico no oficial. Nunca es tarifario ni cotización aprobada.';
comment on column public.opportunity_proposals.amount_cents is
  'Importe propuesto para esta oportunidad; no puede alimentar una tarifa oficial.';

create table if not exists public.crm_activities (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  opportunity_id uuid null,
  author_id uuid not null,
  kind public.crm_activity_kind not null,
  description text not null
    check (char_length(btrim(description)) between 1 and 10000),
  occurred_at timestamptz not null default now(),
  corrects_activity_id uuid null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (customer_id, organization_id)
    references public.customers(id, organization_id) on delete restrict,
  foreign key (opportunity_id, customer_id, organization_id)
    references public.opportunities(id, customer_id, organization_id) on delete restrict,
  foreign key (author_id, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (corrects_activity_id, organization_id)
    references public.crm_activities(id, organization_id) on delete restrict
);

create table if not exists public.tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  opportunity_id uuid null,
  assignee_id uuid not null,
  type public.task_type not null,
  title text not null check (char_length(btrim(title)) between 2 and 200),
  description text null check (description is null or char_length(description) <= 5000),
  due_at timestamptz not null,
  priority public.task_priority not null default 'media',
  status public.task_status not null default 'pendiente',
  result text null check (result is null or char_length(btrim(result)) between 1 and 3000),
  completion_note text null
    check (completion_note is null or char_length(completion_note) <= 5000),
  next_action text null check (next_action is null or char_length(next_action) <= 1000),
  completed_at timestamptz null,
  cancelled_at timestamptz null,
  rescheduled_from_task_id uuid null,
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (customer_id, organization_id)
    references public.customers(id, organization_id) on delete restrict,
  foreign key (opportunity_id, customer_id, organization_id)
    references public.opportunities(id, customer_id, organization_id) on delete restrict,
  foreign key (assignee_id, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (created_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (updated_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (rescheduled_from_task_id, organization_id)
    references public.tasks(id, organization_id) on delete restrict,
  check (
    status <> 'completada'
    or (result is not null and completed_at is not null)
  ),
  check (status = 'completada' or completed_at is null),
  check (status = 'cancelada' or cancelled_at is null),
  check (status <> 'cancelada' or cancelled_at is not null)
);

create table if not exists public.visits (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  opportunity_id uuid not null,
  staff_id uuid not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  participants_count integer null check (participants_count > 0),
  mode public.visit_mode not null default 'presencial',
  status public.visit_status not null default 'programada',
  notes text null check (notes is null or char_length(notes) <= 5000),
  outcome text null check (outcome is null or char_length(outcome) <= 5000),
  next_steps text null check (next_steps is null or char_length(next_steps) <= 3000),
  resolved_at timestamptz null,
  rescheduled_from_visit_id uuid null,
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (customer_id, organization_id)
    references public.customers(id, organization_id) on delete restrict,
  foreign key (opportunity_id, customer_id, organization_id)
    references public.opportunities(id, customer_id, organization_id) on delete restrict,
  foreign key (staff_id, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (created_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (updated_by, organization_id)
    references public.profiles(user_id, organization_id) on delete restrict,
  foreign key (rescheduled_from_visit_id, organization_id)
    references public.visits(id, organization_id) on delete restrict,
  check (end_at > start_at),
  check (
    status = 'programada'
    or resolved_at is not null
  ),
  check (
    status <> 'programada'
    or resolved_at is null
  )
);

create table if not exists private.opportunity_counters (
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  counter_year integer not null check (counter_year between 2020 and 9999),
  last_value bigint not null check (last_value > 0),
  primary key (organization_id, counter_year)
);

create table if not exists private.crm_idempotency_keys (
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  operation text not null check (char_length(operation) between 3 and 80),
  idempotency_key uuid not null,
  response_json jsonb null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  primary key (organization_id, actor_id, operation, idempotency_key)
);

create unique index if not exists opportunity_alternate_dates_active_rank_uidx
  on public.opportunity_alternate_dates (opportunity_id, rank)
  where active;
create unique index if not exists opportunity_alternate_dates_active_date_uidx
  on public.opportunity_alternate_dates (opportunity_id, desired_date)
  where active;

create index if not exists customers_phone_lookup_idx
  on public.customers (organization_id, phone_e164);
create index if not exists customers_name_lookup_idx
  on public.customers (organization_id, lower(full_name));
create index if not exists customers_assignee_idx
  on public.customers (organization_id, assigned_to, archived_at);
create index if not exists customers_created_by_idx
  on public.customers (created_by);
create index if not exists customers_updated_by_idx
  on public.customers (updated_by);
create index if not exists customers_archived_by_idx
  on public.customers (archived_by);

create index if not exists customer_identifiers_customer_idx
  on public.customer_identifiers (organization_id, customer_id, archived_at);
create index if not exists customer_identifiers_lookup_idx
  on public.customer_identifiers (
    organization_id,
    document_type,
    document_number_normalized
  );
create unique index if not exists customer_identifiers_active_customer_uidx
  on public.customer_identifiers (
    customer_id,
    document_type,
    document_number_normalized
  )
  where archived_at is null;
create index if not exists customer_identifiers_created_by_idx
  on public.customer_identifiers (created_by);
create index if not exists customer_identifiers_updated_by_idx
  on public.customer_identifiers (updated_by);
create index if not exists customer_identifiers_archived_by_idx
  on public.customer_identifiers (archived_by);

create index if not exists event_types_organization_active_idx
  on public.event_types (organization_id, active, sort_order);
create index if not exists event_types_created_by_idx
  on public.event_types (created_by);
create index if not exists event_types_updated_by_idx
  on public.event_types (updated_by);

create index if not exists opportunities_pipeline_idx
  on public.opportunities (organization_id, assigned_to, pipeline_status);
create index if not exists opportunities_desired_date_idx
  on public.opportunities (organization_id, desired_date);
create index if not exists opportunities_customer_idx
  on public.opportunities (organization_id, customer_id, created_at desc);
create index if not exists opportunities_event_type_idx
  on public.opportunities (event_type_id);
create index if not exists opportunities_created_by_idx
  on public.opportunities (created_by);
create index if not exists opportunities_updated_by_idx
  on public.opportunities (updated_by);
create index if not exists opportunities_archived_by_idx
  on public.opportunities (archived_by);

create index if not exists opportunity_alternate_dates_org_idx
  on public.opportunity_alternate_dates (organization_id, desired_date);
create index if not exists opportunity_alternate_dates_created_by_idx
  on public.opportunity_alternate_dates (created_by);
create index if not exists opportunity_service_interests_opportunity_idx
  on public.opportunity_service_interests (organization_id, opportunity_id, active);
create index if not exists opportunity_service_interests_created_by_idx
  on public.opportunity_service_interests (created_by);
create index if not exists opportunity_proposals_opportunity_idx
  on public.opportunity_proposals (organization_id, opportunity_id, created_at desc);
create index if not exists opportunity_proposals_recorded_by_idx
  on public.opportunity_proposals (recorded_by);
create index if not exists opportunity_proposals_supersedes_idx
  on public.opportunity_proposals (supersedes_id);

create index if not exists crm_activities_opportunity_idx
  on public.crm_activities (organization_id, opportunity_id, occurred_at desc);
create index if not exists crm_activities_customer_idx
  on public.crm_activities (organization_id, customer_id, occurred_at desc);
create index if not exists crm_activities_author_idx
  on public.crm_activities (author_id);
create index if not exists crm_activities_correction_idx
  on public.crm_activities (corrects_activity_id);

create index if not exists tasks_assignee_due_idx
  on public.tasks (organization_id, assignee_id, status, due_at);
create index if not exists tasks_opportunity_idx
  on public.tasks (organization_id, opportunity_id, created_at desc);
create index if not exists tasks_customer_idx
  on public.tasks (customer_id);
create index if not exists tasks_created_by_idx
  on public.tasks (created_by);
create index if not exists tasks_updated_by_idx
  on public.tasks (updated_by);
create index if not exists tasks_rescheduled_from_idx
  on public.tasks (rescheduled_from_task_id);

create index if not exists visits_staff_start_idx
  on public.visits (organization_id, staff_id, status, start_at);
create index if not exists visits_opportunity_idx
  on public.visits (organization_id, opportunity_id, start_at);
create index if not exists visits_customer_idx
  on public.visits (customer_id);
create index if not exists visits_created_by_idx
  on public.visits (created_by);
create index if not exists visits_updated_by_idx
  on public.visits (updated_by);
create index if not exists visits_rescheduled_from_idx
  on public.visits (rescheduled_from_visit_id);

-- Initial catalog defined by the functional specification. These are product
-- configuration values, never demo business records or commercial tariffs.
insert into public.event_types (
  organization_id,
  name,
  slug,
  active,
  sort_order,
  created_by,
  updated_by
)
select
  organization_row.id,
  catalog.name,
  catalog.slug,
  true,
  catalog.sort_order,
  seed_actor.user_id,
  seed_actor.user_id
from public.organizations as organization_row
join lateral (
  select profile.user_id
  from public.profiles as profile
  join public.user_roles as role_row
    on role_row.user_id = profile.user_id
   and role_row.organization_id = profile.organization_id
  where profile.organization_id = organization_row.id
    and profile.status = 'active'
  order by case role_row.role
    when 'SUPERADMIN' then 1
    when 'ADMINISTRADOR' then 2
    else 3
  end,
  profile.created_at
  limit 1
) as seed_actor on true
cross join (
  values
    ('Boda', 'boda', 10),
    ('Matrimonio civil', 'matrimonio_civil', 20),
    ('Quinceaños', 'quinceanos', 30),
    ('Promoción escolar', 'promocion_escolar', 40),
    ('Graduación', 'graduacion', 50),
    ('Aniversario', 'aniversario', 60),
    ('Bautizo', 'bautizo', 70),
    ('Evento corporativo', 'evento_corporativo', 80),
    ('Conferencia', 'conferencia', 90),
    ('Reunión familiar', 'reunion_familiar', 100),
    ('Otro', 'otro', 110)
) as catalog(name, slug, sort_order)
on conflict (organization_id, slug) do nothing;

create or replace function private.is_crm_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_organization_id = private.current_organization_id()
    and private.has_any_role(
      array['SUPERADMIN', 'ADMINISTRADOR']::public.app_role[]
    )
$$;

create or replace function private.is_crm_commercial(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_organization_id = private.current_organization_id()
    and private.has_any_role(array['COMERCIAL']::public.app_role[])
$$;

create or replace function private.can_access_opportunity(p_opportunity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.opportunities as o
    where o.id = p_opportunity_id
      and o.organization_id = private.current_organization_id()
      and (
        private.is_crm_admin(o.organization_id)
        or (
          private.is_crm_commercial(o.organization_id)
          and o.assigned_to = (select auth.uid())
        )
      )
  )
$$;

create or replace function private.can_access_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.customers as c
    where c.id = p_customer_id
      and c.organization_id = private.current_organization_id()
      and (
        private.is_crm_admin(c.organization_id)
        or (
          private.is_crm_commercial(c.organization_id)
          and (
            c.assigned_to = (select auth.uid())
            or exists (
              select 1
              from public.opportunities as o
              where o.customer_id = c.id
                and o.organization_id = c.organization_id
                and o.assigned_to = (select auth.uid())
            )
          )
        )
      )
  )
$$;

revoke execute on function private.is_crm_admin(uuid) from public, anon;
revoke execute on function private.is_crm_commercial(uuid) from public, anon;
revoke execute on function private.can_access_opportunity(uuid) from public, anon;
revoke execute on function private.can_access_customer(uuid) from public, anon;
grant execute on function private.is_crm_admin(uuid) to authenticated;
grant execute on function private.is_crm_commercial(uuid) to authenticated;
grant execute on function private.can_access_opportunity(uuid) to authenticated;
grant execute on function private.can_access_customer(uuid) to authenticated;

create or replace function private.next_opportunity_code(
  p_organization_id uuid,
  p_year integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_value bigint;
begin
  insert into private.opportunity_counters (
    organization_id,
    counter_year,
    last_value
  ) values (
    p_organization_id,
    p_year,
    1
  )
  on conflict (organization_id, counter_year)
  do update set last_value = private.opportunity_counters.last_value + 1
  returning last_value into v_value;

  return format(
    'KAI-LEAD-%s-%s',
    p_year,
    lpad(v_value::text, 6, '0')
  );
end;
$$;

revoke all on function private.next_opportunity_code(uuid, integer)
  from public, anon, authenticated;

create or replace function private.claim_crm_idempotency(
  p_organization_id uuid,
  p_actor_id uuid,
  p_operation text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted boolean := false;
  v_response jsonb;
begin
  if p_idempotency_key is null then
    raise exception 'idempotency_key is required' using errcode = '22023';
  end if;

  insert into private.crm_idempotency_keys (
    organization_id,
    actor_id,
    operation,
    idempotency_key
  ) values (
    p_organization_id,
    p_actor_id,
    p_operation,
    p_idempotency_key
  )
  on conflict do nothing
  returning true into v_inserted;

  if coalesce(v_inserted, false) then
    return null;
  end if;

  select response_json
  into v_response
  from private.crm_idempotency_keys
  where organization_id = p_organization_id
    and actor_id = p_actor_id
    and operation = p_operation
    and idempotency_key = p_idempotency_key;

  if v_response is null then
    raise exception 'Request with this idempotency key is still in progress'
      using errcode = '55P03';
  end if;

  return v_response;
end;
$$;

create or replace function private.complete_crm_idempotency(
  p_organization_id uuid,
  p_actor_id uuid,
  p_operation text,
  p_idempotency_key uuid,
  p_response jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.crm_idempotency_keys
  set response_json = p_response,
      completed_at = now()
  where organization_id = p_organization_id
    and actor_id = p_actor_id
    and operation = p_operation
    and idempotency_key = p_idempotency_key
$$;

revoke all on function private.claim_crm_idempotency(uuid, uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function private.complete_crm_idempotency(
  uuid, uuid, text, uuid, jsonb
) from public, anon, authenticated;

create or replace function private.sanitize_crm_audit(
  p_table_name text,
  p_row jsonb
)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select case p_table_name
    when 'customers' then p_row - array[
      'full_name',
      'phone_e164',
      'secondary_phone_e164',
      'email',
      'affiliation_name',
      'district',
      'city',
      'internal_notes',
      'marketing_consent_text_version'
    ]::text[]
    when 'customer_identifiers' then p_row - array[
      'document_number_normalized'
    ]::text[]
    when 'opportunities' then p_row - array[
      'decision_maker',
      'next_action',
      'notes',
      'close_reason',
      'source_detail'
    ]::text[]
    when 'opportunity_service_interests' then p_row - array['details']::text[]
    when 'opportunity_proposals' then p_row - array[
      'services_summary',
      'notes'
    ]::text[]
    when 'crm_activities' then p_row - array['description']::text[]
    when 'tasks' then p_row - array[
      'title',
      'description',
      'result',
      'completion_note',
      'next_action'
    ]::text[]
    when 'visits' then p_row - array[
      'notes',
      'outcome',
      'next_steps'
    ]::text[]
    else p_row
  end
$$;

create or replace function private.audit_crm_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_source jsonb;
  v_actor uuid;
  v_organization_id uuid;
  v_entity_id uuid;
begin
  if tg_op <> 'INSERT' then
    v_before := private.sanitize_crm_audit(tg_table_name, to_jsonb(old));
  end if;

  if tg_op <> 'DELETE' then
    v_after := private.sanitize_crm_audit(tg_table_name, to_jsonb(new));
  end if;

  v_source := coalesce(v_after, v_before);
  v_organization_id := (v_source ->> 'organization_id')::uuid;
  v_entity_id := (v_source ->> 'id')::uuid;
  v_actor := auth.uid();

  insert into public.audit_logs (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    before_json,
    after_json
  ) values (
    v_organization_id,
    v_actor,
    tg_argv[0] || '.' || lower(tg_op),
    tg_argv[0],
    v_entity_id,
    v_before,
    v_after
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.prevent_crm_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$$;

create or replace function private.prepare_customer_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
begin
  if tg_op = 'INSERT' then
    if v_actor is not null then
      new.organization_id := v_organization_id;
      new.created_by := v_actor;
      new.updated_by := v_actor;
      new.assigned_to := coalesce(new.assigned_to, v_actor);
    end if;
  else
    if new.id <> old.id
      or new.organization_id <> old.organization_id
      or new.created_by <> old.created_by then
      raise exception 'Immutable customer identity fields cannot change'
        using errcode = '22023';
    end if;

    if v_actor is not null then
      new.updated_by := v_actor;
      if not private.is_crm_admin(old.organization_id) then
        if new.assigned_to <> old.assigned_to
          or new.archived_at is distinct from old.archived_at
          or new.archived_by is distinct from old.archived_by then
          raise exception 'Commercial users cannot reassign or archive customers'
            using errcode = '42501';
        end if;
      end if;
    end if;
  end if;

  new.full_name := btrim(new.full_name);
  new.email := nullif(lower(btrim(new.email)), '');
  return new;
end;
$$;

create or replace function private.prepare_opportunity_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
begin
  if new.pipeline_status = 'ganado'
    and (tg_op = 'INSERT' or old.pipeline_status <> 'ganado') then
    raise exception 'A confirmed booking is required before marking an opportunity as won'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    if v_actor is not null then
      new.organization_id := v_organization_id;
      new.created_by := v_actor;
      new.updated_by := v_actor;
      new.assigned_to := coalesce(new.assigned_to, v_actor);
    end if;

    if new.opportunity_code is null or btrim(new.opportunity_code) = '' then
      new.opportunity_code := private.next_opportunity_code(
        new.organization_id,
        extract(year from new.created_at)::integer
      );
    end if;
  else
    if new.id <> old.id
      or new.organization_id <> old.organization_id
      or new.customer_id <> old.customer_id
      or new.opportunity_code <> old.opportunity_code
      or new.created_by <> old.created_by then
      raise exception 'Immutable opportunity identity fields cannot change'
        using errcode = '22023';
    end if;

    if new.pipeline_status <> old.pipeline_status
      and coalesce(current_setting('kairos.crm_stage_transition', true), '') <> 'on' then
      raise exception 'Use transition_opportunity to change pipeline status'
        using errcode = '42501';
    end if;

    if v_actor is not null then
      new.updated_by := v_actor;
      if not private.is_crm_admin(old.organization_id) then
        if new.assigned_to <> old.assigned_to
          or new.archived_at is distinct from old.archived_at
          or new.archived_by is distinct from old.archived_by then
          raise exception 'Commercial users cannot reassign or archive opportunities'
            using errcode = '42501';
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.prepare_task_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if v_actor is not null then
      new.organization_id := private.current_organization_id();
      new.created_by := v_actor;
      new.updated_by := v_actor;
      new.assignee_id := coalesce(new.assignee_id, v_actor);
    end if;
  else
    if new.id <> old.id
      or new.organization_id <> old.organization_id
      or new.customer_id <> old.customer_id
      or new.opportunity_id is distinct from old.opportunity_id
      or new.created_by <> old.created_by
      or new.due_at <> old.due_at
      or new.rescheduled_from_task_id is distinct from old.rescheduled_from_task_id then
      raise exception 'Task identity and scheduling history are immutable'
        using errcode = '22023';
    end if;

    if new.status <> old.status
      and coalesce(current_setting('kairos.crm_task_transition', true), '') <> 'on' then
      raise exception 'Use a task transition RPC to change task status'
        using errcode = '42501';
    end if;

    if v_actor is not null then
      new.updated_by := v_actor;
      if not private.is_crm_admin(old.organization_id)
        and new.assignee_id <> old.assignee_id then
        raise exception 'Commercial users cannot reassign tasks'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.prepare_visit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if v_actor is not null then
      new.organization_id := private.current_organization_id();
      new.created_by := v_actor;
      new.updated_by := v_actor;
      new.staff_id := coalesce(new.staff_id, v_actor);
    end if;
  else
    if new.id <> old.id
      or new.organization_id <> old.organization_id
      or new.customer_id <> old.customer_id
      or new.opportunity_id <> old.opportunity_id
      or new.created_by <> old.created_by
      or new.start_at <> old.start_at
      or new.end_at <> old.end_at
      or new.rescheduled_from_visit_id is distinct from old.rescheduled_from_visit_id then
      raise exception 'Visit identity and scheduling history are immutable'
        using errcode = '22023';
    end if;

    if new.status <> old.status
      and coalesce(current_setting('kairos.crm_visit_transition', true), '') <> 'on' then
      raise exception 'Use set_crm_visit_status to change visit status'
        using errcode = '42501';
    end if;

    if v_actor is not null then
      new.updated_by := v_actor;
      if not private.is_crm_admin(old.organization_id)
        and new.staff_id <> old.staff_id then
        raise exception 'Commercial users cannot reassign visits'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists customers_prepare_row on public.customers;
create trigger customers_prepare_row
before insert or update on public.customers
for each row execute function private.prepare_customer_row();

drop trigger if exists opportunities_prepare_row on public.opportunities;
create trigger opportunities_prepare_row
before insert or update on public.opportunities
for each row execute function private.prepare_opportunity_row();

drop trigger if exists tasks_prepare_row on public.tasks;
create trigger tasks_prepare_row
before insert or update on public.tasks
for each row execute function private.prepare_task_row();

drop trigger if exists visits_prepare_row on public.visits;
create trigger visits_prepare_row
before insert or update on public.visits
for each row execute function private.prepare_visit_row();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function private.set_updated_at();

drop trigger if exists customer_identifiers_set_updated_at on public.customer_identifiers;
create trigger customer_identifiers_set_updated_at
before update on public.customer_identifiers
for each row execute function private.set_updated_at();

drop trigger if exists event_types_set_updated_at on public.event_types;
create trigger event_types_set_updated_at
before update on public.event_types
for each row execute function private.set_updated_at();

drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at
before update on public.opportunities
for each row execute function private.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function private.set_updated_at();

drop trigger if exists visits_set_updated_at on public.visits;
create trigger visits_set_updated_at
before update on public.visits
for each row execute function private.set_updated_at();

drop trigger if exists opportunity_proposals_append_only on public.opportunity_proposals;
create trigger opportunity_proposals_append_only
before update or delete on public.opportunity_proposals
for each row execute function private.prevent_crm_history_mutation();

drop trigger if exists crm_activities_append_only on public.crm_activities;
create trigger crm_activities_append_only
before update or delete on public.crm_activities
for each row execute function private.prevent_crm_history_mutation();

drop trigger if exists customers_audit on public.customers;
create trigger customers_audit
after insert or update on public.customers
for each row execute function private.audit_crm_row('customer');

drop trigger if exists customer_identifiers_audit on public.customer_identifiers;
create trigger customer_identifiers_audit
after insert or update on public.customer_identifiers
for each row execute function private.audit_crm_row('customer_identifier');

drop trigger if exists opportunities_audit on public.opportunities;
create trigger opportunities_audit
after insert or update on public.opportunities
for each row execute function private.audit_crm_row('opportunity');

drop trigger if exists event_types_audit on public.event_types;
create trigger event_types_audit
after insert or update on public.event_types
for each row execute function private.audit_crm_row('event_type');

drop trigger if exists opportunity_alternate_dates_audit
  on public.opportunity_alternate_dates;
create trigger opportunity_alternate_dates_audit
after insert or update on public.opportunity_alternate_dates
for each row execute function private.audit_crm_row('opportunity_alternate_date');

drop trigger if exists opportunity_service_interests_audit
  on public.opportunity_service_interests;
create trigger opportunity_service_interests_audit
after insert or update on public.opportunity_service_interests
for each row execute function private.audit_crm_row('opportunity_service_interest');

drop trigger if exists opportunity_proposals_audit on public.opportunity_proposals;
create trigger opportunity_proposals_audit
after insert on public.opportunity_proposals
for each row execute function private.audit_crm_row('opportunity_proposal');

drop trigger if exists crm_activities_audit on public.crm_activities;
create trigger crm_activities_audit
after insert on public.crm_activities
for each row execute function private.audit_crm_row('crm_activity');

drop trigger if exists tasks_audit on public.tasks;
create trigger tasks_audit
after insert or update on public.tasks
for each row execute function private.audit_crm_row('task');

drop trigger if exists visits_audit on public.visits;
create trigger visits_audit
after insert or update on public.visits
for each row execute function private.audit_crm_row('visit');

alter table public.customers enable row level security;
alter table public.customer_identifiers enable row level security;
alter table public.event_types enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_alternate_dates enable row level security;
alter table public.opportunity_service_interests enable row level security;
alter table public.opportunity_proposals enable row level security;
alter table public.crm_activities enable row level security;
alter table public.tasks enable row level security;
alter table public.visits enable row level security;

create policy customers_select_scoped
on public.customers for select to authenticated
using (private.can_access_customer(id));

create policy customers_insert_scoped
on public.customers for insert to authenticated
with check (
  organization_id = private.current_organization_id()
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and (
    private.is_crm_admin(organization_id)
    or (
      private.is_crm_commercial(organization_id)
      and assigned_to = (select auth.uid())
    )
  )
);

create policy customers_update_scoped
on public.customers for update to authenticated
using (private.can_access_customer(id))
with check (
  organization_id = private.current_organization_id()
  and updated_by = (select auth.uid())
  and private.can_access_customer(id)
);

create policy customer_identifiers_select_scoped
on public.customer_identifiers for select to authenticated
using (private.can_access_customer(customer_id));

create policy customer_identifiers_insert_scoped
on public.customer_identifiers for insert to authenticated
with check (
  organization_id = private.current_organization_id()
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and private.can_access_customer(customer_id)
);

create policy customer_identifiers_update_scoped
on public.customer_identifiers for update to authenticated
using (private.can_access_customer(customer_id))
with check (
  organization_id = private.current_organization_id()
  and updated_by = (select auth.uid())
  and private.can_access_customer(customer_id)
);

create policy event_types_select_crm
on public.event_types for select to authenticated
using (
  organization_id = private.current_organization_id()
  and private.has_any_role(
    array['SUPERADMIN', 'ADMINISTRADOR', 'COMERCIAL']::public.app_role[]
  )
);

create policy event_types_insert_admin
on public.event_types for insert to authenticated
with check (
  private.is_crm_admin(organization_id)
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy event_types_update_admin
on public.event_types for update to authenticated
using (private.is_crm_admin(organization_id))
with check (
  private.is_crm_admin(organization_id)
  and updated_by = (select auth.uid())
);

create policy opportunities_select_scoped
on public.opportunities for select to authenticated
using (private.can_access_opportunity(id));

create policy opportunities_insert_scoped
on public.opportunities for insert to authenticated
with check (
  organization_id = private.current_organization_id()
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and private.can_access_customer(customer_id)
  and (
    private.is_crm_admin(organization_id)
    or (
      private.is_crm_commercial(organization_id)
      and assigned_to = (select auth.uid())
    )
  )
);

create policy opportunities_update_scoped
on public.opportunities for update to authenticated
using (private.can_access_opportunity(id))
with check (
  organization_id = private.current_organization_id()
  and updated_by = (select auth.uid())
  and private.can_access_opportunity(id)
);

create policy opportunity_alternate_dates_select_scoped
on public.opportunity_alternate_dates for select to authenticated
using (private.can_access_opportunity(opportunity_id));

create policy opportunity_alternate_dates_insert_scoped
on public.opportunity_alternate_dates for insert to authenticated
with check (
  organization_id = private.current_organization_id()
  and created_by = (select auth.uid())
  and private.can_access_opportunity(opportunity_id)
);

create policy opportunity_alternate_dates_update_scoped
on public.opportunity_alternate_dates for update to authenticated
using (private.can_access_opportunity(opportunity_id))
with check (
  organization_id = private.current_organization_id()
  and private.can_access_opportunity(opportunity_id)
);

create policy opportunity_service_interests_select_scoped
on public.opportunity_service_interests for select to authenticated
using (private.can_access_opportunity(opportunity_id));

create policy opportunity_service_interests_insert_scoped
on public.opportunity_service_interests for insert to authenticated
with check (
  organization_id = private.current_organization_id()
  and created_by = (select auth.uid())
  and private.can_access_opportunity(opportunity_id)
);

create policy opportunity_service_interests_update_scoped
on public.opportunity_service_interests for update to authenticated
using (private.can_access_opportunity(opportunity_id))
with check (
  organization_id = private.current_organization_id()
  and private.can_access_opportunity(opportunity_id)
);

create policy opportunity_proposals_select_scoped
on public.opportunity_proposals for select to authenticated
using (private.can_access_opportunity(opportunity_id));

create policy opportunity_proposals_insert_scoped
on public.opportunity_proposals for insert to authenticated
with check (
  organization_id = private.current_organization_id()
  and recorded_by = (select auth.uid())
  and private.can_access_opportunity(opportunity_id)
);

create policy crm_activities_select_scoped
on public.crm_activities for select to authenticated
using (
  case
    when opportunity_id is null then private.can_access_customer(customer_id)
    else private.can_access_opportunity(opportunity_id)
  end
);

create policy crm_activities_insert_scoped
on public.crm_activities for insert to authenticated
with check (
  organization_id = private.current_organization_id()
  and author_id = (select auth.uid())
  and (
    case
      when opportunity_id is null then private.can_access_customer(customer_id)
      else private.can_access_opportunity(opportunity_id)
    end
  )
);

create policy tasks_select_scoped
on public.tasks for select to authenticated
using (
  organization_id = private.current_organization_id()
  and (
    private.is_crm_admin(organization_id)
    or (
      private.is_crm_commercial(organization_id)
      and assignee_id = (select auth.uid())
    )
  )
);

create policy tasks_insert_scoped
on public.tasks for insert to authenticated
with check (
  organization_id = private.current_organization_id()
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and private.can_access_customer(customer_id)
  and (
    opportunity_id is null
    or private.can_access_opportunity(opportunity_id)
  )
  and (
    private.is_crm_admin(organization_id)
    or (
      private.is_crm_commercial(organization_id)
      and assignee_id = (select auth.uid())
    )
  )
);

create policy tasks_update_scoped
on public.tasks for update to authenticated
using (
  organization_id = private.current_organization_id()
  and (
    private.is_crm_admin(organization_id)
    or (
      private.is_crm_commercial(organization_id)
      and assignee_id = (select auth.uid())
    )
  )
)
with check (
  organization_id = private.current_organization_id()
  and updated_by = (select auth.uid())
  and (
    private.is_crm_admin(organization_id)
    or (
      private.is_crm_commercial(organization_id)
      and assignee_id = (select auth.uid())
    )
  )
);

create policy visits_select_scoped
on public.visits for select to authenticated
using (
  organization_id = private.current_organization_id()
  and (
    private.is_crm_admin(organization_id)
    or (
      private.is_crm_commercial(organization_id)
      and staff_id = (select auth.uid())
    )
  )
);

create policy visits_insert_scoped
on public.visits for insert to authenticated
with check (
  organization_id = private.current_organization_id()
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and private.can_access_opportunity(opportunity_id)
  and (
    private.is_crm_admin(organization_id)
    or (
      private.is_crm_commercial(organization_id)
      and staff_id = (select auth.uid())
    )
  )
);

create policy visits_update_scoped
on public.visits for update to authenticated
using (
  organization_id = private.current_organization_id()
  and (
    private.is_crm_admin(organization_id)
    or (
      private.is_crm_commercial(organization_id)
      and staff_id = (select auth.uid())
    )
  )
)
with check (
  organization_id = private.current_organization_id()
  and updated_by = (select auth.uid())
  and (
    private.is_crm_admin(organization_id)
    or (
      private.is_crm_commercial(organization_id)
      and staff_id = (select auth.uid())
    )
  )
);

revoke all on public.customers from anon, authenticated;
revoke all on public.customer_identifiers from anon, authenticated;
revoke all on public.event_types from anon, authenticated;
revoke all on public.opportunities from anon, authenticated;
revoke all on public.opportunity_alternate_dates from anon, authenticated;
revoke all on public.opportunity_service_interests from anon, authenticated;
revoke all on public.opportunity_proposals from anon, authenticated;
revoke all on public.crm_activities from anon, authenticated;
revoke all on public.tasks from anon, authenticated;
revoke all on public.visits from anon, authenticated;
revoke all on private.opportunity_counters from public, anon, authenticated;
revoke all on private.crm_idempotency_keys from public, anon, authenticated;

-- Reads stay behind RLS. All writes are intentionally exposed only through
-- the guarded transactional RPCs below.
grant select on public.customers to authenticated;
grant select on public.customer_identifiers to authenticated;
grant select on public.event_types to authenticated;
grant select on public.opportunities to authenticated;
grant select on public.opportunity_alternate_dates to authenticated;
grant select on public.opportunity_service_interests to authenticated;
grant select on public.opportunity_proposals to authenticated;
grant select on public.crm_activities to authenticated;
grant select on public.tasks to authenticated;
grant select on public.visits to authenticated;

create or replace function public.find_customer_matches(p_phone_e164 text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
  v_matches jsonb;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not private.has_any_role(
    array['SUPERADMIN', 'ADMINISTRADOR', 'COMERCIAL']::public.app_role[]
  ) then
    raise exception 'CRM access denied' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', matches.id,
        'full_name', matches.full_name,
        'masked_phone',
          left(matches.phone_e164, 3)
          || repeat('*', greatest(char_length(matches.phone_e164) - 6, 3))
          || right(matches.phone_e164, 3)
      ) order by matches.created_at desc
    ),
    '[]'::jsonb
  )
  into v_matches
  from (
    select c.id, c.full_name, c.phone_e164, c.created_at
    from public.customers as c
    where c.organization_id = v_organization_id
      and c.phone_e164 = btrim(p_phone_e164)
      and c.archived_at is null
      and private.can_access_customer(c.id)
    order by c.created_at desc
    limit 10
  ) as matches;

  return jsonb_build_object('matches', v_matches);
end;
$$;

create or replace function public.create_crm_intake(
  p_full_name text,
  p_phone_e164 text,
  p_customer_type public.customer_type,
  p_assigned_to uuid,
  p_event_type_id uuid default null,
  p_desired_date date default null,
  p_guests_total integer default null,
  p_modality public.event_modality default null,
  p_source public.lead_source default 'otro',
  p_existing_customer_id uuid default null,
  p_customer jsonb default '{}'::jsonb,
  p_opportunity jsonb default '{}'::jsonb,
  p_alternate_dates jsonb default '[]'::jsonb,
  p_service_interests jsonb default '[]'::jsonb,
  p_proposal jsonb default null,
  p_first_task jsonb default null,
  p_first_visit jsonb default null,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
  v_assignee uuid;
  v_customer_id uuid;
  v_opportunity_id uuid;
  v_opportunity_code text;
  v_task_id uuid;
  v_visit_id uuid;
  v_task_assignee uuid;
  v_visit_staff uuid;
  v_cached jsonb;
  v_match_response jsonb;
  v_matches jsonb;
  v_response jsonb;
  v_item text;
  v_rank smallint := 0;
  v_marketing_consent boolean;
  v_document_type text;
  v_document_number text;
  v_duplicate_override_reason text;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not private.has_any_role(
    array['SUPERADMIN', 'ADMINISTRADOR', 'COMERCIAL']::public.app_role[]
  ) then
    raise exception 'CRM access denied' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_customer, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_opportunity, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_alternate_dates, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_service_interests, '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid CRM intake payload' using errcode = '22023';
  end if;

  if p_proposal is not null and jsonb_typeof(p_proposal) <> 'object' then
    raise exception 'Proposal payload must be an object' using errcode = '22023';
  end if;

  if p_first_task is not null and jsonb_typeof(p_first_task) <> 'object' then
    raise exception 'First task payload must be an object' using errcode = '22023';
  end if;

  if p_first_visit is not null and jsonb_typeof(p_first_visit) <> 'object' then
    raise exception 'First visit payload must be an object' using errcode = '22023';
  end if;

  v_assignee := coalesce(p_assigned_to, v_actor);
  v_duplicate_override_reason := nullif(
    btrim(p_customer ->> 'duplicate_override_reason'),
    ''
  );

  if v_duplicate_override_reason is not null
    and char_length(v_duplicate_override_reason) > 1000 then
    raise exception 'Duplicate override reason is too long' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles as p
    join public.user_roles as ur
      on ur.user_id = p.user_id
     and ur.organization_id = p.organization_id
    where p.user_id = v_assignee
      and p.organization_id = v_organization_id
      and p.status = 'active'
      and ur.role in ('SUPERADMIN', 'ADMINISTRADOR', 'COMERCIAL')
  ) then
    raise exception 'Assigned adviser is not active in this organization'
      using errcode = '23503';
  end if;

  if private.is_crm_commercial(v_organization_id)
    and not private.is_crm_admin(v_organization_id)
    and v_assignee <> v_actor then
    raise exception 'Commercial users may only assign records to themselves'
      using errcode = '42501';
  end if;

  if p_event_type_id is not null and not exists (
    select 1
    from public.event_types as et
    where et.id = p_event_type_id
      and et.organization_id = v_organization_id
      and et.active
  ) then
    raise exception 'Event type is not active in this organization'
      using errcode = '23503';
  end if;

  if jsonb_array_length(coalesce(p_alternate_dates, '[]'::jsonb)) > 3 then
    raise exception 'At most three alternate dates are allowed'
      using errcode = '23514';
  end if;

  v_cached := private.claim_crm_idempotency(
    v_organization_id,
    v_actor,
    'create_crm_intake',
    p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;

  if p_existing_customer_id is null then
    v_match_response := public.find_customer_matches(p_phone_e164);
    v_matches := v_match_response -> 'matches';

    if jsonb_array_length(v_matches) > 0
      and v_duplicate_override_reason is null then
      v_response := jsonb_build_object(
        'requires_customer_choice', true,
        'matches', v_matches
      );
      perform private.complete_crm_idempotency(
        v_organization_id,
        v_actor,
        'create_crm_intake',
        p_idempotency_key,
        v_response
      );
      return v_response;
    end if;

    v_marketing_consent := coalesce(
      (p_customer ->> 'marketing_consent')::boolean,
      false
    );

    insert into public.customers (
      organization_id,
      full_name,
      customer_type,
      phone_e164,
      secondary_phone_e164,
      email,
      affiliation_name,
      district,
      city,
      preferred_contact_channel,
      marketing_consent,
      marketing_consent_at,
      marketing_consent_text_version,
      internal_notes,
      assigned_to,
      created_by,
      updated_by
    ) values (
      v_organization_id,
      btrim(p_full_name),
      p_customer_type,
      btrim(p_phone_e164),
      nullif(btrim(p_customer ->> 'secondary_phone_e164'), ''),
      nullif(lower(btrim(p_customer ->> 'email')), ''),
      nullif(btrim(p_customer ->> 'affiliation_name'), ''),
      nullif(btrim(p_customer ->> 'district'), ''),
      nullif(btrim(p_customer ->> 'city'), ''),
      nullif(p_customer ->> 'preferred_contact_channel', '')::public.contact_channel,
      v_marketing_consent,
      case
        when v_marketing_consent then coalesce(
          nullif(p_customer ->> 'marketing_consent_at', '')::timestamptz,
          now()
        )
        else null
      end,
      case
        when v_marketing_consent
          then nullif(btrim(p_customer ->> 'marketing_consent_text_version'), '')
        else null
      end,
      nullif(btrim(p_customer ->> 'internal_notes'), ''),
      v_assignee,
      v_actor,
      v_actor
    )
    returning id into v_customer_id;

    v_document_type := nullif(upper(btrim(p_customer ->> 'document_type')), '');
    v_document_number := nullif(
      upper(regexp_replace(
        coalesce(p_customer ->> 'document_number', ''),
        '[^A-Za-z0-9-]',
        '',
        'g'
      )),
      ''
    );

    if (v_document_type is null) <> (v_document_number is null) then
      raise exception 'Document type and number must be supplied together'
        using errcode = '22023';
    end if;

    if v_document_type is not null then
      insert into public.customer_identifiers (
        organization_id,
        customer_id,
        document_type,
        document_number_normalized,
        created_by,
        updated_by
      ) values (
        v_organization_id,
        v_customer_id,
        v_document_type,
        v_document_number,
        v_actor,
        v_actor
      );
    end if;
  else
    select c.id
    into v_customer_id
    from public.customers as c
    where c.id = p_existing_customer_id
      and c.organization_id = v_organization_id
      and c.archived_at is null
      and private.can_access_customer(c.id);

    if v_customer_id is null then
      raise exception 'Customer not found or not visible'
        using errcode = 'P0002';
    end if;
  end if;

  insert into public.opportunities (
    organization_id,
    opportunity_code,
    customer_id,
    event_type_id,
    assigned_to,
    pipeline_status,
    desired_date,
    tentative_start_time,
    tentative_end_time,
    guests_adults,
    guests_children,
    guests_total,
    modality,
    source,
    source_detail,
    budget_min_cents,
    budget_max_cents,
    currency,
    decision_maker,
    interest_level,
    probability_percent,
    first_contact_at,
    next_action,
    next_action_at,
    likely_visit_at,
    notes,
    created_by,
    updated_by
  ) values (
    v_organization_id,
    null,
    v_customer_id,
    p_event_type_id,
    v_assignee,
    'nuevo',
    p_desired_date,
    nullif(p_opportunity ->> 'tentative_start_time', '')::time,
    nullif(p_opportunity ->> 'tentative_end_time', '')::time,
    nullif(p_opportunity ->> 'guests_adults', '')::integer,
    nullif(p_opportunity ->> 'guests_children', '')::integer,
    p_guests_total,
    p_modality,
    p_source,
    nullif(btrim(p_opportunity ->> 'source_detail'), ''),
    nullif(p_opportunity ->> 'budget_min_cents', '')::bigint,
    nullif(p_opportunity ->> 'budget_max_cents', '')::bigint,
    coalesce(nullif(upper(p_opportunity ->> 'currency'), ''), 'PEN'),
    nullif(btrim(p_opportunity ->> 'decision_maker'), ''),
    nullif(btrim(p_opportunity ->> 'interest_level'), ''),
    nullif(p_opportunity ->> 'probability_percent', '')::numeric,
    coalesce(
      nullif(p_opportunity ->> 'first_contact_at', '')::timestamptz,
      now()
    ),
    nullif(btrim(p_opportunity ->> 'next_action'), ''),
    nullif(p_opportunity ->> 'next_action_at', '')::timestamptz,
    nullif(p_opportunity ->> 'likely_visit_at', '')::timestamptz,
    nullif(btrim(p_opportunity ->> 'notes'), ''),
    v_actor,
    v_actor
  )
  returning id, opportunity_code
  into v_opportunity_id, v_opportunity_code;

  for v_item in
    select value from jsonb_array_elements_text(coalesce(p_alternate_dates, '[]'::jsonb))
  loop
    v_rank := v_rank + 1;
    if v_item::date = p_desired_date then
      raise exception 'Alternate date cannot repeat the primary date'
        using errcode = '23514';
    end if;

    insert into public.opportunity_alternate_dates (
      organization_id,
      opportunity_id,
      rank,
      desired_date,
      created_by
    ) values (
      v_organization_id,
      v_opportunity_id,
      v_rank,
      v_item::date,
      v_actor
    );
  end loop;

  for v_item in
    select value from jsonb_array_elements_text(coalesce(p_service_interests, '[]'::jsonb))
  loop
    if nullif(btrim(v_item), '') is null then
      raise exception 'Service interest cannot be blank' using errcode = '22023';
    end if;

    insert into public.opportunity_service_interests (
      organization_id,
      opportunity_id,
      service_label,
      created_by
    ) values (
      v_organization_id,
      v_opportunity_id,
      btrim(v_item),
      v_actor
    );
  end loop;

  if p_proposal is not null then
    insert into public.opportunity_proposals (
      organization_id,
      opportunity_id,
      services_summary,
      amount_cents,
      currency,
      notes,
      recorded_by
    ) values (
      v_organization_id,
      v_opportunity_id,
      nullif(btrim(p_proposal ->> 'services_summary'), ''),
      nullif(p_proposal ->> 'amount_cents', '')::bigint,
      coalesce(nullif(upper(p_proposal ->> 'currency'), ''), 'PEN'),
      nullif(btrim(p_proposal ->> 'notes'), ''),
      v_actor
    );
  end if;

  insert into public.crm_activities (
    organization_id,
    customer_id,
    opportunity_id,
    author_id,
    kind,
    description
  ) values (
    v_organization_id,
    v_customer_id,
    v_opportunity_id,
    v_actor,
    'sistema',
    'Prospecto registrado'
  );

  if v_duplicate_override_reason is not null then
    insert into public.crm_activities (
      organization_id,
      customer_id,
      opportunity_id,
      author_id,
      kind,
      description
    ) values (
      v_organization_id,
      v_customer_id,
      v_opportunity_id,
      v_actor,
      'sistema',
      'Ficha separada pese a coincidencia de teléfono. Motivo: '
        || v_duplicate_override_reason
    );
  end if;

  if p_first_task is not null then
    v_task_assignee := coalesce(
      nullif(p_first_task ->> 'assignee_id', '')::uuid,
      v_assignee
    );

    if not exists (
      select 1
      from public.profiles as p
      where p.user_id = v_task_assignee
        and p.organization_id = v_organization_id
        and p.status = 'active'
    ) then
      raise exception 'Task assignee is not active in this organization'
        using errcode = '23503';
    end if;

    if private.is_crm_commercial(v_organization_id)
      and not private.is_crm_admin(v_organization_id)
      and v_task_assignee <> v_actor then
      raise exception 'Commercial users may only assign tasks to themselves'
        using errcode = '42501';
    end if;

    insert into public.tasks (
      organization_id,
      customer_id,
      opportunity_id,
      assignee_id,
      type,
      title,
      description,
      due_at,
      priority,
      created_by,
      updated_by
    ) values (
      v_organization_id,
      v_customer_id,
      v_opportunity_id,
      v_task_assignee,
      (p_first_task ->> 'type')::public.task_type,
      btrim(p_first_task ->> 'title'),
      nullif(btrim(p_first_task ->> 'description'), ''),
      (p_first_task ->> 'due_at')::timestamptz,
      coalesce(
        nullif(p_first_task ->> 'priority', '')::public.task_priority,
        'media'
      ),
      v_actor,
      v_actor
    ) returning id into v_task_id;
  end if;

  if p_first_visit is not null then
    v_visit_staff := coalesce(
      nullif(p_first_visit ->> 'staff_id', '')::uuid,
      v_assignee
    );

    if not exists (
      select 1
      from public.profiles as p
      where p.user_id = v_visit_staff
        and p.organization_id = v_organization_id
        and p.status = 'active'
    ) then
      raise exception 'Visit staff member is not active in this organization'
        using errcode = '23503';
    end if;

    if private.is_crm_commercial(v_organization_id)
      and not private.is_crm_admin(v_organization_id)
      and v_visit_staff <> v_actor then
      raise exception 'Commercial users may only assign visits to themselves'
        using errcode = '42501';
    end if;

    insert into public.visits (
      organization_id,
      customer_id,
      opportunity_id,
      staff_id,
      start_at,
      end_at,
      participants_count,
      mode,
      notes,
      created_by,
      updated_by
    ) values (
      v_organization_id,
      v_customer_id,
      v_opportunity_id,
      v_visit_staff,
      (p_first_visit ->> 'start_at')::timestamptz,
      (p_first_visit ->> 'end_at')::timestamptz,
      nullif(p_first_visit ->> 'participants_count', '')::integer,
      coalesce(
        nullif(p_first_visit ->> 'mode', '')::public.visit_mode,
        'presencial'
      ),
      nullif(btrim(p_first_visit ->> 'notes'), ''),
      v_actor,
      v_actor
    ) returning id into v_visit_id;
  end if;

  v_response := jsonb_build_object(
    'requires_customer_choice', false,
    'customer_id', v_customer_id,
    'opportunity_id', v_opportunity_id,
    'opportunity_code', v_opportunity_code,
    'task_id', v_task_id,
    'visit_id', v_visit_id
  );

  perform private.complete_crm_idempotency(
    v_organization_id,
    v_actor,
    'create_crm_intake',
    p_idempotency_key,
    v_response
  );
  return v_response;
end;
$$;

create or replace function public.transition_opportunity(
  p_opportunity_id uuid,
  p_new_stage public.opportunity_stage,
  p_reason text default null,
  p_expected_updated_at timestamptz default null,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
  v_old public.opportunities%rowtype;
  v_updated_at timestamptz;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'transition_opportunity:' || p_opportunity_id::text;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.can_access_opportunity(p_opportunity_id) then
    raise exception 'Opportunity not found or not visible' using errcode = 'P0002';
  end if;
  if p_new_stage = 'ganado' then
    raise exception 'A confirmed booking is required before marking an opportunity as won'
      using errcode = '23514';
  end if;
  if p_new_stage in ('perdido', 'descartado')
    and nullif(btrim(p_reason), '') is null then
    raise exception 'A close reason is required' using errcode = '23514';
  end if;

  v_cached := private.claim_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;

  select * into v_old
  from public.opportunities
  where id = p_opportunity_id
    and organization_id = v_organization_id
  for update;

  if v_old.id is null then
    raise exception 'Opportunity not found' using errcode = 'P0002';
  end if;

  if v_old.pipeline_status = p_new_stage then
    v_response := jsonb_build_object(
      'opportunity_id', v_old.id,
      'pipeline_status', v_old.pipeline_status,
      'updated_at', v_old.updated_at
    );
    perform private.complete_crm_idempotency(
      v_organization_id, v_actor, v_operation, p_idempotency_key, v_response
    );
    return v_response;
  end if;

  perform set_config('kairos.crm_stage_transition', 'on', true);
  update public.opportunities
  set pipeline_status = p_new_stage,
      close_reason = case
        when p_new_stage in ('perdido', 'descartado') then btrim(p_reason)
        else null
      end,
      closed_at = case
        when p_new_stage in ('perdido', 'descartado') then now()
        else null
      end,
      updated_by = v_actor
  where id = p_opportunity_id
    and organization_id = v_organization_id
    and (
      p_expected_updated_at is null
      or updated_at = p_expected_updated_at
    )
  returning updated_at into v_updated_at;

  if v_updated_at is null then
    raise exception 'Opportunity was changed by another user'
      using errcode = '40001';
  end if;

  insert into public.crm_activities (
    organization_id,
    customer_id,
    opportunity_id,
    author_id,
    kind,
    description
  ) values (
    v_organization_id,
    v_old.customer_id,
    v_old.id,
    v_actor,
    'cambio_etapa',
    'Etapa cambiada de '
      || v_old.pipeline_status::text
      || ' a '
      || p_new_stage::text
      || case
        when nullif(btrim(p_reason), '') is null then ''
        else '. Motivo: ' || btrim(p_reason)
      end
  );

  v_response := jsonb_build_object(
    'opportunity_id', v_old.id,
    'pipeline_status', p_new_stage,
    'updated_at', v_updated_at
  );
  perform private.complete_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.create_crm_activity(
  p_customer_id uuid,
  p_opportunity_id uuid,
  p_kind public.crm_activity_kind,
  p_description text,
  p_occurred_at timestamptz default now(),
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
  v_activity_id uuid;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'create_crm_activity:' || coalesce(p_opportunity_id, p_customer_id)::text;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if nullif(btrim(p_description), '') is null then
    raise exception 'Activity description is required' using errcode = '22023';
  end if;

  if p_opportunity_id is null then
    if not private.can_access_customer(p_customer_id) then
      raise exception 'Customer not found or not visible' using errcode = 'P0002';
    end if;
  elsif not exists (
    select 1
    from public.opportunities as o
    where o.id = p_opportunity_id
      and o.customer_id = p_customer_id
      and o.organization_id = v_organization_id
      and private.can_access_opportunity(o.id)
  ) then
    raise exception 'Opportunity not found or does not belong to the customer'
      using errcode = 'P0002';
  end if;

  v_cached := private.claim_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;

  insert into public.crm_activities (
    organization_id,
    customer_id,
    opportunity_id,
    author_id,
    kind,
    description,
    occurred_at
  ) values (
    v_organization_id,
    p_customer_id,
    p_opportunity_id,
    v_actor,
    p_kind,
    btrim(p_description),
    coalesce(p_occurred_at, now())
  ) returning id into v_activity_id;

  v_response := jsonb_build_object('activity_id', v_activity_id);
  perform private.complete_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.create_crm_task(
  p_customer_id uuid,
  p_opportunity_id uuid,
  p_type public.task_type,
  p_title text,
  p_due_at timestamptz,
  p_assignee_id uuid default null,
  p_description text default null,
  p_priority public.task_priority default 'media',
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
  v_assignee uuid := coalesce(p_assignee_id, auth.uid());
  v_task_id uuid;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'create_crm_task:' || coalesce(p_opportunity_id, p_customer_id)::text;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if nullif(btrim(p_title), '') is null or p_due_at is null then
    raise exception 'Task title and due date are required' using errcode = '22023';
  end if;
  if not private.can_access_customer(p_customer_id) then
    raise exception 'Customer not found or not visible' using errcode = 'P0002';
  end if;
  if p_opportunity_id is not null and not exists (
    select 1
    from public.opportunities as o
    where o.id = p_opportunity_id
      and o.customer_id = p_customer_id
      and o.organization_id = v_organization_id
      and private.can_access_opportunity(o.id)
  ) then
    raise exception 'Opportunity not found or does not belong to the customer'
      using errcode = 'P0002';
  end if;
  if not exists (
    select 1
    from public.profiles as p
    where p.user_id = v_assignee
      and p.organization_id = v_organization_id
      and p.status = 'active'
  ) then
    raise exception 'Task assignee is not active in this organization'
      using errcode = '23503';
  end if;
  if private.is_crm_commercial(v_organization_id)
    and not private.is_crm_admin(v_organization_id)
    and v_assignee <> v_actor then
    raise exception 'Commercial users may only assign tasks to themselves'
      using errcode = '42501';
  end if;

  v_cached := private.claim_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;

  insert into public.tasks (
    organization_id,
    customer_id,
    opportunity_id,
    assignee_id,
    type,
    title,
    description,
    due_at,
    priority,
    created_by,
    updated_by
  ) values (
    v_organization_id,
    p_customer_id,
    p_opportunity_id,
    v_assignee,
    p_type,
    btrim(p_title),
    nullif(btrim(p_description), ''),
    p_due_at,
    p_priority,
    v_actor,
    v_actor
  ) returning id into v_task_id;

  insert into public.crm_activities (
    organization_id,
    customer_id,
    opportunity_id,
    author_id,
    kind,
    description
  ) values (
    v_organization_id,
    p_customer_id,
    p_opportunity_id,
    v_actor,
    'tarea',
    'Tarea creada: ' || btrim(p_title)
  );

  v_response := jsonb_build_object('task_id', v_task_id);
  perform private.complete_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.set_crm_task_status(
  p_task_id uuid,
  p_new_status public.task_status,
  p_result text default null,
  p_reason text default null,
  p_next_action text default null,
  p_expected_updated_at timestamptz default null,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
  v_old public.tasks%rowtype;
  v_updated_at timestamptz;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'set_crm_task_status:' || p_task_id::text;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_new_status not in ('en_progreso', 'completada', 'cancelada') then
    raise exception 'Unsupported task transition' using errcode = '22023';
  end if;
  if p_new_status = 'completada' and nullif(btrim(p_result), '') is null then
    raise exception 'A result is required to complete a task' using errcode = '23514';
  end if;
  if p_new_status = 'cancelada' and nullif(btrim(p_reason), '') is null then
    raise exception 'A reason is required to cancel a task' using errcode = '23514';
  end if;

  v_cached := private.claim_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;

  select * into v_old
  from public.tasks
  where id = p_task_id
    and organization_id = v_organization_id
    and (
      private.is_crm_admin(organization_id)
      or (
        private.is_crm_commercial(organization_id)
        and assignee_id = v_actor
      )
    )
  for update;

  if v_old.id is null then
    raise exception 'Task not found or not visible' using errcode = 'P0002';
  end if;
  if v_old.status in ('completada', 'cancelada')
    and v_old.status <> p_new_status then
    raise exception 'A terminal task cannot be reopened'
      using errcode = '23514';
  end if;
  if v_old.status = p_new_status then
    v_response := jsonb_build_object(
      'task_id', v_old.id,
      'status', v_old.status,
      'updated_at', v_old.updated_at
    );
    perform private.complete_crm_idempotency(
      v_organization_id, v_actor, v_operation, p_idempotency_key, v_response
    );
    return v_response;
  end if;

  perform set_config('kairos.crm_task_transition', 'on', true);
  update public.tasks
  set status = p_new_status,
      result = case
        when p_new_status = 'completada' then btrim(p_result)
        else null
      end,
      completion_note = case
        when p_new_status in ('completada', 'cancelada')
          then nullif(btrim(p_reason), '')
        else null
      end,
      next_action = nullif(btrim(p_next_action), ''),
      completed_at = case when p_new_status = 'completada' then now() else null end,
      cancelled_at = case when p_new_status = 'cancelada' then now() else null end,
      updated_by = v_actor
  where id = p_task_id
    and organization_id = v_organization_id
    and (
      p_expected_updated_at is null
      or updated_at = p_expected_updated_at
    )
  returning updated_at into v_updated_at;

  if v_updated_at is null then
    raise exception 'Task was changed by another user' using errcode = '40001';
  end if;

  insert into public.crm_activities (
    organization_id,
    customer_id,
    opportunity_id,
    author_id,
    kind,
    description
  ) values (
    v_organization_id,
    v_old.customer_id,
    v_old.opportunity_id,
    v_actor,
    'tarea',
    'Tarea cambiada de ' || v_old.status::text || ' a ' || p_new_status::text
  );

  v_response := jsonb_build_object(
    'task_id', v_old.id,
    'status', p_new_status,
    'updated_at', v_updated_at
  );
  perform private.complete_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.complete_crm_task(
  p_task_id uuid,
  p_result text,
  p_completion_note text default null,
  p_next_action text default null,
  p_expected_updated_at timestamptz default null,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select public.set_crm_task_status(
    p_task_id,
    'completada',
    p_result,
    p_completion_note,
    p_next_action,
    p_expected_updated_at,
    p_idempotency_key
  )
$$;

create or replace function public.reschedule_crm_task(
  p_task_id uuid,
  p_new_due_at timestamptz,
  p_reason text,
  p_new_assignee_id uuid default null,
  p_expected_updated_at timestamptz default null,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
  v_old public.tasks%rowtype;
  v_assignee uuid;
  v_new_task_id uuid;
  v_original_updated_at timestamptz;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'reschedule_crm_task:' || p_task_id::text;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_new_due_at is null or nullif(btrim(p_reason), '') is null then
    raise exception 'New due date and reason are required' using errcode = '22023';
  end if;

  v_cached := private.claim_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;

  select * into v_old
  from public.tasks
  where id = p_task_id
    and organization_id = v_organization_id
    and (
      private.is_crm_admin(organization_id)
      or (
        private.is_crm_commercial(organization_id)
        and assignee_id = v_actor
      )
    )
  for update;

  if v_old.id is null then
    raise exception 'Task not found or not visible' using errcode = 'P0002';
  end if;
  if v_old.status in ('completada', 'cancelada') then
    raise exception 'A terminal task cannot be rescheduled' using errcode = '23514';
  end if;

  v_assignee := coalesce(p_new_assignee_id, v_old.assignee_id);
  if not exists (
    select 1 from public.profiles as p
    where p.user_id = v_assignee
      and p.organization_id = v_organization_id
      and p.status = 'active'
  ) then
    raise exception 'Task assignee is not active in this organization'
      using errcode = '23503';
  end if;
  if not private.is_crm_admin(v_organization_id) and v_assignee <> v_actor then
    raise exception 'Commercial users may only assign tasks to themselves'
      using errcode = '42501';
  end if;

  perform set_config('kairos.crm_task_transition', 'on', true);
  update public.tasks
  set status = 'cancelada',
      completion_note = 'Reprogramada: ' || btrim(p_reason),
      cancelled_at = now(),
      updated_by = v_actor
  where id = p_task_id
    and organization_id = v_organization_id
    and (
      p_expected_updated_at is null
      or updated_at = p_expected_updated_at
    )
  returning updated_at into v_original_updated_at;

  if v_original_updated_at is null then
    raise exception 'Task was changed by another user' using errcode = '40001';
  end if;

  insert into public.tasks (
    organization_id,
    customer_id,
    opportunity_id,
    assignee_id,
    type,
    title,
    description,
    due_at,
    priority,
    status,
    rescheduled_from_task_id,
    created_by,
    updated_by
  ) values (
    v_organization_id,
    v_old.customer_id,
    v_old.opportunity_id,
    v_assignee,
    v_old.type,
    v_old.title,
    v_old.description,
    p_new_due_at,
    v_old.priority,
    'pendiente',
    v_old.id,
    v_actor,
    v_actor
  ) returning id into v_new_task_id;

  insert into public.crm_activities (
    organization_id, customer_id, opportunity_id, author_id, kind, description
  ) values (
    v_organization_id,
    v_old.customer_id,
    v_old.opportunity_id,
    v_actor,
    'tarea',
    'Tarea reprogramada. Motivo: ' || btrim(p_reason)
  );

  v_response := jsonb_build_object(
    'previous_task_id', v_old.id,
    'task_id', v_new_task_id
  );
  perform private.complete_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.create_crm_visit(
  p_customer_id uuid,
  p_opportunity_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_mode public.visit_mode default 'presencial',
  p_staff_id uuid default null,
  p_participants_count integer default null,
  p_notes text default null,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
  v_staff uuid := coalesce(p_staff_id, auth.uid());
  v_visit_id uuid;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'create_crm_visit:' || p_opportunity_id::text;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
    raise exception 'Visit end must be after its start' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.opportunities as o
    where o.id = p_opportunity_id
      and o.customer_id = p_customer_id
      and o.organization_id = v_organization_id
      and private.can_access_opportunity(o.id)
  ) then
    raise exception 'Opportunity not found or does not belong to the customer'
      using errcode = 'P0002';
  end if;
  if not exists (
    select 1
    from public.profiles as p
    join public.user_roles as ur
      on ur.user_id = p.user_id
     and ur.organization_id = p.organization_id
    where p.user_id = v_staff
      and p.organization_id = v_organization_id
      and p.status = 'active'
      and ur.role in ('SUPERADMIN', 'ADMINISTRADOR', 'COMERCIAL')
  ) then
    raise exception 'Visit staff member is not active in this organization'
      using errcode = '23503';
  end if;
  if private.is_crm_commercial(v_organization_id)
    and not private.is_crm_admin(v_organization_id)
    and v_staff <> v_actor then
    raise exception 'Commercial users may only assign visits to themselves'
      using errcode = '42501';
  end if;

  v_cached := private.claim_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;

  insert into public.visits (
    organization_id,
    customer_id,
    opportunity_id,
    staff_id,
    start_at,
    end_at,
    participants_count,
    mode,
    notes,
    created_by,
    updated_by
  ) values (
    v_organization_id,
    p_customer_id,
    p_opportunity_id,
    v_staff,
    p_start_at,
    p_end_at,
    p_participants_count,
    p_mode,
    nullif(btrim(p_notes), ''),
    v_actor,
    v_actor
  ) returning id into v_visit_id;

  insert into public.crm_activities (
    organization_id, customer_id, opportunity_id, author_id, kind, description
  ) values (
    v_organization_id,
    p_customer_id,
    p_opportunity_id,
    v_actor,
    'visita',
    'Visita programada'
  );

  v_response := jsonb_build_object('visit_id', v_visit_id);
  perform private.complete_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.set_crm_visit_status(
  p_visit_id uuid,
  p_new_status public.visit_status,
  p_outcome text default null,
  p_next_steps text default null,
  p_expected_updated_at timestamptz default null,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
  v_old public.visits%rowtype;
  v_updated_at timestamptz;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'set_crm_visit_status:' || p_visit_id::text;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_new_status not in ('realizada', 'no_asistio', 'cancelada') then
    raise exception 'Use reschedule_crm_visit for reprogramming'
      using errcode = '22023';
  end if;
  if p_new_status = 'realizada' and nullif(btrim(p_outcome), '') is null then
    raise exception 'An outcome is required to complete a visit'
      using errcode = '23514';
  end if;

  v_cached := private.claim_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;

  select * into v_old
  from public.visits
  where id = p_visit_id
    and organization_id = v_organization_id
    and (
      private.is_crm_admin(organization_id)
      or (
        private.is_crm_commercial(organization_id)
        and staff_id = v_actor
      )
    )
  for update;

  if v_old.id is null then
    raise exception 'Visit not found or not visible' using errcode = 'P0002';
  end if;
  if v_old.status <> 'programada' and v_old.status <> p_new_status then
    raise exception 'A resolved visit cannot change state'
      using errcode = '23514';
  end if;
  if v_old.status = p_new_status then
    v_response := jsonb_build_object(
      'visit_id', v_old.id,
      'status', v_old.status,
      'updated_at', v_old.updated_at
    );
    perform private.complete_crm_idempotency(
      v_organization_id, v_actor, v_operation, p_idempotency_key, v_response
    );
    return v_response;
  end if;

  perform set_config('kairos.crm_visit_transition', 'on', true);
  update public.visits
  set status = p_new_status,
      outcome = nullif(btrim(p_outcome), ''),
      next_steps = nullif(btrim(p_next_steps), ''),
      resolved_at = now(),
      updated_by = v_actor
  where id = p_visit_id
    and organization_id = v_organization_id
    and (
      p_expected_updated_at is null
      or updated_at = p_expected_updated_at
    )
  returning updated_at into v_updated_at;

  if v_updated_at is null then
    raise exception 'Visit was changed by another user' using errcode = '40001';
  end if;

  insert into public.crm_activities (
    organization_id, customer_id, opportunity_id, author_id, kind, description
  ) values (
    v_organization_id,
    v_old.customer_id,
    v_old.opportunity_id,
    v_actor,
    'visita',
    'Visita cambiada de ' || v_old.status::text || ' a ' || p_new_status::text
  );

  v_response := jsonb_build_object(
    'visit_id', v_old.id,
    'status', p_new_status,
    'updated_at', v_updated_at
  );
  perform private.complete_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

create or replace function public.reschedule_crm_visit(
  p_visit_id uuid,
  p_new_start_at timestamptz,
  p_new_end_at timestamptz,
  p_reason text,
  p_new_staff_id uuid default null,
  p_mode public.visit_mode default null,
  p_notes text default null,
  p_expected_updated_at timestamptz default null,
  p_idempotency_key uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid := private.current_organization_id();
  v_old public.visits%rowtype;
  v_staff uuid;
  v_new_visit_id uuid;
  v_original_updated_at timestamptz;
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'reschedule_crm_visit:' || p_visit_id::text;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_new_start_at is null
    or p_new_end_at is null
    or p_new_end_at <= p_new_start_at
    or nullif(btrim(p_reason), '') is null then
    raise exception 'Valid new times and a reason are required'
      using errcode = '22023';
  end if;

  v_cached := private.claim_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;

  select * into v_old
  from public.visits
  where id = p_visit_id
    and organization_id = v_organization_id
    and (
      private.is_crm_admin(organization_id)
      or (
        private.is_crm_commercial(organization_id)
        and staff_id = v_actor
      )
    )
  for update;

  if v_old.id is null then
    raise exception 'Visit not found or not visible' using errcode = 'P0002';
  end if;
  if v_old.status <> 'programada' then
    raise exception 'Only a scheduled visit can be rescheduled'
      using errcode = '23514';
  end if;

  v_staff := coalesce(p_new_staff_id, v_old.staff_id);
  if not exists (
    select 1 from public.profiles as p
    where p.user_id = v_staff
      and p.organization_id = v_organization_id
      and p.status = 'active'
  ) then
    raise exception 'Visit staff member is not active in this organization'
      using errcode = '23503';
  end if;
  if not private.is_crm_admin(v_organization_id) and v_staff <> v_actor then
    raise exception 'Commercial users may only assign visits to themselves'
      using errcode = '42501';
  end if;

  perform set_config('kairos.crm_visit_transition', 'on', true);
  update public.visits
  set status = 'reprogramada',
      outcome = 'Reprogramada: ' || btrim(p_reason),
      resolved_at = now(),
      updated_by = v_actor
  where id = p_visit_id
    and organization_id = v_organization_id
    and (
      p_expected_updated_at is null
      or updated_at = p_expected_updated_at
    )
  returning updated_at into v_original_updated_at;

  if v_original_updated_at is null then
    raise exception 'Visit was changed by another user' using errcode = '40001';
  end if;

  insert into public.visits (
    organization_id,
    customer_id,
    opportunity_id,
    staff_id,
    start_at,
    end_at,
    participants_count,
    mode,
    status,
    notes,
    rescheduled_from_visit_id,
    created_by,
    updated_by
  ) values (
    v_organization_id,
    v_old.customer_id,
    v_old.opportunity_id,
    v_staff,
    p_new_start_at,
    p_new_end_at,
    v_old.participants_count,
    coalesce(p_mode, v_old.mode),
    'programada',
    coalesce(nullif(btrim(p_notes), ''), v_old.notes),
    v_old.id,
    v_actor,
    v_actor
  ) returning id into v_new_visit_id;

  insert into public.crm_activities (
    organization_id, customer_id, opportunity_id, author_id, kind, description
  ) values (
    v_organization_id,
    v_old.customer_id,
    v_old.opportunity_id,
    v_actor,
    'visita',
    'Visita reprogramada. Motivo: ' || btrim(p_reason)
  );

  v_response := jsonb_build_object(
    'previous_visit_id', v_old.id,
    'visit_id', v_new_visit_id
  );
  perform private.complete_crm_idempotency(
    v_organization_id, v_actor, v_operation, p_idempotency_key, v_response
  );
  return v_response;
end;
$$;

revoke all on function public.find_customer_matches(text)
  from public, anon, authenticated;
revoke all on function public.create_crm_intake(
  text,
  text,
  public.customer_type,
  uuid,
  uuid,
  date,
  integer,
  public.event_modality,
  public.lead_source,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  uuid
) from public, anon, authenticated;
revoke all on function public.transition_opportunity(
  uuid, public.opportunity_stage, text, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function public.create_crm_activity(
  uuid, uuid, public.crm_activity_kind, text, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function public.create_crm_task(
  uuid,
  uuid,
  public.task_type,
  text,
  timestamptz,
  uuid,
  text,
  public.task_priority,
  uuid
) from public, anon, authenticated;
revoke all on function public.set_crm_task_status(
  uuid, public.task_status, text, text, text, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function public.complete_crm_task(
  uuid, text, text, text, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function public.reschedule_crm_task(
  uuid, timestamptz, text, uuid, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function public.create_crm_visit(
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  public.visit_mode,
  uuid,
  integer,
  text,
  uuid
) from public, anon, authenticated;
revoke all on function public.set_crm_visit_status(
  uuid, public.visit_status, text, text, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function public.reschedule_crm_visit(
  uuid,
  timestamptz,
  timestamptz,
  text,
  uuid,
  public.visit_mode,
  text,
  timestamptz,
  uuid
) from public, anon, authenticated;

grant execute on function public.find_customer_matches(text)
  to authenticated;
grant execute on function public.create_crm_intake(
  text,
  text,
  public.customer_type,
  uuid,
  uuid,
  date,
  integer,
  public.event_modality,
  public.lead_source,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  uuid
) to authenticated;
grant execute on function public.transition_opportunity(
  uuid, public.opportunity_stage, text, timestamptz, uuid
) to authenticated;
grant execute on function public.create_crm_activity(
  uuid, uuid, public.crm_activity_kind, text, timestamptz, uuid
) to authenticated;
grant execute on function public.create_crm_task(
  uuid,
  uuid,
  public.task_type,
  text,
  timestamptz,
  uuid,
  text,
  public.task_priority,
  uuid
) to authenticated;
grant execute on function public.set_crm_task_status(
  uuid, public.task_status, text, text, text, timestamptz, uuid
) to authenticated;
grant execute on function public.complete_crm_task(
  uuid, text, text, text, timestamptz, uuid
) to authenticated;
grant execute on function public.reschedule_crm_task(
  uuid, timestamptz, text, uuid, timestamptz, uuid
) to authenticated;
grant execute on function public.create_crm_visit(
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  public.visit_mode,
  uuid,
  integer,
  text,
  uuid
) to authenticated;
grant execute on function public.set_crm_visit_status(
  uuid, public.visit_status, text, text, timestamptz, uuid
) to authenticated;
grant execute on function public.reschedule_crm_visit(
  uuid,
  timestamptz,
  timestamptz,
  text,
  uuid,
  public.visit_mode,
  text,
  timestamptz,
  uuid
) to authenticated;

comment on table public.customer_identifiers is
  'PII documental separada. Nunca incluir el número completo en auditoría, dashboard o calendario.';
comment on table public.crm_activities is
  'Línea de tiempo append-only; las correcciones se registran como una nueva actividad.';
comment on table public.visits is
  'Agenda comercial. Una visita nunca bloquea disponibilidad ni crea schedule_allocations.';
