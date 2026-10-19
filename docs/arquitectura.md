# Arquitectura de Hito 0 y Hito 1

KAIROS OS usa Next.js App Router para interfaz y endpoints, Supabase Auth para sesiones, PostgreSQL con RLS para autorización y Supabase Storage para documentos en hitos posteriores. Vercel aloja la aplicación, no la base de datos.

La protección se aplica en tres capas:

1. `src/proxy.ts` renueva la sesión y desvía accesos sin autenticación.
2. `src/server/auth/session.ts` valida identidad, perfil activo, organización y permisos cerca de cada operación.
3. PostgreSQL limita filas y privilegios con RLS, grants mínimos y funciones con `search_path` fijado.

La service role solo se usa en módulos `server-only` para invitaciones. Nunca se entrega al navegador. La función `complete_employee_invitation` reúne perfil, rol y auditoría en una transacción de base.

En Hito 3, la disponibilidad deberá vivir en `schedule_allocations` y estar protegida por una exclusión GiST, transacciones, idempotencia y limpieza de holds vencidos. Esta entrega no simula esa funcionalidad.
