# Petición al backend: perfiles, relaciones, gates y deep links de Comunidad

## Contexto

El frontend ya consume los contratos REST de moderación, notificaciones, feed, clubes y chat. Al completar las primeras superficies se han identificado cuatro huecos que no deben resolverse infiriendo permisos, privacidad o identificadores desde la UI.

Esta petición no incluye trabajo visual ni de Firebase/FCM del frontend. Pedimos únicamente capacidades backend o documentación OpenAPI precisa para integrar las reglas existentes de forma segura.

## 1. Estado efectivo de capacidades, políticas y sanciones propias

### Qué se necesita

Exponer una lectura propia, o ampliar un recurso propio ya existente, que devuelva las capacidades actualmente restringidas para el usuario autenticado y los requisitos de política pendientes.

La respuesta debe poder expresar, como mínimo:

- alcances activos: `cuenta`, `creacion`, `comunidad`, `publicacion`, `chat` y `clubes`;
- estado de cada restricción, motivo visible, fecha de inicio, vencimiento/permanencia y sanción/incidentId cuando proceda;
- políticas activas pendientes de aceptar por tipo (`uso` y `creacion`);
- si `account_sanctioned` obliga a limpiar realtime y qué alcances lo disparan.

También se debe documentar de forma exhaustiva el catálogo de `error.code` funcionales asociados: sanción por alcance, política pendiente y límites de producto.

### Por qué se necesita

`GET /moderacion/mis-incidentes` muestra historial sin datos internos, pero su schema no comunica el alcance efectivo de la sanción. El frontend no puede decidir con seguridad qué acción ocultar o bloquear; tampoco debe cerrar la sesión ante un `403` funcional.

### Qué se espera lograr

Aplicar gates solo a la funcionalidad afectada, conservar biblioteca y sesión cuando la sanción no sea de cuenta completa, informar a la persona afectada y limpiar sockets/RTDB cuando corresponda.

## 2. Perfiles públicos individuales y privacidad del directorio

### Qué se necesita

Documentar e implementar una lectura individual autorizada, preferiblemente:

`GET /comunidad/usuarios/{id}`

Debe devolver únicamente la identidad y los datos lectores que el perfil permita al usuario autenticado, respetando perfil privado, bloqueo bilateral y sanciones. Incluir schema de éxito y errores `401`, `403`/`404` sin filtrar información privada.

Además, documentar explícitamente el comportamiento de `GET /comunidad/usuarios?q=`:

- perfiles privados excluidos de exploración y sugerencias;
- búsqueda por `@alias` exacto para perfiles privados, cuando sea aplicable;
- límite, orden y semántica de `q`.

### Por qué se necesita

La ruta frontend `/dashboard/community/users/:id` no puede construirse sobre el directorio general: no hay contrato de detalle ni garantía de privacidad por ID.

### Qué se espera lograr

Perfiles navegables sin exponer usuarios privados ni permitir enumeración de datos sociales.

## 3. Lecturas de relaciones y solicitudes pendientes

### Qué se necesita

Añadir y tipar operaciones propias para consultar las relaciones actuales y las solicitudes de amistad pendientes. Puede ser un endpoint agregado o recursos separados, pero debe cubrir:

- seguidos y seguidores, con cursor estable si puede superar un tamaño pequeño;
- amistades activas;
- solicitudes de amistad recibidas y enviadas, con ID, usuario mínimo, fechas y estado;
- bloqueos propios, sin exponer quién ha bloqueado al usuario;
- estado de relación con una persona concreta si resulta necesario para el perfil público.

Documentar esquemas, paginación, permisos, límites y `error.code`. Mantener `POST|DELETE /comunidad/seguimientos`, `POST /comunidad/amistades/solicitudes` y su resolución como escrituras idempotentes o explicar su semántica final.

### Por qué se necesita

Actualmente solo existen las escrituras de seguimiento, solicitud y bloqueo. El frontend puede iniciar acciones, pero no puede mostrar listados ni completar el ciclo de solicitudes sin inventar estado local.

### Qué se espera lograr

Completar relaciones, solicitudes pendientes y desbloqueo usando REST como fuente de verdad, incluida la disponibilidad de chat directo que ya se consulta con su endpoint de elegibilidad.

## 4. Contrato validable para deep links de notificaciones

### Qué se necesita

Convertir el actual `Notification.Contexto: object` genérico en un contrato discriminado por `ContextoTipo`, con schemas reutilizables o una unión `oneOf` para:

- `club`;
- `relationships`;
- `catalog_request`;
- `review_report`;
- `community_moderation`;
- `moderation_appeal`;
- `chat_conversation`;
- `feed_publication`;
- `user_profile`;
- `none`.

Cada variante debe declarar los IDs requeridos/opcionales, ejemplos y el comportamiento cuando el recurso se elimina, deja de ser accesible, queda bloqueado o está sancionado. Confirmar que nunca se enviarán URLs arbitrarias.

### Por qué se necesita

El frontend conoce los tipos, pero no las claves exactas de `Contexto`; no es seguro inferirlas ni construir navegación a partir de URLs recibidas.

### Qué se espera lograr

Resolver deep links internos de manera validable, segura y degradable a un aviso cuando el destino ya no sea accesible.

## Criterios de aceptación

- OpenAPI referencia todas las rutas y schemas nuevos sin referencias rotas.
- Éxitos, errores funcionales, permisos, paginación y ejemplos quedan documentados.
- No se exponen datos de perfiles privados, bloqueos de terceros, notas internas ni alcances administrativos sensibles.
- Los contratos permiten al frontend aplicar gates por capacidad y deep links sin inferencias.

## Estado de respuesta

**ACEPTADA (revisada el 2026-07-13).**

Backend incorporó `GET /moderacion/mi-estado-acceso` con restricciones, sanciones, políticas y la señal de limpieza realtime; también completó la lectura individual autorizada de perfiles, los listados propios de relaciones y solicitudes por cursor, y el estado de relación por persona. Los contratos preservan la privacidad mediante `404` para perfiles inaccesibles y no exponen bloqueos de terceros.

La corrección posterior convierte `Notification` en una unión `oneOf` validable: cada `ContextoTipo` tiene un schema de `Contexto` cerrado, sus identificadores requeridos y un ejemplo. OpenAPI y la guía definen que los destinos eliminados o inaccesibles conservan la notificación y muestran un estado no disponible, sin aceptar URLs arbitrarias.

La guía y las extensiones `x-functional-error-codes` documentan el catálogo funcional de gates, límites y todas las lecturas/escrituras de relaciones. El contrato queda preparado para implementar gates, perfiles, relaciones y deep links sin inferencias de UI.
