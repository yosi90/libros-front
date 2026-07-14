# Guía de integración: capacidades, perfiles, relaciones y deep links

## Estado

Esta guía reúne los contratos de comunidad que permiten al front aplicar gates por capacidad, navegar perfiles, reconciliar relaciones y resolver destinos internos de notificaciones. OpenAPI es la referencia tipada definitiva.

## Decisiones de seguridad

- Los gates se basan en una lectura propia del estado efectivo, no en inferencias desde un `403` aislado.
- Un perfil privado o bloqueado no debe ser distinguible de un recurso inexistente para quien no pueda verlo.
- Las listas de relaciones pertenecen únicamente al usuario autenticado. Nunca exponen quién ha bloqueado a esa persona.
- Los deep links se construyen desde `ContextoTipo` e identificadores de dominio permitidos; no se navega a URLs recibidas en una notificación.

## Gates propios disponibles

`GET /moderacion/mi-estado-acceso` devuelve todos los alcances, sanciones activas y políticas pendientes del usuario autenticado. Sigue requiriendo JWT, pero está exento de los gates de sanción y aceptación de políticas: debe llamarse justo tras el login para descubrir una aceptación pendiente sin bloquearse circularmente. Aplicar el gate indicado por cada restricción, conservar la sesión para restricciones parciales y limpiar WebSocket/RTDB únicamente cuando `RequiereLimpiarRealtime` sea `true`.

Los errores funcionales que puede usar la UI como refuerzo de este estado son `account_sanctioned` (cuenta completa), `capability_sanctioned` (solo el alcance solicitado), `usage_policy_acceptance_required` y `creation_policy_acceptance_required`. No se debe convertir un `403` en cierre de sesión: refrescar este recurso y bloquear únicamente la acción afectada. Los límites de producto se devuelven como `club_owner_limit_reached` y `club_membership_limit_reached` (409), y no son sanciones.

Cuando `RequiereLimpiarRealtime` sea `true`, cerrar los sockets propios, detener listeners y borrar cache RTDB local de comunidad/chat. El JWT y la biblioteca pueden permanecer activos. `AlcancesQueRevocanRealtime` indica si lo causa `cuenta`, `comunidad` o `chat`; al desaparecer la restricción se debe reconectar solo tras refrescar el estado y las membresías.

## Catálogo exhaustivo de errores funcionales

Este catálogo cubre los gates transversales y todas las lecturas/escrituras de relaciones. Los códigos `*_internal_error` son fallos no funcionales de servidor y no se usan para decidir UI.

| Dominio | HTTP | `error.code` | Acción del cliente |
|---|---:|---|---|
| Autenticación común | 401 | `authorization_required`, `access_token_expired`, `revoked_token`, `fresh_token_required` | Renovar/iniciar sesión según corresponda. |
| Autenticación común | 422 | `invalid_token` | Descartar la sesión local e iniciar sesión. |
| Gate | 403 | `account_sanctioned` | Bloquear toda acción privada y limpiar realtime/RTDB. Consultar el estado propio. |
| Gate | 403 | `capability_sanctioned` | Bloquear solo el alcance pedido; consultar el estado propio. |
| Gate | 403 | `user_not_found` | Invalidar la sesión local: el actor del token ya no existe. |
| Gate | 403 | `email_verification_pending` | Solicitar verificación de correo; no es una sanción. |
| Gate | 403 | `usage_policy_acceptance_required` | Llevar a la aceptación de política de uso. |
| Gate | 403 | `creation_policy_acceptance_required` | Llevar a la aceptación de política de creación. |
| Límite de clubes | 409 | `club_owner_limit_reached`, `club_membership_limit_reached` | Mostrar el límite de producto; no es una sanción. |
| Listas de relaciones | 400 | `invalid_relationship_kind` | Usar solo `seguidos`, `seguidores`, `amistades` o `bloqueos`. |
| Solicitudes listadas | 400 | `invalid_friend_request_direction` | Usar solo `recibidas` o `enviadas`. |
| Perfil/estado de relación | 404 | `community_profile_not_found` | Tratar perfil privado, bloqueado, no verificado o inexistente como no disponible. |
| Seguir/dejar de seguir | 400 | `invalid_social_request` | Corregir/añadir `UsuarioId` numérico. |
| Seguir | 400 | `invalid_follow_target` | No permitir seguirse a sí mismo. |
| Solicitud de amistad | 400 | `invalid_friend_target` | No permitir solicitar amistad a uno mismo. |
| Bloqueo | 400 | `invalid_block_target` | No permitir bloquearse a uno mismo. |
| Seguir o solicitar amistad | 403 | `user_blocked` | Retirar acciones sociales y no inferir quién estableció el bloqueo. |
| Resolver solicitud | 400 | `invalid_friend_state` | Enviar solo `aceptada` o `rechazada`. |
| Resolver solicitud | 404 | `friend_request_not_found` | Refrescar solicitudes: no existe, no es recibida o ya fue resuelta. |
| Directo relacionado | 400 | `invalid_direct_target` | Corregir el ID de destino. |
| Directo relacionado | 403 | `direct_not_allowed` | Refrescar `GET /chat/directos/elegibilidad/{user_id}`; no revelar la causa. |

La elegibilidad de directo devuelve `200` con `PuedeIniciarDirecto=false` y uno de `same_user`, `blocked_or_unavailable`, `messages_disabled` o `follow_required`; son motivos de producto en el cuerpo, no `error.code`.

## Perfiles públicos

`GET /comunidad/usuarios/{id}` devuelve el perfil público accesible. Un perfil privado, bloqueado, no verificado o inexistente responde `404`; el cliente no debe distinguir esos casos. El directorio devuelve como máximo 100 perfiles públicos verificados, ordenados por nombre e ID. `q` busca parcialmente y `@alias` exige coincidencia exacta, siempre dentro de perfiles públicos.

## Relaciones propias

`GET /comunidad/relaciones/{seguidos|seguidores|amistades|bloqueos}` pagina exclusivamente las relaciones del usuario autenticado mediante `limit` (1--100) y `afterId`. `GET /comunidad/amistades/solicitudes?tipo=recibidas|enviadas` usa el mismo cursor para solicitudes pendientes. `GET /comunidad/usuarios/{id}/relacion` ofrece el estado propio contra un perfil accesible; no sirve para inspeccionar relaciones entre terceros ni para detectar perfiles privados o bloqueos.

Las escrituras existentes son idempotentes: seguir/dejar de seguir y bloquear/desbloquear convergen al estado pedido; crear una solicitud no duplica una pendiente para el mismo par; resolverla solo afecta a una solicitud pendiente recibida. El front debe refrescar las lecturas tras una escritura o recibir la proyección realtime correspondiente.

## Deep links de notificaciones

`Notification.ContextoTipo` discrimina los identificadores de destino en `Contexto`; OpenAPI enumera las variantes `none`, `club`, `relationships`, `catalog_request`, `review_report`, `community_moderation`, `moderation_appeal`, `chat_conversation`, `feed_publication` y `user_profile`. Construir rutas internas exclusivamente a partir de esos IDs, nunca desde una URL recibida. Si el recurso no existe o ya no es accesible, mostrar la notificación y un estado no disponible.
