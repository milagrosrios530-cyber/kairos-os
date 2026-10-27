# Despliegue a staging y Vercel

## Estado verificado el 20 de octubre de 2026

- Repositorio: `milagrosrios530-cyber/kairos-os`, rama `main`.
- Proyecto Vercel: `kairos-os`, equipo `CRAKS EN CRISTO`.
- URL pública: [https://kairos-os-pi.vercel.app](https://kairos-os-pi.vercel.app).
- Calendario público compartible: [https://kairos-os-pi.vercel.app/disponibilidad](https://kairos-os-pi.vercel.app/disponibilidad). No requiere inicio de sesión y solo expone fechas confirmadas y horarios.
- Supabase conectado: proyecto `uhicgqxmynqbddmrgzrn`.
- Variables de Producción: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `STAFF_DNI_LOOKUP_SECRET`.
- La integración oficial Supabase-Vercel está instalada únicamente para `kairos-os`.
- La service key está almacenada como secreto de Vercel y fue creada exclusivamente para este despliegue. La clave temporal de instalación fue revocada, el secreto fue rotado y se ejecutó un nuevo despliegue `Ready`. La clave vigente no se expone al navegador ni se versiona.
- Site URL y callback `https://kairos-os-pi.vercel.app/auth/callback` autorizados en Supabase Auth.
- Prueba pública: `/login` devuelve HTTP 200 y un intento inválido llega a Supabase y devuelve el mensaje controlado de credenciales.
- Prueba de acceso: `/app` y `/app/configuracion/usuarios` redirigen al login sin sesión.
- Prueba responsive: viewport 390 x 844 sin desbordamiento horizontal.
- GitHub Actions: workflow `Quality` correcto para `2ed4814`.

El entorno `Production` de Vercel no implica todavía la aprobación comercial del Supabase como base productiva definitiva. Hasta resolver esa decisión no deben cargarse datos reales de operación.

## Procedimiento reproducible

1. Crear un proyecto Supabase exclusivo de staging bajo una cuenta de la organización.
2. Aplicar migraciones versionadas y ejecutar `supabase test db`.
3. Desactivar signup público, configurar SMTP y registrar URLs de callback local y staging.
4. Ejecutar el bootstrap del primer superadmin desde una terminal segura.
5. Crear proyecto Vercel conectado al repositorio privado.
6. Configurar las cuatro variables de `.env.example` en Vercel; la service role solo en servidor y como secreto.
7. Ejecutar `pnpm check` en CI antes de desplegar.
8. Probar login, recuperación, invitación, 403 de comercial y auditoría con cuentas de staging.

Para cerrar producción faltan: decisión sobre base definitiva, dominio aprobado, propietario técnico, política de backups, SMTP, protección contra contraseñas filtradas, rotación de la credencial inicial y smoke test autenticado manual. Aplicar una migración al repositorio no demuestra que ya se ejecutó en la base remota.
