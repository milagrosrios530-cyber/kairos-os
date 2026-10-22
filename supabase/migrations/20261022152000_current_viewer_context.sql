-- Contexto de sesión en una sola consulta, limitado al usuario autenticado.
create or replace function public.current_viewer_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', profile.user_id,
    'email', auth.jwt() ->> 'email',
    'organization_id', profile.organization_id,
    'organization_name', organization.name,
    'timezone', organization.timezone,
    'full_name', profile.full_name,
    'roles', coalesce(
      (
        select jsonb_agg(user_role.role order by user_role.role)
        from public.user_roles as user_role
        where user_role.user_id = profile.user_id
          and user_role.organization_id = profile.organization_id
      ),
      '[]'::jsonb
    )
  )
  from public.profiles as profile
  join public.organizations as organization
    on organization.id = profile.organization_id
  where profile.user_id = auth.uid()
    and profile.status = 'active'
  limit 1;
$$;

revoke all on function public.current_viewer_context()
  from public, anon;
grant execute on function public.current_viewer_context()
  to authenticated;

comment on function public.current_viewer_context() is
  'Devuelve únicamente identidad, organización y roles del usuario autenticado para reducir viajes de red.';
