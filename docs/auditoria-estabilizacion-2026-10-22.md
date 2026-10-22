# Auditoría y estabilización — 22 de octubre de 2026

## Alcance corregido

- Autorización explícita al inicio de cada Route Handler, antes de leer o validar el cuerpo.
- Deduplificación de la sesión durante cada render y consultas de perfil/roles en paralelo.
- Límite de 10 segundos para llamadas a Supabase en navegador, proxy, SSR y cliente administrativo.
- Fechas de tareas, visitas y actividad interpretadas y mostradas en la zona horaria de la organización.
- Paginación real para reservas, tareas, visitas y usuarios; pendientes e historial separados.
- Reintentos seguros para abonos, holds y bloqueos sin generar una nueva clave de idempotencia tras un corte de red.
- Registro de errores de API correlacionable por `requestId`, sin cuerpo, credenciales ni datos personales.
- CSP, protección contra framing y cabeceras de endurecimiento.
- Acceso por DNI con huella HMAC indexada, migración gradual de cuentas anteriores y rate limit persistente.
- Exclusión PostgreSQL por organización: un evento por día y ocupación extendida cuando termina después de medianoche.
- Historial de migraciones local/remoto reconciliado y nuevas migraciones aplicadas en Supabase.
- Pruebas E2E públicas en escritorio y móvil para login, redirección privada y autorización previa a validación.

## Evidencia de verificación

Ejecutar desde la raíz:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
npx supabase@latest migration list --linked --project-ref uhicgqxmynqbddmrgzrn
npx supabase@latest db lint --linked --project-ref uhicgqxmynqbddmrgzrn --level warning --fail-on none
```

Resultado de esta ronda:

- ESLint: sin errores ni advertencias.
- TypeScript: sin errores.
- Vitest: 75 pruebas aprobadas.
- Next.js: build de producción aprobado.
- Playwright: 6 pruebas aprobadas en Chromium escritorio y móvil.
- Supabase: historial alineado y `db lint` sin errores ni advertencias.

## Prueba funcional sugerida

1. Iniciar sesión como administrador.
2. Abrir Inicio, CRM, Clientes, Tareas, Visitas, Agenda, Calendario, Reservas y Equipo.
3. Confirmar que Tareas y Visitas abren por defecto los pendientes/próximos y permiten consultar Historial.
4. Crear un usuario interno con nombre, DNI, correo y contraseña; verificar ingreso por correo y por DNI.
5. Crear un evento nocturno cuyo término sea posterior a la hora de inicio y comprobar que PostgreSQL impide reservar una fecha solapada.
6. Revisar diciembre de 2026 y confirmar que Ivon Artica Cuadrado sigue visible el 12/12/2026 sin convertir la propuesta en tarifa oficial.

## Límites del hito

Esta estabilización no implementa módulos comerciales posteriores. Finanzas, proveedores, contratos, notificaciones avanzadas y KPIs completos siguen sujetos a sus hitos y a aprobación explícita.
