# KAIROS OS

Base segura del sistema interno de gestión y reservas del Salón de Recepciones Kairós. Esta entrega cubre Hitos 0, 1 y 2: plataforma, alta directa de usuarios internos, acceso por correo o DNI, perfiles/roles, CRM, agenda comercial, clientes, tareas, visitas, RLS, auditoría y navegación protegida. El calendario de disponibilidad, holds y reservas pertenece al Hito 3 y todavía no está habilitado.

## Requisitos

- Node.js 20.9 o superior
- pnpm 11
- Un proyecto Supabase separado para `staging`
- Docker Desktop solo si se ejecutará Supabase local

## Puesta en marcha

1. Copiar `.env.example` a `.env.local` y completar URL, publishable key y service role key de Supabase staging.
2. En un proyecto nuevo, aplicar en orden todas las migraciones de `supabase/migrations/` mediante Supabase CLI o el flujo de migraciones del proyecto. Las migraciones versionadas ya están aplicadas en el proyecto KAIROS entregado con ref `uhicgqxmynqbddmrgzrn`.
3. Desactivar el registro público en Supabase Auth y configurar las URL de redirección `http://localhost:3000/auth/callback` y la de staging. En el proyecto KAIROS entregado, el registro público y los callbacks locales ya están configurados; falta añadir la URL de Vercel cuando exista.
4. Ejecutar el bootstrap inicial una sola vez:

   ```powershell
   $env:KAIROS_BOOTSTRAP_CONFIRM='KAIROS_INITIAL_SUPERADMIN'
   pnpm bootstrap:superadmin
   ```

5. Iniciar la aplicación con `pnpm dev` y abrir `http://localhost:3000/login`.

No ejecutes `supabase/seed.staging.sql` en producción. El archivo no contiene clientes reales ni tarifas.

## Comandos de calidad

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Las pruebas SQL requieren una base Supabase migrada. Para ejecutarlas contra el proyecto enlazado sin dejar datos de prueba:

```powershell
pnpm dlx supabase db query --linked --project-ref uhicgqxmynqbddmrgzrn --file supabase/tests/identity_rls.test.sql --agent no
```

## Prueba manual de Hitos 1 y 2

1. Inicia sesión como `SUPERADMIN`.
2. Abre **Equipo y permisos** y crea una cuenta `COMERCIAL` con nombre, DNI, correo corporativo y contraseña inicial.
3. Entra con esa cuenta primero mediante su correo y luego mediante su DNI.
4. Comprueba que la cuenta comercial no ve la pantalla de usuarios.
5. Con la sesión comercial, envía un `POST /api/admin/users`: debe responder `403` sin crear usuario.
6. Verifica en Supabase que `profiles`, `user_roles` y `audit_logs` contienen la operación.
7. Como superadmin, registra un prospecto en `/app/crm/nueva`, muévelo de etapa en el Kanban y abre `/app/agenda` para verificar la fecha solicitada.
8. Como comercial, verifica que no aparecen clientes de otro asesor ni controles de reasignación y que `Ganado` permanece bloqueado sin reserva confirmada.

## Límites de esta entrega

- La migración está aplicada en el proyecto Supabase indicado, pero el repositorio no guarda claves ni tokens.
- Hay clientes, agenda y seguimiento CRM reales. No hay reservas ni tarifas oficiales: la fecha solicitada es tentativa y el monto propuesto es referencial.
- La base protege datos internos con RLS. Staging no se considera completamente operativo hasta probar con un correo corporativo real el flujo entre un `SUPERADMIN` y un `COMERCIAL` creado directamente.

Consulta `docs/ESTADO_HITOS.md`, `docs/seguridad-rbac.md`, `docs/despliegue.md` y `DECISIONES_PENDIENTES.md` antes de avanzar.
