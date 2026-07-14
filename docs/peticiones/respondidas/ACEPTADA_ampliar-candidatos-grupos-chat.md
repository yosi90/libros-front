# Solicitud: candidatos externos para grupos de chat

## Qué se necesita

Permitir candidatos de grupo más allá de amistades cuando la relación y las preferencias de mensajería lo hagan elegible, identificando las amistades para priorizarlas.

## Estado de respuesta

ACEPTADA. `GET /chat/grupos/candidatos` devuelve candidatos canónicos con `EsAmistad`, aplica la elegibilidad de directo y sirve tanto creación como administración mediante `ConversacionId` opcional. La creación usa `Invitados` y genera invitaciones consentidas; no incorpora terceros directamente.

La definición vigente está en `docs/backend/GUIA_INVITACIONES_GRUPOS_CHAT.md` y `docs/backend/openapi.yaml`.
