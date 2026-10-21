-- Hito 3 hotfix: PostgreSQL evaluates policy helper functions as the caller.
-- Authenticated users need EXECUTE only on the two boolean helpers referenced
-- by RLS. Mutating/private operational helpers remain non-executable.

grant execute on function private.can_view_booking_calendar(uuid)
  to authenticated;
grant execute on function private.can_access_booking(uuid)
  to authenticated;

comment on function private.can_view_booking_calendar(uuid) is
  'Boolean RLS helper. Safe for authenticated execution; returns no business data.';
comment on function private.can_access_booking(uuid) is
  'Boolean RLS helper. Safe for authenticated execution; returns no business data.';
