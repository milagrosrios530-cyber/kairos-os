# Modelo de datos de Hito 1

```text
auth.users
    1
    |
    1
profiles N -------- 1 organizations 1 -------- N venues
    |
    N
user_roles

organizations 1 -------- N audit_logs
auth.users   1 -------- N audit_logs como actor opcional
```

`profiles` conserva la identidad interna y el estado. `user_roles` admite más de un rol por usuario sin guardar permisos en metadatos controlables por el navegador. `audit_logs` no permite `UPDATE` ni `DELETE`.

Capacidades y precios no se han inicializado. `capacity_authorized` permanece nulo hasta aprobación y evidencia correspondiente.
