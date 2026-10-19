# KAIROS OS

Base segura del sistema interno de gestión y reservas del Salón de Recepciones Kairós. Esta entrega cubre Hito 0 y Hito 1: proyecto, documentación, autenticación por invitación, perfiles, roles, RLS, auditoría y navegación protegida. CRM, calendario y reservas todavía no están habilitados.

## Requisitos

- Node.js 20.9 o superior
- pnpm 11
- Un proyecto Supabase separado para `staging`
- Docker Desktop solo si se ejecutará Supabase local

## Puesta en marcha

1. Copiar `.env.example` a `.env.local` y completar URL, publishable key y service role key de Supabase staging.
2. Aplicar `supabase/migrations/20261019010000_identity_and_access.sql` mediante Supabase CLI o el flujo de migraciones del proyecto.
3. Desactivar el registro público en Supabase Auth y configurar las URL de redirección `http://localhost:3000/auth/callback` y la de staging.
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

Las pruebas SQL requieren una base Supabase migrada:

```powershell
pnpm dlx supabase test db
```

## Prueba manual de Hito 1

1. Inicia sesión como `SUPERADMIN` invitado.
2. Abre **Equipo y permisos** e invita un correo de prueba como `COMERCIAL`.
3. Acepta la invitación, define la contraseña y entra con esa cuenta.
4. Comprueba que la cuenta comercial no ve la pantalla de usuarios.
5. Con la sesión comercial, envía un `POST /api/admin/users/invite`: debe responder `403` sin crear usuario.
6. Verifica en Supabase que `profiles`, `user_roles` y `audit_logs` contienen la operación.

## Límites de esta entrega

- No hay conexión remota incluida en el repositorio y no se guardan secretos.
- No hay reservas, clientes ni tarifas; pertenecen a hitos posteriores.
- La base protege datos internos con RLS, pero la migración debe aplicarse y probarse en Supabase antes de considerar staging operativo.

Consulta `docs/ESTADO_HITOS.md`, `docs/seguridad-rbac.md`, `docs/despliegue.md` y `DECISIONES_PENDIENTES.md` antes de avanzar.
