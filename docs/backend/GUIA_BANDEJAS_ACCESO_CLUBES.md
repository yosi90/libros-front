# Guia de bandejas de acceso a clubes

## Estado

Disponible. OpenAPI es la referencia mecanica y esta guia resume la integracion de producto.

## Bandejas

- `GET /clubes-lectura/solicitudes/mias?direccion=enviadas|recibidas`: historial de solicitudes de acceso.
- `GET /clubes-lectura/invitaciones?direccion=enviadas|recibidas`: historial de invitaciones. `direccion` pasa a ser obligatoria.
- Ambas admiten `estado`, `limit` y `cursorId`, y ordenan por ID descendente.
- Las solicitudes recibidas incorporan `Solicitante`; las invitaciones recibidas incorporan `Invitador`; las invitaciones enviadas incorporan `Invitador` e `Invitado`.
- Las invitaciones no contienen `Mensaje` porque el modelo no almacena ese dato.

## Acciones

- La persona solicitante cancela una solicitud pendiente con `PATCH /clubes-lectura/solicitudes/mias/{id}` y `{ "Estado": "cancelada" }`.
- Un propietario o moderador activo cancela una invitacion pendiente con `PATCH /clubes-lectura/invitaciones/{id}` y el mismo cuerpo.
- Un propietario o moderador activo obtiene IDs elegibles mediante `GET /clubes-lectura/{id}/invitaciones/candidatos`; el alta de invitación vuelve a aplicar la misma regla al ID recibido.
- La aceptacion o rechazo de invitaciones y la resolucion de solicitudes conservan sus rutas por club actuales.

## Privacidad y acceso

Los clubes eliminados y las relaciones bloqueadas no se enumeran. Los clubes retirados del descubrimiento solo son visibles si la cuenta conserva membresia activa; una operacion pendiente no concede acceso. Las vistas recibidas comprueban el rol gestor en cada consulta.

`GET /clubes-lectura/resumen` incorpora `BandejasAcceso` con los pendientes enviados y recibidos de solicitudes e invitaciones, calculados con las mismas reglas que las bandejas.

## Realtime

Las mutaciones invalidan mediante `club.updated`. La cancelacion manual de una invitacion crea ademas una notificacion persistente para la persona invitada; cancelar una solicitud no genera una notificacion persistente.

## Errores funcionales

- Filtros: `invalid_club_inbox_direction`, `invalid_club_inbox_limit`, `invalid_club_inbox_state`, `invalid_club_cursor` (`400`).
- Cuerpos: `invalid_club_request_cancellation_state`, `invalid_club_invitation_cancellation_state`, `invalid_club_invitation_target` y `club_join_request_message_too_long` (`400`).
- Permisos/no enumeracion: `club_access_unavailable`, `club_join_request_not_found`, `club_invitation_not_found`, `club_invitation_candidate_unavailable`, `club_moderator_required` y `user_blocked`.
- Conflictos: `duplicate_club_join_request`, `duplicate_club_invitation`, `club_already_member`, `club_invitation_target_already_member`, `club_invitation_candidate_not_eligible` y `club_membership_limit_reached` (`409`).

Ante un `500` de cancelacion, reconciliar la bandeja con `GET` antes de reintentar porque el resultado de la escritura puede ser incierto.
