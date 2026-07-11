# Petición al backend: recursos formales y alcance de sanciones

## Qué necesitamos

El usuario debe poder entender y recurrir una sanción. Solicitamos que backend diseñe un flujo formal con capacidades equivalentes a:

- listar recursos propios asociados a incidente o sanción;
- crear una alegación con límites de longitud y reglas de elegibilidad;
- consultar estado `pendiente`, `en_revision`, `aceptado` o `rechazado`, o enums equivalentes;
- devolver resolución, fecha y efectos aplicados;
- bandeja administrativa/moderadora para resolver recursos;
- auditoría sin exponer notas internas al usuario.

También necesitamos que cada sanción indique alcance funcional estable: cuenta completa, creación, comunidad, publicación, chat, clubes u otros que backend decida. Los errores deben devolver `code`, alcance y, cuando sea seguro, vencimiento y acción necesaria.

## Por qué se necesita

Un `403` genérico no permite distinguir una sanción parcial, una política pendiente o una sesión inválida. Sin recurso dentro de la aplicación la resolución no es trazable para usuario ni moderación.

## Qué esperamos lograr

- Mostrar motivo, duración y capacidades afectadas.
- Mantener disponible la biblioteca si la sanción solo afecta a comunidad.
- Limpiar chat/realtime sin cerrar sesión cuando corresponda.
- Permitir una revisión trazable con resolución visible.

## Decisiones que debe devolver backend

- Endpoints, roles, enums y límites del flujo de recurso.
- Catálogo definitivo de alcances y precedencia entre sanciones simultáneas.
- Códigos de error y datos seguros para la UI.
- Eventos de notificación/realtime al crear o resolver un recurso.
