# Seguridad y matriz RBAC

| Capacidad Hito 1 | Superadmin | Administrador | Otros roles |
|---|---:|---:|---:|
| Entrar al sistema | Sí | Sí | Sí |
| Ver organización y sedes | Sí | Sí | Sí |
| Ver perfiles y roles del equipo | Sí | Sí | No |
| Invitar y asignar rol | Sí | No, pendiente D-19 | No |
| Ver auditoría | Sí | Sí | No |
| Cambiar configuración sensible | Sí | No | No |

El frontend usa esta matriz solo para navegación. Las APIs y servicios vuelven a comprobarla y PostgreSQL aplica RLS por organización.

Controles incluidos: registro público desactivable en `supabase/config.toml`, sesiones en cookies mediante `@supabase/ssr`, validación Zod en servidor, mensajes de login no enumerables, secretos aislados, grants mínimos, auditoría append-only y cabeceras HTTP básicas.

Antes de producción se debe activar MFA para roles sensibles, confirmar SMTP, revisar CSP definitiva, validar logs sin PII y ejecutar pruebas cruzadas en staging.
