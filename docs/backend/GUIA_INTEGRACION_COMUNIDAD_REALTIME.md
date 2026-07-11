# Guia de integracion: comunidad, chat y realtime

Esta guia es el punto de partida del front para la vertical social. SQL es la fuente de verdad; WebSocket y Firebase solo aceleran la UI y nunca sustituyen una recarga REST.

## Inicio de sesion y Firebase

1. Mantener el JWT de Libros como credencial de la API.
2. Pedir `POST /auth/firebase-custom-token` con JWT.
3. Iniciar sesion Firebase con el custom token. El UID siempre es `libros:<id_usuario>`.
4. No usar Firebase para roles, sanciones ni autorizacion de la API.

## Recuperacion de estado

- REST: historial duradero de notificaciones, feed, clubes y chat.
- Firestore: leer solo `private_users/libros:<id_usuario>` con listeners si aporta valor. El cliente no escribe Firestore.
- WebSocket: señal de novedad. Deduplicar por `eventId`; ante reconexion o eventos desordenados, volver a consultar REST/Firestore.

## Notificaciones

- `GET /notificaciones`
- `POST /notificaciones/<id>/leer`
- `POST /notificaciones/leer-todas`

Mostrar `Titulo`, `Cuerpo`, `Contexto`, `FechaCreacion` y estado de lectura. Una notificacion realtime no elimina la necesidad de refrescar el listado.

## Comunidad

- Directorio: `GET /comunidad/usuarios?q=`.
- Seguimiento: `POST|DELETE /comunidad/seguimientos` con `{ UsuarioId }`.
- Amistad: `POST /comunidad/amistades/solicitudes`; resolver con `PATCH /comunidad/amistades/solicitudes/<id>` y `{ Estado: "aceptada"|"rechazada" }`.
- Bloqueo: `POST|DELETE /comunidad/bloqueos` con `{ UsuarioId }`.
- Feed: `GET|POST /comunidad/publicaciones`; comentarios y reacciones bajo `/comunidad/publicaciones/<id>`.
- Denuncia: `POST /comunidad/denuncias`.

Renderizar Markdown saneado; no permitir HTML arbitrario ni embeds fuera de la allowlist del front.

## Clubes de lectura

Un usuario crea como maximo un club y puede tener tres membresias activas, incluido el club propio.

- `abierto`: `POST /clubes-lectura/<id>/unirse`.
- `cerrado`: invitacion o `POST /clubes-lectura/<id>/solicitudes` con `{ Mensaje? }`.
- Descubrimiento/creacion: `GET|POST /clubes-lectura`.
- Detalle/edicion/borrado: `GET|PATCH|DELETE /clubes-lectura/<id>`.
- Restauracion: `POST /clubes-lectura/<id>/restaurar`.
- Miembros, roles, salida, invitaciones y lectura actual: subrutas documentadas en OpenAPI.

El propietario edita y cambia roles; propietario o moderador gestiona invitaciones/solicitudes. Al salir o ser expulsado, retirar de inmediato la UI del chat del club.

## Chat y WebSocket

- Listado: `GET /chat/conversaciones`.
- Directo: `POST /chat/conversaciones/directa` con `{ UsuarioId }`.
- Club: `POST /chat/clubes/<id>`.
- Historial/envio: `GET|POST /chat/conversaciones/<id>/mensajes`.
- Lectura: `POST /chat/conversaciones/<id>/leer`.
- Ticket: `POST /chat/ws-ticket`; comunidad: `POST /chat/comunidad-ws-ticket`.

Conectar a la URL devuelta por el ticket dentro de 60 segundos. Solo enviar frames `{ "type": "ping" }`; el servidor responde `pong`. Los frames recibidos usan `{ eventId, occurredAtUtc, type, payload }`.

Si el socket cierra por bloqueo o sancion, limpiar el estado live, no reintentar inmediatamente y recuperar por REST tras volver a tener acceso.

## Presencia y typing

RTDB solo contiene estado efimero:

- Presencia propia: `presence/libros:<id_usuario>`.
- Typing propio: `typing/<id_conversacion>/libros:<id_usuario>`.

Usar `onDisconnect()` para limpiar ambos. Las reglas permiten typing solo cuando el backend ha proyectado membresia activa de la conversacion; si falla por permisos, refrescar conversaciones por REST.

## Errores y seguridad

Todas las respuestas de error incluyen `error`; cuando exista, usar `code` para la logica de UI. Tratar `account_sanctioned`, requisitos de politica y limites de clubes como estados de producto, no como errores silenciosos.

La referencia detallada de parametros y metodos esta en `docs/backend/openapi.yaml`; esta guia explica como componerlos en la aplicacion.
