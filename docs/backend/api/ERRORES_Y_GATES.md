# Errores funcionales y gates

Todas las respuestas de error usan el envelope documentado en OpenAPI. Cuando exista `error.code`, el front debe decidir por ese código estable y no por el texto humano.

| Dominio | HTTP | `error.code` | Acción del cliente |
|---|---:|---|---|
| Autenticación | 401 | `authorization_required`, `access_token_expired`, `revoked_token`, `fresh_token_required` | Renovar o iniciar sesión según corresponda. |
| Autenticación | 422 | `invalid_token` | Descartar la sesión local e iniciar sesión. |
| Sesión | 401 | `session_refresh_invalid`, `session_revoked`, `refresh_replay_detected`, `firebase_identity_revoked` | Limpiar access/refresh local. Ante replay, informar del cierre de ese dispositivo. |
| Sesión | 400 | `session_id_invalid` | Corregir el UUID de la sesion propia. |
| Sesión | 403 | `csrf_invalid` | Recuperar una prueba con `GET /auth/session/csrf` y reintentar una sola vez; nunca intentar leer el refresh. |
| Sesión | 503 | `session_refresh_unavailable`, `session_csrf_unavailable` | Mantener el estado de UI sin asumir que la sesion fue rotada y reintentar con prudencia. |
| Firebase | 400/401/403 | `firebase_id_token_required`, `firebase_id_token_invalid`, `firebase_id_token_expired`, `firebase_id_token_revoked`, `firebase_provider_invalid`, `firebase_provider_not_enabled`, `firebase_provider_subject_required`, `firebase_email_required`, `firebase_email_unverified`, `firebase_user_disabled` | Renovar la prueba Firebase o mostrar el proveedor admitido; nunca reutilizar custom tokens como login. |
| Onboarding | 400/409 | `onboarding_invalid_payload`, `onboarding_unknown_field`, `onboarding_alias_invalid`, `onboarding_policy_invalid`, `onboarding_country_invalid`, `onboarding_ticket_invalid`, `onboarding_account_conflict`, `usage_policy_version_conflict` | Corregir campos o reiniciar el intercambio para obtener ticket/politica vigentes. |
| Cambio de email | 400/401/409 | `reauthentication_invalid_payload`, `firebase_recent_login_required`, `reauthentication_ticket_invalid`, `email_change_invalid_payload`, `email_change_email_invalid`, `email_change_same_email`, `email_change_reserved`, `email_change_reservation_invalid`, `email_change_not_confirmed` | Reautenticar, reservar y confirmar con el ID token que ya contiene el nuevo email verificado. |
| Metodos de acceso | 400/404/409 | `access_method_not_enabled`, `access_method_invalid`, `access_method_not_linked`, `access_method_already_linked`, `access_method_conflict`, `link_ticket_invalid`, `firebase_email_conflict`, `firebase_identity_conflict`, `google_email_mismatch_confirmation_required`, `google_email_mismatch_confirmation_invalid`, `google_email_mismatch_confirmation_unexpected`, `last_recoverable_access_method` | Reconciliar con `GET /auth/access-methods`; ante diferencia Google mostrar solo `details` enmascarado y reintentar con `ConfirmEmailMismatch=true` tras confirmacion. Consumir `LinkTicket` solo tras login y reautenticacion, nunca fusionar silenciosamente ni retirar el ultimo metodo. |
| Telefono | 400/403/429 | `phone_number_invalid`, `phone_region_not_allowed`, `phone_preflight_rate_limited` | No solicitar SMS sin preflight `201`; respetar `Retry-After` y no usar numeros fuera de la allowlist. |
| Telefono | 400/401/403/409 | `phone_attempt_required`, `phone_attempt_unexpected`, `phone_attempt_invalid`, `phone_attempt_expired`, `phone_attempt_consumed`, `phone_attempt_not_allowed`, `phone_attempt_mismatch`, `phone_attempt_user_conflict`, `phone_attempt_user_required`, `phone_access_method_not_linked` | Repetir el preflight para obtener otro `IntentoId`; el login telefonico solo existe para una cuenta previamente vinculada. |
| Gate | 403 | `account_sanctioned` | Bloquear acciones privadas y limpiar realtime/RTDB. Consultar el estado propio. |
| Gate | 403 | `capability_sanctioned` | Bloquear solo el alcance pedido y consultar el estado propio. |
| Gate | 403 | `user_not_found` | Invalidar la sesión local. |
| Gate | 403 | `email_verification_pending` | Solicitar verificación de correo. |
| Gate | 403 | `usage_policy_acceptance_required` | Abrir la aceptación de política de uso. |
| Gate | 403 | `creation_policy_acceptance_required` | Abrir la aceptación de política de creación. |
| Preferencias de interfaz | 400 | `interface_preferences_invalid_payload`, `interface_preferences_unknown_field`, `interface_preferences_version_invalid`, `interface_preferences_no_changes`, `interface_preferences_theme_invalid` | Corregir el body; enviar `Version` y un `Tema` admitido sin campos ajenos. |
| Preferencias de interfaz | 409 | `interface_preferences_conflict` | Adoptar `details.Preferencias`, reconciliar la elección local y solo reintentar con confirmación del usuario. |
| Preferencias de notificaciones | 400 | `invalid_notification_preferences`, `invalid_notification_preference`, `duplicate_notification_preference` | Corregir la matriz; cada combinación `Categoria` + `Canal` debe ser única y `Habilitado` booleano. |
| Preferencias de notificaciones | 409 | `mandatory_notification_category` | Mantener habilitadas `moderacion/in_app` y `sistema/in_app`. |
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
