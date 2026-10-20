# Seguridad y matriz RBAC

| Capacidad Hito 1 | Superadmin | Administrador | Otros roles |
|---|---:|---:|---:|
| Entrar al sistema | Sí | Sí | Sí |
| Ver organización y sedes | Sí | Sí | Sí |
| Ver perfiles y roles del equipo | Sí | Sí | No |
| Invitar y asignar rol | Sí | No, pendiente D-19 | No |
| Ver auditoría | Sí | Sí | No |
| Cambiar configuración sensible | Sí | No | No |

| Capacidad Hito 2 | Superadmin | Administrador | Comercial | Otros |
|---|---:|---:|---:|---:|
| Ver dashboard/CRM global | Sí | Sí | No | No |
| Ver clientes y oportunidades propias/asignadas | Sí | Sí | Sí | No |
| Crear prospectos, tareas y visitas | Sí | Sí | Sí, para sí mismo | No |
| Reasignar responsables | Sí | Sí | No | No |
| Ver datos documentales | Sí, según RLS | Sí, según RLS | Solo ficha asignada | No |
| Convertir propuesta en tarifa o ingreso | No | No | No | No |
| Marcar oportunidad como ganada sin reserva confirmada | No | No | No | No |

El frontend usa esta matriz solo para navegación. Las APIs y servicios vuelven a comprobarla y PostgreSQL aplica RLS por organización.

Controles incluidos: registro público desactivable en `supabase/config.toml`, sesiones en cookies mediante `@supabase/ssr`, validación Zod en servidor, mensajes de login no enumerables, secretos aislados, grants mínimos, RLS por asignación, escrituras CRM solo por RPC, auditoría append-only, DNI en payload separado/enmascarado e idempotencia.

Antes de producción se debe activar MFA para roles sensibles, confirmar SMTP, revisar CSP definitiva, validar logs sin PII y ejecutar pruebas cruzadas en staging.
