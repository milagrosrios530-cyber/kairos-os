# Estado de implementación de KAIROS OS

## Hito 0

Implementado en repositorio: Next.js, TypeScript, Tailwind, shadcn/ui, scripts de calidad, especificación funcional, documentación de arquitectura, variables de entorno, configuración de Supabase y guía de despliegue.

Supabase remoto: las migraciones `20261019010000_identity_and_access.sql` y `20261019020000_security_hardening.sql` están aplicadas en el proyecto `uhicgqxmynqbddmrgzrn`. El proyecto se trata como `staging` hasta que Dirección apruebe expresamente su clasificación y propiedad de producción. No se ejecutó ningún seed demo.

Vercel: el repositorio está vinculado al proyecto `kairos-os` y la interfaz está publicada en [https://kairos-os-pi.vercel.app](https://kairos-os-pi.vercel.app). La integración oficial Supabase-Vercel quedó instalada para este proyecto. Las tres variables públicas de la aplicación se guardaron como configuración y la clave administrativa como secreto de Producción. La clave privada usada por Vercel es exclusiva y revocable; no se guardó en Git. La credencial temporal utilizada durante la conexión fue revocada, sustituida por una clave rotada y el despliegue posterior quedó `Ready`.

La etiqueta `Production` de Vercel describe el entorno de despliegue de la plataforma. No resuelve la decisión comercial pendiente sobre si el Supabase actual será la base productiva definitiva.

## Hito 1

Implementado en código: login sin registro público, recuperación y actualización de contraseña, invitación de empleados, perfiles, roles, RLS, auditoría append-only, protección `proxy.ts`, autorización de servidor, `/api/me`, API administrativa de invitación, navegación base y vista de equipo.

La interfaz de Hito 1 incluye una composición limpia y responsive, navegación lateral contraíble, menú móvil, estado de ruta activo, menú de cuenta y cierre de sesión. No se añadió una campana decorativa: las notificaciones persistentes pertenecen a un hito posterior y solo se mostrarán cuando tengan datos y acciones reales.

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
- registro público de Auth desactivado, URL principal configurada en `https://kairos-os-pi.vercel.app` y callbacks locales y de producción permitidos en remoto;
- asesor de seguridad de Supabase sin hallazgos de tablas, funciones o RLS después del hardening;
- primer usuario interno enlazado con perfil activo y rol `SUPERADMIN`;
- autorización `SUPERADMIN` verificada bajo un JWT simulado del rol `authenticated` y RLS real.
- conexión Vercel-Supabase verificada desde la URL pública mediante un intento deliberadamente inválido que devolvió el error controlado de credenciales, sin error de configuración;
- rutas `/app` y `/app/configuracion/usuarios` redirigen a login cuando no existe sesión;
- QA móvil a 390 x 844 sin desbordamiento horizontal (`scrollWidth = clientWidth = 390`);
- workflow remoto `Quality` de GitHub completado correctamente para el commit `2ed4814`.

El asesor de rendimiento solo informa índices todavía sin uso porque el entorno acaba de inicializarse y no tiene tráfico; no es un error abierto.

Pendiente para cerrar completamente la puerta autenticada: iniciar sesión manualmente en la URL pública y ejecutar una invitación real controlada para verificar el flujo `SUPERADMIN` frente a `COMERCIAL` sin usar un correo ficticio. La contraseña administrativa no se introdujo mediante automatización.

Aviso abierto de Auth: Supabase informa que la protección contra contraseñas filtradas está desactivada. Debe habilitarse y la contraseña inicial compartida por el administrador debe rotarse antes de producción.

Decisiones que requieren aprobación de Dirección antes de considerar producción cerrada:

- clasificar el proyecto Supabase actual como `staging` o como producción definitiva y asignar propietario técnico;
- elegir el dominio público definitivo;
- aprobar proveedor SMTP, remitente y política de entrega para invitaciones y recuperación;
- aprobar la activación de protección contra contraseñas filtradas y la rotación de la credencial administrativa inicial;
- autorizar expresamente el inicio del Hito 2.

## Hito 2

Implementado el 20 de octubre de 2026:

- dashboard comercial con conteos reales y alcance global para `SUPERADMIN`/`ADMINISTRADOR` o propio para `COMERCIAL`;
- clientes con búsqueda, ficha protegida, teléfono/WhatsApp, DNI enmascarado y oportunidades históricas;
- CRM en lista móvil y Kanban de escritorio, alta transaccional, deduplicación orientativa, etapas y línea de tiempo append-only;
- captura de evento solicitado, fecha tentativa, invitados, servicios, asesor y monto propuesto expresamente no tarifario;
- partidas de servicio editables con cantidad, unidad y detalle, además de un detalle libre de la celebración;
- tareas y visitas persistentes, con resultado obligatorio al completar;
- permisos revalidados en servidor y PostgreSQL, 28 políticas RLS, auditoría, idempotencia y concurrencia optimista;
- las tablas CRM conceden lectura bajo RLS; las escrituras autenticadas se realizan solo mediante RPCs guardadas y autorizadas.

Supabase remoto: migraciones `crm_hito2` y `crm_service_details` aplicadas. El catálogo inicial contiene 11 tipos de evento de la especificación. No se cargaron tarifas ni fixtures demo.

Evidencia de puerta:

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (41/41) y `pnpm build` pasan;
- pgTAP remoto: 58/58 controles de esquema, RLS, privilegios, append-only, auditoría y concurrencia;
- flujo transaccional remoto: 9/9 controles para cliente → oportunidad → propuesta referencial → tarea → visita → calificación → cierres con resultado;
- el flujo de QA se ejecutó con `ROLLBACK` y se comprobó que quedaron 0 clientes `DEMO QA`;
- los cambios de servicios se ejecutan mediante una RPC autorizada, idempotente, transaccional y con control de concurrencia; no se habilitó escritura directa.

Actualización operativa verificada el 20 de octubre de 2026: la oportunidad real `KAI-LEAD-2026-000001` conservó su cliente y recibió siete partidas detalladas, una nueva versión append-only de la propuesta y actividades/auditoría. El saldo informado quedó expresamente separado de un pago verificado y la fecha sigue siendo tentativa.

Avisos abiertos, no bloqueantes para staging:

- el asesor de Supabase advierte que las RPCs transaccionales son `SECURITY DEFINER`; es intencional porque no se conceden escrituras directas y cada función valida sesión, organización, rol y alcance;
- la protección de contraseñas filtradas de Supabase Auth continúa desactivada;
- el asesor de rendimiento marca índices nuevos como no usados y algunas claves foráneas compuestas como no totalmente cubiertas; se medirán con tráfico antes de añadir índices que encarezcan cada escritura;
- falta una prueba manual autenticada en la interfaz desplegada con una cuenta `COMERCIAL` real.

## Hitos 3 a 7

No iniciados. En particular, la fecha solicitada del CRM es tentativa: no bloquea el salón ni confirma una reserva. El calendario con exclusión PostgreSQL, holds y protección contra doble reserva pertenece al Hito 3 y requiere aprobación explícita para comenzar.
