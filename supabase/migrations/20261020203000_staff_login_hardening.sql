-- KAIROS OS - Endurecimiento adicional del directorio privado de acceso.

create index if not exists staff_login_identifiers_created_by_idx
  on public.staff_login_identifiers (created_by);

drop policy if exists staff_login_identifiers_deny_clients
  on public.staff_login_identifiers;

create policy staff_login_identifiers_deny_clients
  on public.staff_login_identifiers
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on policy staff_login_identifiers_deny_clients
  on public.staff_login_identifiers is
  'Denegacion explicita: los alias de DNI solo se resuelven con service_role desde el servidor.';
