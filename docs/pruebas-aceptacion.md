# Pruebas de aceptación hasta Hito 2

## Automatizadas

- Permisos: solo superadmin recibe `users:invite`; comercial no recibe privilegios administrativos.
- Validación: correos, nombres, roles y contraseñas se rechazan en servidor cuando son inválidos.
- Contrato SQL: tablas Hito 1, RLS, ausencia de lectura anónima, bloqueo de inserción directa de roles y auditoría no falsificable.
- Compilación: lint sin advertencias, TypeScript estricto, Vitest y build de producción.
- CRM: normalización de teléfonos, DNI/RUC coherente, fechas válidas, totales de invitados, partidas de servicio con cantidad/unidad/detalle, montos enteros no contractuales, duplicados justificados, tareas/visitas y transiciones con resultado.
- SQL Hito 2: 58 aserciones sobre tablas, RLS, ausencia de acceso anónimo, ausencia de escritura directa, RPCs guardadas, FKs, append-only, auditoría sanitizada y concurrencia optimista.
- Flujo remoto Hito 2: 9 aserciones transaccionales con `ROLLBACK`, sin dejar fixtures.

## En staging

1. Crear superadmin mediante bootstrap e iniciar sesión.
2. Invitar un comercial y comprobar `profiles`, `user_roles` y `audit_logs`.
3. Iniciar sesión como comercial y acceder directamente a `/app/configuracion/usuarios`: debe mostrar 403 interno.
4. Enviar `POST /api/admin/users/invite` como comercial: debe devolver HTTP 403 y no crear usuario.
5. Cerrar sesión y abrir `/app`: debe redirigir a `/login` sin datos privados.
6. Deshabilitar el perfil en base y confirmar que pierde acceso, conservando autoría histórica.

## En staging — Hito 2

1. Como `SUPERADMIN`, crear un prospecto con tarea y visita, cerrar la visita con resultado y comprobar su línea de tiempo.
2. Repetir el teléfono y elegir entre vincular el cliente existente o justificar una ficha separada.
3. Como `COMERCIAL`, verificar que solo aparecen fichas propias/asignadas y que no puede reasignar ni consultar datos de otro asesor.
4. Recargar y volver a iniciar sesión: el registro debe persistir.
5. Confirmar que fecha y monto se muestran como tentativos/referenciales y que “Ganado” está bloqueado sin reserva.
6. Editar cantidades y detalles de servicios, recargar la ficha y comprobar persistencia, actividad de auditoría y rechazo de una versión `updated_at` obsoleta.

La puerta automatizada y remota de Hito 2 está aprobada. El smoke autenticado en navegador con una cuenta comercial real permanece como verificación operativa, no como sustituto de los controles de base ya ejecutados.
