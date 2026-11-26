# Contratos de tiempo real

Libros no tiene WebSocket propio: sus únicos eventos van al canal del espacio de cada club. REST es la fuente de verdad.

## Eventos del club → canal del espacio

Los eventos del club van al canal del espacio de cada club (`ecosistema-kit/ESPACIOS.md`, «6. El canal de tiempo real»), que la web y la APK reciben por el gateway de la plataforma, con un solo socket por pestaña:

| Evento | Datos | Cuándo |
|---|---|---|
| `club.updated` | `ClubId` | Cambia el club, su progreso, encuestas, debates o su retirada del descubrimiento, o la propiedad expulsa o cambia un rol (las entradas y salidas hechas en la plataforma no lo publican: se ven en la lista de miembros del espacio) |
| `club.reading_updated` | `ClubId`, `LecturaId` | Nueva lectura actual |
| `club.milestone_created`, `club.milestone_updated`, `club.milestone_deleted` | `ClubId`, `HitoId` | Hitos |
| `club.event_created`, `club.event_updated`, `club.event_deleted` | `ClubId`, `EventoId` | Eventos del calendario |

El backend los publica después de confirmar la transacción (`utils/platform_space_channel.publicar_tras_confirmar()`), en segundo plano y con reintentos: `POST /v1/servicio/espacios/club-<ClubId>/canal` con `{ "idExterno", "datos": { "tipo": <evento>, "ClubId", … } }`. El `idExterno` de cada publicación se fija al encolarla, así que un reintento no la duplica. El frontend lo escucha con `yosiftware.espacios.canal(EspacioId, …)` (o el socket del gateway en la APK) y refresca por REST: `mensaje.datos.tipo` es el evento. Con `desfase`, recargar todo de la API.

## Lo que es de la plataforma

Las notificaciones y su push, el chat con su presencia, la moderación, las sesiones y los ajustes tienen el tiempo real de la plataforma (`ecosistema-kit/CHAT.md`, `NOTIFICACIONES.md`). Las publicaciones de club se refrescan por REST al recibir `club.updated`.

## Fuente de verdad

SQL y REST. Un evento perdido o repetido nunca cambia el resultado: al recibirlo o al reconectar, la web vuelve a pedir el recurso por REST.
