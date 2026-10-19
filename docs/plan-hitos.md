# Plan de construcción por hitos

## Hito 0 Repositorio y decisiones

Stack, documentación, variables seguras, migraciones, CI, Vercel, scripts y decisiones pendientes. Estado: implementado localmente; falta vincular servicios externos.

## Hito 1 Identidad permisos y navegación

Supabase Auth por invitación, perfiles, roles, RLS, auditoría, protección de rutas y shell adaptable. Estado: implementado en código; falta validación contra Supabase staging.

## Hito 2 CRM y seguimiento

Clientes, oportunidades, deduplicación orientativa, Kanban, actividades, tareas, visitas, búsqueda y dashboard básico. Puerta: persistencia y permisos comprobados entre sesiones/equipos.

## Hito 3 Calendario y reservas

Bookings, `schedule_allocations`, exclusión GiST, holds, expiración, idempotencia, confirmación, reprogramación y cancelación transaccional. Puerta: dos peticiones concurrentes dejan una sola asignación bloqueante.

## Hito 4 Portales externos

Disponibilidad pública sin PII, consulta que crea lead real y enlace privado revocable por reserva. Puerta: acceso anónimo y tokens no permiten cross-access.

## Hito 5 Cotizaciones y pagos

Tarifarios versionados, aprobación, cotizaciones inmutables, PDF, comprobantes privados, verificación y saldos. Puerta: ningún precio propuesto se publica y ningún comprobante pendiente reduce el saldo.

## Hito 6 Operaciones y calidad

Checklists, recursos, reportes, notificaciones, observabilidad, accesibilidad, performance, backups y restauración de prueba.

## Hito 7 Producción y estabilización

Dominio, secretos, alertas, maestros aprobados, usuarios reales, capacitación, rollback y soporte. No se promueve sin pruebas de permisos, disponibilidad y recuperación.

No se inicia Hito 2 hasta presentar y aprobar el cierre comprobable de Hitos 0 y 1.
