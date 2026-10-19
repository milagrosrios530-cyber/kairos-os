# Despliegue a staging y Vercel

1. Crear un proyecto Supabase exclusivo de staging bajo una cuenta de la organización.
2. Aplicar migraciones versionadas y ejecutar `supabase test db`.
3. Desactivar signup público, configurar SMTP y registrar URLs de callback local y staging.
4. Ejecutar el bootstrap del primer superadmin desde una terminal segura.
5. Crear proyecto Vercel conectado al repositorio privado.
6. Configurar las cuatro variables de `.env.example` en Vercel; la service role solo en servidor.
7. Ejecutar `pnpm check` en CI antes de desplegar.
8. Probar login, recuperación, invitación, 403 de comercial y auditoría con cuentas de staging.

Producción requiere un proyecto Supabase distinto, dominio aprobado, propietario técnico, política de backups y revisión de seguridad. Aplicar una migración al repositorio no demuestra que ya se ejecutó en la base remota.
