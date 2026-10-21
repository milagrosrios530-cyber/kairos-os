# Arquitectura hasta Hito 2

KAIROS OS usa Next.js App Router para interfaz y endpoints, Supabase Auth para sesiones, PostgreSQL con RLS para autorización y Supabase Storage para documentos en hitos posteriores. Vercel aloja la aplicación, no la base de datos.

La protección se aplica en tres capas:

1. `src/proxy.ts` renueva la sesión y desvía accesos sin autenticación.
2. `src/server/auth/session.ts` valida identidad, perfil activo, organización y permisos cerca de cada operación.
3. PostgreSQL limita filas y privilegios con RLS, grants mínimos y funciones con `search_path` fijado.

La service role solo se usa en módulos `server-only` para invitaciones. Nunca se entrega al navegador. La función `complete_employee_invitation` reúne perfil, rol y auditoría en una transacción de base.

El CRM añade una cuarta frontera: Route Handlers validan cuerpos con Zod y llaman una capa `server-only`; esta vuelve a comprobar permisos y ejecuta RPCs PostgreSQL transaccionales. Las tablas permiten `SELECT` solo bajo RLS y no conceden `INSERT`, `UPDATE` o `DELETE` a `authenticated`. Cada RPC comprueba `auth.uid()`, organización, rol, asignación, idempotencia y, en cambios de estado, la versión `updated_at` esperada.

El alcance queda así:

- `SUPERADMIN` y `ADMINISTRADOR`: visión global del negocio en Hito 2;
- `COMERCIAL`: clientes y oportunidades propias/asignadas, más sus tareas y visitas;
- otros roles: sin acceso CRM hasta que su hito funcional defina el dato mínimo necesario.

Propuestas y actividades son append-only. El DNI vive separado y se elimina de los payloads de auditoría. La UI muestra montos propuestos como referenciales y nunca como tarifas, ingresos o utilidad.

En Hito 3, la disponibilidad vive en `schedule_allocations` y está protegida por una exclusión GiST, transacciones, idempotencia y limpieza de holds vencidos. El alta CRM con fecha inserta allí un hold automático de 24 horas dentro de la misma transacción; una colisión revierte también el alta y devuelve conflicto al ejecutivo.
