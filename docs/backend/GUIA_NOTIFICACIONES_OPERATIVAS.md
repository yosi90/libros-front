# Guía de integración: notificaciones operativas

## Estado

Disponible en desarrollo. No se añaden rutas: `GET /notificaciones`, `notification.created` y las colas REST existentes siguen siendo el contrato canónico.

## Matriz de avisos

| Código | Categoría | Destinatario | Contexto y destino |
| --- | --- | --- | --- |
| `catalog_request.pending` | `sistema` | Administradores y moderadores activos de catálogo | `catalog_request`: `Id`, `Estado: pendiente`, `Destino: cola_catalogo` |
| `catalog_request.resolved` | `sistema` | Persona creadora | `catalog_request`: estado `devuelta`, `aprobada` o `rechazada`, `Destino: propio` |
| `review_report.pending` | `moderacion` | Administradores y moderadores activos | `review_report`: grupo pendiente, `Destino: cola_reportes` |
| `review_report.resolved` | `moderacion` | Fuente y cada denunciante del grupo | `review_report`: estado final, `Destino: propio` |
| `community.report_pending` | `moderacion` | Administradores y moderadores activos | `community_moderation`: grupo pendiente, tipo/entidad, `Destino: cola_denuncias_comunidad` |
| `community.report_source_resolved` / `community.report_reporter_resolved` | `moderacion` | Fuente o denunciante respectivamente | `community_moderation`: estado final, `Destino: propio` |
| `moderation.appeal_created` | `moderacion` | Administradores activos | `moderation_appeal`: alegación pendiente, `Destino: cola_alegaciones` |
| `moderation.appeal_updated` | `moderacion` | Persona autora | `moderation_appeal`: estado actual, `Destino: propio` |

Cada aviso se persiste antes de emitir `notification.created` y crea un único mensaje correlacionado en la conversación personal `sistema`. La notificación expone `ConversationId` y `MessageId`; el front usa `ContextoTipo`, `Contexto.Destino` e identificadores, nunca texto libre ni URLs.

## Reglas de consumo

- Las categorías `moderacion` son obligatorias in-app. Push mantiene las preferencias de cuenta. Catálogo conserva `sistema`.
- Tras reconexión, recuperar desde `GET /notificaciones`; realtime es at-least-once y puede repetirse.
- Navegar solo a la pantalla indicada por `Destino` y volver a consultar la cola o recurso: una revocación de rol, bloqueo de cuenta o resolución puede haber ocurrido después de emitirse el aviso.
- Los avisos no exponen motivos privados, payload de catálogo, notas internas, contenido moderado ni identidad de otros denunciantes.
- La deduplicación es por destinatario, código, entidad, transición y destino. Una creación repetida o resolución concurrente no genera una segunda campana ni mensaje de sistema.

Las políticas permanecen fuera de esta vertical: usar los endpoints actuales de borrador y publicación.
