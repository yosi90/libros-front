# Guia de integracion: comunidad y clubes

Punto de partida del front para la vertical social que **sigue siendo de Libros** después de la fase 3 de la adhesión a Yosiftware: las publicaciones y comentarios de los clubes, las denuncias de contenido y los clubes. La actividad automática pasó a las novedades de la plataforma y el muro general se retiró. SQL y REST son la fuente de verdad.

La cuenta, la sesión, el perfil, las relaciones, el chat, las notificaciones y su push, la moderación de cuentas y las preferencias de interfaz son de la plataforma: la web los usa con el SDK (`ecosistema-kit/ACCESO.md`, `SOCIAL.md`, `CHAT.md`, `NOTIFICACIONES.md`, `MODERACION.md`). Qué se retiró y qué usar en su lugar: [ADHESION_YOSIFTWARE.md](../api/ADHESION_YOSIFTWARE.md) y [RUTAS_RETIRADAS.md](../api/RUTAS_RETIRADAS.md).

## Sesión y configuración

- Todas las rutas privadas llevan `Authorization: Bearer <token>` con el token de la cuenta de Yosiftware (`yosiftware.fetch()` lo pone y lo renueva). Firebase ya no interviene: ni custom token ni `signInWithCustomToken`.
- `GET /runtime-config` solo devuelve `Environment` y `QaDatasetVersion`; validar que `Environment` coincide con el despliegue esperado (en campañas QA, exactamente `qa`).
- `GET /usuarios/me` da el `Id` local, el alias (`Nombre`) y el rol de Libros.
- Firestore y la RTDB se retiraron: sus reglas (`docs/firebase/`) niegan todo y la web no debe leerlas.

## Tiempo real

No hay WebSocket propio. Los eventos del club (`club.updated`, `club.reading_updated`, `club.milestone_*`, `club.event_*`) llegan por el **canal del espacio** de cada club (fase 4; [CONTRATOS.md](CONTRATOS.md)): `yosiftware.espacios.canal(EspacioId, …)` entrega `mensaje.datos = { tipo, ClubId, LecturaId?, HitoId?, EventoId? }`, que es un aviso para refrescar por REST. Con `desfase`, recargar de la API; sin canal, refrescar al entrar en el club, al volver al foco o tras una acción propia.

## Publicaciones de club

Se publica con `POST /clubes-lectura/<id>/publicaciones` (audiencia `club`; si se envía `ClubId`, el de la ruta). El compositor general del muro (`POST /comunidad/publicaciones`) se retiró. La retirada del descubrimiento no cierra el club para sus miembros; un `404 club_post_target_unavailable` no distingue club eliminado, inexistente o membresía no activa.

## Novedades (antes, actividad automática y muro general)

La actividad lectora se publica como novedades de la plataforma (decisión 2 de la petición de migración): empezar o terminar una obra, puntuarla y reseñarla, con el catálogo de tipos de Libros. Las ve la web social (y, si la web quiere, su feed: `GET /v1/novedades` con el token de la plataforma, `ecosistema-kit/NOVEDADES.md`). `PublicarActividad: false` sigue evitando publicar un cambio concreto; lo demás lo deciden los ajustes de compartir de la persona en la web social (`https://social.yosiftware.es/?vista=novedades`), que sustituyen a `/comunidad/actividad/preferencias` (retirada). El muro general se retiró.

## Comunidad

- Publicaciones de los clubes: `GET|POST /clubes-lectura/<id>/publicaciones`; editar, borrar, comentarios y reacciones bajo `/comunidad/publicaciones/<id>` (solo publicaciones de club).
- Denuncia: `POST /comunidad/denuncias` admite `publicacion`, `comentario` y `club`. Para un club solo enviar `{ TipoEntidad, EntidadId, Motivo }`: el backend valida el acceso y construye la evidencia. Un `404` no distingue inexistencia de inaccesibilidad. Los perfiles y los mensajes se denuncian en la plataforma (`yosiftware.denunciar()`).
- El directorio de personas, los seguimientos, las amistades y los bloqueos son de la plataforma (`GET /v1/personas` y el perfil de la web social).

Renderizar Markdown saneado; no permitir HTML arbitrario ni embeds fuera de la allowlist del front. Si una denuncia retira un club del descubrimiento, el directorio se refresca por REST y no debe inferir la medida.

## Clubes de lectura

Un usuario crea como máximo un club. Desde la fase 4 cada club es un **espacio** de la plataforma (`ecosistema-kit/ESPACIOS.md`; guía: [ADHESION_YOSIFTWARE.md](../api/ADHESION_YOSIFTWARE.md)): la pertenencia, las invitaciones, las solicitudes y sus avisos son de la plataforma, y todo lo demás del club sigue en Libros.

- Descubrimiento y creación: `GET|POST /clubes-lectura`; paginado con `q`, `tipoObjetivo` + `objetivoId`, `limit`, `cursorFecha` y `cursorId`. Cada club trae `EspacioId`, y en el descubrimiento `EstadoMembresia` (`disponible` o `miembro`).
- `abierto`: `POST /v1/espacios/{EspacioId}/entrar` con el token de la plataforma (o `yosiftware.espacios`).
- `cerrado`: `POST /v1/espacios/{EspacioId}/solicitudes` `{ mensaje? }` o una invitación de la plataforma.
- Invitar: buscar en `GET /v1/personas?q=` y `POST /v1/espacios/{EspacioId}/invitaciones` `{ cuenta | correo, rol? }`; aceptar con `#yosi-invitacion=<código>` o `#yosi-invitaciones` (el SDK abre su ventana) o con su interfaz propia.
- Salir: `DELETE /v1/espacios/{EspacioId}/miembros/yo`. Expulsar y cambiar el rol, en Libros (`DELETE` y `PATCH /clubes-lectura/<id>/miembros/<userId>`, solo la propiedad).
- Detalle, edición y borrado: `GET|PATCH|DELETE /clubes-lectura/<id>`; restauración: `POST /clubes-lectura/<id>/restaurar` (crea un espacio nuevo con la propiedad como único miembro). El detalle trae `ConversacionId`, la conversación del espacio: `<yosi-chat-conversacion conversacion="…">` o la interfaz de chat de Libros sobre `/v1/chat/…`.
- Lo que se hace en la plataforma llega a Libros por el feed (cada 5 minutos o antes, con NATS): después de entrar, hasta que la copia lo aplica, las rutas del club pueden responder `404 club_access_unavailable`; reintentar tras un momento.

La expulsión de un club se avisa con una notificación de Libros (`club.expulsion`). Las invitaciones y las solicitudes (y su respuesta) las avisa la plataforma.

En encuestas, `Opciones` siempre devuelve `Id` y `Texto`. Antes del voto y mientras la encuesta siga abierta, `TotalVotos` es `null`; tras votar o cerrar se devuelven los recuentos.

Los spoilers estructurados de clubes se limitan a debates y sus comentarios. `ClubDebate` y `ClubDebateComment` identifican al autor mediante `Autor: { Id, Nombre, Imagen }`; `Nombre` es el alias que copia el feed.

## Errores

Todas las respuestas de error incluyen `error`; cuando exista, usar `code` para la logica de UI ([ERRORES_Y_GATES.md](../api/ERRORES_Y_GATES.md)). `403 platform_restriction_active` (con `details.Alcance`), los `club_space_*` y el límite de crear un club son estados de producto, no errores silenciosos. La referencia de parametros y metodos esta en `docs/backend/openapi.yaml`.
