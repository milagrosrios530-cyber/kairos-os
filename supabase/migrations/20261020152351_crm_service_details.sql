alter table public.opportunities
  add column if not exists occasion_detail text null;

alter table public.opportunities
  drop constraint if exists opportunities_occasion_detail_length;
alter table public.opportunities
  add constraint opportunities_occasion_detail_length
  check (
    occasion_detail is null
    or char_length(btrim(occasion_detail)) between 1 and 160
  );

comment on column public.opportunities.occasion_detail is
  'Detalle libre y no contractual del tipo de celebración, por ejemplo 50 años.';

alter table public.opportunity_service_interests
  add column if not exists quantity numeric(10, 2) null,
  add column if not exists unit text null,
  add column if not exists updated_by uuid null,
  add column if not exists updated_at timestamptz null;

update public.opportunity_service_interests
set updated_by = created_by,
    updated_at = created_at
where updated_by is null
   or updated_at is null;

alter table public.opportunity_service_interests
  alter column updated_by set not null,
  alter column updated_at set not null,
  alter column updated_at set default now();

alter table public.opportunity_service_interests
  drop constraint if exists opportunity_service_interests_quantity_check;
alter table public.opportunity_service_interests
  add constraint opportunity_service_interests_quantity_check
  check (quantity is null or (quantity > 0 and quantity <= 100000));

alter table public.opportunity_service_interests
  drop constraint if exists opportunity_service_interests_unit_check;
alter table public.opportunity_service_interests
  add constraint opportunity_service_interests_unit_check
  check (unit is null or char_length(btrim(unit)) between 1 and 40);

alter table public.opportunity_service_interests
  drop constraint if exists opportunity_service_interests_updated_by_organization_id_fkey;
alter table public.opportunity_service_interests
  add constraint opportunity_service_interests_updated_by_organization_id_fkey
  foreign key (updated_by, organization_id)
  references public.profiles(user_id, organization_id) on delete restrict;

create index if not exists opportunity_service_interests_opportunity_org_idx
  on public.opportunity_service_interests (opportunity_id, organization_id);
create index if not exists opportunity_service_interests_created_by_org_idx
  on public.opportunity_service_interests (created_by, organization_id);
create index if not exists opportunity_service_interests_updated_by_org_idx
  on public.opportunity_service_interests (updated_by, organization_id);

create unique index if not exists opportunity_service_interests_active_label_uidx
  on public.opportunity_service_interests (
    organization_id,
    opportunity_id,
    lower(btrim(service_label))
  )
  where active;

drop trigger if exists opportunity_service_interests_set_updated_at
  on public.opportunity_service_interests;
create trigger opportunity_service_interests_set_updated_at
before update on public.opportunity_service_interests
for each row execute function private.set_updated_at();

create or replace function public.upsert_opportunity_service_details(
  p_opportunity_id uuid,
  p_services jsonb,
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
  v_customer_id uuid;
  v_current_updated_at timestamptz;
  v_new_updated_at timestamptz;
  v_item jsonb;
  v_service_id uuid;
  v_label text;
  v_unit text;
  v_details text;
  v_quantity numeric(10, 2);
  v_count integer := 0;
  v_summary text[] := array[]::text[];
  v_cached jsonb;
  v_response jsonb;
  v_operation text := 'upsert_opportunity_service_details:' || p_opportunity_id::text;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if jsonb_typeof(p_services) <> 'array'
    or jsonb_array_length(p_services) < 1
    or jsonb_array_length(p_services) > 30 then
    raise exception 'Services must contain between 1 and 30 items'
      using errcode = '22023';
  end if;

  select o.customer_id, o.updated_at
  into v_customer_id, v_current_updated_at
  from public.opportunities as o
  where o.id = p_opportunity_id
    and o.organization_id = v_organization_id
    and o.archived_at is null
    and private.can_access_opportunity(o.id)
  for update;

  if v_customer_id is null then
    raise exception 'Opportunity not found or not visible' using errcode = 'P0002';
  end if;
  if p_expected_updated_at is not null
    and v_current_updated_at <> p_expected_updated_at then
    raise exception 'Opportunity was changed by another user' using errcode = '40001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_services) as service(value)
    where jsonb_typeof(service.value) <> 'object'
      or nullif(btrim(service.value ->> 'label'), '') is null
  ) then
    raise exception 'Each service requires a label' using errcode = '22023';
  end if;

  if (
    select count(*) <> count(distinct lower(btrim(service.value ->> 'label')))
    from jsonb_array_elements(p_services) as service(value)
  ) then
    raise exception 'Service labels cannot be repeated' using errcode = '23514';
  end if;

  v_cached := private.claim_crm_idempotency(
    v_organization_id,
    v_actor,
    v_operation,
    p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;

  for v_item in
    select value from jsonb_array_elements(p_services)
  loop
    v_label := btrim(v_item ->> 'label');
    v_unit := nullif(btrim(v_item ->> 'unit'), '');
    v_details := nullif(btrim(v_item ->> 'details'), '');
    v_service_id := null;
    v_quantity := null;

    if char_length(v_label) not between 2 and 120
      or (v_unit is not null and char_length(v_unit) > 40)
      or (v_details is not null and char_length(v_details) > 2000) then
      raise exception 'Service label, unit or details exceed their allowed length'
        using errcode = '22023';
    end if;

    if v_item ? 'quantity' and jsonb_typeof(v_item -> 'quantity') <> 'null' then
      if jsonb_typeof(v_item -> 'quantity') <> 'number' then
        raise exception 'Service quantity must be numeric' using errcode = '22023';
      end if;
      v_quantity := (v_item ->> 'quantity')::numeric;
      if v_quantity <= 0 or v_quantity > 100000 then
        raise exception 'Service quantity is outside the allowed range'
          using errcode = '23514';
      end if;
    end if;

    if nullif(v_item ->> 'id', '') is not null then
      v_service_id := (v_item ->> 'id')::uuid;
      update public.opportunity_service_interests
      set service_label = v_label,
          quantity = v_quantity,
          unit = v_unit,
          details = v_details,
          active = true,
          updated_by = v_actor
      where id = v_service_id
        and organization_id = v_organization_id
        and opportunity_id = p_opportunity_id;

      if not found then
        raise exception 'Service detail not found' using errcode = 'P0002';
      end if;
    else
      select osi.id into v_service_id
      from public.opportunity_service_interests as osi
      where osi.organization_id = v_organization_id
        and osi.opportunity_id = p_opportunity_id
        and osi.active
        and lower(btrim(osi.service_label)) = lower(v_label)
      for update;

      if v_service_id is null then
        insert into public.opportunity_service_interests (
          organization_id,
          opportunity_id,
          service_label,
          quantity,
          unit,
          details,
          created_by,
          updated_by
        ) values (
          v_organization_id,
          p_opportunity_id,
          v_label,
          v_quantity,
          v_unit,
          v_details,
          v_actor,
          v_actor
        );
      else
        update public.opportunity_service_interests
        set quantity = v_quantity,
            unit = v_unit,
            details = v_details,
            updated_by = v_actor
        where id = v_service_id;
      end if;
    end if;

    v_count := v_count + 1;
    v_summary := array_append(
      v_summary,
      v_label || case
        when v_quantity is null then ''
        else ' (' || to_char(v_quantity, 'FM9999999990.##')
          || coalesce(' ' || v_unit, '') || ')'
      end
    );
  end loop;

  update public.opportunities
  set updated_by = v_actor
  where id = p_opportunity_id
    and organization_id = v_organization_id
  returning updated_at into v_new_updated_at;

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
    p_opportunity_id,
    v_actor,
    'nota',
    'Servicios actualizados: ' || array_to_string(v_summary, ', ')
  );

  v_response := jsonb_build_object(
    'opportunity_id', p_opportunity_id,
    'services_saved', v_count,
    'updated_at', v_new_updated_at
  );
  perform private.complete_crm_idempotency(
    v_organization_id,
    v_actor,
    v_operation,
    p_idempotency_key,
    v_response
  );
  return v_response;
end;
$$;

create or replace function public.create_crm_intake_v2(
  p_full_name text,
  p_phone_e164 text,
  p_customer_type public.customer_type,
  p_assigned_to uuid,
  p_event_type_id uuid,
  p_desired_date date,
  p_guests_total integer,
  p_modality public.event_modality,
  p_source public.lead_source,
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
  v_labels jsonb;
  v_response jsonb;
  v_opportunity_id uuid;
  v_occasion_detail text := nullif(btrim(p_opportunity ->> 'occasion_detail'), '');
  v_cached jsonb;
begin
  if v_actor is null or v_organization_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if jsonb_typeof(p_service_interests) <> 'array'
    or jsonb_array_length(p_service_interests) > 30 then
    raise exception 'Invalid services payload' using errcode = '22023';
  end if;
  if v_occasion_detail is not null and char_length(v_occasion_detail) > 160 then
    raise exception 'Occasion detail is too long' using errcode = '22023';
  end if;

  v_cached := private.claim_crm_idempotency(
    v_organization_id,
    v_actor,
    'create_crm_intake_v2',
    p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(btrim(case
      when jsonb_typeof(service.value) = 'string' then service.value #>> '{}'
      else service.value ->> 'label'
    end))),
    '[]'::jsonb
  )
  into v_labels
  from jsonb_array_elements(p_service_interests) as service(value);

  v_response := public.create_crm_intake(
    p_full_name,
    p_phone_e164,
    p_customer_type,
    p_assigned_to,
    p_event_type_id,
    p_desired_date,
    p_guests_total,
    p_modality,
    p_source,
    p_existing_customer_id,
    p_customer,
    p_opportunity,
    p_alternate_dates,
    v_labels,
    p_proposal,
    p_first_task,
    p_first_visit,
    p_idempotency_key
  );

  if v_response ? 'opportunity_id' then
    v_opportunity_id := (v_response ->> 'opportunity_id')::uuid;

    if v_occasion_detail is not null then
      update public.opportunities
      set occasion_detail = v_occasion_detail,
          updated_by = v_actor
      where id = v_opportunity_id
        and organization_id = v_organization_id;
    end if;

    if jsonb_array_length(p_service_interests) > 0 then
      perform public.upsert_opportunity_service_details(
        v_opportunity_id,
        p_service_interests,
        null,
        p_idempotency_key
      );
    end if;
  end if;

  perform private.complete_crm_idempotency(
    v_organization_id,
    v_actor,
    'create_crm_intake_v2',
    p_idempotency_key,
    v_response
  );
  return v_response;
end;
$$;

revoke all on function public.upsert_opportunity_service_details(
  uuid, jsonb, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function public.create_crm_intake_v2(
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

grant execute on function public.upsert_opportunity_service_details(
  uuid, jsonb, timestamptz, uuid
) to authenticated;
grant execute on function public.create_crm_intake_v2(
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

comment on function public.upsert_opportunity_service_details(
  uuid, jsonb, timestamptz, uuid
) is 'Actualiza partidas de servicio con permisos, concurrencia, idempotencia y auditoría sin borrar historia.';
