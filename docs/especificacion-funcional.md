# KAIROS OS
## Documento maestro de requerimientos funcionales, arquitectura y plan de construcción con Codex

**Versión:** 1.0 — 19 de octubre de 2026  
**Producto:** KAIROS OS · CRM, reservas y operaciones del Salón de Recepciones Kairós  
**Organización:** Kairós · Pilcomayo, Huancayo, Perú  
**Clasificación:** Uso interno / especificación de desarrollo  
**Destinatarios:** Dirección, administración, coordinación de eventos y desarrollador asistido por Codex  
**Estado:** Especificación propuesta; contiene decisiones pendientes que deben aprobarse antes de la puesta en producción.

> **Mandato para el desarrollador:** Construir un producto web real, persistente, seguro y desplegable. NO entregar un prototipo de pantallas, datos simulados ni botones de demostración. Cada operación visible debe guardar, consultar y actualizar datos en una base PostgreSQL real y respetar los permisos definidos en este documento.

---

# 0. Resumen ejecutivo y decisiones fundamentales

KAIROS OS centraliza las consultas, clientes, visitas, cotizaciones, seguimiento, reservas, operaciones y cobros del salón. Todo usuario autorizado trabaja sobre **la misma base de datos**. Lo que un asesor registre debe aparecer en el calendario, en la ficha del cliente, en el panel de administración y en los reportes, con permisos y estados consistentes.

**Resultado de la primera versión:** un asesor registra a una persona interesada, identifica fecha, tipo de evento, cantidad de asistentes y necesidades, programa seguimiento, genera una cotización, solicita un bloqueo temporal o reserva y finalmente registra el contrato y abono para confirmar la fecha. Un cliente externo consulta disponibilidades generales mediante un link público y puede abrir un segundo link privado para ver los datos permitidos de SU evento.

**Decisión técnica recomendada:** aplicación full-stack con Next.js (App Router), TypeScript, Tailwind CSS y shadcn/ui; Supabase PostgreSQL, Auth y Storage; despliegue en Vercel y repositorio GitHub. No mezclar Firebase, Supabase y varias bases de datos para la misma función. Vercel aloja la aplicación; Supabase aloja los datos, usuarios y documentos.

**Prioridades no negociables:** impedir dobles reservas; registros persistentes; permisos comprobados en servidor y base de datos; historial de cambios; protección de información personal; enlaces externos limitados; conciliación clara entre reservas y pagos; móviles utilizables; pruebas automáticas de procesos críticos.

**Alcance por etapas:**

| Etapa | Objetivo | Componentes |
|---|---|---|
| MVP / P0 | Operación comercial y calendario verdaderamente funcional | Usuarios y roles; CRM; seguimientos; calendario; bloqueos; reservas; portal público; ficha cliente; auditoría; panel básico |
| P1 | Administración y cierre comercial sólido | Cotizaciones PDF/versiones; catálogo de servicios; pagos/abonos; contratos adjuntos; tareas operativas; inventario básico; informes |
| P2 | Automatización y expansión | Avisos por WhatsApp mediante integración oficial; correo transaccional; automatizaciones; reportes avanzados; proveedores; firma electrónica; pagos en línea opcionales |

**Restricción comercial:** el Tarifario Maestro Kairós V3.0 es un borrador de dirección. Excepto las referencias declaradas explícitamente como actuales por Dirección, las cifras intermedias y políticas propuestas NO se deben publicar ni activar sin aprobación. El sistema deberá distinguir `propuesto`, `aprobado` e `inactivo`.

---

# 1. Contexto real de Kairós y supuestos

## 1.1. Información operativa conocida

- Establecimiento: **Salón de Recepciones Kairós**, distinto de El Conquistador.
- Ubicación comercial: Pilcomayo, Huancayo, Perú.
- Eventos atendidos: bodas, matrimonios civiles, quinceaños, promociones, aniversarios, bautizos y actividades corporativas.
- Terreno de referencia: 1,200 m²; área techada 600 m² y zona verde libre 300 m².
- Capacidad comercial declarada: hasta 600 invitados sentados, **pendiente de cotejar aforo autorizado y distribución de montaje**.
- Elementos reportados: mesas, sillas, iluminación, decoración básica y limpieza. Inventario exacto por confirmar.
- La coordinadora apoya el programa y dirige el evento contratado el mismo día; no se presume wedding planner integral.
- Catering por terceros: Kairós no opera una cocina propia.
- Un cliente puede pedir solo el espacio, modalidad integral o servicios personalizados.
- Temporada particularmente importante para promociones: noviembre y diciembre.

## 1.2. Definiciones iniciales de producto

1. En versión 1 hay **un salón principal**: `venue_id = kairos_principal`. Diseñar esquema preparado para agregar más sedes o recursos, pero NO hacer una plataforma de múltiples empresas.
2. Cada evento ocupa el recurso `salon_principal`. **Por defecto, bloquear una jornada/día comercial completo para una reserva confirmada**; la Dirección podrá activar posteriormente la comercialización de dos eventos en una misma fecha únicamente con validaciones de horarios, montaje y desmontaje. Esto evita prometer la misma fecha dos veces durante el arranque.
3. Todas las fechas se presentan en hora local de **America/Lima**. Almacenarlas como `timestamptz` en UTC y convertir para la interfaz.
4. No se habilita reserva pagada automática desde internet en el MVP. El cliente solicita disponibilidad, y el equipo confirma contrato y pago validado.
5. Un mismo cliente puede generar **varios leads, cotizaciones y reservas** a lo largo del tiempo. No duplicar su ficha por cada evento.
6. Las reservas pasadas y los documentos nunca deben desaparecer por un clic accidental. Usar cancelación y trazabilidad en vez de borrado físico de datos comerciales.

## 1.3. Glosario operativo

| Término | Definición |
|---|---|
| Contacto / cliente | Persona natural o representante que consulta o contrata; existe una ficha única |
| Oportunidad / lead | Posibilidad de venta para un evento determinado, con estado comercial |
| Actividad / seguimiento | Llamada, mensaje, visita, tarea o recordatorio asignado a un usuario |
| Cotización | Propuesta de servicios, cantidades, precios y condiciones; puede tener versiones |
| Prebloqueo / hold | Retención temporal de la disponibilidad; vence si no se transforma en reserva |
| Reserva confirmada | Compromiso comercial que cumplió las condiciones internas de aprobación |
| Evento | Operación efectiva con fecha, duración, servicios, responsables y documentación |
| Bloqueo de calendario | Intervalo no vendible por evento, mantenimiento, cierre, reserva o retención activa |
| Pago verificado | Cobro validado por personal autorizado; no basta subir una captura |
| Portal público | Vista general anónima sin datos personales de otros clientes |
| Portal privado | Vista de un único evento accesible con token revocable y limitado |

---

# 2. Arquitectura general y criterios de selección

## 2.1. Stack recomendado

| Capa | Herramienta | Responsabilidad |
|---|---|---|
| Frontend | Next.js App Router + React + TypeScript | Rutas, componentes, formularios y vistas |
| UI | Tailwind CSS + shadcn/ui + Lucide | Diseño consistente y adaptable |
| Formularios | React Hook Form + Zod o equivalente | Validación de campos con esquema compartido |
| Calendario | FullCalendar (licencia y compatibilidad verificadas) o equivalente mantenido | Mes, semana, día, filtros y eventos |
| Backend | Next.js Server Actions / Route Handlers y servicios de dominio | Casos de uso, permisos, transacciones y API |
| Datos | Supabase PostgreSQL | Relaciones, índices, auditoría y reglas de no superposición |
| Identidad | Supabase Auth | Sesiones, invitación de trabajadores y recuperación |
| Archivos | Supabase Storage con buckets privados | Cotizaciones, contratos, comprobantes y adjuntos |
| Alojamiento | Vercel | Deploy de la app y variables de entorno |
| Código y CI | GitHub + GitHub Actions | Versionamiento, revisiones, pruebas y despliegue |
| Avisos | Correo transaccional opcional; WhatsApp manual primero | Evitar integrar mensajería costosa al inicio |
| Monitoring | Errores, logs, auditoría y alertas | Diagnóstico y continuidad |

## 2.2. Diagrama lógico

```text
                         CLIENTE SIN SESIÓN
                    /disponibilidad    /mi-evento/TOKEN
                               |
                               v
                     NEXT.JS - VERCEL
                    Web UI + API + reglas
                     /         |        \
              EQUIPO INTERNO   |     VALIDADOR DE ENLACES
             /admin  /crm       |      Y ACCESO LIMITADO
                               v
                           SUPABASE
                 Auth + PostgreSQL + Storage
                               |
         +---------------------+------------------------+
         |                     |                        |
      CONTACTOS        OPORTUNIDADES/RESERVAS      AUDITORÍA
         |                     |                        |
     SEGUIMIENTOS         ASIGNACIONES               REPORTES
         |                     |
     COTIZACIONES          CALENDARIO
         |                     |
       PAGOS              DISPONIBILIDAD
```

**Regla de arquitectura:** una fecha bloqueada no vive en un arreglo del frontend, un calendario distinto ni una hoja paralela. Existe una fuente de verdad transaccional: `schedule_allocations` en PostgreSQL. El calendario privado y público leen de la misma fuente con distintas políticas de exposición.

## 2.3. Requisitos de proyecto

- Repositorio privado de GitHub con ramas `main`, `develop` opcional y ramas de trabajo cortas.
- Entornos `local`, `staging` y `production` con bases de datos distintas y cuentas de prueba separadas.
- Migraciones SQL versionadas dentro del repositorio. Nunca editar tablas manualmente solo en producción.
- `.env.example` con nombres de variables, sin credenciales reales.
- `README.md` con instalación, scripts, pruebas y configuración de Supabase/Vercel.
- Tipos TypeScript generados desde el esquema de PostgreSQL cuando corresponda.
- Fijar versiones compatibles verificadas al iniciar el proyecto y revisar cambios importantes antes de actualizar.
- Zona horaria configurable por establecimiento, inicialmente `America/Lima`.

---

# 3. Identidad visual y experiencia de uso

KAIROS OS debe verse como un producto profesional, no como un CRM genérico abarrotado.

**Identidad recomendada:** carbón `#181716`, marfil `#F5F0E8`, champagne `#C5A46D`, superficies blancas y grises discretas. El dorado es acento y no reemplaza señales semánticas de error. Usar logo oficial de Kairós si Dirección entrega el archivo autorizado; nunca redibujarlo arbitrariamente. Tipografía de interfaz clara (Inter o similar); serif editorial solo para encabezados de marca.

**Principios UX:**

- Escritorio: barra lateral persistente y encabezado con buscador, notificaciones y usuario.
- Móvil: navegación compacta, tarjetas y formularios con controles táctiles; no depender del hover.
- Captura rápida: crear prospecto en menos de 60 segundos con campos mínimos.
- Búsqueda global por teléfono, nombre, evento, fecha y código de reserva.
- Colores de estados combinados con **etiquetas textuales**; nunca usar color como única señal.
- Formularios con mensajes útiles, estados vacíos claros, filtros guardados por usuario y confirmación para acciones irreversibles.
- Antes de cambiar la fecha de una reserva, advertir sobre impactos en calendario, contrato y comunicaciones.

**Navegación principal:** Inicio; CRM/Prospectos; Clientes; Calendario; Reservas; Cotizaciones; Tareas/Seguimientos; Pagos; Operaciones; Reportes; Configuración. Los módulos que estén en P1 pueden verse ocultos hasta activación, no como páginas rotas.

---

# 4. Usuarios, roles y matriz de autorización

## 4.1. Roles

- **SUPERADMIN / Propietario:** control del proyecto, empleados, roles, parámetros, precios aprobados, reportes financieros, correcciones excepcionales y revocación de accesos. Reservar el superadmin para un número mínimo de personas.
- **ADMINISTRADOR:** gestiona prospectos, clientes, calendario, reservas, cotizaciones, pagos y asignaciones; invita usuarios con roles subordinados si Dirección lo permite; no puede convertirse en superadmin.
- **COMERCIAL:** crea y edita sus oportunidades o las asignadas; ve disponibilidad; agenda visitas; emite cotizaciones desde tarifarios aprobados; solicita hold; no verifica pagos ni elimina reservas confirmadas.
- **COORDINADOR:** ve eventos confirmados y detalles operativos, gestiona el programa, montaje, proveedores y tareas; no altera los importes aprobados.
- **FINANZAS / CAJA:** consulta contratos/importes autorizados, registra y verifica abonos, emite resúmenes; no cambia fechas por su cuenta.
- **CONSULTA / LECTURA:** acceso a reportes y calendario según alcance designado, sin escritura.
- **CLIENTE:** NO tiene cuenta de empleado; entra por URL pública o un token privado de su reserva.

## 4.2. Matriz simplificada

| Acción | Superadmin | Administrador | Comercial | Coordinador | Finanzas | Consulta |
|---|---|---|---|---|---|---|
| Alta/edición de contactos | Sí | Sí | Propios/asignados | Lectura relevante | Lectura relevante | Según permiso |
| Seguimientos y visitas | Sí | Sí | Propios/asignados | Propios | No | Lectura |
| Ver calendario interno | Sí | Sí | Sí, con datos limitados | Sí | Sí | Lectura |
| Crear hold | Sí | Sí | Solicitar o crear dentro de política | No | No | No |
| Confirmar reserva | Sí | Sí, según requisitos | No | No | No | No |
| Cambiar/cancelar reserva | Sí | Sí, con motivo | Solicitar | Solicitar | No | No |
| Cotizar con lista aprobada | Sí | Sí | Sí | No | No | No |
| Aprobar descuento excepcional | Sí | Si delegado y bajo límite | No | No | No | No |
| Registrar comprobante | Sí | Sí | Subir para revisión | No | Sí | No |
| Verificar cobro | Sí | Delegable | No | No | Sí | No |
| Administración de usuarios | Sí | Limitada | No | No | No | No |
| Política de precios y seguridad | Sí | Solo parámetros delegados | No | No | No | No |
| Ver reporte de rentabilidad | Sí | Autorizado | No | No | Autorizado | No |

## 4.3. Condiciones de seguridad

- Registro público desactivado para empleados. Usuarios internos creados exclusivamente mediante invitación de personal autorizado.
- Sesión validada en cada llamada/acción que acceda a datos; RBAC aplicado por servidor y políticas RLS.
- Habilitar MFA para administradores y finanzas si lo permite el proveedor elegido.
- Usuario deshabilitado pierde el acceso a nuevas acciones de inmediato; preservar su autoría histórica.
- Nunca dar `service_role`, contraseñas, claves de Storage ni secretos de tokens en código enviado al navegador.
- Restringir exportación y descarga masiva de datos a roles autorizados.
- Permitir auditoría de altas, cambios de rol, verificaciones de pagos, cancelaciones, descuentos y modificaciones de reservas.

---

# 5. Módulo A — Panel de administración / Dashboard

**Ruta sugerida:** `/app`.

## 5.1. Indicadores de portada

1. Prospectos nuevos hoy / semana / mes.
2. Prospectos calificados: fecha, tipo y cantidad de invitados registrados.
3. Seguimientos vencidos, de hoy y futuros.
4. Visitas agendadas, realizadas y tasa de asistencia.
5. Cotizaciones enviadas en el período y valor cotizado.
6. Reservas confirmadas, valor contratado y señas verificadas.
7. Próximos eventos a 7 / 30 / 90 días.
8. Ocupación de sábados, domingos y lunes a jueves; social y corporativo.
9. Ingresos de pagos efectivamente verificados y saldos por cobrar, si P1 está activo.
10. Alertas: holds por vencer, solicitudes sin atender, pagos pendientes de verificar, conflictos detectados.

**Panel visual:** tarjetas KPI con comparación temporal; mini calendario; tabla “Próximas acciones”; embudo de ventas; listado “Eventos próximos”; filtros por fecha, usuario, tipo de evento y origen.

**Definición de métricas:** reserva confirmada ≠ oportunidad ganada sin cobro; facturación contratada ≠ efectivo recibido; tasa de conversión = reservas confirmadas / oportunidades calificadas elegibles del período, indicando método y fechas.

**Permisos:** un asesor ve métricas propias; administrador ve global; finanzas ve valores económicos que su rol autoriza.

**Aceptación:** los indicadores deben coincidir con filtros y registros de módulos base, sin cifras estáticas de demostración.

---

# 6. Módulo B — Clientes / contactos

**Ruta:** `/app/clientes` y `/app/clientes/[id]`.

## 6.1. Registro de cliente

Campos recomendados:

| Campo | Tipo / regla |
|---|---|
| `full_name` | Requerido; nombre y apellidos o razón social |
| `customer_type` | Persona / empresa / comité / institución |
| `phone_e164` | Requerido para contacto WhatsApp; normalizar prefijo `+51` cuando aplique; permitir otros países |
| `secondary_phone` | Opcional |
| `email` | Opcional con formato válido |
| `document_type`, `document_number` | Opcionales en captura inicial; requeridos solo si contrato/facturación los necesita |
| `organization` | Colegio, empresa, promoción, comité, etc. |
| `district`, `city` | Opcionales |
| `preferred_contact_channel` | WhatsApp / llamada / correo |
| `marketing_consent` | Consentimiento voluntario, fecha y versión de texto; separado de la prestación del servicio |
| `internal_notes` | Notas visibles solo internamente |
| `created_by`, `assigned_to` | Auditoría y responsable |
| `created_at`, `updated_at` | Tiempos de servidor |

**Detección de duplicados:** al crear un número ya asociado a otra ficha, mostrar coincidencia y proponer vincular una nueva oportunidad al contacto existente. El teléfono no debe ser restricción absoluta de unicidad: una empresa puede compartir número o un familiar puede gestionar varios eventos. La fusión de duplicados es una acción administrativa auditada.

## 6.2. Ficha 360°

Cabecera con nombre, teléfono, botón para abrir WhatsApp con texto prellenado, asesor asignado y última actividad. Pestañas: Resumen; Oportunidades; Reservas; Seguimientos; Cotizaciones; Documentos; Historial.

La ficha debe mostrar todas las oportunidades del cliente a lo largo de los años y permitir crear otra sin perder conversaciones anteriores. Los datos sensibles no salen a la vista pública.

## 6.3. Acciones funcionales

Crear, editar, buscar, filtrar, reasignar, exportar (solo autorizado), archivar y fusionar con confirmación. La eliminación definitiva se reserva a procesos legales/administrativos autorizados y debe revisar referencias antes de actuar.

---

# 7. Módulo C — CRM / oportunidades comerciales

**Rutas:** `/app/crm`, `/app/crm/nueva`, `/app/crm/[id]`.

## 7.1. Estructura de una oportunidad

- Identificador consecutivo legible: ejemplo `KAI-LEAD-2026-000123` (además de UUID interno).
- Contacto vinculado y asesor responsable.
- Tipo de evento: boda, matrimonio civil, quinceaños, promoción escolar, graduación, aniversario, bautizo, conferencia, corporativo u otro configurable.
- Fecha deseada principal y hasta tres alternativas; hora tentativa de inicio y fin.
- Invitados adultos, menores y total; estimación permitida antes de confirmar.
- Modalidad: `solo_local`, `integral`, `personalizado`, `corporativo`.
- Servicios de interés: mobiliario, decoración, catering, mozos, coordinación, audiovisual, sonido, ceremonia, etc.
- Presupuesto estimado o rango, origen de captación (Facebook Ads, Instagram, WhatsApp, referencia, visita, otro).
- Fecha y hora de primera consulta, próxima acción y fecha probable de visita.
- Decisor: persona, comité, pareja, empresa.
- Probabilidad y nivel de interés opcionales; no inventar puntuación automática sin reglas aprobadas.
- Notas, archivos, actividad de la línea de tiempo y fecha de cierre.

## 7.2. Embudo visible tipo Kanban

1. **Nuevo:** consulta recibida sin calificar.
2. **Contactado:** conversación iniciada.
3. **Calificado:** tiene tipo de evento, fecha tentativa, invitados y contacto.
4. **Visita programada:** reunión o recorrido con fecha.
5. **Visita realizada:** recorrido completado, impresiones registradas.
6. **Cotización enviada:** propuesta trazable compartida.
7. **Negociación / pendiente de decisión:** esperando respuesta, alternativas o aprobación.
8. **Ganado:** reserva confirmada y condiciones cumplidas.
9. **Perdido:** motivo obligatorio (precio, fecha, competencia, sin respuesta, otro).
10. **Descartado:** duplicado, consulta no calificada o fuera de servicio, con razón.

**Nota de diseño:** los estados de **venta** nunca sustituyen los estados de **ocupación del calendario**. Al registrar una oportunidad con fecha se crea, dentro de la misma transacción, un hold automático de 24 horas en `schedule_allocations`; si la fecha ya está ocupada, PostgreSQL rechaza el alta completa. La oportunidad puede seguir negociándose mientras el hold está activo, pero “Cotización enviada” por sí mismo no confirma la reserva.

## 7.3. Reglas de movimiento

- Arrastrar una tarjeta cambia el estado y registra `activity_log` con usuario/hora/estado previo/nuevo.
- `Ganado` únicamente tras vincular reserva confirmada; prohibir marcarlo de forma libre.
- `Perdido` requiere motivo; ofrece programar recontacto si resulta pertinente.
- Alertar duplicidad de oportunidad con mismo cliente, fecha y tipo; permitir si hay razón.
- Al cambiar asesor, transferir tareas futuras pendientes (decisión explícita) y notificar internamente.

## 7.4. Línea de tiempo central

Historial cronológico con llamadas, WhatsApp manual, reuniones, notas, cotizaciones, comprobantes recibidos, bloqueos, reservas, cambios y archivos. Cada registro contiene autor y hora. No simular una integración de WhatsApp: en MVP un clic abre WhatsApp y el asesor marca manualmente “mensaje enviado” con nota; mensajes entrantes no se sincronizan sin API real.

---

# 8. Módulo D — Seguimientos, tareas y visitas

**Rutas:** `/app/tareas`, `/app/visitas`.

## 8.1. Tarea de seguimiento

Campos: cliente, oportunidad, tipo (`llamada`, `whatsapp`, `visita`, `enviar_cotizacion`, `verificar_pago`, `otro`), título, descripción, responsable, fecha/hora de vencimiento, prioridad, estado (`pendiente`, `en_progreso`, `completada`, `cancelada`), resultado, nota y siguiente acción.

**Reglas:** una tarea vencida sin completar aparece en dashboard y bandeja; completarla requiere resultado; una nueva programación debe crear un nuevo registro o una versión auditable, no reescribir silenciosamente la historia. Recordatorios pueden ser internos primero y luego correo.

## 8.2. Visitas al salón

Agenda de visitas distinta del calendario de **eventos**; una visita no bloquea el salón para clientes. Registrar fecha/hora, asesor, participantes, modalidad, estado (`programada`, `realizada`, `no_asistio`, `reprogramada`, `cancelada`), notas, próximos pasos. Mostrar dos calendarios con filtros que eviten confusiones.

## 8.3. Ejemplo operacional

Una mamá escribe para quinceaños el 16 de octubre de 2027: asesor crea cliente + oportunidad y agenda visita para el sábado a las 11:00. Al realizarla, sube una nota, cambia estado y fija seguimiento para dos días después. Dirección puede ver todo en el panel, sin preguntarle a cada asesor.

---

# 9. Módulo E — Calendario de eventos, holds y disponibilidad (CRÍTICO)

**Ruta interna:** `/app/calendario`. **Ruta pública:** `/disponibilidad`.

## 9.1. Vistas y filtros internos

- Mes: resumen de fechas ocupadas, holds, bloqueos administrativos y eventos.
- Semana/día: franjas horarias reales, instalación y desmontaje.
- Lista: eventos ordenados con filtros avanzados.
- Filtros por tipo de evento, estado, asesor, coordinador, año/mes y recurso/espacio (futuro).
- Etiqueta legible combinando estado y tipo: `CONFIRMADA · BODA`, `HOLD · PROMOCIÓN`, `BLOQUEADO · MANTENIMIENTO`.
- Modal al pulsar evento: fecha/hora, cliente, número de invitados, modalidad, asesor, pago, documentos y acciones autorizadas.
- Actualización tras crear/editar/cancelar; opcional suscripción a cambios en tiempo real o refetch dirigido.

## 9.2. Semántica de colores

| Estado | Etiqueta y color de referencia |
|---|---|
| Disponible | Fondo neutro/claramente disponible |
| Retención / hold activo | Ámbar, etiqueta “RETENIDA” |
| Pendiente de validación de abono | Ámbar oscuro, etiqueta “POR VERIFICAR” |
| Confirmada | Verde oscuro o champagne contrastado, etiqueta “RESERVADA” |
| En curso | Azul profundo, etiqueta “EN EVENTO” |
| Bloqueo operativo | Gris oscuro, etiqueta “NO DISPONIBLE” |
| Cancelada / hold vencido | No ocupa fecha; queda visible solo en historial o filtro histórico |

El *tipo de evento* puede ir como insignia secundaria, sin reemplazar el color del estado.

## 9.3. Regla central de disponibilidad

**Nunca permitir dos asignaciones bloqueantes activas sobre el mismo recurso y el mismo intervalo operativo.** La validación debe vivir en PostgreSQL, no solo en el frontend. Un bloqueo efectivo comprende, cuando aplique, entrada de proveedores, montaje, ceremonia, evento, desmontaje y margen de limpieza.

**Configuración inicial:** “jornada exclusiva”: una reserva confirmada bloquea la fecha comercial y cualquier extensión operativa a la fecha siguiente. La posibilidad de volver a vender otra franja del mismo día se mantiene DESACTIVADA hasta que Dirección apruebe reglas claras. El modelo de intervalos preparado permite flexibilizar después sin reescribir la base.

**Intervalos:** utilizar formato semiabierto `[inicio, fin)`; dos intervalos que solo se tocan en el punto de corte no se superponen técnicamente, pero un buffer configurado de limpieza sí puede impedir vender consecutivamente. El cálculo se hace en el servidor con zona horaria explícita.

## 9.4. Estados de ocupación

- `free`: resultado calculado, no un registro.
- `held`: retención temporal activa con fecha/hora de vencimiento.
- `pending_verification`: evidencia de pago recibida bajo hold vigente, aún sin confirmación.
- `confirmed`: reserva aprobada con condiciones satisfechas.
- `in_progress`: el evento está desarrollándose.
- `completed`: realizado; permanece histórico y no crea ocupación futura adicional.
- `cancelled`: cancelado con motivo y política aplicada; libera el calendario si está autorizado.
- `expired`: prebloqueo vencido, liberado automáticamente.
- `blocked`: cierre administrativo, mantenimiento o uso interno con razón.

**Importante:** `completed` corresponde al evento/booking, pero la asignación de calendario histórica se conserva. No liberar ni borrar el registro histórico de ocupación de fechas pasadas; `blocking=false` solo para retenciones vencidas o cancelaciones justificadas y no significa eliminar historial.

## 9.5. Ventana de hold y vigencia

- La duración aprobada del hold es 24 horas. El alta CRM con fecha lo crea automáticamente y una extensión posterior requiere autorización, motivo y auditoría.
- El cron del sistema libera holds vencidos; **además**, todo intento nuevo de reservar ejecuta expiración de holds caducados dentro de la misma transacción antes de comprobar colisiones.
- Una captura de depósito pendiente de validación NO habilita una retención infinita. Mantiene el vencimiento del hold salvo extensión autorizada.
- Una extensión de hold registra autor, motivo, hora anterior y nueva fecha de vencimiento.
- El sistema no debe enviar al cliente “reserva confirmada” solo porque un asesor creó un hold.

## 9.6. Concurrencia y errores

Dos usuarios pueden abrir la misma fecha simultáneamente. El primero que confirme la transacción válida gana; el segundo recibe HTTP `409 CALENDAR_CONFLICT`, ve disponibilidad actualizada y puede elegir alternativa. **No basta refrescar el calendario cada minuto; la base de datos debe rechazar la colisión aun bajo solicitudes simultáneas.**

## 9.7. Eventos de más de un día

Si empieza 20:00 y termina 02:00 del día siguiente, el sistema almacena dos marcas completas con fechas distintas. Debe tratar montaje y desmontaje igualmente. Bajo política de jornada exclusiva, el portal público puede marcar ambos días como afectados si la ocupación se extiende a la segunda fecha; el administrador ve la precisión horaria.

---

# 10. Módulo F — Reservas y ciclo de vida

**Rutas:** `/app/reservas`, `/app/reservas/nueva`, `/app/reservas/[id]`.

## 10.1. Campos de reserva

`booking_code`, `customer_id`, `opportunity_id`, `venue_id`, `event_type_id`, `package_type`, `guest_count`, `event_date`, `event_start_at`, `event_end_at`, `setup_start_at`, `teardown_end_at`, `sales_owner_id`, `coordinator_id`, `quote_version_id`, `contract_id`, `total_contract_cents`, `currency=PEN`, `deposit_required_cents`, `deposit_verified_cents`, `status`, `confirmation_at`, `confirmed_by`, `cancelled_at`, `cancellation_reason`, `internal_notes`, `public_notes` (curadas), `created_at`, `updated_at`.

**El servidor genera código** legible tipo `KAI-RES-2027-000045`. No depender de un `count(*)` vulnerable a concurrencia; usar secuencia/identificador transaccional.

## 10.2. Transiciones de estado

```text
PROSPECTO -> COTIZADO -> HOLD_TEMPORAL -> PAGO_POR_VERIFICAR
                                            |
                     [contrato/condiciones aceptados + abono verificado]
                                            v
                                      CONFIRMADA
                                            |
                                      EN_PREPARACIÓN
                                            |
                                        EN_CURSO
                                            |
                                        FINALIZADA

HOLD_TEMPORAL/PAGO_POR_VERIFICAR -> VENCIDA (libera fecha)
HOLD_TEMPORAL/CONFIRMADA -> CANCELADA (solo con permiso y motivo)
CONFIRMADA -> REPROGRAMADA (acción especial, reasigna intervalo con transacción)
```

La oportunidad se marca `Ganado` cuando exista una **reserva confirmada**. Una cancelación posterior no borra el lead ni los pagos: agrega registros de cancelación y tratamiento económico.

## 10.3. Confirmación de reserva

**Precondiciones aprobadas para el bloqueo comercial:** cliente válido; disponibilidad verificada en transacción; fecha y hora de inicio; importe contractual; responsable; y abono de al menos **S/500 registrado y verificado** por un rol autorizado. La verificación de los S/500 confirma la fecha; después se envía el contrato con todos los detalles del programa y su firma no retrasa el bloqueo ya confirmado.

**Regla económica aprobada por Dirección el 20/10/2026:** el abono inicial para reservar es **S/500 verificados** y forma parte del total contratado. El saldo base se calcula como `total_contract_cents - 50000`; la cuota intermedia equivale al **50% del saldo base** y vence 15 días calendario antes del evento; el saldo final es el remanente después de todos los pagos verificados y vence **2 horas antes** del inicio. Si el contrato se confirma a menos de 15 días del evento, el abono de S/500 y esa cuota intermedia vencen inmediatamente. Esta regla define el calendario de cobro de cada contrato y **no constituye una tarifa oficial de servicios**.

**Ejemplo aprobado:** para un contrato de S/15,500, el abono inicial de S/500 deja un saldo base de S/15,000; la cuota intermedia es S/7,500 y el saldo final es S/7,500. Todos los cálculos se almacenan en céntimos enteros y nunca con números de punto flotante.

**Flujo:** administrador revisa documentación → clic “Confirmar reserva” → backend verifica permisos, pagos, contrato, ausencia de conflicto → transacción actualiza reserva y asignación de calendario → auditoría → se muestra confirmación → portal privado refleja nuevo estado.

## 10.4. Reprogramación segura

La nueva fecha debe estar libre. En una misma transacción: obtener bloqueo del recurso; liberar la asignación anterior cuando corresponda; crear/modificar la nueva asignación; registrar cambio y motivo; conservar la fecha anterior en historial. Si la nueva fecha está ocupada, no cambiar nada y notificar `409`. Requerir revisión de condiciones económicas/contrato y aceptación si las condiciones cambian.

## 10.5. Cancelación

No borrar físicamente reserva, contrato, cotización ni pagos. Solicitar motivo, quién solicita, fecha efectiva y decisión de pagos/cargos. La política de penalidades se configura **solo después de revisión legal y aprobación**; no calcular devoluciones o multas arbitrarias. La cancelación libera la fecha salvo si existe bloqueo operativo separado.

---

# 11. Módulo G — Tarifario, productos y cotizaciones (P1)

## 11.1. Regla maestra: precios autorizados

El sistema NO debe asumir que todas las tarifas del archivo `KAIROS_Tarifario_Maestro_por_Tipo_de_Evento_V3_0` están aprobadas. El documento distingue: **actual informado por Dirección** (alquiler hasta S/4,000; integral S/70 para 100 invitados hasta S/55 para 600) y **propuestas de trabajo** (interpolaciones, rangos, mobiliario, upgrades, extras y condiciones de pago). Fuente: Tarifario Maestro Kairós V3.0, páginas 2-5 y 12.

Crear entidades `price_lists`, `price_list_versions`, `services`, `service_prices`, `pricing_rules`, `approval_records` con propiedades `approval_status=proposed|approved|inactive`, fechas de vigencia, aprobador, autor, justificación, moneda y descripción verificable de inclusiones.

**Regla:** asesores cotizan exclusivamente versiones `approved` y vigentes. Un precio ilustrativo puede estar cargado en entorno de pruebas como `proposed`, pero **no aparecer en el portal público ni en botones de cotización final**. Direccion puede crear cotización manual excepcional con motivo y aprobación trazable.

## 11.2. Líneas de servicio

- **Kairós Espacios:** alquiler base del local + mobiliario adicional + servicios expresamente contratados.
- **Kairós Celebración:** paquete integral por invitado con alcance confirmado.
- **Celebración Plus:** mejoras aprobadas con suplemento.
- **Experiencia Kairós:** personalización superior condicionada a alcance real.
- **Kairós Corporativo:** alquiler por horas y servicios de tecnología/coffee break, previa validación de equipamiento.
- **A medida:** líneas personalizadas autorizadas, con precio, cantidad y alcance.

## 11.3. Tabla referencial para el motor (DESACTIVADA hasta aprobar)

**Alquiler social propuesto de hasta 8 horas, incluyendo únicamente mobiliario estándar para hasta 100 puestos:**

| Invitados declarados | Alquiler base propuesto | Situación |
|---:|---:|---|
| 1-100 | S/2,000 | Pendiente de aprobación |
| 101-200 | S/2,400 | Pendiente de aprobación |
| 201-300 | S/2,800 | Pendiente de aprobación |
| 301-400 | S/3,200 | Pendiente de aprobación |
| 401-500 | S/3,600 | Pendiente de aprobación |
| 501-600 | S/4,000 | Pendiente de aprobación |

**Mobiliario extra:** hipótesis S/32 por módulo de 1 mesa + 8 sillas, sobre la base de 100 puestos. Debe comprobarse stock. **No convertir a regla vigente por defecto.**

**Integral:** referencia Dirección: S/70 para 100 y S/55 para 600. Fórmula de interpolación propuesta entre 100 y 600: `precio_persona = max(55, 70 - 0.03 * (invitados - 100))`; permitir decimales. No aplicar en grupos inferiores a 100 sin regla explícita. El precio y su método deben ser configurables/versionados, nunca un número rígido enterrado en componentes React.

**Complementos propuestos:** Plus S/12/persona (mínimo S/1,800); Experiencia S/25/persona (mínimo S/3,500); hora extra S/250; ceremonia desde S/600; decoración superior desde S/900; coffee break corporativo desde S/16/persona. Todos pendientes de aprobación, proveedor y alcance final.

## 11.4. Editor de cotizaciones

**Datos:** cliente, oportunidad, evento, fecha, horario, invitados, modalidad, versión de precios, servicios seleccionados, partidas con descripción/cantidad/unidad/precio, subtotal, descuentos, cargos/impuestos configurables, total, anticipo sugerido, condiciones, vigencia de oferta, observaciones, asesor, aprobaciones y estado (`borrador`, `pendiente_aprobacion`, `aprobada`, `enviada`, `aceptada`, `rechazada`, `vencida`).

**Comportamiento:**

1. Seleccionar cliente + oportunidad. Autocompletar datos sin mezclar fechas de otras oportunidades.
2. Seleccionar modalidad y servicios. Mostrar cálculo desglosado y advertencia si precio no autorizado.
3. Validar aforo, número de sillas/mesas, disponibilidad de recursos y vigencia del tarifario.
4. Permitir descuento solo dentro del límite del rol; si excede, solicitar aprobación.
5. “Generar PDF”: documento descargable formal con logo, versión, fecha, código, cliente, desglose, inclusiones, exclusiones, vigencia y nota de disponibilidad. Guardar una copia inmutable.
6. “Enviar por WhatsApp”: abrir `wa.me` con mensaje y enlace seguro del PDF o archivo descargable según política. Registrar la acción; **no afirmar que se entregó ni leyó** sin integración.
7. Nueva modificación = **nueva versión** de la cotización. Las versiones enviadas no se reescriben en silencio.

## 11.5. Casuística real para probar flexibilidad

Una boda de alrededor de **350 personas** puede recibir **una propuesta personalizada de S/4,200**, con mesas, sillas, limpieza y obsequios pactados, si existe autorización comercial. Esa cifra es una **cotización concreta**, no la tarifa general del sistema. El sistema debe permitir precio manual y líneas “vino de cortesía” con costo interno contabilizado. Debe alertar si `43 mesas x 8 sillas = 344 puestos`, ya que falta comprobar los puestos adicionales de la mesa de honor u otro mobiliario para cubrir la cantidad comprometida. Nunca suponer que 43 mesas son suficientes para 350 invitados sin un plano validado.

---

# 12. Módulo H — Pagos, abonos y cuentas por cobrar (P1)

**Rutas:** `/app/pagos`, `/app/reservas/[id]/pagos`.

## 12.1. Registro de pago

Campos: `booking_id`, `amount_cents` (entero en céntimos), `currency=PEN`, `paid_at`, `payment_method` (transferencia, Yape, Plin, efectivo, tarjeta, otro), `reference`, `proof_file_id`, `recorded_by`, `verification_status` (`submitted`, `verified`, `rejected`, `reversed`), `verified_at`, `verified_by`, motivo de rechazo/reversión, comentarios.

**Saldo:** `saldo = importe_contratado - suma(pagos_verificados_no_revertidos)`; ajustes contractuales se modelan por separado. Un comprobante `submitted` nunca cuenta como dinero cobrado ni habilita confirmar por sí solo.

## 12.2. Plan de pagos

La regla activa aprobada es: S/500 verificados como abono inicial incluido en el total; luego 50% del saldo base (`total contractual - S/500`) con vencimiento 15 días calendario antes del evento; finalmente el remanente 2 horas antes del inicio del evento. Si al confirmar faltan menos de 15 días, el abono inicial y la cuota intermedia vencen inmediatamente. El sistema debe conservar importes y fechas pactadas por versión contractual, registrar cualquier excepción con motivo y autorización, y no reinterpretar este calendario como tarifa de servicios.

## 12.3. Seguridad y trazabilidad financiera

- Verificar pago exige rol autorizado y un registro verificable.
- Impedir doble aplicación del mismo `payment_reference` a la misma cuenta sin advertencia o regla de unicidad apropiada.
- Revertir pago crea ajuste y audita motivo, nunca borra comprobante.
- No almacenar número completo de tarjeta ni claves de aplicaciones bancarias.
- Archivos privados en Storage, acceso temporal y autorizado.
- Aviso de saldo y vencimientos solo cuando exista un canal de comunicación consentido y aprobado.

## 12.4. Reporte financiero mínimo

Monto contratado, cobrado verificado, saldo pendiente, vencido por reserva, método de pago, exportación CSV restringida y alertas de pagos próximos. **Costo y margen** son una fase superior: registrar costos reales de catering, coordinación, limpieza, personal, decoración y proveedores antes de afirmar rentabilidad.

---

# 13. Módulo I — Portal público y enlaces privados (CRÍTICO)

## 13.1. Portal público de disponibilidad

**URL ejemplo:** `https://reservas.tudominio.pe/disponibilidad` (dominio ilustrativo; no está adquirido).

**Lo que ve cualquiera:** logotipo, título Kairós, instrucciones breves, meses navegables, estado de días de interés, posible horario consultable si se decide habilitar, botón “Consultar esta fecha” y enlace/contacto WhatsApp oficial configurado. Mostrar máximo 12 meses inicialmente para reducir scraping; ampliar según ajustes. No mostrar nombres, números de teléfono, precios internos, motivo del evento ajeno, contrato, monto de abonos ni nombres de asesores.

**Estados públicos deliberadamente simples:** `Disponible`, `Consultar disponibilidad` (retenciones, capacidad parcial o incertidumbre operativa), `No disponible`. Si dirección aprueba política exclusiva por día, confirmar que una reserva ocupa la jornada para terceros, aunque técnicamente exista tiempo libre.

**Flujo “Consultar esta fecha”:** elegir día → formulario corto (nombre, WhatsApp, tipo de evento, invitados, comentario, consentimiento sobre uso de datos) → backend valida y registra nuevo lead con origen `portal_disponibilidad` → muestra número de solicitud y CTA opcional a WhatsApp. **El formulario no genera reserva confirmada ni bloquea fechas por sí mismo.**

**Prevención de abuso:** rate limiting, honeypot/CAPTCHA cuando haga falta, saneamiento de entradas, mínimos de datos, mensajes genéricos; límites de consulta por IP/identificador; `Cache-Control` breve o sin caché de información que pueda quedar obsoleta. Volver a comprobar en servidor antes de retener cualquier fecha.

## 13.2. Portal privado de un cliente

**URL ejemplo:** `https://reservas.tudominio.pe/mi-evento/t_<token-largo>` (ilustrativa).

**Contenido permitido, configurable por evento:**

- Código de reserva, nombre comercial del salón y modalidad contratada.
- Fecha, horario y tipo de evento de ese cliente.
- Estado actual: `pendiente de confirmar`, `reservado`, `reprogramado`, `cancelado`.
- Cantidad de invitados confirmados (si Dirección lo habilita).
- Indicador de siguientes pasos: visita, firma, confirmación del abono o reunión de coordinación.
- Nombre/teléfono comercial público de contacto de Kairós.
- Opcional P1: total, abono y saldo **solo con autorización de exposición individual**.

**Reglas del token:** aleatorio criptográficamente seguro, suficiente entropía (≥128 bits; preferir ≥256), almacenar **solo hash** en base, fecha de expiración opcional definida por política, facultad de revocación y rotación, comparar con método seguro, endpoint sin índice por identificador predecible, `noindex`, no meter datos personales en parámetros. Para prevenir filtraciones usar `Referrer-Policy: no-referrer`, evitar analíticas invasivas y no cargar trackers de terceros en ese portal; preferir cookie/session temporal derivada cuando convenga en lugar de propagar el token a URLs de terceros. Rate limiting.

**El cliente no puede:** consultar otras fichas, ver listas de eventos, editar libremente fechas, verificar sus pagos, acceder a precios privados, revisar contratos de terceros ni descubrir registros enumerando IDs. El enlace privado no equivale a inicio de sesión interno.

## 13.3. Generación y caducidad de enlaces

Un administrador genera link desde reserva; al “Copiar enlace” se registra el evento. Puede “Revocar enlace” y “Crear enlace nuevo”; el anterior deja de funcionar. El cambio de estado de la reserva se refleja en la misma ficha salvo revocación. Para políticas más estrictas, exigir último tramo del teléfono u OTP antes de mostrar importes/documentos; esa autenticación reforzada es P2.

## 13.4. Mensajes de ejemplo

**Disponibilidad pública:** “Esta fecha aparece disponible para consultas. La disponibilidad se confirma únicamente con nuestro equipo y al completar las condiciones de reserva.”

**Reserva privada confirmada:** “Tu evento está reservado para el domingo 19 de septiembre de 2027. Horario y servicios según contrato. Si necesitas reprogramar, comunícate con Kairós.”

Los mensajes se generan desde **datos reales** y deben evitar garantías que el estado no soporte.

---

# 14. Módulo J — Preparación y operación del evento (P1)

**Ruta:** `/app/operaciones/[bookingId]`.

Cada reserva confirmada genera, opcionalmente, un tablero de producción:

- Responsable comercial, coordinadora y encargado operativo.
- Lista de proveedores externos (catering, audiovisual, DJ, decorador) con datos de contacto internos.
- Ficha de necesidades: menús, menores, alergias comunicadas, invitados finales, manteles, mesas, sillas, escenario, ceremonia, horarios, ingreso y salida de proveedores.
- Inventario planificado y disponible: modelos y cantidades reales de mobiliario.
- Cronograma de evento: instalación, recepción, ceremonia, discursos, vals, comida, celebración y desmontaje, personalizable.
- Archivos: plano de distribución, contrato, anexos, acta de entrega/devolución, autorizaciones técnicas.
- Checklist con responsable, fecha límite, estado y evidencia: contrato, anticipo, servicios, plano, proveedores, menú, seguridad, limpieza, coordinación, cierre.
- Registro final de incidencias, daños, devolución de mobiliario, comentarios del cliente y cierre.

**Regla:** la coordinadora dirige los hitos del programa pactado y no se le asigna automáticamente la responsabilidad de wedding planner integral. El campo de alcance contratado evita prometer servicios inexistentes.

---

# 15. Módulo K — Configuración y administración del sistema

**Ruta:** `/app/configuracion` (solo autorizados).

## 15.1. Secciones

1. **Organización:** nombre comercial, RUC opcional, dirección comercial, logo, WhatsApp oficial, correo, zona horaria y enlaces.
2. **Sede y recursos:** salón, jardines y posibles espacios futuros, aforo comercial y aforo legal validado, modalidad de exclusividad diaria, horas permitidas, buffers.
3. **Usuarios:** invitar, activar, bloquear, asignar rol, resetear acceso, permisos delegados y grupos.
4. **Eventos:** catálogo de tipos, modalidades, servicios, orden/colores de etiquetas, sin eliminar categorías utilizadas.
5. **Precios:** tarifario con estado de aprobación, vigencias, listas, aprobación de descuentos y costos.
6. **Reservas:** duración de holds, condiciones de confirmación, montos, ventanas para cancelación/reprogramación, configuración legal aprobada.
7. **Documentos:** plantilla con logo, cabeceras y pies, textos contractuales revisados.
8. **Notificaciones:** reglas habilitadas, plantillas aprobadas, horarios razonables y canales.
9. **Auditoría:** registro de acciones, filtros por usuario, tabla, fecha y objeto.
10. **Privacidad:** consentimiento, derechos ARCO, retención, exportación individual, control de enlaces.

## 15.2. Aprobación formal de ajustes sensibles

Cambiar capacidad, descuentos máximos, política de hold, servicios incluidos, condición de confirmación o tarifas requiere superadmin o flujo de aprobación equivalente, historial de versión y motivo. Algunas opciones requieren doble confirmación y no son retroactivas a contratos ya aceptados.

---

# 16. Diseño de base de datos relacional

## 16.1. Convenciones obligatorias

- Identificador primario: `uuid` generado por servidor, más códigos legibles en tablas que lo requieran.
- Timestamps `created_at`, `updated_at` y `deleted_at` (solo donde corresponda). Usar `timestamptz` UTC y conversión local en interfaz.
- Dinero en **entero de céntimos** (`bigint`), nunca `float` para sumas; porcentaje con decimal estable o base points.
- Moneda inicialmente `PEN`, arquitectura extensible; no asumir conversiones.
- `not null`, `check`, llaves foráneas, `unique` e índices desde la primera migración.
- Columnas `created_by`/`updated_by` cuando auditen responsabilidad; triggers de `updated_at`.
- Datos privados y pagos en tablas restringidas, no incrustados en JSON público.
- Se prohíbe usar Storage o un arreglo en el navegador como fuente primaria del calendario.

## 16.2. Tablas núcleo (P0)

| Tabla | Propósito y campos esenciales | Relaciones |
|---|---|---|
| `organizations` | `id`, `name`, `timezone`, `contact_phone`, `settings` | Raíz futura de sedes |
| `venues` | `id`, `organization_id`, `name`, `capacity_declared`, `capacity_authorized`, `exclusive_day_policy`, `active` | Sede que puede reservarse |
| `venue_resources` | `id`, `venue_id`, `name`, `capacity`, `exclusive`, `active` | Inicial: `salon_principal` |
| `profiles` | `user_id` de Auth, `organization_id`, `name`, `status` | Identidad interna |
| `user_roles` | `user_id`, `role`, `organization_id`, `granted_by` | Autorización y RLS |
| `customers` | `id`, `organization_id`, nombre, teléfonos, contacto, datos opcionales, consentimientos | Cliente recurrente |
| `event_types` | `id`, `name`, `slug`, `active`, `sort_order` | Tipos configurables |
| `opportunities` | `id`, `customer_id`, `event_type_id`, `desired_date`, `guests`, `pipeline_status`, `assigned_to`, `source`, `budget_cents` | Intentos de venta |
| `opportunity_alternate_dates` | `opportunity_id`, `desired_date`, `rank` | Alternativas |
| `crm_activities` | `id`, `opportunity_id`, `customer_id`, `author_id`, `kind`, `description`, `occurred_at` | Línea de tiempo |
| `tasks` | `id`, `opportunity_id`, `assignee_id`, `due_at`, `status`, `type`, `result` | Seguimiento |
| `visits` | `id`, `customer_id`, `opportunity_id`, `staff_id`, `start_at`, `end_at`, `status`, `notes` | Recorridos del local |
| `bookings` | `id`, `venue_id`, `customer_id`, `opportunity_id`, `booking_code`, `status`, horarios, invitados, `quote_id`, responsables | Contrato/reserva |
| `schedule_allocations` | `id`, `resource_id`, `booking_id` opcional, `opportunity_id` opcional, `allocation_kind`, intervalo, `blocking`, `hold_expires_at`, `release_reason` | **Fuente de disponibilidad** para holds CRM y reservas |
| `share_links` | `id`, `booking_id`, `token_hash`, `expires_at`, `revoked_at`, `scope`, `created_by` | Portal privado |
| `audit_logs` | `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `occurred_at`, `request_id` | Cambios sensibles |
| `system_settings` | `organization_id`, `key`, `value_json`, `version`, `approved_by` | Políticas activas |

**Índices específicos:** `customers(phone_e164)`, `opportunities(assigned_to,pipeline_status)`, `opportunities(desired_date)`, `tasks(assignee_id,due_at,status)`, `bookings(venue_id,event_start_at,status)`, `share_links(token_hash)` unique, `schedule_allocations(resource_id,start_at,end_at,blocking)` más GiST por intervalo.

## 16.3. Tablas de expansión (P1)

| Tabla | Campos esenciales y relación |
|---|---|
| `service_catalog` | Servicio, unidad, descripción, estado, proveedor propio/tercero |
| `price_lists` y `price_list_versions` | Título, estatus, aprobación, fechas de vigencia, versión |
| `pricing_rules` | Fórmula o tramos versionados, configuración auditable; sin ejecutar fórmulas arbitrarias desde la UI |
| `quotes`, `quote_versions`, `quote_lines` | Cotización, snapshot inmutable, desglose de partidas y autorizaciones |
| `discount_approvals` | Cotización, descuento, solicitado/aprobado por, motivo y fecha |
| `payment_schedules` y `payment_installments` | Cuotas e importes pactados, vencimientos |
| `payments` | Abono con estatus verificado, referencia, comprobante y autor |
| `payment_adjustments` | Reversión/ajuste auditado |
| `files` | Metadatos, propietario, bucket/path privado, tipo MIME, tamaño y control de acceso |
| `contracts` | Archivo, versión de términos, firma/aceptación, fecha, estado |
| `vendors` | Proveedor, especialidad, teléfono, condiciones y evidencias |
| `event_checklists`, `checklist_items` | Tareas operativas de eventos |
| `furniture_items`, `resource_requirements` | Stock verificado, mesas/sillas planificadas y reservas de inventario |
| `notifications`, `notification_deliveries` | Mensajes, canal, estado, reintentos y destinatario |
| `event_incidents` | Daños, incidencias, fotografías y responsables |

## 16.4. Relaciones y restricciones cardinales

- `customers 1:N opportunities`; `customers 1:N bookings`.
- `opportunities 0:N quotes`, pero **máximo una reserva activa para una misma oportunidad**, salvo un caso aprobado de evento compuesto; manejar unicidad parcial si se define así.
- `bookings 1:N schedule_allocations`, porque un evento podría bloquear más de un recurso en versiones futuras.
- `bookings 0:N payments`, `bookings 0:N share_links` y `bookings 0:N contracts`.
- `quote_versions 1:N quote_lines`; una reserva apunta a **versión exacta aceptada** de cotización.
- Las referencias entre tablas deben pertenecer a la misma organización y sede cuando corresponda; verificar tanto por código como por constraints/triggers.
- Un nombre comercial y teléfono pueden cambiar; los PDFs de cotizaciones emitidos deben conservar el snapshot histórico de lo aceptado.

---

# 17. Protección transaccional contra dobles reservas

## 17.1. Esquema orientativo de restricción SQL

El programador deberá implementarlo mediante migraciones verificadas con la versión PostgreSQL de Supabase. Fragmento **conceptual implementable**, no sustituto de pruebas y políticas completas:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE schedule_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES venue_resources(id),
  booking_id uuid NULL REFERENCES bookings(id),
  allocation_kind text NOT NULL CHECK (
    allocation_kind IN ('hold','booking','maintenance','admin_block')
  ),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  blocking boolean NOT NULL DEFAULT true,
  hold_expires_at timestamptz NULL,
  release_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  CHECK (allocation_kind <> 'hold' OR hold_expires_at IS NOT NULL),
  CONSTRAINT prevent_overlapping_active_allocations
    EXCLUDE USING gist (
      resource_id WITH =,
      tstzrange(start_at, end_at, '[)') WITH &&
    ) WHERE (blocking = true)
);
```

**Matiz:** `blocking=true` representa asignación vigente. La retención vencida cambia a `blocking=false` mediante una operación transaccional y deja historial; nunca usar `now()` dentro del predicado del índice parcial. Para calendario histórico, asignaciones confirmadas finalizadas pueden conservar `blocking=true` sobre fechas pasadas; solo impiden duplicados históricos, no futuras reservas.

## 17.2. Procedimiento de creación de hold/reserva

**Requisito:** implementar como función RPC segura (`SECURITY DEFINER` cuidadosamente acotada y con `search_path` seguro) o transacción ejecutada en backend con credenciales de privilegio mínimo. Un conjunto de consultas independientes desde cliente no sirve.

```text
INICIAR TRANSACCIÓN
1. Validar sesión + rol + organización + recurso y ventana horaria.
2. Bloquear la fila del recurso: SELECT ... FOR UPDATE.
3. Convertir horarios a instantes UTC; aplicar exclusividad/buffers.
4. Liberar holds vencidos de ESE recurso y auditar la liberación.
5. Verificar colisiones en allocations que sigan blocking=true.
6. Insertar hold o convertir hold propio en booking.
7. Si constraint GiST indica superposición -> error 409, ROLLBACK.
8. Actualizar oportunidad/reserva y escribir audit_logs en misma transacción.
COMMIT
9. Refrescar calendario y enviar aviso asíncrono (si existe integración).
```

**Idempotencia:** cada solicitud importante admite `idempotency_key` único por operación/actor para que doble clic, reintento de red o API duplicada NO creen dos holds, pagos, reservas ni notificaciones. Si el cliente repite la misma clave, devolver el resultado ya obtenido.

**Integridad adicional:** permiso requerido para `UPDATE blocking`, bloqueo de cambios manuales directos, constraint o trigger que valide `booking_id` y resource del mismo venue, y disparador o servicio que mantenga sincronización entre el estado del booking y su asignación.

## 17.3. Casos de concurrencia obligatorios

- Dos asesores intentan crear un hold para la misma fecha a la vez: solo uno gana.
- Dos reservas con intervalos parcialmente superpuestos: una rechazada.
- Reserva que cruza medianoche y otra en la mañana siguiente: sin solapamiento si hay espacio y política lo permite; con política exclusiva/buffer, bloqueo correcto.
- Hold vencido no retenido por cron: un nuevo intento libera y puede ocupar.
- Confirmación de hold ya vencido: debe fallar y reevaluarse disponibilidad.
- Reprogramación a fecha ocupada: rollback total sin liberar definitivamente la reserva original.
- Reintento de confirmar reserva ya confirmada: operación idempotente, sin duplicar pagos ni asignaciones.

---

# 18. API, acciones de servidor y contratos de respuesta

**Diseño:** frontend consume funciones de aplicación; la API encapsula autorización, validación, transacciones y DTOs. Nunca exponer tablas de datos sensibles enteras por un endpoint `SELECT *` público.

| Método y ruta ilustrativa | Función | Acceso |
|---|---|---|
| `GET /api/me` | Usuario, rol, permisos | Sesión |
| `GET/POST /api/customers` | Buscar/crear cliente | Interno autorizado |
| `GET/PATCH /api/customers/:id` | Ficha/actualización | Interno autorizado |
| `GET/POST /api/opportunities` | Pipeline/alta | Interno autorizado |
| `PATCH /api/opportunities/:id/stage` | Cambio con validación | Comercial/admin |
| `GET/POST /api/tasks` | Agenda y seguimiento | Interno autorizado |
| `GET/POST /api/visits` | Programar y reportar visitas | Comercial/admin |
| `GET /api/calendar` | Eventos filtrados sin filtraciones | Interno autorizado |
| `POST /api/holds` | Crear prebloqueo atómico | Rol autorizado |
| `POST /api/holds/:id/extend` | Extender hold con motivo | Admin |
| `POST /api/holds/:id/release` | Liberar hold | Admin o creador según política |
| `POST /api/bookings` | Crear booking vinculado | Interno autorizado |
| `POST /api/bookings/:id/confirm` | Confirmar con validaciones | Admin |
| `POST /api/bookings/:id/reschedule` | Cambio atómico de fecha | Admin |
| `POST /api/bookings/:id/cancel` | Cancelar con motivo | Admin |
| `GET /api/public/availability` | Disponibilidad agregada sin PII | Público con rate limit |
| `POST /api/public/requests` | Crear consulta pública | Público con antiabuso |
| `GET /api/public/my-event/:token` | Detalle acotado de reserva | Solo token válido |
| `POST /api/bookings/:id/share-links` | Emitir nuevo token | Admin |
| `DELETE /api/share-links/:id` | Revocar | Admin |
| `GET/POST /api/quotes` | Cotizaciones versionadas | Comercial/admin |
| `POST /api/payments` | Cargar comprobante | Comercial/finanzas/admin |
| `POST /api/payments/:id/verify` | Aprobar cobro | Finanzas/admin |
| `GET /api/reports/summary` | KPIs por permiso | Interno autorizado |
| `POST /api/admin/users/invite` | Invitar usuario | Superadmin/admin delegado |
| `GET /api/admin/audit` | Auditoría | Admin autorizado |

**Contrato de error coherente:**

```json
{
  "error": {
    "code": "CALENDAR_CONFLICT",
    "message": "La fecha seleccionada dejó de estar disponible.",
    "request_id": "req_...",
    "details": { "resource": "salon_principal" }
  }
}
```

Códigos: 400 entrada inválida; 401 no autenticado; 403 sin permiso; 404 inexistente/no visible; 409 conflicto comercial o de calendario; 422 regla de negocio; 429 límite de solicitudes; 500 error con `request_id` y registro privado, sin volcar stacktrace al cliente.

**Rutas de datos públicos** entregan DTOs mínimos. `GET /api/public/availability?from=...&to=...` devuelve por fecha `available|inquire|unavailable`, sin adjuntar `booking_id`, nombre del contratante, fuente comercial ni notas.

---

# 19. Componentes de pantalla y navegación detallada

## 19.1. Pantalla de login

Logo; correo; contraseña o acceso seguro provisto; “Recuperar acceso”; mensajes sin revelar si un correo existe; salida de sesión; manejo de sesión expirada y redirección al destino autorizado.

## 19.2. Dashboard

Encabezado con mes seleccionado y filtros; fila KPI; lado izquierdo próximas tareas; lado derecho calendario resumido y próximos eventos; tabla de oportunidades recientes. Cada número abre listado filtrado correspondiente.

## 19.3. CRM

Vista `Kanban | Tabla`, selector de asesor, búsqueda por nombre/teléfono, filtros por etapa, fecha deseada y tipo de evento; botón `+ Nuevo prospecto`. Tarjeta muestra nombre, evento, fecha tentativa, invitados, última interacción y próxima acción. Clic abre ficha, no una pantalla distinta con datos duplicados.

## 19.4. Cliente 360°

Ficha, botón WhatsApp, badges de oportunidades, cronología cronológica, tabs, “Nueva oportunidad”, “Nueva tarea”, “Agendar visita”. El teléfono es clicable con código internacional normalizado.

## 19.5. Calendario

Barra de mes/semana/lista; filtros de tipo, estado y responsable; mini leyenda; selector de recursos; botón `+ Bloquear fecha`, `+ Nueva reserva`, `+ Visita` (esta última aparece en capa separada). Clic a fecha abre opciones con disponibilidad del momento. Clic a reserva muestra detalles y, según rol, reprogramación.

## 19.6. Nueva reserva

Wizard: `1 Cliente` → `2 Evento y fecha` → `3 Servicios` → `4 Cotización / importes` → `5 Condiciones y comprobante` → `6 Confirmación`. En MVP, etapas de cotización/pagos muestran campos mínimos o quedan bajo feature flag P1. Al volver atrás se conservan datos sin escribir reservas definitivas.

## 19.7. Detalle de reserva

Cabecera código, estado, fecha, cliente, botones visibles según permisos; pestañas `Resumen`, `Calendario`, `Pagos`, `Documentos`, `Operación`, `Historial`, `Enlace para cliente`. Trazar acciones como “Subir comprobante” y “Verificar pago” por separado.

## 19.8. Pantalla de configuración

Menú por secciones, formularios con valores actuales y referencias. Para opciones sensibles: mostrar modificación, confirmación, motivo y guardado auditado. Nunca indicar “Guardado” antes de recibir respuesta válida del servidor.

## 19.9. Estados vacíos y fallas de red

- Sin clientes: botón funcional “Agregar cliente”.
- Calendario sin eventos: mostrar días disponibles y guía sin eventos inventados.
- Error de red al guardar: conservar borrador local temporalmente sin marcar como guardado; permitir reintento idempotente.
- Sesión caducada: solicitar nuevo acceso sin ejecutar la mutación una segunda vez por accidente.
- Sin permiso: vista 403 clara, con vuelta al panel.

---

# 20. Seguridad, privacidad y cumplimiento en Perú

## 20.1. Alcance legal

El sistema procesará nombres, teléfonos, comunicaciones, documentos y posiblemente comprobantes. Debe cumplir los principios y obligaciones aplicables de la **Ley peruana N.° 29733** y su Reglamento aprobado por **Decreto Supremo N.° 016-2024-JUS**. Debe existir una revisión legal final del aviso de privacidad, bases de tratamiento, consentimientos cuando procedan, canales de ejercicio de derechos y plazos de conservación. Este documento define medidas técnicas, **no reemplaza una asesoría legal**.

**Referencia pública:** Autoridad Nacional de Protección de Datos Personales, https://www.gob.pe/institucion/anpd/normas-legales/6554453-n-016-2024-jus

## 20.2. Controles de aplicación

- TLS/HTTPS en todas las rutas. Cookies seguras, `HttpOnly`, `SameSite` según flujo, sesión con vencimiento y renovación apropiada.
- Autenticación y autorización comprobadas en cada Server Action / Route Handler y no solo en navegación.
- Activar RLS y grants mínimos en toda tabla expuesta, revocar acceso anónimo a tablas privadas y denegar por defecto.
- Usar vistas/servicios públicos de solo lectura con columnas mínimas: **ninguna tabla de clientes o reservas expuesta directamente al rol anónimo**.
- RLS de asignación/organización/rol; funciones de privilegio elevado con alcance restringido, revisión del `search_path`, parámetros y permisos `EXECUTE`.
- Validación compartida con Zod/SQL: teléfonos, correo, enums, cantidades, tamaños, longitudes y rutas.
- Evitar XSS (sanitizar contenido y evitar HTML libre), inyección SQL (consultas parametrizadas), CSRF, SSRF en integraciones, carga insegura de archivos y escalamiento de privilegios.
- Aislar secretos de servidor; `.env` fuera de Git; rotarlos al existir filtración.
- Archivos: buckets privados, tamaño máximo y MIME permitido, nombres no ejecutables, validación del lado servidor, antivirus/proveedor opcional según riesgo, URL firmada de corta duración, no publicar documentos en directorios estáticos.
- Rate limiting de login, disponibilidad pública, solicitudes, enlaces privados y exportación.
- Registros no deben incluir contraseñas, tokens, documentos íntegros ni información de tarjetas.
- Cabeceras de seguridad: CSP compatible, HSTS, `X-Content-Type-Options`, `Referrer-Policy` y protección de embedding según necesidad.
- Políticas de deshabilitación/invitación de usuarios, MFA para roles sensibles y contraseñas administradas por Auth.

## 20.3. Controles de datos

- Consentimiento de marketing separado del trámite de una reserva; no asumir que escribir por WhatsApp autoriza campañas masivas.
- Datos mínimos necesarios. Documento de identidad solo cuando haga falta para contrato/comprobante.
- Información financiera visible según rol y necesidad de trabajo.
- Función administrativa para gestionar solicitudes de acceso, rectificación y eliminación según obligaciones y límites legales.
- Definir y aprobar período de conservación por tipo de dato y procedimientos de anonimización.
- Restringir entornos de desarrollo: usar datos sintéticos, nunca copias de clientes reales compartidas libremente con asistentes de IA.
- Establecer contrato y evaluación de encargados/proveedores de software que procesan datos, cuando corresponda.

## 20.4. Auditoría

Registrar: usuario; IP aproximada cuando sea legal y útil; request ID; fecha de servidor; acción; objeto; campos modificados filtrados; motivo de cancelación; descuentos; alta/cambio de rol; extensión de holds; rechazo/verificación de pagos; generación y revocación de enlaces. **No almacenar secretos ni capturas completas dentro del log.**

Auditoría debe ser de solo anexado para usuarios comunes; correcciones administrativas pasan por registros compensatorios, no borrado silencioso.

---

# 21. Notificaciones y automatizaciones

## 21.1. MVP sin integración WhatsApp

- Botón “Abrir WhatsApp” con número del cliente y mensaje prellenado; el usuario envía manualmente.
- Recordatorios de tareas en dashboard.
- Aviso interno de hold próximo a vencer y abono pendiente de verificación.
- Alerta de nueva solicitud desde portal público a bandeja del CRM; correo opcional si está configurado.

## 21.2. P1/P2: motor de notificaciones

Implementar **outbox** transaccional: cuando se confirma una reserva, se guarda el evento de negocio y el pendiente de notificación en la misma transacción. Un trabajador asíncrono envía avisos con reintento, deduplicación, logs de estado y control de consentimiento. Nunca enviar avisos solo desde un `useEffect` de frontend.

Eventos candidatos: lead nuevo; tarea próxima; visita mañana; hold por vencer; nueva reserva confirmada; cambio de fecha; pago verificado; cuota próxima; evento dentro de 30/7/1 días. Los avisos externos requieren plantillas revisadas y preferencia de canal.

**Cron:** en Vercel, un plan Hobby no permite cron de frecuencia subdiaria; para liberar holds de forma periódica preferir un scheduler compatible con la frecuencia y el presupuesto contratado. Independientemente del scheduler, la operación de crear reserva siempre verifica/expira holds vencidos transaccionalmente para que la seguridad no dependa de un cron puntual. Procesamientos programados deben ser idempotentes y llevar credenciales separadas.

---

# 22. Reportes y KPIs (P0 básico / P1 completo)

| Indicador | Fórmula / origen | Filtros |
|---|---|---|
| Leads nuevos | Oportunidades con `created_at` en período | Asesor, campaña, tipo |
| Leads calificados | Oportunidades que completan datos mínimos | Período, asesor |
| Visitas agendadas | Registros de visitas creados/programados | Mes, asesor |
| Tasa de visita realizada | Visitas realizadas / visitas que debían ocurrir | Asesor, período |
| Cotizaciones enviadas | Versiones con `sent_at` | Responsable, tipo |
| Conversión comercial | Reservas confirmadas / oportunidades calificadas del conjunto definido | Origen, asesor, período |
| Valor contratado | Suma de importes confirmados no cancelados, con regla de ajustes | Fecha comercial / evento |
| Cobranza real | Suma de pagos verificados no revertidos | Fecha de pago, método |
| Saldo por cobrar | Contrato ajustado - pagos verificados | Mes de evento |
| Ocupación | Días vendibles con reservas confirmadas / días vendibles del período | Fin de semana, tipo |
| Tiempo de primera respuesta | Primer registro de atención - hora de entrada | Origen, asesor |
| Pérdidas por motivo | Oportunidades perdidas agrupadas por motivo | Fecha, etapa |
| Margen estimado | Contratado - costos directos verificables | Evento, tipo, proveedor |

**Cuidado estadístico:** si un lead llega en octubre pero reserva en noviembre, la definición temporal debe ser clara. Conservar filtros y fuente, exportar CSV por personal autorizado y mostrar “sin datos” antes que ceros engañosos. Reportes pesados pueden usar vistas materializadas refrescadas, pero no se convierten en fuente de verdad operacional.

---

# 23. Requisitos no funcionales y disponibilidad técnica

## 23.1. Rendimiento objetivo (medible, no garantía contractual)

- Dashboard inicial: objetivo p95 ≤ 3 segundos en conexiones ordinarias y bases de tamaño inicial, tras optimización.
- Consultas principales: objetivo p95 API ≤ 800 ms para filtros típicos, sujeto a infraestructura y carga reales.
- Calendario: cargar por rango de fechas visible, no todos los eventos históricos al abrir.
- Búsqueda: índices de texto/teléfono con paginación; límites de 25-50 registros por página.
- Todos los listados con filtros en servidor y paginación; evitar descargar 10,000 clientes al navegador.

## 23.2. Compatibilidad y accesibilidad

- Chrome, Edge y Safari en versiones razonablemente recientes.
- Diseño móvil desde 360 px, tablet y escritorio; formularios de visita/seguimiento y portal cliente prioritarios en celular.
- Accesibilidad: navegación de teclado, foco visible, contraste suficiente, etiquetas, errores asociados a campos y textos para estados; aspirar a WCAG 2.2 AA según presupuesto.
- Fechas accesibles con formato peruano `dd/mm/aaaa`; nunca intercambiar día y mes por configuración del navegador.

## 23.3. Respaldo y recuperación

- Definir propietario operativo del proyecto Supabase/Vercel/GitHub y acceso de recuperación.
- Contratar el nivel de respaldo que corresponda al riesgo comercial; verificar periodicidad y retención real del plan elegido.
- Los backups de PostgreSQL **no sustituyen los respaldos de objetos Storage**; proteger PDFs/comprobantes por separado.
- Ejecutar al menos una prueba de restauración en staging antes del lanzamiento y después periódicamente.
- Objetivo sugerido a aprobar: RPO ≤ 24 h y RTO ≤ 8 h; no presentarlo como un SLA garantizado sin verificar plan e infraestructura.
- Mantener exportaciones de datos y un procedimiento de operación manual si el sistema queda temporalmente fuera de línea.

## 23.4. Observabilidad

Errores centralizados, trazas de endpoints sensibles, monitoreo de uso y tasas de 500/409/429, tiempo de respuesta, fallos de jobs, acceso a documentos y fallos de envío. Prohibir logs con PII sensible innecesaria. Crear alertas a un administrador técnico cuando fallen migraciones, cron o políticas RLS.

---

# 24. Matriz de reglas de negocio comprobables

| ID | Regla | Prioridad | Resultado esperado |
|---|---|---|---|
| BR-01 | Una consulta nueva no bloquea fecha | P0 | Día sigue disponible mientras no exista asignación bloqueante |
| BR-02 | Hold activo impide asignación contradictoria | P0 | Segundo intento HTTP 409 |
| BR-03 | Hold vencido puede liberarse al reservar | P0 | Fecha se ofrece tras limpieza transaccional |
| BR-04 | Reserva solo al completar condiciones aprobadas | P0 | Sin documentos/abono exigible verificado no hay `confirmed` |
| BR-05 | Asesor no verifica pagos | P0 | Intento bloqueado 403/RLS |
| BR-06 | Asesor no puede cambiar reserva confirmada | P0 | Sin permiso/solicitud controlada |
| BR-07 | Cliente público nunca ve PII de otros | P0 | DTO reducido; RLS anónima restringida |
| BR-08 | Enlace privado muestra solo SU reserva | P0 | Token limitado y revocable |
| BR-09 | Cancelación conserva historial | P0 | Auditoría y booking conservado |
| BR-10 | Reprogramación es transaccional | P0 | Sin pérdida de fecha original ante error |
| BR-11 | Todas las pantallas usan la misma fuente | P0 | CRM/calendario/dashboard consistentes |
| BR-12 | Horas incluyen madrugada/buffers | P0 | No solapamiento oculto |
| BR-13 | Aforo autorizado no se inventa | P0 | Validar contra `capacity_authorized` cuando exista |
| BR-14 | Precios no aprobados no se venden | P1 | Tarifas `proposed` bloqueadas |
| BR-15 | Cotización enviada es inmutable/versionada | P1 | Nueva revisión crea versión nueva |
| BR-16 | Captura de pago no equivale a cobro | P1 | Saldo no disminuye sin verificación |
| BR-17 | Pagos y ajustes no se borran sin rastro | P1 | Reversión auditada |
| BR-18 | Personalización no cambia tarifa general | P1 | Caso de S/4,200 permanece excepcional |
| BR-19 | Mobiliario debe cubrir puestos comprometidos | P1 | Alerta de déficit / stock |
| BR-20 | Notificación duplicada no genera mensajes dobles | P2 | Idempotencia/outbox |

---

# 25. Pruebas automatizadas y criterios de aceptación

## 25.1. Estrategia mínima de QA

- **Unitarias:** reglas de fecha, estados, cuotas, dinero, validadores, cálculo de mesas y permisos.
- **Integración:** PostgreSQL migrado de cero, autenticación, RLS, constraints GiST, transacciones de reservas, versionado de cotizaciones.
- **E2E con Playwright:** navegador real en desktop y móvil con usuarios de prueba por rol.
- **Seguridad:** pruebas cruzadas de acceso entre roles y tokens, URLs revocadas, inyección, carga de archivos y recursos privados.
- **Carga/concurrencia:** múltiples peticiones al mismo intervalo para probar que SOLO una reserva bloqueante persiste.
- **Regresión:** cada error resuelto debe dejar un test.

## 25.2. Casos E2E obligatorios (P0)

| Caso | Pasos resumidos | Criterio de aceptación |
|---|---|---|
| T-01 | Admin invita asesor y asesor inicia sesión | Solo datos/acciones permitidas |
| T-02 | Crear cliente con teléfono válido | Persistencia y búsqueda inmediata |
| T-03 | Intentar crear cliente con teléfono ya usado | Advertencia y opción de reutilizar |
| T-04 | Crear lead desde WhatsApp manual | CRM e historial coherentes |
| T-05 | Crear lead por formulario público | Entra al CRM sin confirmar fecha |
| T-06 | Asignar asesor y cambiar etapa | Cambio visible y auditado |
| T-07 | Agendar tarea vencimiento mañana | Aparece en tablero correcto |
| T-08 | Agendar visita al local | Visible como visita, no bloquea fecha de evento |
| T-09 | Crear hold de fecha libre | Aparece retenida interna/públicamente según política |
| T-10 | Segundo hold igual | Rechazo 409 y sin doble asignación |
| T-11 | Dos reservas simultáneas con peticiones paralelas | Única operación ganadora |
| T-12 | Simular expiración de hold sin cron | Nueva transacción lo libera correctamente |
| T-13 | Intentar confirmar con documento/pago faltante | Negación y campos faltantes visibles |
| T-14 | Admin confirma con condiciones cumplidas | Reserva y lead ganado, calendario sincronizado |
| T-15 | Comercial intenta cancelar reserva | 403, sin cambio en base |
| T-16 | Admin reprograma a fecha ocupada | Rollback, fecha original conservada |
| T-17 | Admin reprograma a fecha libre | Nueva fecha visible, historial correcto |
| T-18 | Cancelar con motivo | No aparece vendida; conserva evidencia |
| T-19 | Enlace público de calendario | No expone nombre/monto/telefono de ningún cliente |
| T-20 | Enlace privado válido | Solo detalle autorizado de una reserva |
| T-21 | Revocar enlace privado | URL anterior devuelve 404/410 neutro |
| T-22 | Modificar parámetro sin permiso | Rechazo servidor/RLS |
| T-23 | Evento cruza medianoche | Ocupación calculada correctamente en fechas afectadas |
| T-24 | Refrescar app / abrir otro equipo | Cambios persisten y son consistentes |
| T-25 | Doble clic o reintento de POST | No duplica objetos gracias a idempotencia |
| T-26 | Exportar clientes desde usuario sin permiso | 403, no se filtran datos |
| T-27 | Subir documento permitido/prohibido | Restricciones aplicadas y descarga privada |
| T-28 | Cerrar sesión y abrir ruta privada | Redirección a login, sin exposición de datos |
| T-29 | Cambiar de perfil/rol | Datos y botones adecuados tras recarga de sesión |
| T-30 | Ajustar lista CRM y filtro calendario | Dashboard refleja mismo universo de registros |

## 25.3. Casos P1

T-31: cotizar con precio propuesto → denegar envío final; T-32: aprobar lista → habilitar; T-33: cambiar descuento excepcional → pedir aprobación; T-34: generar PDF con líneas y condiciones; T-35: nueva versión de cotización conserva anterior; T-36: subir captura de pago → saldo no cambia; T-37: verificar pago → saldo cambia; T-38: reversión audita y ajusta; T-39: 350 invitados con 43 mesas de 8 → advertir déficit; T-40: checklist conserva responsable y completitud.

## 25.4. Checklist de “terminado” por funcionalidad

Una función SOLO se da por completada cuando: interfaz lista; datos persistentes; validaciones implementadas; reglas de roles y RLS comprobadas; errores y estados vacíos; test unitario/integración/E2E proporcional; documentación de uso; revisión de cambios; ejecuta en staging y se ha comprobado manualmente. Ningún botón decorativo se cuenta como entregable.

---

# 26. Plan de implementación para Codex por hitos

## Hito 0 — Preparación del repositorio y decisiones (sin codificar reglas sin validar)

**Entregables:** repo, README, `.env.example`, convenciones, arquitectura, diseño de tablas, lista de decisiones pendientes y `AGENTS.md` para Codex. Crear proyecto Supabase staging; secretos solo en gestores adecuados. Salida: `npm run build`, `lint`, `typecheck`, test runner operativo.

## Hito 1 — Identidad, permisos y estructura de navegación

Crear proyecto Next.js, diseño UI base, login, invitación de usuarios, roles y permisos, tablas `organizations`, `venues`, `profiles`, `user_roles`, RLS, middleware/protección efectiva en servidor, tests de acceso y primeros datos de ejemplo.

**Puerta de aceptación:** comercial no puede ejecutar una función administrativa alterando directamente la URL o API.

## Hito 2 — CRM y seguimiento end-to-end

Clientes, deduplicación orientativa, oportunidades, Kanban, filtros, notas, tareas, visitas, búsqueda y dashboard básico. Actividades auditadas y estados consistentes. Prueba completa desde nuevo cliente a visita realizada.

**Puerta:** cerrar/reabrir sesión o cambiar de computador no pierde registros; lead desde portal todavía no se incluye en este hito si se hará en Hito 4.

## Hito 3 — Motor transaccional de calendario y reservas

Tablas booking y allocations; política de jornada exclusiva; selector de fecha; holds con expiración; administración de bloqueos; confirmación validada; reprogramación y cancelación; pruebas de concurrencia y cruces. La ocupación es la parte más crítica: no avanzar sin sus tests.

**Puerta:** prueba simultánea de dos administradores: solo una asignación efectiva.

## Hito 4 — Portal público y portal privado por token

Disponibilidad pública sin PII; formulario de consultas que crea lead real; emisión/revocación de enlaces individuales; visibilidad limitada; políticas de seguridad; pruebas contra enumeración y cross-access.

**Puerta:** un usuario anónimo nunca obtiene datos de otro evento y no reserva sin administración.

## Hito 5 — Cotizaciones, catálogo y pagos (P1)

Versiones de tarifas; aprobación; cotizaciones; PDFs; comprobantes privados; verificación; saldos; permisos de caja. Incluir caso personalizado y validación de mobiliario.

**Puerta:** ningún precio propuesto sale como vigente y ningún pago no verificado se presenta como cobrado.

## Hito 6 — Operaciones, reportes y calidad de producción

Checklists, documentación de eventos, métricas y filtros, auditoría visual, notificaciones básicas, respaldos y restauración de prueba, accesibilidad, performance y seguridad reforzada.

**Puerta:** entregar entorno staging evaluado con criterios del hito anterior y manual de usuarios.

## Hito 7 — Producción y estabilización

Dominio/subdominio definitivo, HTTPS, backups, alertas, datos maestros aprobados, importación asistida de cartera actual, creación de usuarios reales, capacitación, pruebas con 3 casos reales anonimizados, plan de rollback y soporte de incidencias.

**No promover a producción con datos reales** si no están superadas pruebas de permisos, disponibilidades y respaldo.

---

# 27. Indicaciones operativas para Codex

## 27.1. Reglas que debe obedecer el agente de programación

1. Leer íntegro este documento y usarlo como contrato funcional principal.
2. No inventar tarifas oficiales, aforo legal, duraciones vigentes, proveedor aprobado o políticas de penalidad.
3. Si una decisión de negocio está pendiente, hacer parámetro configurable, marcar su estado `pending_approval` y detener solo la parte que requiera resolución; continuar módulos independientes.
4. Antes de cada hito: explicar archivos a crear, migraciones, pruebas y riesgos. Trabajar en PR/commits pequeños.
5. Después de cada hito: ejecutar pruebas, validar UI y reportar evidencias, no afirmar “funciona” sin haberlo ejecutado.
6. Nunca poner secretos reales en código, capturas o mensajes.
7. Evitar un monolito de componentes gigantes; usar servicios de dominio, schemas de validación, repositorios y componentes reutilizables.
8. No confiar en restricciones de interfaz para autorización. Aplicar RLS, roles, transacciones e invariantes de negocio.
9. No alterar datos de producción al crear fixtures; trabajar primero sobre staging.
10. Documentar supuestos y problemas pendientes en `DECISIONES_PENDIENTES.md`.
11. No usar datos ficticios como resultado final en dashboard/API; los seeds demo deben ser claramente demo y exclusivos de entornos no productivos.
12. No editar precios o políticas de la empresa por inferencia. Mantener historial y versionado.

## 27.2. Estructura orientativa de repositorio

```text
kairos-os/
├─ AGENTS.md
├─ README.md
├─ DECISIONES_PENDIENTES.md
├─ docs/
│  ├─ especificacion-funcional.md
│  ├─ seguridad-rbac.md
│  ├─ diagrama-datos.md
│  ├─ despliegue.md
│  └─ pruebas-aceptacion.md
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/
│  │  ├─ (internal)/app/
│  │  ├─ disponibilidad/
│  │  ├─ mi-evento/[token]/
│  │  └─ api/
│  ├─ components/{ui,calendar,crm,bookings}/
│  ├─ features/{customers,opportunities,tasks,bookings,pricing,payments}/
│  ├─ lib/{auth,db,permissions,validation,time,money}/
│  └─ server/{services,repositories,policies}/
├─ supabase/
│  ├─ migrations/
│  ├─ seed.sql
│  └─ tests/
├─ tests/{unit,integration,e2e,security}/
├─ public/brand/
├─ .env.example
└─ package.json
```

**Adaptación permitida:** Codex puede proponer organización de carpetas alternativa si respeta independencia del dominio, autorización y testabilidad. No crear carpetas vacías solo para seguir el dibujo.

## 27.3. Prompt maestro listo para iniciar en Codex

> Actúa como arquitecto de software, ingeniero full-stack senior y QA de un sistema empresarial de reservas. Vas a construir KAIROS OS según `docs/especificacion-funcional.md`, que es el documento principal del producto. Primero lee el documento, inspecciona el repositorio y presenta un plan por hitos. Utiliza Next.js + TypeScript, Supabase PostgreSQL/Auth/Storage, Tailwind y shadcn/ui; prepara deploy en Vercel. Cada funcionalidad debe persistir en base real, tener validación en servidor y control de permisos. Las reservas deben protegerse contra cruces mediante transacciones y restricciones PostgreSQL, incluyendo concurrencia y expiración de holds. Nunca conviertas precios propuestos en tarifas oficiales. Implementa primero Hito 0 y Hito 1; ejecuta build, lint, typecheck y pruebas; informa qué quedó implementado, cómo probarlo y qué decisiones necesito aprobar. No avances al siguiente hito sin presentar un resumen comprobable y errores abiertos.

## 27.4. Prompt para cada hito posterior

> Lee `docs/especificacion-funcional.md` y el estado del repositorio. Ejecuta el Hito [N] respetando las reglas de negocio BR-[...] y pruebas T-[...]. Antes de codificar, enumera migraciones, rutas, servicios y tests afectados. Después implementa, ejecuta pruebas y un flujo E2E, corrige fallas y actualiza README, documentación y matriz de avance. No uses mock data en producción ni aceptes acciones que alteren estados solo en frontend. Si surge una decisión comercial no aprobada, regístrala como pendiente y no la supongas resuelta.

## 27.5. Prompt de auditoría final

> Audita KAIROS OS como si fuera a manejar reservas y pagos reales mañana. Verifica tablas, constraints, transacciones, RLS, secreto de Supabase, autorización en todas las acciones, links públicos, tokens, PDFs, uploads, backups y reportes. Ejecuta todos los tests unitarios, de integración, E2E y de concurrencia. Comprueba un flujo real: solicitud pública → prospecto → seguimiento → cotización → hold → abono verificado → reserva confirmada → enlace privado → reprogramación → evento finalizado. Devuelve lista priorizada de defectos, riesgos y evidencias. No declares producción lista si falla alguna prueba crítica.

---

# 28. Decisiones que Dirección debe aprobar antes de activar cada función

| ID | Pregunta a resolver | Valor provisional técnico | Bloquea |
|---|---|---|---|
| D-01 | ¿El salón se vende a una sola celebración por fecha? | **Aprobado: máximo un evento por día completo** | Política de calendario |
| D-02 | ¿Cuál es el horario válido de uso / hora máxima? | Parametrizable; 8 h es solo referencia del borrador | Cotización definitiva |
| D-03 | ¿Cuánto dura un hold? | **Aprobado: 24 horas** | Automatización de holds |
| D-04 | ¿El cliente puede solicitar hold por web? | No; solo consulta pública | Portal |
| D-05 | ¿Qué monto/documento confirma reserva? | **Aprobado:** S/500 verificados confirman la fecha y están incluidos en el total; contrato posterior sin retrasar el bloqueo; 50% del saldo base 15 días antes; remanente 2 horas antes; si faltan menos de 15 días, la cuota intermedia vence inmediatamente | Cobros/confirmación |
| D-06 | ¿Cuáles precios intermedios se aprueban? | Ninguno activado por defecto | Cotizaciones oficiales |
| D-07 | ¿Cuál es el stock exacto de mesas/sillas? | Por inventariar | Validación final mobiliario |
| D-08 | ¿Cuál es aforo legal autorizado por formato? | Sin cifra legal registrada por defecto | Promesas de aforo |
| D-09 | ¿Quién puede aprobar descuento/obsequio? | Superadmin inicialmente | Cotización avanzada |
| D-10 | ¿Qué datos se muestran con enlace privado? | Fecha, horario, tipo, estado y contacto Kairós | Portal privado |
| D-11 | ¿Cuándo vence un link privado? | Por defecto manualmente revocable; fecha configurable | Política de privacidad |
| D-12 | ¿A quién se envían avisos y por qué canal? | Dashboard/WhatsApp manual | Automatizaciones |
| D-13 | ¿Qué política se aplica a daños/cancelación? | Solo cláusula revisada legalmente | Contrato/penalidades |
| D-14 | ¿Cuál dominio se usará? | Pendiente de compra/configuración | Producción |
| D-15 | ¿Cuál correo/WhatsApp oficial figurará? | Configurable por administración | Portal y PDF |
| D-16 | ¿Quién administra tecnología, backups y facturación cloud? | Pendiente de designar | Producción |
| D-17 | ¿Se mostrará saldo económico en enlace del cliente? | No en MVP, activable después | Portal P1 |
| D-18 | ¿Se autoriza multi-evento por fecha? | No en MVP | Optimización de ocupación |

**Criterio:** decisiones comerciales abiertas no deben bloquear construir CRM ni seguridad, pero sí bloquean activar funciones que requieran reglas oficiales o afirmar tarifas vigentes.

---

# 29. Datos de prueba y criterios de configuración inicial

## 29.1. Catálogos iniciales de demostración

**Tipos:** boda, matrimonio civil, quinceaños, promoción escolar, graduación, aniversario, bautizo, evento corporativo, conferencia, reunión familiar y otro.  
**Modalidades:** solo_local, integral, personalizado, corporativo.  
**Origen del lead:** Facebook Ads, Instagram, WhatsApp, referido, visita presencial, web disponibilidad, otros.  
**Roles:** SUPERADMIN, ADMINISTRADOR, COMERCIAL, COORDINADOR, FINANZAS, CONSULTA.

## 29.2. Escenarios de demo que deben poder repetirse

- Cliente A consulta por boda de 350 invitados en septiembre de 2027, solicita alquiler y mobiliario personalizado. La cotización con obsequios debe ser manual y autorizada.
- Cliente B consulta quinceaños para esa misma fecha: puede crearse lead, pero no puede obtener segunda reserva confirmada.
- Cliente C organiza promoción de 500 alumnos/familiares para diciembre de 2027, con visita, seguimiento y cotización en proceso.
- Un usuario comercial y otro administrador intentan reservar el mismo sábado en paralelo; uno recibe conflicto.
- Administrador crea hold de una fecha que vence; un tercero puede consultarla después de expiración.
- Link privado de Cliente A se revoca y el token antiguo deja de dar acceso.

**No usar teléfonos ni nombres reales en seeds.** Crear teléfonos ficticios de prueba y marcar `DEMO` en staging. No importar automáticamente listas de WhatsApp sin revisión y consentimiento adecuado.

---

# 30. Entrega, infraestructura y operación diaria

## 30.1. Configuración inicial

1. Crear organización dueña de cuentas y repositorio privado; evitar cuentas personales de desarrolladores como único propietario.
2. Crear proyecto Supabase de staging y ejecutar migraciones/seed demo.
3. Configurar Auth de empleados, email SMTP adecuado y políticas RLS.
4. Conectar GitHub con Vercel para desplegar staging; almacenar variables seguras por entorno.
5. Ejecutar tests y revisión de seguridad. No compartir llave de servicio.
6. Preparar producción con credenciales propias; ejecutar solo migraciones probadas.
7. Configurar dominio y HTTPS; probar redirecciones y acceso en móvil.
8. Hacer copia inicial/restauración; definir procedimiento de soporte y accesos de emergencia.
9. Cargar únicamente tarifas autorizadas y catálogos aprobados; invitar empleados reales.
10. Validar un proceso con datos de ensayo y firmar aceptación funcional.

## 30.2. Checklist previo a cada deploy

- Tests unitarios y de integración pasan.
- E2E crítico de reserva/no-solapamiento pasa.
- Migraciones son reversibles cuando corresponda y mantienen datos históricos.
- Nuevas tablas tienen grants/RLS revisados.
- Verificados permisos de nuevas rutas.
- No hay credenciales en repo, bundles, logs ni PDFs.
- La funcionalidad funciona con errores de red y mensajes claros.
- Se han revisado entornos/env vars/dominos correctos.
- Se puede recuperar versión anterior sin perder integridad de nuevas migraciones.

## 30.3. Manual de rutina interna

**Inicio de jornada:** asesor revisa “Tareas hoy” y nuevas consultas; administración revisa “Holds por vencer” y pagos; coordinación revisa próximos eventos.  
**Al recibir consulta:** buscar por WhatsApp → crear/vincular cliente → registrar oportunidad → calificar → programar seguimiento/visita.  
**Al cotizar:** comprobar estado de la fecha y tarifario aprobado → emitir cotización con vigencia.  
**Al recibir comprobante:** cargarlo como “pendiente”; finanzas verifica.  
**Al confirmar:** administrador confirma y verifica que calendario cambie.  
**Antes de evento:** coordinadora completa checklist y valida montaje.  
**Después:** cerrar operación y dejar incidencias/feedback.

---

# 31. Anexo de trazabilidad: módulo → tablas → pruebas

| Módulo | Tablas predominantes | Tests mínimos |
|---|---|---|
| Autenticación / roles | `profiles`, `user_roles` | T-01, T-15, T-22, T-28, T-29 |
| Clientes | `customers` | T-02, T-03 |
| CRM | `opportunities`, `crm_activities` | T-04, T-05, T-06 |
| Seguimientos y visitas | `tasks`, `visits` | T-07, T-08 |
| Calendario/hold | `schedule_allocations`, `venues` | T-09 a T-13, T-23, T-25 |
| Reservas | `bookings`, `schedule_allocations` | T-14 a T-18 |
| Portal público | `opportunities` + DTO disponibilidad | T-05, T-19 |
| Portal privado | `share_links`, `bookings` | T-20, T-21 |
| Cotizaciones | `quotes`, `quote_versions`, `price_lists` | T-31 a T-35 |
| Pagos | `payments`, `payment_adjustments` | T-36 a T-38 |
| Operación/mobiliario | `event_checklists`, `furniture_items` | T-39, T-40 |
| Dashboard | vistas/consultas sobre CRM/calendario | T-24, T-30 |

---

# 32. Criterios de aceptación globales y definición de producto entregado

KAIROS OS está listo para el primer uso real **únicamente si**:

1. Un superadministrador inicia sesión, gestiona usuarios y cambia roles con auditoría.
2. Un empleado autorizado crea cliente, oportunidad, tarea y visita con datos persistentes y roles restringidos.
3. El calendario muestra bloqueos y reservas consultando los registros reales, con fechas y tipos claramente visibles internamente.
4. Dos trabajadores no pueden vender el mismo recurso/horario: pruebas concurrentes pasan en base de datos.
5. Los holds caducan y la fecha se libera aun si el scheduler no ha corrido.
6. Las reservas confirmadas requieren condiciones verificadas y conservan contrato/historial; si se cancela o reprograma no aparecen inconsistencias.
7. El cliente público ve disponibilidad general sin información de terceros y puede enviar una consulta real que entra al CRM.
8. El cliente con token válido ve exclusivamente su reserva; los tokens revocados no funcionan.
9. Permisos efectivos en UI, API y RLS, sin endpoints que expongan datos fuera de su rol.
10. Dashboard, CRM, detalle de reserva y calendario reflejan la misma operación inmediatamente o tras una actualización consistente.
11. Existen backups evaluados, procedimiento de recuperación, logs y responsable técnico.
12. Hay documentación de instalación, mantenimiento, uso cotidiano, cambio de tarifas y despliegue, más pruebas automatizadas ejecutables.

**Resultado esperado para Dirección:** abrir un solo enlace administrativo desde computadora o celular para conocer quién preguntó, qué fecha necesita, qué se le ofreció, cuándo hay que volver a contactarlo, cuáles fechas están comprometidas y cuáles eventos están realmente confirmados; compartir otro enlace con clientes sin exponer información privada del negocio.

---

# 33. Fuentes utilizadas y límites de autoridad

## 33.1. Documento de Kairós

**Tarifario y Catálogo de Servicios por Tipo de Evento — Kairós V3.0**, octubre de 2026, 14 páginas, entregado como archivo adjunto. Relevancia:

- Pág. 2-3: identidad del salón, servicios y alquiler propuesto.
- Pág. 4-5: mobiliario adicional, paquete integral, fórmula y servicios.
- Pág. 6-9: modalidades por evento y corporativo, extras.
- Pág. 10-11: ejemplos de proforma, márgenes y datos mínimos del CRM.
- Pág. 12: requisitos de reserva propuestos, checklist y advertencias comerciales.
- Pág. 13-14: lenguaje de marca, pendientes de aprobación y métricas de Dirección.

**Distinción:** este documento técnico reutiliza datos reportados por Kairós y describe ingeniería propuesta. No convierte supuestos ni tarifas del borrador comercial en obligaciones vigentes de la empresa.

## 33.2. Documentación pública para que Codex consulte versiones vigentes

- Supabase, Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase, Authentication: https://supabase.com/docs/guides/auth
- Supabase, Database Backups: https://supabase.com/docs/guides/platform/backups
- Next.js, Authentication / Authorization: https://nextjs.org/docs/app/guides/authentication
- Vercel, Cron usage and limits: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel, Managing Cron Jobs: https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Autoridad Nacional de Protección de Datos Personales (Perú), Reglamento Ley 29733, D.S. 016-2024-JUS: https://www.gob.pe/institucion/anpd/normas-legales/6554453-n-016-2024-jus

**Nota de mantenimiento:** tarifas cloud, límites de planes, librerías y servicios pueden cambiar. Antes de programar la infraestructura o prometer costos mensuales, verificar la documentación oficial vigente y presupuestar por volumen real.

---

**Fin del documento maestro — KAIROS OS · Versión 1.0**
