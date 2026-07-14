# Inventario de contratos actuales: social, moderacion y realtime

Estado comprobado contra rutas y controladores. Este documento resume el comportamiento live; OpenAPI contiene el contrato HTTP canónico y detallado.

## Autenticacion Firebase

`POST /auth/firebase-custom-token` requiere el JWT habitual de Libros y responde:

```json
{ "success": true, "token": "<firebase-custom-token>", "uid": "libros:42", "expiresIn": 3600 }
```

Usar el token con `signInWithCustomToken`. El UID es siempre `libros:<id_usuario>`. Firebase no es fuente de roles, permisos ni sanciones de la API. Errores: `401` para JWT ausente/invalido, `503 firebase_not_configured` si Firebase Admin no esta configurado y `500 firebase_token_internal_error` ante un fallo de emision.

## Rutas HTTP existentes

Todas requieren JWT, salvo que OpenAPI indique una excepcion general.

| Vertical | Rutas actuales |
| --- | --- |
| Notificaciones | Listado por cursor, lectura individual/total/lote, preferencias y dispositivos FCM bajo `/notificaciones/*` |
| Comunidad | Directorio, actividad, relaciones, bloqueos, feed, comentarios, reacciones y denuncias bajo `/comunidad/*` |
| Clubes | Descubrimiento, membresías, invitaciones, solicitudes, lectura actual e histórico, progreso, hitos, calendario, encuestas, debates y publicaciones privadas bajo `/clubes-lectura/*` |
| Chat | Conversaciones, directo, chat de club, mensajes idempotentes, edición/borrado temporal, reacciones, lectura, búsqueda y tickets bajo `/chat/*` |
| Moderacion de contenido | Cola y resolucion de denuncias comunitarias: `/moderacion/comunidad/denuncias*`; reportes de resenas: `/moderacion/reportes*` |
| Moderacion de cuentas | Historial propio, politicas activas/aceptacion y senal tecnica: `/moderacion/mis-incidentes`, `/moderacion/politicas/*`, `/moderacion/senales/abuse-lock`; administracion de casos, incidentes, sanciones y politicas bajo `/moderacion/admin/*` |

Los listados sociales usan cursores documentados en OpenAPI. REST y SQL siguen siendo autoritativos; Firestore, NATS y WebSocket aceleran vistas privadas o entregan novedades.

## WebSocket y eventos en vivo

1. Pedir `POST /chat/ws-ticket` para `/ws/chat` o `POST /chat/comunidad-ws-ticket` para `/ws/community`.
2. Conectar con el ticket en query string antes de 60 segundos. Es de un solo uso.
3. Enviar solo `{ "type": "ping" }`; la respuesta es `{ "type": "pong", "payload": {} }`.

El gateway separa la entrega por canal: `chat.*`, `message.*` y `chat.access_revoked` llegan por `/ws/chat`; notificaciones, comunidad, clubes y moderación llegan por `/ws/community`. `realtime.access_revoked` cierra todos los sockets de la persona con `4403`. El cliente que necesite ambas verticales debe mantener ambos sockets y deduplicar cada canal por `eventId`.

Los eventos recibidos siempre siguen este envelope:

```json
{
  "eventId": "123",
  "occurredAtUtc": "2026-07-11T12:00:00+00:00",
  "type": "chat.message_created",
  "payload": {}
}
```

NATS no conserva historial ni ofrece replay. Deduplicar por `eventId` y resincronizar por REST o Firestore tras cualquier reconexion.

`eventId` es el identificador textual de la fila persistida en `realtime_outbox_eventos`: es único por evento y sirve únicamente para deduplicar. `occurredAtUtc` es la fecha UTC ISO-8601 de creación del outbox. El transporte puede duplicar, reordenar o perder eventos; no hay confirmación del cliente ni cursor de replay.

El gateway solo acepta frames JSON `{ "type": "ping" }`. El tamaño máximo predeterminado es 4096 bytes (`REALTIME_MAX_FRAME_BYTES`) y el límite predeterminado es 30 pings por minuto (`REALTIME_MAX_PINGS_PER_MINUTE`); los entornos pueden ajustarlos mediante esas variables.

| Evento emitido hoy | Payload minimo |
| --- | --- |
| `notification.created` | Notificación persistida (`Id`, `Codigo`, `Titulo`, `Contexto`, fechas). Las resoluciones comunitarias usan `community.report_source_resolved` o `community.report_reporter_resolved`, sin contenido, medida ni identidad del moderador. Para avisos operativos, `Contexto.Destino` indica solo `propio`, `cola_catalogo`, `cola_reportes`, `cola_denuncias_comunidad` o `cola_alegaciones`; `ConversationId` y `MessageId` correlacionan el archivo de sistema. Puede repetirse: reconciliar con `GET /notificaciones`. |
| `notification.read` | `{ Id }` o `{ Todas: true }` |
| `chat.conversation_updated` | `{ ConversationId, Motivo? }`; se emite para creación de grupos, aceptación de invitaciones, cambios de miembros/roles y pérdida de acceso. Un invitado no lo recibe para la conversación del grupo antes de aceptar. El cliente debe reconciliar por REST y cerrar ventanas/typing locales si ya no tiene acceso. |
| `message.created`, `message.updated`, `message.deleted` | Mensaje o tombstone con `Id` y `ConversacionId`; `message.updated` puede incluir `OcultoPorModeracion: true|false` y nunca incluye contenido al cambiar la moderación. En `message.created`, `MensajeRespondido` es el resumen de la respuesta o `null`. Los mensajes de sistema llevan `RemitenteId: null`, `TipoRemitente: sistema`, `CodigoSistema`, `SeveridadSistema`, `Accion?` y `NotificacionId`. |
| `message.reaction_updated` | `{ Id, ConversacionId, UsuarioId, Tipo }` |
| `message.read` | `ConversacionId`, `IdUltimoMensaje`, `UsuarioId`, `NoLeidos` |
| `chat.access_revoked` | `{ ConversacionId, Razon }`; retirar el chat de club de la vista local |
| `community.post_created` | Publicacion creada y, si aplica, `ClubId` |
| `community.comment_created` | `PublicacionId`, `Id` |
| `community.reaction_updated` | `PublicacionId`, `Tipo` |
| `community.post_updated`, `community.post_deleted` | `PublicacionId` |
| `community.comment_updated`, `community.comment_deleted` | `PublicacionId`, `ComentarioId` |
| `club.updated` | `{ ClubId }`; también invalida el detalle/proyección tras retirar o restaurar el club del descubrimiento, sin revelar la medida a terceros |
| `club.reading_updated` | `{ ClubId, LecturaId }` |
| `club.milestone_created`, `club.milestone_updated`, `club.milestone_deleted` | `{ ClubId, HitoId }` |
| `club.event_created`, `club.event_updated`, `club.event_deleted` | `{ ClubId, EventoId }` |
| `moderation.appeal_created`, `moderation.appeal_updated` | Identificadores de alegación/sanción y estado, sin textos ni notas internas |
| `realtime.access_revoked` | `{ reason: "block" | "sanction" }`; cierra los sockets del usuario |

## Contrato RTDB de typing

- Ruta de escritura propia: `typing/<conversationId>/libros:<id_usuario>`.
- Ruta de lectura: cada miembro activo puede leer solo el nodo individual de cualquier participante conocido de esa misma conversación; no puede leer el padre para enumerar participantes.
- Valor recomendado: `true`; eliminarlo al dejar de escribir y registrar `onDisconnect().remove()` al crearlo.
- Al perder membresía, producirse un bloqueo bilateral o aplicarse una sanción que afecta chat, el backend retira la membresía RTDB y elimina el typing propio. Presencia de terceros, typing de conversaciones no accesibles y el índice interno `chat_members` no son legibles por el cliente.

Las encuestas, los debates, los comentarios de debate, las invitaciones y las solicitudes de acceso no emiten hoy un evento granular propio. Cada mutación actualiza la proyección privada de clubes cuando corresponde; el cliente debe reconciliar esa vista o recargar el recurso REST tras recibir `club.updated`, una notificación o al reconectar. No debe asumir eventos inexistentes.

El buscador REST de candidatos de club y la identidad `Autor` de debates/comentarios no añaden eventos ni datos personales al realtime. Los cambios de elegibilidad se reconcilian consultando REST y se vuelven a validar al crear o aceptar una invitación.

Las invitaciones de grupos de chat usan notificaciones persistentes tipadas (`chat.group_invitation_created`, `chat.group_invitation_resolved`, `chat.group_invitation_cancelled`) y `notification.created`; no añaden un evento realtime específico. La pertenencia RTDB, los mensajes y `chat.conversation_updated` de la conversación privada solo se conceden al invitado después de aceptar. Rechazar, cancelar o dejar caducar nunca proyecta la conversación.

La portada `GET /clubes-lectura/resumen` y sus contadores `BandejasAcceso` no crean un canal ni evento adicional. Las altas, resoluciones y cancelaciones de solicitudes o invitaciones invalidan mediante `club.updated`; la cancelación administrativa de una invitación añade una notificación persistente a la persona invitada. Los eventos granulares de lectura, hitos y calendario, y los eventos actuales de publicaciones/comentarios comunitarios, también invalidan sus secciones correspondientes. Tras reconectar, REST es la reconciliación canónica; un evento nunca concede acceso a un club cerrado ni transporta filas de bandeja.

Los eventos de hitos y de chat no transportan spoilers estructurados. El contenido con protección por progreso se limita a debates persistentes y sus comentarios; los clientes no deben añadir campos de spoiler a mensajes ni derivarlos de `HitoId`.

## Cierres y recuperacion

| Codigo | Significado | Cliente |
| --- | --- | --- |
| `4400` | Frame invalido o demasiado grande | Corregir el cliente; no reconectar en bucle. |
| `4401` | Ticket invalido, caducado o ya consumido | Pedir un ticket nuevo por REST. |
| `4403` | Acceso retirado o cuenta no autorizada | Limpiar estado live; recuperar por REST solo cuando el acceso vuelva a permitirse. |
| `4429` | Demasiados pings | Aplicar backoff antes de volver a conectar. |

El cliente aplica reintento con backoff y jitter. La reconexion nunca sustituye una recarga de la vista afectada; si hay duplicados, orden distinto o falta de eventos, REST/Firestore prevalecen.

## Fuente de verdad

Los métodos, cuerpos, paginación, permisos y errores de HTTP se mantienen en `docs/backend/openapi.yaml`. Este documento solo complementa el contrato con transporte live, eventos y recuperación.

Los schemas reutilizables del envelope y de los payloads de clubes/revocaciones están en `components/schemas` de `docs/backend/openapi.yaml`: `RealtimeEnvelope`, `ClubUpdatedEventPayload`, `ClubReadingUpdatedEventPayload`, `ClubMilestoneEventPayload`, `ClubCalendarEventPayload`, `ChatAccessRevokedEventPayload` y `RealtimeAccessRevokedEventPayload`.

`RealtimeDiscriminatedEvent` es la unión tipada canónica entre `type` y `payload`. La evolución solo permite añadir campos opcionales o nuevos tipos documentados; renombrar/eliminar campos requeridos o cambiar su significado exige un tipo nuevo y una migración explícita de clientes.
