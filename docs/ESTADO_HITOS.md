# Estado de implementación de KAIROS OS

## Hito 0

Implementado en repositorio: Next.js, TypeScript, Tailwind, shadcn/ui, scripts de calidad, especificación funcional, documentación de arquitectura, variables de entorno, configuración de Supabase y guía de despliegue.

Supabase remoto: las migraciones `20261019010000_identity_and_access.sql` y `20261019020000_security_hardening.sql` están aplicadas en el proyecto `uhicgqxmynqbddmrgzrn`. El proyecto se trata como `staging` hasta que Dirección apruebe expresamente su clasificación y propiedad de producción. No se ejecutó ningún seed demo.

Vercel: el repositorio está vinculado al proyecto `kairos-os` y la interfaz está publicada en [https://kairos-os-pi.vercel.app](https://kairos-os-pi.vercel.app). La integración oficial Supabase-Vercel quedó instalada para este proyecto. Las tres variables públicas de la aplicación se guardaron como configuración y la clave administrativa como secreto de Producción. La clave privada usada por Vercel es exclusiva y revocable; no se guardó en Git. La credencial temporal utilizada durante la conexión fue revocada, sustituida por una clave rotada y el despliegue posterior quedó `Ready`.

La etiqueta `Production` de Vercel describe el entorno de despliegue de la plataforma. No resuelve la decisión comercial pendiente sobre si el Supabase actual será la base productiva definitiva.

## Hito 1

Implementado en código: login sin registro público, acceso indistinto con correo corporativo o DNI y contraseña, recuperación y actualización de contraseña, alta directa de empleados por roles autorizados, perfiles, roles, RLS, auditoría append-only, protección `proxy.ts`, autorización de servidor, `/api/me`, API administrativa de usuarios, navegación base y vista de equipo.

El alta directa crea la identidad de acceso en Supabase Auth y la enlaza transaccionalmente con perfil, rol e identificador DNI protegido mediante BCrypt salado. El DNI completo no se expone a clientes ni se guarda en auditoría; solo se muestra su terminación. Un `ADMINISTRADOR` puede crear roles operativos, pero no elevar a otra persona a `ADMINISTRADOR` o `SUPERADMIN`; esa elevación queda reservada a `SUPERADMIN`. El correo ingresado funciona como identificador de KAIROS OS, pero no crea por sí solo un buzón externo: el dominio y proveedor corporativo siguen pendientes de Dirección.

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
- prueba pgTAP remota de 32 controles ejecutada dentro de una transacción con `ROLLBACK`;
- registro público de Auth desactivado, URL principal configurada en `https://kairos-os-pi.vercel.app` y callbacks locales y de producción permitidos en remoto;
- asesor de seguridad de Supabase sin hallazgos de tablas, funciones o RLS después del hardening;
- primer usuario interno enlazado con perfil activo y rol `SUPERADMIN`;
- autorización `SUPERADMIN` verificada bajo un JWT simulado del rol `authenticated` y RLS real.
- conexión Vercel-Supabase verificada desde la URL pública mediante un intento deliberadamente inválido que devolvió el error controlado de credenciales, sin error de configuración;
- rutas `/app` y `/app/configuracion/usuarios` redirigen a login cuando no existe sesión;
- QA móvil a 390 x 844 sin desbordamiento horizontal (`scrollWidth = clientWidth = 390`);
- workflow remoto `Quality` de GitHub completado correctamente para el commit `2ed4814`.

El asesor de rendimiento solo informa índices todavía sin uso porque el entorno acaba de inicializarse y no tiene tráfico; no es un error abierto.

Pendiente para cerrar completamente la puerta autenticada: ejecutar un alta controlada de empleado con un correo corporativo real y comprobar login tanto por correo como por DNI frente a una cuenta `COMERCIAL`. No se crea una cuenta ficticia solo para completar esta prueba.

Aviso abierto de Auth: Supabase informa que la protección contra contraseñas filtradas está desactivada. Debe habilitarse y la contraseña inicial compartida por el administrador debe rotarse antes de producción.

Decisiones que requieren aprobación de Dirección antes de considerar producción cerrada:

- clasificar el proyecto Supabase actual como `staging` o como producción definitiva y asignar propietario técnico;
- elegir el dominio público definitivo;
- aprobar dominio/proveedor de buzones corporativos, proveedor SMTP, remitente y política de recuperación;
- aprobar la activación de protección contra contraseñas filtradas y la rotación de la credencial administrativa inicial;
- autorizar expresamente el inicio del Hito 2.

## Hito 2

Implementado el 20 de octubre de 2026:

- dashboard comercial con conteos reales y alcance global para `SUPERADMIN`/`ADMINISTRADOR` o propio para `COMERCIAL`;
- clientes con búsqueda, ficha protegida, teléfono/WhatsApp, DNI enmascarado y oportunidades históricas;
- CRM en lista móvil y Kanban de escritorio, alta transaccional, deduplicación orientativa, etapas y línea de tiempo append-only;
- Kanban interactivo: cada tarjeta se puede arrastrar entre etapas con actualización optimista, reversión ante error, control de concurrencia, autorización de servidor y auditoría; `Ganado` continúa bloqueado hasta una reserva confirmada;
- agenda comercial mensual responsive con fechas solicitadas, visitas y tareas persistentes, conteo por día y acceso directo a cada oportunidad;
- alta simplificada para ejecutivos: cinco datos esenciales visibles y clasificación, servicios, propuesta y actividades en secciones opcionales;
- captura de evento solicitado, fecha tentativa, invitados, servicios, asesor y monto propuesto expresamente no tarifario;
- partidas de servicio editables con cantidad, unidad y detalle, además de un detalle libre de la celebración;
- tareas y visitas persistentes, con resultado obligatorio al completar;
- permisos revalidados en servidor y PostgreSQL, 28 políticas RLS, auditoría, idempotencia y concurrencia optimista;
- las tablas CRM conceden lectura bajo RLS; las escrituras autenticadas se realizan solo mediante RPCs guardadas y autorizadas.

Supabase remoto: migraciones `crm_hito2` y `crm_service_details` aplicadas. El catálogo inicial contiene 11 tipos de evento de la especificación. No se cargaron tarifas ni fixtures demo.

Evidencia de puerta:

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (54/54) y `pnpm build` pasan;
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

## Hito 3

Implementado el 21 de octubre de 2026:

- calendario mensual real y responsive con disponibilidad, holds, reservas confirmadas y bloqueos operativos;
- máximo un evento bloqueante por organización y día, garantizado en PostgreSQL mediante rango temporal y exclusión GiST;
- alta CRM enlazada al calendario: registrar una oportunidad con fecha crea en la misma transacción un hold de 24 horas; si el día ya está ocupado, se revierte el alta y se devuelve un conflicto legible al ejecutivo;
- creación de hold por 24 horas, idempotencia, expiración segura, liberación, prórroga administrativa, reprogramación y cancelación mediante transacciones;
- registro append-only de evidencias de adelanto y revisión administrativa separada para aprobar o rechazar;
- la fecha solo se confirma cuando un rol autorizado verifica un adelanto mínimo de S/500; el contrato se envía después y no retrasa el bloqueo;
- S/500 se descuenta del total contractual. El 50% del saldo restante vence 15 días antes y el remanente dos horas antes del evento; si faltan menos de 15 días, el adelanto y el 50% del saldo restante vencen inmediatamente;
- el monto propuesto del CRM permanece referencial y nunca se convierte automáticamente en tarifa ni total contractual;
- privacidad por alcance: los ejecutivos ven ocupación general del calendario, pero solo el detalle de sus propias reservas; administración conserva alcance global;
- validación y autorización repetidas en servidor y dentro de cada RPC; tablas expuestas con RLS forzada y sin escrituras directas;
- auditoría de creación, confirmación, rechazo de evidencia, liberación, prórroga, reprogramación, cancelación y bloqueos operativos;
- accesos desde el CRM, listado de reservas, ficha operativa y flujo de alta simplificado.

Supabase remoto: cuatro migraciones de Hito 3 aplicadas (`booking_engine_hito3`, `booking_engine_indexes`, `booking_management_actions` y `booking_deposit_rejection`). No se cargaron fixtures ni reservas demo.

## Hito 4 — avance autorizado: calendario público

Implementado el primer corte del portal público en `/disponibilidad`: acceso sin cuenta, navegación limitada al mes actual y once meses posteriores, y exposición exclusiva de fechas confirmadas con su horario. La vista usa el término **“Reservado”** y omite clientes, teléfonos, tipo de evento, códigos, importes, abonos y asesores. El calendario interno ofrece acciones para abrir y compartir el enlace público.

La lectura pública se ejecuta únicamente en servidor con selección explícita de cuatro columnas de `bookings`, filtro `status = confirmed` y clave administrativa no expuesta. El API conserva rate limit persistente por huella HMAC; la respuesta del sitio mantiene `no-store`, `noindex` y `Referrer-Policy: no-referrer`. Para acelerar la navegación, solo el conjunto saneado de fechas y horarios se reutiliza durante 30 segundos en servidor y se invalida inmediatamente al confirmar, cancelar o reprogramar una reserva. Los meses adyacentes se precargan y la etiqueta móvil de **“Reservado”** queda contenida dentro de su día. No se habilitaron todavía el formulario público de prospectos ni los enlaces privados de clientes; siguen pendientes del resto de Hito 4.

Evidencia de puerta:

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (78/78) y `pnpm build` pasan;
- pgTAP remoto de flujo: 20/20 controles, incluidos el hold automático al crear el prospecto, el rechazo `23P01` de una fecha ya ocupada y el rollback que conserva el hold original;
- pgTAP remoto de seguridad: 24/24 controles de RLS, privilegios, acceso anónimo, funciones privadas y RPCs autorizadas;
- smoke autenticado posterior al despliegue: se corrigieron los permisos `EXECUTE` de los dos helpers booleanos usados por las políticas RLS, la consulta bajo rol `authenticated` devolvió acceso válido y el calendario/listado/formulario cargaron desde la URL pública;
- prueba funcional de pagos: S/15,500 genera adelanto S/500, saldo base S/15,000, vencimiento intermedio S/7,500 y pago final S/7,500;
- las pruebas de base se ejecutaron dentro de transacciones con `ROLLBACK`; la comprobación posterior confirmó 0 clientes demo, 0 reservas de prueba y 0 asignaciones bloqueantes residuales.

La oportunidad real de Ivon Artica Cuadrado continúa intacta y enlazada a `KAI-RES-2026-000001`: 12 de diciembre de 2026, de 12:00 a 22:00, con S/500 verificados. La reserva quedó en estado `confirmed`, la fecha está bloqueada y el CRM avanzó a `Ganado` conservando su historial.

Avisos abiertos, no bloqueantes para staging:

- las RPCs transaccionales son `SECURITY DEFINER` por diseño y validan sesión, organización, rol y alcance antes de mutar datos;
- la limpieza física periódica de holds vencidos queda para operación programada; la disponibilidad y toda escritura crítica los consideran vencidos inmediatamente, y cada transacción de reserva limpia los holds obsoletos antes de bloquear una fecha;
- falta el smoke manual autenticado con una cuenta `COMERCIAL` real; el smoke con `SUPERADMIN` ya pasó;
- la generación, envío, firma y almacenamiento privado del contrato pertenecen al Hito 5; Hito 3 registra la confirmación de fecha y muestra ese paso como pendiente;
- la protección de contraseñas filtradas de Supabase Auth continúa desactivada.

## Resto de Hito 4 e Hitos 5 a 7

No iniciados. El formulario público de consultas y los enlaces privados de clientes requieren el resumen comprobable de este corte y aprobación explícita antes de avanzar.
