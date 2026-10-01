# Datos de libro en la notificación de petición de catálogo aprobada

## Estado de respuesta

ACEPTADA (28/9/2026). El backend añadió `TipoEntidad`, `Accion` y `EntidadId` al contexto de `catalog_request.resolved` cuando hay entidad canónica. Las aprobaciones de libro, tanto altas como ediciones, incluyen el ID. `GET /notificaciones` y `GET /notificaciones/{id}` añaden `EnBiblioteca` calculado al consultar en avisos propios de libro aprobado. Realtime y push llevan solo el contexto estático; el cliente consulta REST antes de ofrecer la acción. Los avisos históricos pueden carecer de estos campos. Contrato: `docs/backend/api/ENDPOINTS.md`, sección de notificaciones, y `docs/backend/openapi.yaml`.

## Necesidad

Queremos que, al recibir la notificación de una petición de libro aprobada, la persona pueda añadir ese libro a su biblioteca desde el aviso y elegir en ese momento su estado de lectura. El frontend ya dispone del selector adaptable a Web, Wood y Android, y de la escritura de estado en la colección.

Hoy `catalog_request.resolved` lleva un contexto `catalog_request` con `Id` de petición, `Estado` y `Destino`. No permite distinguir si la petición era de libro ni identificar el libro resultante. Resolver cada aviso con `GET /peticiones/catalogo/mias` y cruzar toda la colección personal implicaría cargar listados completos al abrir la campana. El aviso puede seguir accesible después de que el libro haya sido añadido por otra vía.

## Solicitud al backend

Ampliar el contrato de las notificaciones propias de resolución de petición para que el frontend conozca, sin recorrer todas las peticiones y toda la colección:

- El tipo de entidad y la acción de la petición (`TipoEntidad`, `Accion`), tanto en altas como en ediciones.
- El identificador canónico del libro asociado cuando exista (`EntidadId`), especialmente después de aprobar una petición de libro. Aclarar cuándo puede quedar nulo en una aprobación.
- Si el libro está ya en la biblioteca de la persona destinataria en el momento de consultar sus notificaciones, o una forma acotada de consultar esa condición para el aviso. Este dato debe reflejar cambios posteriores a la creación del aviso, no quedar congelado en el evento original.

El backend decide si estos datos se incorporan al contexto de la notificación o se exponen por otro contrato puntual. Confirmar qué devuelve el listado de notificaciones, la consulta de una notificación concreta usada al abrir un push y el evento en tiempo real. Conservar la compatibilidad de los avisos históricos que carecen de los campos nuevos.

## Resultado esperado

El frontend ofrecerá «Añadir a mi biblioteca» solo en una notificación propia de petición aprobada de tipo `libro`, con `EntidadId` válido y cuando el libro aún no esté en la colección. Al tocarla, abrirá el selector de estado apropiado para la pantalla y guardará el estado mediante la API de colección existente. Antes de escribir, podrá revalidar con el detalle público del libro para cubrir cambios ocurridos mientras el aviso estaba abierto. Las peticiones rechazadas, devueltas, de otros tipos o sin libro canónico conservarán únicamente su navegación habitual.
