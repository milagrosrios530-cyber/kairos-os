# Pruebas de aceptación hasta Hito 2

## Automatizadas

- Permisos: superadmin y administrador reciben `users:create`; el administrador solo puede crear roles operativos y comercial no recibe privilegios administrativos.
- Validación: correo, nombre, DNI peruano de ocho dígitos, rol, confirmación y fortaleza de contraseña se rechazan en servidor cuando son inválidos.
- Contrato SQL: tablas Hito 1, directorio privado de identificadores de acceso, RLS forzada, ausencia de lectura anónima/autenticada, bloqueo de inserción directa de roles y auditoría no falsificable.
- Compilación: lint sin advertencias, TypeScript estricto, Vitest y build de producción.
- CRM: normalización de teléfonos, DNI/RUC coherente, fechas válidas, totales de invitados, partidas de servicio con cantidad/unidad/detalle, montos enteros no contractuales, duplicados justificados, tareas/visitas y transiciones con resultado.
- SQL Hito 2: 58 aserciones sobre tablas, RLS, ausencia de acceso anónimo, ausencia de escritura directa, RPCs guardadas, FKs, append-only, auditoría sanitizada y concurrencia optimista.
- Flujo remoto Hito 2: 9 aserciones transaccionales con `ROLLBACK`, sin dejar fixtures.
- Agenda y pipeline: cuadrícula mensual, límites de mes, etapas válidas, motivos obligatorios al cerrar y bloqueo técnico de `Ganado` sin reserva.

## En staging

1. Crear superadmin mediante bootstrap e iniciar sesión.
2. Crear directamente un comercial con nombre, DNI, correo corporativo y contraseña; comprobar `auth.users`, `profiles`, `user_roles`, `staff_login_identifiers` y `audit_logs` sin que el DNI completo aparezca en logs.
3. Iniciar sesión como comercial y acceder directamente a `/app/configuracion/usuarios`: debe mostrar 403 interno.
4. Enviar `POST /api/admin/users` como comercial: debe devolver HTTP 403 y no crear usuario.
5. Cerrar sesión y abrir `/app`: debe redirigir a `/login` sin datos privados.
6. Deshabilitar el perfil en base y confirmar que pierde acceso, conservando autoría histórica.
7. Iniciar sesión primero con el correo y luego con el DNI de la misma cuenta; ambos deben resolver a la misma identidad sin revelar si otro DNI existe.
8. Como administrador intentar crear otro administrador: debe rechazarse; como superadmin debe permitirse.

## En staging — Hito 2

1. Como `SUPERADMIN`, crear un prospecto con tarea y visita, cerrar la visita con resultado y comprobar su línea de tiempo.
2. Repetir el teléfono y elegir entre vincular el cliente existente o justificar una ficha separada.
3. Como `COMERCIAL`, verificar que solo aparecen fichas propias/asignadas y que no puede reasignar ni consultar datos de otro asesor.
4. Recargar y volver a iniciar sesión: el registro debe persistir.
5. Confirmar que fecha y monto se muestran como tentativos/referenciales y que “Ganado” está bloqueado sin reserva.
6. Editar cantidades y detalles de servicios, recargar la ficha y comprobar persistencia, actividad de auditoría y rechazo de una versión `updated_at` obsoleta.
7. Arrastrar una tarjeta a otra etapa, recargar y comprobar persistencia; simular una versión obsoleta y confirmar reversión visual y conflicto HTTP 409.
8. Intentar arrastrar a `Ganado`: debe permanecer bloqueado mientras no exista una reserva confirmada.
9. Abrir `/app/agenda?mes=2026-12` y confirmar que la fecha solicitada del cliente aparece en el día correspondiente sin presentarse como disponibilidad ni reserva.
10. Abrir el alta de prospecto y comprobar que solo nombre, teléfono, tipo de evento, fecha e invitados son esenciales; los demás campos deben seguir disponibles en secciones opcionales.

La puerta automatizada y remota de Hito 2 está aprobada. El smoke autenticado en navegador con una cuenta comercial real permanece como verificación operativa, no como sustituto de los controles de base ya ejecutados.
