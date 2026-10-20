# Estado de implementación de KAIROS OS

## Hito 0

Implementado en repositorio: Next.js, TypeScript, Tailwind, shadcn/ui, scripts de calidad, especificación funcional, documentación de arquitectura, variables de entorno, configuración de Supabase y guía de despliegue.

Supabase remoto: las migraciones `20261019010000_identity_and_access.sql` y `20261019020000_security_hardening.sql` están aplicadas en el proyecto `uhicgqxmynqbddmrgzrn`. El proyecto se trata como `staging` hasta que Dirección apruebe expresamente su clasificación y propiedad de producción. No se ejecutó ningún seed demo.

Pendiente externo: crear o vincular el proyecto Vercel y configurar sus variables de entorno sin guardar secretos en Git.

## Hito 1

Implementado en código: login sin registro público, recuperación y actualización de contraseña, invitación de empleados, perfiles, roles, RLS, auditoría append-only, protección `proxy.ts`, autorización de servidor, `/api/me`, API administrativa de invitación, navegación base y vista de equipo.

Puerta local: `lint`, `typecheck`, tests y build pasan en esta entrega.

Puerta de base remota verificada el 19 de octubre de 2026:

- historial local/remoto sincronizado con dos migraciones;
- cinco tablas de identidad presentes y con RLS habilitado;
- cinco políticas RLS esperadas presentes;
- `anon` sin lectura de perfiles o roles;
- usuarios autenticados sin concesión directa de roles ni inserción de auditoría;
- auditoría protegida contra `UPDATE` y `DELETE` por trigger;
- RPC de invitaciones ejecutable solo por `service_role`;
- prueba pgTAP remota de 17 controles ejecutada dentro de una transacción con `ROLLBACK`;
- registro público de Auth desactivado y callbacks locales configurados en remoto.
- asesor de seguridad de Supabase sin hallazgos de tablas, funciones o RLS después del hardening;
- primer usuario interno enlazado con perfil activo y rol `SUPERADMIN`;
- autorización `SUPERADMIN` verificada bajo un JWT simulado del rol `authenticated` y RLS real.

El asesor de rendimiento solo informa índices todavía sin uso porque el entorno acaba de inicializarse y no tiene tráfico; no es un error abierto.

Pendiente para cerrar completamente la puerta de staging: añadir la URL de callback de Vercel cuando exista y ejecutar una invitación real controlada para verificar el flujo `SUPERADMIN` frente a `COMERCIAL` sin usar un correo ficticio.

Aviso abierto de Auth: Supabase informa que la protección contra contraseñas filtradas está desactivada. Debe habilitarse y la contraseña inicial compartida por el administrador debe rotarse antes de producción.

## Hitos 2 a 7

No iniciados. La interfaz no muestra métricas inventadas ni botones que aparenten guardar estos módulos.
