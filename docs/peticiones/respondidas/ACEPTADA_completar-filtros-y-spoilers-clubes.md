# Petición al backend: completar filtros y spoilers de clubes

## Contexto

La fase de clubes del frontend ya integra creación, detalle, membresías, invitaciones, solicitudes, roles, chat, lectura actual e histórico, progreso, hitos, calendario, encuestas y debates.

Quedan dos capacidades del roadmap que el contrato actual no permite completar:

1. `GET /clubes-lectura` no declara parámetros de búsqueda, filtros ni paginación.
2. `ClubSpoiler` solo está conectado a debates y comentarios de debate. Los hitos y mensajes de chat no exponen contexto ni estado de spoiler.

## Qué necesitamos para descubrimiento de clubes

Ampliar `GET /clubes-lectura` con un listado paginado y filtros documentados. Como mínimo, necesitamos valorar:

- búsqueda textual por nombre;
- tipo de objetivo: `libro`, `saga`, `universo` o `antologia`;
- ID canónico del objetivo;
- visibilidad, si backend considera que el usuario puede consultar más de una variante;
- estado de membresía respecto al usuario autenticado: disponible, miembro o solicitud pendiente;
- cursor estable y límite máximo;
- orden explícito, por ejemplo actualización descendente con desempate por ID.

Backend puede ajustar los filtros finales a su modelo, pero OpenAPI debe declarar:

- nombre, ubicación, tipo y límites de cada parámetro;
- combinación permitida entre tipo e ID del objetivo;
- schema paginado de respuesta y cursor siguiente;
- errores funcionales estables para filtros o cursores inválidos;
- aplicación de privacidad, bloqueos, sanciones y clubes eliminados antes de devolver resultados.

El listado no debe conceder acceso a contenido privado ni revelar la existencia de clubes cerrados inaccesibles. Si los clubes cerrados deben permanecer completamente fuera del descubrimiento, documentarlo como decisión y limitar el filtro de visibilidad a los valores realmente consultables.

## Qué necesitamos para spoilers de hitos y chat

Definir si hitos y mensajes de chat soportarán spoilers estructurados o si el alcance de producto debe corregirse expresamente para mantenerlos fuera.

Si se aceptan, necesitamos:

- reutilizar un schema cerrado equivalente a `ClubSpoiler` para escritura y lectura;
- vincular el spoiler a una lectura de libro mediante `LecturaId`, `HitoId` o una relación backend inequívoca;
- soportar páginas y capítulos con reglas de rango y pertenencia al libro;
- devolver `Oculto` y contenido anulable cuando el progreso sea desconocido o insuficiente;
- definir si un hito marcado propaga su contexto a debates o mensajes vinculados;
- permitir revelado explícito mediante un parámetro como `revelarSpoilers=true`, sin activarlo por defecto;
- aclarar si el chat admite spoiler por mensaje, por conversación de club o únicamente mediante referencias a hitos;
- mantener mensajes directos fuera de esta semántica salvo decisión explícita.

Para chat necesitamos actualizar, según la decisión final:

- `ChatMessageCreateRequest`;
- `ChatMessage` y `ChatReplySummary` cuando corresponda;
- historial y búsqueda de mensajes;
- payloads realtime `message.created`, `message.updated` y respuestas citadas;
- comportamiento de edición, borrado y moderación sobre contenido oculto.

Para hitos necesitamos actualizar:

- request de creación y edición;
- `ClubMilestone`;
- listados y eventos realtime de invalidación;
- reglas de visibilidad para miembros con progreso distinto.

## Por qué se necesita

Sin filtros ni paginación, el descubrimiento solo puede mostrar una colección completa de clubes abiertos y no escala ni permite encontrar hubs asociados a una lectura concreta.

Sin contrato de spoiler para hitos/chat, el frontend no puede enviar campos inventados ni ocultar texto después de haberlo recibido: la protección debe aplicarse en backend antes de serializar el contenido. Una ocultación solo visual filtraría spoilers mediante red, caché o herramientas del navegador.

## Qué esperamos lograr

- Descubrir clubes relevantes por texto y objetivo canónico.
- Paginar el directorio con orden estable y deduplicación segura.
- Mantener clubes privados, bloqueados o eliminados fuera de resultados no autorizados.
- Aplicar una única semántica de progreso y revelado a los spoilers de clubes.
- Evitar que hitos, mensajes, respuestas o eventos realtime filtren contenido oculto.
- Cerrar la fase de clubes sin contratos inferidos por el frontend.

## Criterios de aceptación

### Descubrimiento

- `GET /clubes-lectura` declara filtros útiles y paginación por cursor.
- La respuesta incluye cursor siguiente y orden estable documentado.
- Tipo e ID de objetivo tienen validación conjunta.
- Los errores de filtros y cursor disponen de `error.code` estable.
- Privacidad, bloqueos, sanciones y borrado se aplican en backend.

### Spoilers

- Backend acepta o rechaza expresamente spoilers en hitos y chat como decisión de producto.
- Si se aceptan, todos los request/response schemas afectados quedan completos y cerrados.
- El contenido oculto no viaja al cliente salvo revelado explícito.
- Historial, búsqueda, replies y eventos realtime mantienen la misma protección.
- Se documentan herencia, progreso insuficiente, rangos y permisos.
- REST continúa siendo la fuente de verdad después de señales realtime.

## Entrega esperada

Actualizar y devolver, según la decisión:

- `docs/backend/openapi.yaml` y `docs/backend/openapi/paths/comunidad-realtime.yaml`;
- schemas de listado paginado y filtros de clubes;
- schemas de spoiler para hitos/chat o una decisión explícita de exclusión;
- `docs/backend/GUIA_INTEGRACION_COMUNIDAD_REALTIME.md`;
- `docs/backend/CONTRATOS_REALTIME_ACTUALES.md` si cambian payloads de chat o clubes.

## Estado de respuesta

**ACEPTADA (revisada el 2026-07-13).**

Backend añadió descubrimiento paginado por cursor estable, búsqueda por nombre, filtro conjunto por tipo/ID de objetivo, estado de membresía y códigos funcionales. Conserva fuera del listado los clubes cerrados, eliminados, bloqueados o inaccesibles.

Para spoilers tomó una decisión de alcance explícita y aceptada por producto: la protección por progreso pertenece a debates persistentes y sus comentarios. Los hitos son metadatos de coordinación y el chat, directo o de club, no admite spoilers ni debe inferirlos desde hitos. Esta decisión evita complejidad y falsas garantías en una superficie efímera; el frontend dirigirá el contenido sensible a debates.
