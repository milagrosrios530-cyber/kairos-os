# Estado de implementación de KAIROS OS

## Hito 0

Implementado en repositorio: Next.js, TypeScript, Tailwind, shadcn/ui, scripts de calidad, especificación funcional, documentación de arquitectura, variables de entorno, configuración de Supabase y guía de despliegue.

Supabase remoto: las migraciones `20261019010000_identity_and_access.sql` y `20261019020000_security_hardening.sql` están aplicadas en el proyecto `uhicgqxmynqbddmrgzrn`. El proyecto se trata como `staging` hasta que Dirección apruebe expresamente su clasificación y propiedad de producción. No se ejecutó ningún seed demo.

Vercel: el repositorio está vinculado al proyecto `kairos-os` y la interfaz está publicada en [https://kairos-os-pi.vercel.app](https://kairos-os-pi.vercel.app). Las tres variables públicas se guardaron como configuración y la clave administrativa como secreto de Producción. La clave privada usada por Vercel es exclusiva y revocable; no se guardó en Git.

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

## Hitos 2 a 7

No iniciados. La interfaz no muestra métricas inventadas ni botones que aparenten guardar estos módulos.
