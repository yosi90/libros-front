# Guia de integracion: comunidad, chat y realtime

Esta guia es el punto de partida del front para la vertical social. SQL es la fuente de verdad; WebSocket y Firebase solo aceleran la UI y nunca sustituyen una recarga REST.

## Inicio de sesion y Firebase

1. Mantener el JWT de Libros como credencial de la API.
2. Pedir `POST /auth/firebase-custom-token` con JWT.
3. Iniciar sesion Firebase con el custom token. El UID siempre es `libros:<id_usuario>`.
4. No usar Firebase para roles, sanciones ni autorizacion de la API.

### Configuracion web por entorno

La configuracion web de Firebase pertenece al despliegue del front. No solicitarla a la API ni incluir el service account: las claves web identifican el proyecto, pero la credencial de administrador es exclusivamente del backend.

Cada entorno del front debe aportar su equivalente a estas variables (adaptar el prefijo al bundler):

```text
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_APP_ID
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_DATABASE_URL
FIREBASE_VAPID_KEY             # solo si se activa push web FCM
FIREBASE_USE_EMULATORS=false   # true solo en desarrollo local
```

- Produccion y staging usan sus propios proyectos Firebase y sus valores publicos de configuracion.
- Desarrollo local puede usar el proyecto de emulador `demo-libros-api`; con `FIREBASE_USE_EMULATORS=true`, conectar Firestore a `localhost:8080`. No apuntar accidentalmente al proyecto remoto desde pruebas locales.
- Tras inicializar el SDK, pedir el custom token a la API e invocar `signInWithCustomToken`. Renovar esa sesion obteniendo un token nuevo tras restaurar la sesion propia de Libros, no almacenando el custom token como si fuera un JWT de larga duracion.

Las reglas se despliegan desde este repositorio mediante `firebase.json`, que referencia `docs/firebase/firestore.rules` y `docs/firebase/database.rules.json`. Para comprobarlas localmente, el repositorio backend ofrece `npm run test:firestore-rules`; no es un comando del repositorio frontend ni un requisito para compilar su cliente.

El despliegue de reglas se ejecuta desde la raíz del backend con `npx firebase deploy --only firestore:rules,database`; seleccionar el proyecto Firebase correspondiente a cada entorno antes de publicar. El emulador incluido en `firebase.json` cubre Firestore en `localhost:8080`; RTDB se valida contra sus reglas publicadas y no debe usarse como sustituto de REST.

Las reglas publicadas son `docs/firebase/firestore.rules` y `docs/firebase/database.rules.json`: Firestore permite solo lectura bajo `private_users/libros:<id_usuario>` y prohibe toda escritura cliente; RTDB reserva `chat_members` para el backend y solo permite presencia propia y typing de una conversacion con membresia proyectada.

## Recuperacion de estado

- REST: historial duradero de notificaciones, feed, clubes y chat.
- Firestore: leer solo `private_users/libros:<id_usuario>` con listeners si aporta valor. El cliente no escribe Firestore.
- WebSocket: señal de novedad. Deduplicar por `eventId`; ante reconexion o eventos desordenados, volver a consultar REST/Firestore.

## Notificaciones

- `GET /notificaciones`
- `POST /notificaciones/<id>/leer`
- `POST /notificaciones/leer-todas`

Mostrar `Titulo`, `Cuerpo`, `Contexto`, `FechaCreacion` y estado de lectura. Una notificacion realtime no elimina la necesidad de refrescar el listado.

Las resoluciones de denuncias comunitarias usan `community.report_source_resolved` y `community.report_reporter_resolved`. El contexto no expone conversación, contenido, medida ni moderador; los avisos de mensaje son informativos y los destinos inaccesibles se conservan como no disponibles. Consultar `GUIA_NOTIFICACIONES_DENUNCIAS_COMUNITARIAS.md`.

## Publicaciones de club

El compositor general usa `POST /comunidad/publicaciones` con `Audiencia: "club"` y `ClubId`. No enviar `ClubId` con otra audiencia. También permanece `POST /clubes-lectura/<id>/publicaciones`, que fuerza esa misma audiencia. La retirada del descubrimiento no cierra el club para sus miembros; un `404 club_post_target_unavailable` no distingue club eliminado, inexistente o membresía no activa. Los bloqueos se aplican filtrando destinatarios y feed, no como error que exponga relaciones privadas.

## Actividad automática

`GET /comunidad/actividad/preferencias` devuelve `AudienciaPredeterminada: "seguidores"` si aún no existe una fila de preferencias para la cuenta. Ese valor también es el fallback de servidor para una actividad forzada y no sobrescribe preferencias ya guardadas. Con `PublicarActividad` omitido, el backend decide por los opt-ins persistidos; el frontend no decide la audiencia efectiva.

`Preferencias.Reconocimientos` conserva por cuenta los booleanos `Estado`, `Puntuacion` y `Resena`, inicialmente `false`. Tras explicar una categoría, llamar a `POST /comunidad/actividad/reconocimientos/estado|puntuacion|resena`; es idempotente, no modifica opt-ins/audiencia y no publica actividad.

## Comunidad

- Directorio: `GET /comunidad/usuarios?q=`.
- Seguimiento: `POST|DELETE /comunidad/seguimientos` con `{ UsuarioId }`.
- Amistad: `POST /comunidad/amistades/solicitudes`; resolver con `PATCH /comunidad/amistades/solicitudes/<id>` y `{ Estado: "aceptada"|"rechazada" }`.
- Bloqueo: `POST|DELETE /comunidad/bloqueos` con `{ UsuarioId }`.
- Feed: `GET|POST /comunidad/publicaciones`; comentarios y reacciones bajo `/comunidad/publicaciones/<id>`.
- Denuncia: `POST /comunidad/denuncias` admite `perfil`, `publicacion`, `comentario`, `mensaje` y `club`. Para mensaje o club solo enviar `{ TipoEntidad, EntidadId, Motivo }`: el backend valida el acceso y construye la evidencia. Un `404` no distingue inexistencia de inaccesibilidad.

Renderizar Markdown saneado; no permitir HTML arbitrario ni embeds fuera de la allowlist del front.

Si una denuncia administrativa oculta un mensaje, recibir `message.updated` con `OcultoPorModeracion: true` y eliminarlo de historial, búsqueda, replies y caché; recuperar por REST. Si retira un club del descubrimiento, `club.updated` invalida los miembros activos, pero el directorio se refresca por REST y no debe inferir la medida ni sanción de cuenta.

## Clubes de lectura

Un usuario crea como maximo un club y puede tener tres membresias activas, incluido el club propio.

- `abierto`: `POST /clubes-lectura/<id>/unirse`.
- `cerrado`: invitacion o `POST /clubes-lectura/<id>/solicitudes` con `{ Mensaje? }`.
- Bandeja propia: `GET /clubes-lectura/invitaciones?estado=pendiente&limit=20&cursorId=`. REST recupera invitaciones aunque se haya perdido una notificacion; `Mensaje` siempre es `null` porque el modelo de invitaciones no lo almacena.
- Bandeja de gestión: propietario o moderador activo usa `GET /clubes-lectura/<id>/solicitudes?estado=pendiente&limit=20&cursorId=`. Ambos listados ordenan por ID descendente y devuelven `SiguienteCursor`.
- Un bloqueo bilateral cancela invitaciones y solicitudes pendientes que conecten a las dos personas, elimina sus notificaciones de club relacionadas y prohíbe crear o resolver nuevas interacciones entre ellas. No interpretar la ausencia de un registro como prueba de quién bloqueó a quién.
- Descubrimiento/creacion: `GET|POST /clubes-lectura`.
- Descubrimiento paginado: `GET /clubes-lectura?q=&tipoObjetivo=libro&objetivoId=1&limit=20&cursorFecha=&cursorId=`. Solo incluye clubes abiertos activos no bloqueados respecto al propietario, ordenados por actualización e ID descendentes. `tipoObjetivo` y `objetivoId` se envían juntos; cada resultado declara `EstadoMembresia` (`disponible`, `miembro` o `solicitud_pendiente`).
- Detalle/edicion/borrado: `GET|PATCH|DELETE /clubes-lectura/<id>`.
- Restauracion: `POST /clubes-lectura/<id>/restaurar`.
- Miembros, roles, salida, invitaciones y lectura actual: subrutas documentadas en OpenAPI.
- Propietario o moderador activo busca candidatos con `GET /clubes-lectura/<id>/invitaciones/candidatos?q=&limit=&cursorTipo=&cursorNombre=&cursorId=`. El cursor es compuesto y la respuesta ordena `amistad`, `seguidor`, `publico`, nombre e ID. Los perfiles privados solo aparecen por amistad o porque siguen al gestor. El `POST` de invitación aplica exactamente la misma elegibilidad al `UsuarioId` recibido.

Las notificaciones `club.invitation`, `club.invitation_cancelled` y `club.join_request` son solo avisos; al recibirlas, al reconectar o tras resolver o cancelar una operación, refrescar la bandeja REST correspondiente. Las bandejas globales requieren `direccion=enviadas|recibidas` y el resumen aporta sus cuatro contadores pendientes. No se añaden eventos realtime granulares nuevos: `club.updated` conserva su semántica de invalidación y REST permanece como fuente de verdad.

El propietario edita y cambia roles; propietario o moderador gestiona invitaciones/solicitudes. Al salir o ser expulsado, retirar de inmediato la UI del chat del club.

En encuestas, `Opciones` siempre devuelve `Id` y `Texto` para que se pueda votar. Antes del voto y mientras la encuesta siga abierta, `TotalVotos` es `null`; tras votar o cerrar se devuelven los recuentos.

Los spoilers estructurados de clubes se limitan a debates y sus comentarios. Los hitos son metadatos de coordinación y el chat —incluidos directos y mensajes de club— no admite campos de spoiler, ocultación por progreso ni `revelarSpoilers`; no enviar esos campos ni inferirlos desde un hito. Usar un debate persistente cuando una conversación de club necesite protección por progreso.

`ClubDebate` y `ClubDebateComment` identifican al autor mediante `Autor: { Id, Nombre, Imagen }`; no existe `AutorId` duplicado. La membresía permite mostrar autores con perfil privado y autores históricos. El bloqueo bilateral oculta el debate completo o el comentario correspondiente, y un detalle bloqueado responde como no disponible.

## Chat y WebSocket

- Listado: `GET /chat/conversaciones`.
- Directo: `POST /chat/conversaciones/directa` con `{ UsuarioId }`.
- Club: `POST /chat/clubes/<id>`.
- Historial/envio: `GET|POST /chat/conversaciones/<id>/mensajes`.
- Lectura: `POST /chat/conversaciones/<id>/leer`.
- Ticket: `POST /chat/ws-ticket`; comunidad: `POST /chat/comunidad-ws-ticket`.

Conectar a la URL devuelta por el ticket dentro de 60 segundos. Abrir `/ws/chat` para eventos `chat.*` y `message.*`; abrir `/ws/community` para notificaciones, comunidad, clubes y moderación. Solo enviar frames `{ "type": "ping" }`; el servidor responde `pong`. Los frames recibidos usan `{ eventId, occurredAtUtc, type, payload }`.

Si el socket cierra por bloqueo o sancion, limpiar el estado live, no reintentar inmediatamente y recuperar por REST tras volver a tener acceso.

Ejemplo de ticket y conexión:

```json
{
  "success": true,
  "Ticket": "<ticket-de-un-solo-uso>",
  "FechaExpiracion": "2026-07-12T22:10:00+00:00",
  "WebSocketUrl": "wss://realtime.example/ws/community"
}
```

Conectar con `new WebSocket(`${WebSocketUrl}?ticket=${encodeURIComponent(Ticket)}`)`. El único frame cliente admitido es `{ "type": "ping" }`, cuya respuesta es `{ "type": "pong", "payload": {} }`. Un evento válido es `{ "eventId": "42", "occurredAtUtc": "2026-07-12T22:09:00+00:00", "type": "club.updated", "payload": { "ClubId": 7 } }`.

| Cierre | Reintento | Acción cliente |
| --- | --- | --- |
| `4400` | No automático | Corregir el frame o tamaño enviado. |
| `4401` | Sí, con ticket nuevo | Pedir un ticket nuevo por REST. |
| `4403` | No hasta recuperar acceso | Limpiar estado live y recargar REST cuando vuelva a estar autorizado. |
| `4429` | Sí, con backoff | Esperar con backoff y jitter antes de conectar de nuevo. |

## Presencia y typing

RTDB solo contiene estado efimero:

- Presencia propia: `presence/libros:<id_usuario>`.
- Typing propio: `typing/<id_conversacion>/libros:<id_usuario>`.
- Typing ajeno: cada miembro activo puede leer el nodo concreto `typing/<id_conversacion>/libros:<id_otro_usuario>`. No puede leer ni listar el padre `typing/<id_conversacion>`, ni consultar nodos de personas o conversaciones ajenas.

Registrar la limpieza antes de escribir el estado efimero y volver a registrarla cada vez que se reconecte RTDB:

```ts
const uid = `libros:${userId}`;
const presence = ref(rtdb, `presence/${uid}`);
await onDisconnect(presence).remove();
await set(presence, { online: true, updatedAt: serverTimestamp() });

const typing = ref(rtdb, `typing/${conversationId}/${uid}`);
await onDisconnect(typing).remove();
await set(typing, true);
// Al enviar o abandonar el campo: remove(typing).
```

El valor permitido de typing es cualquier JSON efímero controlado por el cliente; la forma recomendada es `true`, como en el ejemplo. Para mostrar “X está escribiendo…”, suscribirse o leer el nodo individual de cada participante conocido, y considerar que solo `true` significa que está escribiendo.

No usar `onDisconnect()` para mensajes, notificaciones ni confirmaciones de lectura: esos datos viven en SQL/REST. Las reglas permiten leer y escribir typing solo cuando el backend ha proyectado membresía activa de la conversación. Si se pierde la membresía, hay bloqueo bilateral o una sanción de cuenta/comunidad/chat, el worker retira `chat_members/<id_conversacion>/libros:<id_usuario>` y borra su `typing` asociado; las reglas deniegan desde entonces toda lectura y escritura. Si falla por permisos, limpiar el estado local y refrescar conversaciones por REST.

## Errores y seguridad

Todas las respuestas de error incluyen `error`; cuando exista, usar `code` para la logica de UI. Tratar `account_sanctioned`, requisitos de politica y limites de clubes como estados de producto, no como errores silenciosos.

La referencia detallada de parametros y metodos esta en `docs/backend/openapi.yaml`; esta guia explica como componerlos en la aplicacion.

`npm run lint:openapi` se ejecuta en la raíz de este repositorio backend y valida `docs/backend/openapi.yaml`. El frontend consume el contrato publicado; no necesita copiar el roadmap interno ni ejecutar ese script para integrar las rutas.
