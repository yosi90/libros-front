# Petición: avisos accionables para peticiones, reportes y alegaciones

## Contexto

El frontend ya dispone de centro de notificaciones persistente, preferencias, entrega realtime mediante `notification.created` y navegación interna construida exclusivamente desde `ContextoTipo` y `Contexto`. También existen los contextos `catalog_request`, `review_report`, `community_moderation` y `moderation_appeal`.

Sin embargo, el contrato no define qué avisos se crean cuando una petición o un reporte entra, cambia o se resuelve, ni diferencia el destino de una misma entidad para su autor frente al personal que la gestiona. Hoy el frontend solo puede llevar `catalog_request` a Perfil > Mis peticiones y `review_report` a Perfil > Mis reportes.

La gestión básica de políticas **no es una carencia de backend**: ya usamos borrador y publicación por tipo bajo `/moderacion/admin/politicas/{kind}/borrador` y `/publicar`. Esta petición no solicita reimplementar ese ciclo.

## Qué se necesita

Publicar en OpenAPI y en una guía de integración una matriz única de avisos persistentes para peticiones, reportes y alegaciones, entregados solo a personas autorizadas y navegables mediante contexto tipado seguro.

### 1. Eventos y destinatarios

Definir códigos estables, categoría, título/cuerpo permitido, contexto y destinatarios para, como mínimo:

| Dominio | Evento | Destinatarios esperados |
| --- | --- | --- |
| Peticiones de catálogo | Creación y reenvío de una petición pendiente | Administradores y moderadores con acceso efectivo a la cola de catálogo. |
| Peticiones de catálogo | Devuelta, aprobada o rechazada | La persona creadora de la petición. |
| Reportes de reseñas | Creación de un nuevo grupo pendiente | Administradores y moderadores con acceso efectivo a la cola de reportes. No generar una alerta por cada denuncia adicional del mismo grupo pendiente. |
| Reportes de reseñas | Resolución del grupo | Cada persona que haya presentado un reporte dentro del grupo, sin revelar denunciantes ni datos internos a terceros. |
| Denuncias comunitarias | Creación de un nuevo grupo pendiente | Personal con acceso efectivo a la bandeja de denuncias comunitarias. Las notificaciones de resolución ya existentes para fuente y denunciantes deben mantenerse. |
| Alegaciones de sanción | Nueva alegación y cambios de estado | Personal con acceso a la cola administrativa, y la persona autora cuando proceda, sin exponer nota interna ni información de terceros. |

Si existe algún otro tipo de petición, reporte o cola moderable que el frontend deba soportar, incluirlo en esta matriz en lugar de crear una ruta paralela sin documentar.

### 2. Contextos tipados y navegación

Mantener la regla actual: el backend no envía URLs y el frontend no deduce destinos desde texto libre.

Para `catalog_request`, `review_report`, `community_moderation` y `moderation_appeal`, ampliar el contexto discriminado —o añadir un código/acción tipado equivalente— con:

- identificador mínimo de la petición, grupo o alegación;
- estado funcional que motivó el aviso;
- un destino semántico permitido, por ejemplo `propio`, `cola_catalogo`, `cola_reportes`, `cola_denuncias_comunidad` o `cola_alegaciones`;
- datos de enfoque opcionales, solo cuando no expongan contenido, autores, notas internas ni terceros.

El backend decide el destinatario y el destino semántico al persistir cada notificación. El frontend solo convierte ese destino permitido a una ruta interna y vuelve a validar el acceso con guards y la respuesta REST.

### 3. Entrega, consistencia y privacidad

- Persistir primero el aviso y emitir después el `notification.created` ya existente; `GET /notificaciones` sigue siendo la fuente de verdad tras reconexión.
- Garantizar deduplicación idempotente por destinatario, entidad/grupo, transición y código. Una resolución concurrente no puede crear avisos repetidos.
- Respetar bajas, revocaciones, bloqueo de cuenta y permisos efectivos del destinatario en el instante de creación.
- Documentar qué categoría usan estos avisos y si la entrega `in_app` es obligatoria para trabajo de moderación; las preferencias push pueden seguir la política que determine backend.
- No incluir motivos privados, payloads de catálogo, notas internas, contenido denunciado, identidad de otros denunciantes ni datos de moderación que el destinatario no pueda consultar por REST.
- Documentar códigos de error, límites y los eventos realtime que correspondan. No hace falta crear un canal realtime distinto si `notification.created` cubre el caso.

## Qué se espera lograr

Que una persona que pueda gestionar una entrada reciba una alerta con CTA a su cola concreta, y que quien haya creado una petición, reporte o alegación reciba el resultado en su propia vista. Todo ello debe funcionar tras reconexión, sin duplicados y sin que el frontend reconstruya reglas de autorización.

## Compatibilidad solicitada

- Conservar los contextos y avisos existentes de resolución de denuncias comunitarias.
- Conservar las notificaciones correlacionadas con Yosiftware cuando correspondan; no duplicar mensajes de sistema ni la campana.
- No cambiar los endpoints actuales de peticiones, reportes, denuncias, alegaciones, preferencias o lectura de notificaciones salvo ampliación documentada y compatible.
- Mantener los endpoints actuales de políticas: el frontend utilizará el borrador y la publicación ya documentados para una sección administrativa propia.

## Estado de respuesta

**ACEPTADA — 2026-07-13.**

El backend publicó `docs/backend/GUIA_NOTIFICACIONES_OPERATIVAS.md`, actualizó OpenAPI y extendió `notification.created` sin añadir rutas incompatibles. La respuesta cubre:

- los ocho códigos solicitados para catálogo, reportes de reseñas, denuncias comunitarias y alegaciones;
- destinatarios por permisos efectivos, incluido el aviso de creación de grupo y el resultado para autores o denunciantes;
- `Contexto.Destino` discriminado (`propio`, `cola_catalogo`, `cola_reportes`, `cola_denuncias_comunidad` y `cola_alegaciones`), sin URLs ni inferencia desde texto;
- persistencia previa a realtime, mensajes correlacionados en el archivo de sistema, categoría obligatoria `in_app` para moderación y deduplicación por destinatario, código, entidad, transición y destino;
- límites de privacidad y reconciliación desde `GET /notificaciones`.

No se solicitó trabajo adicional de políticas porque los endpoints de borrador y publicación ya estaban disponibles. Queda implementar en frontend la sección administrativa propia, los destinos internos y los estados de carga del Perfil.
