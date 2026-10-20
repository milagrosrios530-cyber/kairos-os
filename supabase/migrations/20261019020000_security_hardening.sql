-- KAIROS OS - Hito 1: hardening posterior a los asesores de Supabase.

-- Esta función de event trigger ya existía en el proyecto remoto. No forma parte
-- del API de KAIROS y no debe poder invocarse como RPC por roles expuestos.
revoke execute on function public.rls_auto_enable()
  from public, anon, authenticated, service_role;

-- Índices de soporte para las claves foráneas detectadas por el asesor de
-- rendimiento. Evitan escaneos completos al validar cambios en auth.users.
create index if not exists audit_logs_actor_id_idx
  on public.audit_logs (actor_id);

create index if not exists user_roles_granted_by_idx
  on public.user_roles (granted_by);
