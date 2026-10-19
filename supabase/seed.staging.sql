-- SOLO LOCAL / STAGING. No ejecutar en producción.
insert into public.organizations (id, name, timezone, settings)
values (
  '10000000-0000-4000-8000-000000000001',
  'Kairós DEMO',
  'America/Lima',
  '{"demo": true, "environment": "staging"}'::jsonb
)
on conflict (id) do nothing;

insert into public.venues (
  id,
  organization_id,
  name,
  capacity_declared,
  capacity_authorized,
  exclusive_day_policy,
  active
)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Salón principal DEMO',
  null,
  null,
  true,
  true
)
on conflict (id) do nothing;
