# Petición al backend: contrato exhaustivo de eventos realtime

## Qué necesitamos

El contrato HTTP de comunidad, chat, sanciones y clubes ya es consumible. El transporte WebSocket sigue sin poder tiparse completamente: `RealtimeEnvelope.payload` solo referencia schemas de algunos eventos de clubes y de revocación, mientras que el inventario de `CONTRATOS_REALTIME_ACTUALES.md` describe el resto con payloads mínimos.

Necesitamos una fuente de verdad validable que cubra todos los eventos emitidos por `/ws/chat` y `/ws/community`. Puede ser OpenAPI ampliado, AsyncAPI o un documento de contrato versionado con schemas JSON reutilizables, pero debe expresar la relación exacta entre `type` y `payload`.

### Envelope y discriminación

- Declarar `type` como enum o discriminador estable.
- Modelar `RealtimeEnvelope` como unión discriminada para que cada valor de `type` acepte exclusivamente su schema de `payload`.
- Mantener `eventId` y `occurredAtUtc` con sus formatos, semántica de unicidad y regla de deduplicación.
- Indicar por evento qué socket lo entrega: chat, comunidad o ambos.
- Documentar política de evolución y versionado: cómo se añade un tipo/campo, qué cambios son incompatibles y cómo debe reaccionar un cliente anterior.

### Eventos que deben quedar tipados

- Notificaciones: `notification.created`, `notification.read`.
- Chat y mensajes: `chat.conversation_updated`, `message.created`, `message.updated`, `message.deleted`, `message.reaction_updated`, `message.read`, `chat.access_revoked`.
- Comunidad: `community.post_created`, `community.post_updated`, `community.post_deleted`, `community.comment_created`, `community.comment_updated`, `community.comment_deleted`, `community.reaction_updated`.
- Clubes: confirmar los schemas actuales de `club.updated`, `club.reading_updated`, `club.milestone_created|updated|deleted` y `club.event_created|updated|deleted`, e indicar explícitamente la señal de invalidación que aplica a encuestas, debates y comentarios de debate.
- Moderación y cuenta: `moderation.appeal_created`, `moderation.appeal_updated`, `realtime.access_revoked` y cualquier evento de denuncia, sanción, política, bloqueo o cambio de membresía que pueda afectar a la UI.

Para cada payload necesitamos campos requeridos, opcionales y anulables, límites/enums, ejemplos y una indicación de si contiene una entidad persistida completa, un tombstone o solo identificadores para invalidar REST. Los eventos nunca deben incluir notas internas ni datos de terceros no autorizados.

## Cierres, límites y recuperación

Completar junto al contrato:

- catálogo definitivo de cierres WebSocket, motivo, reintento permitido y comportamiento de UI;
- tamaño máximo de frame, límites por tipo de frame y política de backoff;
- garantías de duplicación, desorden, pérdida y ausencia de replay;
- secuencia esperada al perder acceso por bloqueo, sanción o membresía;
- ejemplos completos de ticket, conexión, `ping`/`pong`, evento y revocación.

## Por qué se necesita

El frontend puede usar REST como fuente de verdad, pero no debe adivinar la forma de un payload ni qué recurso invalidar. Un contrato exhaustivo permite centralizar deduplicación y reconexión, evitar estados obsoletos y generar tipos TypeScript seguros.

## Qué esperamos lograr

- Implementar la infraestructura realtime sin casts `unknown` ni heurísticas por evento.
- Recargar únicamente los recursos afectados después de una señal, manteniendo REST como estado recuperable.
- Tratar pérdida de permisos y cierres de socket de forma segura y consistente.

## Criterios de aceptación

- Cada `type` emitido hoy tiene un schema de payload y socket de entrega documentados.
- El envelope usa una discriminación validable entre `type` y `payload`.
- Todos los cambios de clubes, encuestas, debates y moderación tienen un evento granular o una estrategia de invalidación explícita.
- Cierres, límites, reintentos y semántica de recuperación están documentados y son coherentes con la guía de integración.
- La especificación o contrato asociado se valida en CI junto al OpenAPI.

## Estado de respuesta

**ACEPTADA (revisada el 2026-07-12).**

Backend incorporó `RealtimeDiscriminatedEvent` como unión canónica entre `type` y `payload`, con schemas para notificaciones, chat, mensajes, comunidad, clubes, alegaciones y revocaciones. También documentó qué socket entrega cada familia, la invalidación de encuestas/debates, límites de frames, cierres, reintentos, deduplicación, pérdida y evolución compatible de eventos.

El frontend puede implementar ya Firebase y WebSocket usando REST como fuente de verdad. La configuración específica del linter backend y las advertencias editoriales OpenAPI siguen siendo deuda de calidad independiente.
