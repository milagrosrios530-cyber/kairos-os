# Plan de construcción por hitos

## Hito 0 Repositorio y decisiones — completado

Stack, documentación, variables seguras, migraciones, CI, Vercel, scripts y decisiones pendientes. Estado: implementado localmente; falta vincular servicios externos.

## Hito 1 Identidad permisos y navegación — completado

Supabase Auth por invitación, perfiles, roles, RLS, auditoría, protección de rutas y shell adaptable. Estado: implementado en código; falta validación contra Supabase staging.

## Hito 2 CRM y seguimiento — completado

Clientes, oportunidades, deduplicación orientativa, Kanban, actividades, tareas, visitas, búsqueda y dashboard básico. Puerta automatizada y de base remota aprobada; queda el smoke manual autenticado con `COMERCIAL` como control operativo.

## Hito 3 Calendario y reservas — completado

Bookings, `schedule_allocations`, exclusión GiST, holds, expiración, idempotencia, confirmación, reprogramación y cancelación transaccional. Puerta aprobada: PostgreSQL rechaza el segundo cruce con `23P01` y conserva una sola asignación bloqueante; 17/17 pruebas de flujo y 24/24 de seguridad pasan en Supabase remoto.

## Hito 4 Portales externos

Disponibilidad pública sin PII, consulta que crea lead real y enlace privado revocable por reserva. Puerta: acceso anónimo y tokens no permiten cross-access.

## Hito 5 Cotizaciones y pagos

Tarifarios versionados, aprobación, cotizaciones inmutables, PDF, comprobantes privados, verificación y saldos. Puerta: ningún precio propuesto se publica y ningún comprobante pendiente reduce el saldo.

## Hito 6 Operaciones y calidad

Checklists, recursos, reportes, notificaciones, observabilidad, accesibilidad, performance, backups y restauración de prueba.

## Hito 7 Producción y estabilización

Dominio, secretos, alertas, maestros aprobados, usuarios reales, capacitación, rollback y soporte. No se promueve sin pruebas de permisos, disponibilidad y recuperación.

No se inicia Hito 4 hasta presentar el cierre comprobable de Hito 3 y recibir aprobación explícita.
