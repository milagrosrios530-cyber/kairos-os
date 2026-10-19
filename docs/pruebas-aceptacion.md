# Pruebas de aceptación para Hito 0 y Hito 1

## Automatizadas

- Permisos: solo superadmin recibe `users:invite`; comercial no recibe privilegios administrativos.
- Validación: correos, nombres, roles y contraseñas se rechazan en servidor cuando son inválidos.
- Contrato SQL: tablas Hito 1, RLS, ausencia de lectura anónima, bloqueo de inserción directa de roles y auditoría no falsificable.
- Compilación: lint sin advertencias, TypeScript estricto, Vitest y build de producción.

## En staging

1. Crear superadmin mediante bootstrap e iniciar sesión.
2. Invitar un comercial y comprobar `profiles`, `user_roles` y `audit_logs`.
3. Iniciar sesión como comercial y acceder directamente a `/app/configuracion/usuarios`: debe mostrar 403 interno.
4. Enviar `POST /api/admin/users/invite` como comercial: debe devolver HTTP 403 y no crear usuario.
5. Cerrar sesión y abrir `/app`: debe redirigir a `/login` sin datos privados.
6. Deshabilitar el perfil en base y confirmar que pierde acceso, conservando autoría histórica.

La aceptación final de Hito 1 necesita la ejecución de estas pruebas contra Supabase real; un build exitoso no sustituye esa puerta.
