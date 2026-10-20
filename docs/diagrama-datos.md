# Modelo de datos hasta Hito 2

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

organizations 1 -------- N customers 1 -------- N opportunities
                                  |                    |
                                  N identifiers        +-- N service_interests
                                                       +-- N proposals (append-only)
                                                       +-- N crm_activities (append-only)
                                                       +-- N tasks
                                                       +-- N visits

organizations 1 -------- N event_types
profiles      1 -------- N customers/opportunities/tasks/visits como responsable
```

`profiles` conserva la identidad interna y el estado. `user_roles` admite más de un rol por usuario sin guardar permisos en metadatos controlables por el navegador. `audit_logs` no permite `UPDATE` ni `DELETE`.

`opportunity_proposals.amount_cents` registra únicamente lo ofrecido en esa conversación. No es tarifa oficial, valor contratado, ingreso ni utilidad. Las visitas son agenda comercial y no tienen relación con `schedule_allocations`.

Capacidades y precios oficiales no se han inicializado. `capacity_authorized` permanece nulo hasta aprobación y evidencia correspondiente.
