# Solicitud: candidatos externos para grupos de chat

## Qué se necesita

Permitir candidatos de grupo más allá de amistades cuando la relación y las preferencias de mensajería lo hagan elegible, identificando las amistades para priorizarlas.

## Estado de respuesta

ACEPTADA. `GET /chat/grupos/candidatos` devuelve candidatos canónicos con `EsAmistad`, aplica la elegibilidad de directo y sirve tanto creación como administración mediante `ConversacionId` opcional. La creación usa `Invitados` y genera invitaciones consentidas; no incorpora terceros directamente.

La guía histórica equivalente está en `docs/backend/guias/antiguas/INVITACIONES_GRUPOS_CHAT.md` y el contrato vigente en `docs/backend/openapi.yaml`.
