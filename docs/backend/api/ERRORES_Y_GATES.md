# Errores funcionales y gates

Todas las respuestas de error usan el envelope documentado en OpenAPI. Cuando exista `error.code`, el front debe decidir por ese código estable y no por el texto humano.

| Dominio | HTTP | `error.code` | Acción del cliente |
|---|---:|---|---|
| Autenticación | 401 | `authorization_required`, `access_token_expired`, `revoked_token`, `fresh_token_required` | Renovar o iniciar sesión según corresponda. |
| Autenticación | 422 | `invalid_token` | Descartar la sesión local e iniciar sesión. |
| Gate | 403 | `account_sanctioned` | Bloquear acciones privadas y limpiar realtime/RTDB. Consultar el estado propio. |
| Gate | 403 | `capability_sanctioned` | Bloquear solo el alcance pedido y consultar el estado propio. |
| Gate | 403 | `user_not_found` | Invalidar la sesión local. |
| Gate | 403 | `email_verification_pending` | Solicitar verificación de correo. |
| Gate | 403 | `usage_policy_acceptance_required` | Abrir la aceptación de política de uso. |
| Gate | 403 | `creation_policy_acceptance_required` | Abrir la aceptación de política de creación. |
| Clubes | 409 | `club_owner_limit_reached`, `club_membership_limit_reached` | Mostrar el límite de producto. |
| Relaciones | 400 | `invalid_relationship_kind` | Usar `seguidos`, `seguidores`, `amistades` o `bloqueos`. |
| Solicitudes | 400 | `invalid_friend_request_direction` | Usar `recibidas` o `enviadas`. |
| Perfil/relación | 404 | `community_profile_not_found` | Tratar privado, bloqueado, no verificado o inexistente como no disponible. |
| Seguir | 400 | `invalid_social_request`, `invalid_follow_target` | Corregir destino y no permitir seguirse a uno mismo. |
| Amistad | 400 | `invalid_friend_target`, `invalid_friend_state` | Corregir destino o estado. |
| Amistad | 404 | `friend_request_not_found` | Refrescar la bandeja. |
| Bloqueo | 400 | `invalid_block_target` | No permitir bloquearse a uno mismo. |
| Relación | 403 | `user_blocked` | Retirar acciones sin inferir quién bloqueó. |
| Chat directo | 400 | `invalid_direct_target` | Corregir el ID de destino. |
| Chat directo | 403 | `direct_not_allowed` | Refrescar elegibilidad sin revelar la causa. |

`GET /moderacion/mi-estado-acceso` es el punto de reconciliación para sanciones y políticas. OpenAPI replica en `x-functional-error-codes` los códigos adicionales propios de cada operación y prevalece sobre esta tabla.
