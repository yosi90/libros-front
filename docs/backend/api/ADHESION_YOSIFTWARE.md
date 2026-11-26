# Adhesión a Yosiftware: guía para el frontend

Libros (web y APK Kotlin) usa la cuenta de Yosiftware desde el corte del 2026-10-29. Esta guía dice qué hace la plataforma, qué hace la API y cómo se conectan. No sustituye a `ENDPOINTS.md` ni a OpenAPI. Las rutas retiradas, con su recambio, están en [RUTAS_RETIRADAS.md](RUTAS_RETIRADAS.md).

Roadmap: `docs/roadmaps/FINALIZADO_adhesion-yosiftware/ROADMAP_FINALIZADO_adhesion_yosiftware.md`. Kit de la plataforma: `ecosistema-kit/` (espacios: `ESPACIOS.md`).

## Lo que es de la plataforma

| Qué | Dónde |
| --- | --- |
| Entrar, registrarse, contraseña, métodos de acceso, sesiones | El SDK (`ACCESO.md`): `<yosi-acceso>` con el panel de cuentas |
| Perfil, avatar, correo y ajustes de interfaz | `yosiftware.sesion()`, `yosiftware.abrirPerfil()`, `yosiftware.ajustes` |
| Personas, amistades, seguimientos y bloqueos | `SOCIAL.md`, `GET /v1/personas` |
| Chat (también la conversación de cada club) | `CHAT.md`, `/v1/chat/…`; `ConversacionId` en `GET /clubes-lectura/{id}` |
| Notificaciones y push | `<yosi-notificaciones>`; el push lo envía la plataforma |
| Moderación de cuentas y normas | `MODERACION.md`; lo limitado llega en el token |
| Denunciar perfiles y mensajes | `yosiftware.denunciar()` (las publicaciones, los comentarios y los clubes se denuncian en Libros) |
| Compartir la actividad de lectura | Las novedades y sus ajustes (`https://social.yosiftware.es/?vista=novedades`, `GET`/`PUT /v1/cuenta/novedades/ajustes`) |
| Entrar en un club, invitar, solicitudes y salir | Los espacios (`/v1/espacios/…` y el SDK), abajo |
| El tiempo real | El canal del espacio de cada club, abajo |

La administración de Libros no está en la web: es el plugin de la administración (abajo), y no tiene recambio para la web.

## El token y el usuario local

1. **El token.** Todas las rutas privadas llevan `Authorization: Bearer <token>` con el token de la cuenta de Yosiftware (`yosiftware.token()` o `yosiftware.fetch()`, que lo pone y lo renueva). No hay otro modo de entrar.
2. **El usuario local.** `GET /usuarios/me` devuelve `{ Id, Nombre, Role, CompartirEstadisticas }`: el `id` local, el alias que copia el feed y el rol de Libros (`usuario`, `administrador` o `moderador`). La marca de Yosiftadísticas la pone el SDK.
3. **La persona nueva empieza vacía.** La primera petición con el token de una cuenta que nunca ha usado Libros crea su usuario local, sin copiar nada del token. El propietario (`usuarios.id = 1`) está enlazado con su cuenta (`python -m scripts.enlazar_propietario`).

### Campos de la API

- `GET /runtime-config` solo devuelve `Environment` y `QaDatasetVersion`.
- `GET /verify` lista `api`, `sqlServer` y `plataformaFeedWorker`.
- `GET /comunidad/resumen` trae `Resumen.Clubes.Activos`. Las invitaciones pendientes las da la plataforma: `GET /v1/espacios/invitaciones` con el token de la persona, o `yosiftware.espacios.invitaciones()` (`.length`); no hay ruta de servicio que las cuente sin ese token. `GET /comunidad/capacidades` trae `feed` y `clubes`.
- Los clubes traen `EspacioId`; el detalle, además, `ConversacionId`. `EstadoMembresia` es `miembro` o `disponible`.
- Los listados de clubes, debates y estadísticas no filtran por bloqueos: los bloqueos son de la plataforma.
- `PublicarActividad` en `/coleccion/{libros|antologias}/{id}/estado`, `/puntuacion` y `/resena`: `false` no publica la novedad de ese cambio; `true`, `null` u omitido la publican, y decide la plataforma con los ajustes de la persona.
- Editar, borrar, comentar y reaccionar (`/comunidad/publicaciones/{id}…`) y denunciar publicaciones y comentarios (`POST /comunidad/denuncias`) solo valen para lo de los clubes: lo demás es `404`.
- `GET /estadisticas/comunidad`: `ActividadComunidad30Dias` cuenta las publicaciones, comentarios y reacciones de los clubes abiertos.

## Los clubes: los espacios de la plataforma

Cada club es un **espacio** de la plataforma (`ecosistema-kit/ESPACIOS.md`). La plataforma lleva quién está, con qué rol y cómo se entra, las invitaciones (también a un correo), las solicitudes y **sus avisos**, la conversación y el canal; Libros, todo lo demás del club. La web elige entre la ventana de invitaciones del SDK o su propia interfaz (`data-invitaciones="propias"`); la APK Kotlin usa `sesion.espacios` de la librería de la plataforma.

| Qué hace la persona | Cómo |
| --- | --- |
| Crear el club | `POST /clubes-lectura`. Responde `{ Id, EspacioId }`: la API crea el espacio a su nombre (es su propiedad) en la misma transacción. Si la plataforma no responde, `503 club_space_unavailable` (u otro `club_space_*`) y no se crea nada |
| Entrar en uno abierto | `POST /v1/espacios/{EspacioId}/entrar` con el token de la plataforma (`yosiftware.tokenPlataforma()`). `403 expulsado_del_espacio` si la sacaron: solo vuelve con una invitación |
| Pedir entrar en uno cerrado | `POST /v1/espacios/{EspacioId}/solicitudes` `{ "mensaje"? }`; retirarla, `DELETE …/solicitudes/mia`. Quien puede aprobar recibe la notificación de la plataforma con «Aprobar» y «Rechazar», y quien la pidió se entera de la respuesta |
| Aprobar o rechazar una solicitud | `GET /v1/espacios/{EspacioId}/solicitudes` y `POST …/solicitudes/{idSolicitud}/aprobar` o `…/rechazar` (la propiedad y los moderadores) |
| Invitar | Buscar con `GET /v1/personas?q=` e invitar con `POST /v1/espacios/{EspacioId}/invitaciones` `{ "cuenta" }` o `{ "correo" }` (y `rol` opcional: `miembro` o `moderacion`). El correo lo envía la plataforma. Las pendientes, `GET /v1/espacios/{EspacioId}/invitaciones`; retirar una, `DELETE …/invitaciones/{id}` |
| Aceptar o rechazar una invitación | **`#yosi-invitacion=<código>`** (el enlace del correo) y **`#yosi-invitaciones`** (desde la campana, vía la web social) en la raíz de la web: con el SDK, su ventana se abre sola y lanza `yosiftware:espacio` (`aceptada` con el espacio, o `rechazada`); con interfaz propia, `POST /v1/espacios/invitaciones/por-codigo` y `…/por-codigo/aceptar` `{ "codigo" }`, o `GET /v1/espacios/invitaciones` y `POST …/{id}/aceptar` o `…/rechazar`. Se acepta solo con un token de Libros (`403 acepta_en_la_web`); `correo_de_otra_cuenta`, `dos_pasos_necesarios` e `invitacion_no_encontrada` según `ESPACIOS.md` |
| Salir | `DELETE /v1/espacios/{EspacioId}/miembros/yo` (la propiedad no puede: traspasa antes con `POST /v1/espacios/{EspacioId}/traspaso`) |
| Expulsar o cambiar el rol | `DELETE` y `PATCH /clubes-lectura/{id}/miembros/{userId}` (solo la propiedad). La API lo hace en el espacio con su credencial de servicio; la persona expulsada recibe `club.expulsion` |
| Editar, borrar y restaurar el club | `PATCH`/`DELETE /clubes-lectura/{id}` y `POST …/restaurar`. Borrar borra el espacio (y su conversación); restaurar, durante 30 días, crea uno nuevo con la propiedad como único miembro: los demás vuelven entrando o con una invitación |
| El chat del club | La conversación del espacio: `ConversacionId` del detalle, en `<yosi-chat-conversacion conversacion="…">` o en la interfaz de chat de Libros sobre `/v1/chat/…`. Entra cada miembro activo con su rol (los dos roles escriben); quien entra después no ve lo anterior. `null` hasta que la plataforma la da (segundos tras crear el club) |
| Lo que cambia en directo | El **canal del espacio**: `yosiftware.espacios.canal(EspacioId, (m) => …)`; `m.datos` es `{ tipo, ClubId, LecturaId?, HitoId?, EventoId? }` con `tipo` `club.updated`, `club.reading_updated`, `club.milestone_*` o `club.event_*`: refrescar por REST. `desfase`: recargar todo; `cerrado`: ya no es miembro activo. La APK, con el socket del gateway de la plataforma |

- **Botones**: `yo` del espacio (`yosiftware.espacios.mios()` o `GET /v1/espacios/{EspacioId}`) dice el rol y las capacidades (`gestionar`, `invitar`, `chat`) para enseñar u ocultar. Quién puede hacer qué dentro del club (lecturas, hitos, encuestas, debates, moderar) lo decide Libros con su rol (`propietario`, `moderador`, `miembro`).
- **El feed tarda**: lo que se hace en la plataforma (entrar, aceptar, salir, un rol, un traspaso) llega a Libros por el feed (cada 5 minutos, o al momento con NATS). Justo después de entrar, las rutas del club pueden responder `404 club_access_unavailable`: reintentar tras unos segundos, o esperar a que `GET /clubes-lectura/mios` lo traiga.
- Cada persona crea un solo club; en cuántos está lo limita la plataforma (300 espacios por cuenta). Las invitaciones y solicitudes las avisa la plataforma, no Libros.
- **Retirado del descubrimiento** por moderación, el espacio queda con entrada por invitación hasta que se reabre.

## El panel de administración: plugin de la administración

Decisión 1 de la petición de migración (`ecosistema-kit/PLUGIN_ADMINISTRACION.md`). El plugin se llama `libros` («Libros»); su código está versionado en `admin-plugin/` (manifiesto con la versión y las acciones, e interfaz). Se empaqueta con `python -m scripts.empaquetar_plugin_admin`, que lo valida como la administración y deja el ZIP en `.runtime/entregas/` (ignorado por Git). Contrato de cada acción: [ENDPOINTS.md](ENDPOINTS.md#plugin-de-la-administración).

**Qué hay en el plugin**, por pestañas:

- **Resumen**: las tres colas pendientes (peticiones, reseñas denunciadas y denuncias de clubes) con un botón a cada una, las cuentas por rol y por estado, y las estadísticas de las peticiones de catálogo (por estado y desglose por tipo y acción).
- **Peticiones de catálogo**: la cola por estado, con los datos de cada petición, Google Books si trae ISBN, y aprobar (creándola con sus datos o enlazándola a una obra que ya existe), devolver o rechazar con comentario. Avisa a quien la pidió.
- **Reseñas denunciadas**: la reseña, quién la escribió, las denuncias con su motivo; aceptar (la oculta) o rechazar, con comentario y, al aceptar, **un incidente en la plataforma** si el propietario lo decide (caso de moderación de la plataforma y mensaje para la persona).
- **Denuncias de clubes**: clubes, publicaciones y comentarios de club, con lo denunciado tal como estaba; aceptar (oculta, o retira el club del descubrimiento) o rechazar, con la misma opción de incidente.
- **Catálogo**: libros, antologías, autores, universos, sagas, idiomas, estilos, lugares de origen y estados de localización. Buscar y paginar; dar de alta y editar cada ficha (autores, saga con su orden o universo, idiomas, estilos, sinopsis, páginas, wiki, titular), rellenar un alta con Google Books por ISBN, **portadas** (el panel reduce la imagen a 600 × 900 antes de enviarla), **ediciones** (nueva, editar ISBN, fecha o portada, o compartir una existente), **secciones** de las antologías (nueva y editar), borrar idiomas y estilos sin usar, y corregir o fusionar lugares de origen.
- **IA**: el modo de la IA de las peticiones (`apagado`, `sombra` o `real`), el modelo, lo gastado y cada uso (`docs/roadmaps/PAUSADO_ia/`, IA1.5).
- **Roles**: las cuentas con su cuenta de Yosiftware (`IdGlobal`), alias, rol y estado; buscar por alias o por la cuenta; cambiar el rol con motivo (no deja quitar el último administrador ni cambiarse a sí mismo).
- **Copias de seguridad**: generar una copia completa (en segundo plano: el ZIP queda en `.runtime/copias/` de la API, porque el plugin solo recibe JSON) y ver las guardadas. En QA no se hacen.
- **Auditoría**: las escrituras administrativas, con quién las hizo en la administración.

**Cómo se protege.** `/admin/v1/*` solo responde por la propia máquina: con cabeceras de Cloudflare o de proxy, desde otra dirección o con otro `Host` es `404`. Exige la credencial del plugin, de la que la API solo guarda la huella SHA-256 (`LIBROS_PLUGIN_ADMIN_CREDENCIAL_SHA256`, en la configuración privada, nunca en Git ni en el ZIP). Actúa la cuenta de administración del entorno (`LIBROS_PLUGIN_ADMIN_ID_GLOBAL`). Las `POST` aplican `Idempotency-Key` (tabla `plugin_admin_idempotencia`) y piden confirmación en la administración. La interfaz no carga nada de fuera y pinta los datos con nodos (sin HTML). El túnel se reconoce por sus cabeceras `CF-*` y por el `Host`; Waitress, además, borra `X-Forwarded-For` y `Forwarded` antes de que lleguen a la API.

**Direcciones**: `http://127.0.0.1:5101/admin/v1` en QA y `http://127.0.0.1:5001/admin/v1` en producción.

### Lo que hace el propietario

- **Credenciales**: una por entorno, en `Libros API\.runtime\plugin-administracion\qa.credencial` y `produccion.credencial`; su huella y la cuenta de administración van en `qa/.env` y en `.env`. Para cambiar una: generar otra sin mostrarla (solo la huella), poner la huella, reiniciar la API y repetir `credencial libros` en la administración de ese entorno. La de QA no se reutiliza en producción.
- **Instalar o actualizar**, desde la copia de la administración de cada entorno (`C:\Users\Yosi\yosiftware-cuentas\qa` o `…\produccion`):

  ```powershell
  .venv\Scripts\python.exe -m cuentas.admin.plugins instalar "<zip>"      # la primera vez
  .venv\Scripts\python.exe -m cuentas.admin.plugins credencial libros
  .venv\Scripts\python.exe -m cuentas.admin.plugins activar libros
  .venv\Scripts\python.exe -m cuentas.admin.plugins actualizar "<zip>"    # una versión nueva (conserva la credencial)
  ```

  En `credencial libros`, pegar el contenido del archivo (se escribe sin verse). No pasarla con una tubería de PowerShell 5.1 (`Get-Content … |`): la administración la rechaza (`PLUGIN_ADMINISTRACION.md`).
- Una versión nueva sube `version` en `admin-plugin/manifest.json` antes de empaquetar. La plataforma no necesita ningún cambio: instalar, dar la credencial y activar son órdenes de su kit.
- Sin la huella puesta, `/admin/v1/*` responde en local `503 admin_plugin_not_configured`.

## El plugin de Notificapp

`books_request` (con sus acciones y `onSuccess`) y `books_review_report` avisan de las peticiones y de los reportes de reseñas; `books_community_report`, de las denuncias de clubes, sus publicaciones y sus comentarios. Contrato, versiones y publicación: [NOTIFICAPP.md](NOTIFICAPP.md).

## Errores de autenticación y de acceso

Siguen el formato de `ERRORES.md` (`error` para mostrar, `code` para decidir, `debug.requestId`).

| Estado | `code` | Cuándo | Qué hace el frontend |
| --- | --- | --- | --- |
| 401 | `authorization_required` | Falta `Authorization: Bearer` | Pedir que entre (`<yosi-acceso>`). |
| 401 | `access_token_expired` | El token ha caducado (duran 10 minutos) | Nada: `yosiftware.fetch()` pide otro y repite una vez. |
| 401 | `invalid_token` | Firma, emisor, audiencia o formato no válidos | Igual: el SDK renueva y repite; si vuelve a fallar, pedir que entre. |
| 403 | `account_deleted` | La cuenta se ha borrado en la plataforma | Volver a la vista sin sesión. |
| 403 | `platform_restriction_active` | La cuenta tiene limitado lo que intenta (`restricciones` del token o del feed) | Mostrar `error`. `details.Alcance` (`creacion`, `comunidad`, `publicacion`) y `details.Hasta` (ISO 8601 UTC o `null`). |
| 403 | `platform_rules_acceptance_required` | El token trae `normasPendientes` | Llevar a aceptar las normas con el SDK y pedir un token nuevo. |
| 503 | `authentication_unavailable` | La API no tiene configurada la validación | Error genérico; es un fallo del servidor. |

- **`restricciones`**: `creacion` bloquea solo lo que ven otras personas fuera de los clubes (decisión 10 de la petición): las portadas que se suben (`POST /image/set/cover/{nombre}`), las reseñas (`POST`/`PATCH /coleccion/{libros|antologias}/{id}/resena`) y las peticiones de catálogo (`/peticiones/catalogo…`). No bloquea la colección privada (estados, puntuaciones, ediciones e históricos), las notas, las entidades narrativas, la estructura propia (capítulos, partes, interludios, escenas, secciones de saga y universo) ni los reportes de reseñas (`POST /reportes`). `comunidad` bloquea las escrituras de los clubes (también sus publicaciones, comentarios y denuncias, porque implica `publicacion`). Las lecturas no se bloquean. Lo comprueba `tests/test_platform_social_services.py` (`RestrictionScopeTests`).
- **`normasPendientes`**: bloquea todo salvo las lecturas de arranque (las listas del catálogo, `/coleccion/items`, `/coleccion/universos`, `/comunidad/capacidades` y `GET /usuarios/me`).

## Lo que hace el backend por su cuenta

- **Feed de cambios** (`realtime/plataforma_feed_worker.py`; latido `plataformaFeedWorker` en `/verify`): aplica `cuenta.estado` (`suspendida` y `cerrada` esconden; `borrada` borra lo de la cuenta en Libros, abajo), copia el alias de `cuenta.creada` y `perfil.cambiado` y la pertenencia de los clubes (`espacio.*` y `miembro.*` en `club_miembros`).
- **Los espacios de los clubes** (`utils/platform_spaces.py`): roles `moderacion` y `miembro` declarados al arrancar (`PUT /v1/servicio/espacios/roles`); crear, borrar y restaurar el espacio con su club; nombre y entrada tras editar; expulsar y cambiar el rol con la credencial de servicio; la conversación del espacio al crear o restaurar.
- **Notificaciones** (`utils/platform_notifications.py`, `ecosistema-kit/NOTIFICACIONES.md`). La API declara su catálogo al arrancar (`PUT /v1/servicio/notificaciones/tipos`) y envía cada aviso a la cuenta de la persona (`POST /v1/servicio/notificaciones`, con su `id_global`) **después de confirmar** y en segundo plano, con un `idExterno` estable; retira los que dejan de valer (`DELETE …/{idExterno}`). La web solo enseña `<yosi-notificaciones>`: los enlaces llevan a sus rutas (`https://libros.yosiftware.es/…` en producción y `https://libros.dev.yosiftware.es/…` en QA; `LIBROS_WEB_ORIGEN` lo cambia).

  | Tipo | Nombre (lo ve la persona en sus ajustes) | Personal | Cuándo y qué dice | Enlace y botones |
  | --- | --- | --- | --- | --- |
  | `peticion.resuelta` | Tus peticiones al catálogo | sí | «Se ha aprobado tu petición al catálogo», «Se ha rechazado…» o «Tu petición al catálogo necesita cambios» | `/dashboard/profile?section=requests`; «Añadir a mi biblioteca» (`/dashboard/catalog?addBook={id}`) si se aprueba un libro, «Revisar la petición» si se devuelve |
  | `resena.revisada` | Revisión de tus reseñas | sí | «Hemos ocultado una reseña tuya tras revisarla» o «…y sigue publicada», con el porqué | `/dashboard/profile?section=reports` |
  | `reporte.resuelto` | Tus reportes de reseñas | sí | «Hemos revisado la reseña que reportaste» («Hemos tomado medidas: la reseña ya no se ve» o «…no incumple las normas de Libros») | `/dashboard/profile?section=reports` |
  | `club.contenido_revisado` | Revisión de tu contenido en clubes | sí | «Hemos revisado una publicación tuya de un club», «…un comentario tuyo…» o «Hemos revisado tu club», con lo decidido | el club o `/dashboard/community/clubs` |
  | `club.denuncia_resuelta` | Tus denuncias en clubes | sí | «Hemos revisado tu denuncia» («Hemos tomado medidas al respecto» o «…no incumple las normas de Libros») | ídem |
  | `club.expulsion` | Expulsiones de clubes | sí | «Te han expulsado del club «…»» (con quien lo hizo como actor) | `/dashboard/community/clubs` |

  **No hay tipo del equipo**: las colas que esperan al administrador (peticiones de catálogo, reportes de reseñas y denuncias de clubes) las avisa Notificapp, como exige el kit; un tipo propio saldría en los ajustes de todas las personas. Las invitaciones y solicitudes de los clubes no se declaran: las avisa la plataforma. `enviada: false` (la persona lo tiene apagado) no se reintenta. No se avisa a nadie de lo que hace él mismo, ni a quien no tiene cuenta de Yosiftware, con una excepción: `peticion.resuelta` llega siempre a quien pidió, aunque sea la misma cuenta que la resuelve (el propietario aprueba desde Notificapp o la administración como el usuario 1 y también quiere el aviso de sus propias peticiones; 2026-11-05). La aprobación automática al crear una petición cuyo ISBN ya está en el catálogo no avisa: la persona ve el resultado en ese momento.
- **Novedades** (`utils/platform_novedades.py`, `NOVEDADES.md`; decisión 2). Catálogo declarado al arrancar (`PUT /v1/servicio/novedades/tipos`); cada cambio de la colección se publica tras confirmar y en segundo plano, en tercera persona y sin el nombre:

  | Tipo | Nombre | Texto | Cuándo |
  | --- | --- | --- | --- |
  | `libro.empezado` | Empezar un libro | «ha empezado a leer «Dune»» | estado `En marcha` |
  | `libro.terminado` | Terminar un libro | «ha terminado de leer «Dune»» | estado `Leido` |
  | `libro.puntuado` | Puntuar un libro | «ha puntuado «Dune» con 4 de 5» | puntuación |
  | `libro.resenado` | Reseñar un libro | «ha reseñado «Dune»» | reseña (se retira si se borra o la oculta la moderación) |

  Un `idExterno` por persona, obra y actividad (`lectura-<id global>-libro-7`, `puntuacion-…`, `resena-…`): empezar y terminar actualizan la misma tarjeta. Enlace: el catálogo de Libros con el libro listo para añadir (`/dashboard/catalog?addBook={id}`); imagen: la portada que sirve la API. Los demás estados no se comparten. `publicada: false` es decisión de la persona y no se reintenta.
- **Incidentes** (`utils/platform_moderation.py`, `MODERACION.md`): `registrar_incidente()` registra un aviso a la cuenta (`POST /v1/servicio/moderacion/incidentes`, con caso, mensaje e `idExterno`) y `casos()` lee los casos. Lo pide el administrador desde el plugin, al aceptar una denuncia de reseña o de club (`Incidente`).
- **Novedades de Yosiftware**: `python -m scripts.anunciar_novedad_yosiftware` anuncia en el feed de Yosiftware algo de Libros que la gente nota (`POST /v1/servicio/novedades/yosiftware`). Solo en producción y a mano.
- **Cómo se envía**: lo que se registra durante la transacción (`utils/after_commit.py`) solo se encola al confirmar; un hilo por proceso de la API (`utils/platform_dispatch.py`) llama a la plataforma, reintenta ante red, 5xx o 429 (10 s, 1 min, 5 min, 15 min y 1 h) y, si llega otra operación con la misma clave, solo cuenta la última. La respuesta HTTP nunca espera a la plataforma, y un fallo de la plataforma no deshace nada de la persona.
- **Canal del espacio** (`utils/platform_space_channel.publicar()`): `club.updated`, `club.reading_updated`, `club.milestone_*` y `club.event_*` se publican tras confirmar y en segundo plano (`POST /v1/servicio/espacios/club-<id>/canal`, con un `idExterno` por publicación que no se duplica al reintentar).
- **Cuenta borrada** (`cuenta.estado` `borrada`, decisión 22; `utils/account_deletion.py`). En la transacción de la página del feed, idempotente si el feed repite el cambio:
  - **se borra** lo personal (colección y posesiones con reseñas, puntuaciones, títulos y cabeceras; estados de lectura; notas; entidades narrativas propias con sus vínculos y los apodos que ya no use nadie; actividad; peticiones de catálogo `pendiente` o `devuelta`) y lo social que sigue en Libros (sus publicaciones y comentarios, con los comentarios y reacciones que colgaban de sus publicaciones; sus debates con sus comentarios; sus reacciones, votos y progreso en los clubes);
  - **se anonimiza** lo compartido: la autoría del catálogo, las peticiones resueltas, los reportes y denuncias y las auditorías siguen apuntando al usuario local, que pasa a «Cuenta borrada» sin perfil, correo, últimos accesos ni rol; en `ia_llamadas`, la cuenta pasa a `borrada` y el coste se conserva;
  - los clubes que poseía y su pertenencia siguen el feed de la plataforma;
  - el avatar se borra del disco después de confirmar (solo en la carpeta de imágenes del entorno).
  Una denuncia o un reporte pendiente sobre algo ya borrado se puede rechazar; aceptarlo responde `404 reported_content_not_found` en las denuncias de comunidad.
- **Permisos.** El rol de administrador y moderador sigue en la base de Libros, asociado al usuario local (y, por él, al `sub`; el plugin lo enseña con `IdGlobal`). El moderador no tiene hoy dónde moderar: el panel es del plugin, que solo usa el propietario (decisión 14).
