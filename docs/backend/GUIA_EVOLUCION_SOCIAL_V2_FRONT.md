# Guia del front: evolucion social v2

Esta guía resume las decisiones de integración social para el front. El contrato exacto, campos y errores vive en `docs/backend/openapi.yaml`; `docs/backend/ENDPOINTS.md` es su referencia humana.

## Como usar esta guia

- Lo ya disponible de comunidad, clubes, chat y realtime se integra siguiendo `GUIA_INTEGRACION_COMUNIDAD_REALTIME.md`.
- El chat v2 cubre texto, edición, borrado, reacciones, lectura y búsqueda; adjuntos, audio, vídeo y llamadas no forman parte del contrato actual.
- El inventario de rutas, Firebase, eventos y cierres WebSocket está en `CONTRATOS_REALTIME_ACTUALES.md`.
- OpenAPI documenta los contratos activos de clubes y moderación comunitaria, incluidos creación, membresías, invitaciones, solicitudes, lectura actual, histórico, progreso personal, hitos, eventos, encuestas, debates y resolución de denuncias. Consumirlos como contratos canónicos de estas pantallas.
- Las pruebas y validaciones de despliegue se gestionan en una iniciativa de calidad separada.

## Contratos sociales disponibles

- Las sanciones son por capacidad, no solo por baneo completo: el front debe ocultar o bloquear la acción afectada, conservando biblioteca y sesión cuando el alcance no sea `cuenta`.
- Alegaciones de sanciones propias ya disponibles: `GET /moderacion/alegaciones`, `POST /moderacion/alegaciones/sanciones/<idSancion>` y la cola admin bajo `/moderacion/admin/alegaciones`. El usuario nunca recibe notas internas, snapshots ni datos de terceros; al cambiar el estado recibira notificacion y evento realtime para recargar su listado.
- Centro de notificaciones con cursor estable, preferencias por categoria y canal, y push web FCM opcional por dispositivo. Registrar el token actual con `POST /notificaciones/dispositivos`; al salir, llamar `POST /auth/logout` con el `DispositivoId` devuelto para revocarlo. El payload FCM comparte `notificationId` con centro y toast para deduplicar.
- Chat con idempotencia por `clientMessageId`, edicion y borrado temporal, reacciones, busqueda y eventos realtime reconciliables.
- Feed con audiencias `publico`, `seguidores`, `amigos` y `club`: el backend filtra por privacidad, bloqueo bilateral y membresía, por lo que el front no debe inferir ni intentar ampliar accesos. Publicaciones y comentarios pueden enlazar de forma exclusiva un `LibroId` o `AntologiaId`. Feed y comentarios usan el cursor estable `cursorFecha` + `cursorId` y devuelven `SiguienteCursor`; al ser `null` no hay más resultados.
- El autor puede editar o borrar lógicamente sus publicaciones y comentarios. Ante `community.post_updated|post_deleted|comment_updated|comment_deleted`, invalidar o actualizar el elemento por sus IDs; la auditoría es interna y no se expone al cliente.
- La actividad lectora automática está disponible: consultar o guardar preferencias en `GET|PUT /comunidad/actividad/preferencias`. Los cambios de estado, puntuación y reseña de `/coleccion/*` aceptan `PublicarActividad`; `true` publica puntualmente, `false` evita publicar y omitirlo respeta el opt-in. Los perfiles privados no generan publicaciones automáticas.
- Los spoilers de publicaciones y comentarios se declaran por página y/o capítulo de su libro vinculado. El feed devuelve `ContenidoMarkdown: null` y `Spoiler.Oculto: true` cuando el progreso es desconocido o insuficiente; la interfaz solo debe añadir `revelarSpoilers=true` tras una acción explícita de la persona lectora.
- Clubes: lecturas, hitos, eventos, encuestas y debates usan `limit` + `cursorId` y devuelven `SiguienteCursor`. El detalle del club pagina `MiembrosDetalle` de la misma forma, con `SiguienteCursorMiembros`; sus métricas siguen mostrando el total de miembros activos. Cada miembro administra solo su progreso opcional desde `/progreso`; el valor no se comparte salvo que se marque expresamente `Compartir`.
- Propietarios y moderadores administran hitos y eventos internos. Las encuestas muestran resultados tras votar o cerrar y el voto puede cambiarse hasta la fecha de cierre. Los debates son persistentes, no pertenecen al chat del club y pueden usar spoilers estructurados de su lectura de libro; los comentarios heredan el rango. Igual que el feed, el contenido se oculta si el progreso no basta y solo se revela al pedir `revelarSpoilers=true`.
- Firebase web se configura exclusivamente por variables de entorno del front; nunca por la API ni con credenciales de administrador. La guía de integración indica las claves públicas requeridas, uso de emuladores y la limpieza `onDisconnect()` de presencia y typing.

## Catálogo y colección relacionados

- La escritura de catalogo para administradores y moderadores esta disponible en `/catalogo/admin/autores|universos|sagas|libros|antologias` (`POST`) y `/catalogo/admin/<tipo>/<id>` (`PATCH`). Las escrituras legacy equivalentes ya fueron retiradas.
- OpenAPI ya describe esas diez operaciones administrativas en `docs/backend/openapi.yaml`; usarlo como referencia de body, permisos y respuestas de error, junto con esta guia para las decisiones de integracion.
- Las altas y ediciones aceptan relaciones completas: autores, universo o saga, idiomas y estilos. En obras se debe enviar exactamente una ubicacion: `Saga`/`SagaId` con `Orden`, o `Universo`/`UniversoId`. Las listas de relaciones reemplazan el conjunto existente cuando se envian. Las peticiones de catalogo aprobadas aplican exactamente este mismo payload.
- El contenido narrativo de una obra exige que el usuario la tenga guardada en su colección personal. Esto no concede acceso al contenido creado por otros usuarios: capítulos, escenas, personajes y entidades narrativas se siguen filtrando por su autor.
- Idiomas y estilos ya tienen administracion controlada bajo `/catalogo/admin/*` para administrador/moderador. Los lugares de origen siguen siendo un catalogo vivo: se corrigen o fusionan hacia un destino, sin borrados libres que dejen autores sin referencia.
- Para crear o modificar contenido narrativo ligado a un libro, el usuario debera tener el libro en su coleccion personal. Ser el creador auditado del libro no concede acceso por si solo.
- Las estadísticas de lectura son estrictamente personales por `id_usuario`; las estadísticas de capítulos, escenas y personajes conservan su autoría narrativa personal. No usar `id_usuario_creador` de una obra canónica para decidir visibilidad en el front.

## Realtime y recuperacion

SQL y REST siguen siendo la fuente recuperable. Firestore, RTDB y WebSocket aceleran la interfaz, pero el cliente debe deduplicar eventos por `eventId` y resincronizar con REST o Firestore tras reconectar, recibir eventos desordenados o perder permisos.

Firestore solo proyecta vistas privadas que se benefician de listener u offline: perfil/configuracion propia, preferencias y centro de notificaciones, relaciones y bloqueos, clubes propios, actividad, coleccion ligera, peticiones/reportes propios y alegaciones/sanciones propias. No se proyecta el feed publico, mensajes ni contenido narrativo como sustituto de REST; para ellos la API sigue siendo la lectura autoritativa.

Estrategia de cliente:

1. Aplicar optimistamente solo cambios iniciados por la propia persona usuaria y reconciliarlos con la respuesta REST persistida.
2. Tratar WebSocket/NATS como señal: deduplicar `eventId`, invalidar o refrescar el recurso indicado por su payload y tolerar orden no determinista.
3. Mantener listeners Firestore únicamente en las vistas privadas listadas. Cada snapshot reemplaza o reconcilia el estado local, nunca se escribe desde el cliente.
4. Al reconectar, recibir `4403`, perder eventos o detectar un salto de estado, recargar REST y usar Firestore solo como acelerador. No existe replay de NATS ni debe inventarse un cursor de WebSocket.

Las notificaciones ya entregan `ContextoTipo` y `Contexto` con identificadores de dominio. El front resuelve internamente el deep link segun ese tipo; no debe aceptar ni esperar URLs enviadas por la API.

Los eventos realtime son efimeros y los tickets WebSocket caducan; el backend los retiene solo de forma operativa. El front debe seguir resincronizando por REST/Firestore tras reconectar, sin depender de historial de NATS o de tickets antiguos.

## Fuente de verdad del contrato

- Indice OpenAPI: `docs/backend/openapi.yaml`.
- Referencia humana: `docs/backend/ENDPOINTS.md`.
- Integracion ya disponible: `docs/backend/GUIA_INTEGRACION_COMUNIDAD_REALTIME.md`.
- Roadmap finalizado y decisiones de entrega: `docs/roadmaps/FINALIZADO_comunidad-social-v2/ROADMAP_FINALIZADO_comunidad_social_v2.md`.
- Validación estructural de OpenAPI: `npm run lint:openapi`.
