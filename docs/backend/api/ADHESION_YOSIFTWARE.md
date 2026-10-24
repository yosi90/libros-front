# Adhesión a Yosiftware: guía para el frontend

Punto de partida del frontend (web y APK Kotlin) para Libros con la cuenta de Yosiftware: qué ha dejado de hacer la API, qué usar de la plataforma en su lugar y qué falta. No sustituye a `ENDPOINTS.md` ni a OpenAPI; la lista exacta de rutas retiradas, con su recambio, está en [RUTAS_RETIRADAS.md](RUTAS_RETIRADAS.md).

Roadmap: `docs/roadmaps/ACTIVO_adhesion-yosiftware/ROADMAP_ACTIVO_adhesion_yosiftware.md` (fases 2 a 4). Kit de la plataforma: 1.53 (espacios: `ecosistema-kit/ESPACIOS.md`).

## Estado de publicación

| Qué | Dónde está |
| --- | --- |
| Validación de los tokens de la plataforma, usuario local por `id_global`, `restricciones` y `normasPendientes` | Rama `adhesion/api-identidad`, **sin unir**. En QA desde el 2026-10-24. |
| Lector del feed de cambios | En marcha en QA (cada 5 minutos), con la credencial de servicio de QA. |
| Cuenta del propietario (`usuarios.id = 1`) | Enlazada en QA con su identificador de QA. En producción, en el corte. |
| **Retirada de lo que pasa a la plataforma** (sesión, identidad, perfil, preferencias, relaciones, chat, notificaciones, moderación y administración de cuentas, Firestore, RTDB y tiempo real propio) | Rama `adhesion/api-identidad`, 2026-10-24 (fase 3, primera parte). En QA desde ese día. |
| **Notificaciones, novedades e incidentes** con la credencial de servicio (catálogos al arrancar, envío en segundo plano); retirada del muro general y de las preferencias de la actividad automática | Rama `adhesion/api-identidad`, 2026-10-24 (fase 3, segunda parte). En QA desde ese día. |
| **Clubes en los espacios** (roles, espacio con cada club, copia del feed, expulsión y roles por la credencial de servicio, conversación y canal del espacio); retiradas las rutas propias de entrar, salir, invitaciones, solicitudes y bandejas | Rama `adhesion/api-identidad`, 2026-10-24 (fase 4, `236dae7`). En QA desde ese día. |
| **El panel de administración, plugin de la administración** (`libros` 1.0.0); retiradas `/admin/*`, `/catalogo/admin/*`, `/moderacion/*` y las demás rutas de administración | Rama `adhesion/api-identidad`, 2026-10-24 (fase 3). En la API de QA desde ese día; el plugin, **pendiente de que el propietario lo instale** (abajo). |
| **Plugin de Notificapp `libros-api` 1.1.0** (sin `books_appeal`) | ZIP entregado; lo instala el propietario en el corte (abajo). |
| Publicación | Solo en el corte: API y web a la vez. Hasta entonces, producción sigue con la sesión propia de Libros. |

## Qué cambia para el frontend

1. **El token.** Todas las rutas privadas llevan `Authorization: Bearer <token>` con el token de la cuenta de Yosiftware (`yosiftware.token()` o `yosiftware.fetch()`, que lo pone y lo renueva). No hay modo mixto: un JWT de la sesión antigua es `401 invalid_token`.
2. **Sin inicio de sesión ni sesión propios.** Entrar, registrarse, recuperar la contraseña, el teléfono, los métodos de acceso, el cambio de correo, las sesiones y cerrar la sesión los hace el SDK (`<yosi-acceso>`). Todo `/auth/*` ha desaparecido.
3. **El usuario local.** `GET /usuarios/me` (nuevo, sustituye a `GET /auth/user`) devuelve `{ Id, Nombre, Role }`: el `id` local, el alias que copia el feed y el rol de Libros (`usuario`, `administrador` o `moderador`). El perfil, el avatar, el correo y los ajustes los da la plataforma (`yosiftware.sesion()`, `yosiftware.abrirPerfil()`, `yosiftware.ajustes`). `ExcluirMedicionAudiencia` ya no llega: la marca de Yosiftadísticas la pone el SDK.
4. **La persona nueva empieza vacía.** La primera petición con un token de una cuenta que nunca ha usado Libros crea su usuario local, sin copiar nada del token. El propietario se enlaza con sus datos de siempre antes de entrar (`enlazar-propietario`).
5. **Lo que queda en Libros no cambia de ruta ni de cuerpo**: catálogo, colección, libros, antologías, sagas, universos, ediciones, capítulos, escenas, entradas y entidades narrativas, notas, estadísticas, peticiones de catálogo, reportes de reseñas, denuncias de contenido, las publicaciones y los clubes, imágenes de portada y `/verify`. Solo cambian algunos campos, abajo.
6. **La página de administración desaparece de la web** (hito 4 del roadmap del frontend). Todo el panel (resumen, roles, peticiones de catálogo, catálogo con ediciones, secciones y portadas, denuncias de reseñas y de clubes, copias, estadísticas y auditoría) es ahora el plugin de Libros de la administración de la plataforma, que solo usa el propietario desde la red local del servidor. Sus rutas (`/admin/*`, `/catalogo/admin/*`, `/moderacion/*`, la cola y la resolución de `/peticiones/catalogo`, las escrituras de `/antologias/secciones` y de `/estado_localizacion/catalogo`) **ya no existen en internet** y no tienen recambio para la web: el frontend borra la página, sus servicios y su guarda, y deja de mostrar a administradores y moderadores los botones de editar el catálogo. Detalle: abajo, «El panel de administración».

## Qué usar de la plataforma en lugar de lo retirado

| Antes en Libros | Ahora |
| --- | --- |
| `/auth/session…`, `/auth/onboarding…`, `/auth/sessions…`, `/auth/access-methods…`, `/auth/email-change/…`, `/auth/phone/preflight`, `/auth/reauthentication` | El SDK de la plataforma (`ACCESO.md`): `<yosi-acceso>` con el panel de cuentas |
| `GET /auth/user`, `PUT /auth/update`, `POST /image/set/photo` | `GET /usuarios/me` y el perfil de la plataforma |
| `/usuarios/me/preferencias-interfaz`, `/chat/preferencias-flotantes` | `yosiftware.ajustes`; las ventanas del chat las guarda la plataforma |
| `/comunidad/usuarios…`, `/comunidad/relaciones/…`, `/comunidad/seguimientos`, `/comunidad/amistades/…`, `/comunidad/bloqueos` | Las personas y relaciones de la plataforma (`SOCIAL.md`, `GET /v1/personas`) |
| `/chat/*`, `/bandejas/chat/…`, los tickets y los WebSocket `/ws/chat` y `/ws/community` | El chat de la plataforma pintado por Libros (`CHAT.md`, `/v1/chat/…`) y su tiempo real |
| `/chat/clubes/{id}` | La conversación del espacio del club: `ConversacionId` en `GET /clubes-lectura/{id}` |
| `/notificaciones/*` y `/notificaciones-dispositivos/{id}` | `<yosi-notificaciones>`; el push lo envía la plataforma |
| `/moderacion/mi-estado-acceso`, `/moderacion/mis-incidentes`, alegaciones, políticas y todo `/moderacion/admin/*` de cuentas | La moderación y las normas de la plataforma (`MODERACION.md`); lo limitado llega en el token |
| `POST /comunidad/denuncias` con `perfil` o `mensaje` | `yosiftware.denunciar()` (las de publicaciones, comentarios y clubes siguen en Libros) |
| `/admin/*`, `/catalogo/admin/*`, `/moderacion/reportes…`, `/moderacion/comunidad/denuncias…`, `GET /peticiones/catalogo` y `PATCH /peticiones/catalogo/{id}/resolver`, `POST`/`PATCH /antologias/secciones`, `POST`/`PATCH /estado_localizacion/catalogo` | Nada en la web: el plugin de Libros de la administración de la plataforma (abajo) |
| `/auth/account-states`, `/admin/auth/phone-attempts`, `/admin/usuarios/{id}`, `/moderacion/usuarios…` | Sin recambio: la gestión de cuentas se retira |
| `/auth/firebase-custom-token`, Firestore y RTDB | Sin recambio: se retiran enteros (las reglas niegan todo) |
| `/health/realtime` | `/verify` (`plataformaFeedWorker`) |
| El muro general (`GET` y `POST /comunidad/publicaciones`) | Las novedades de la plataforma (web social; en la web, `GET /v1/novedades`). Las publicaciones solo quedan en los clubes: `GET`/`POST /clubes-lectura/{id}/publicaciones` |
| `/comunidad/actividad/preferencias` y `/comunidad/actividad/reconocimientos/{categoria}` | Los ajustes de compartir de la plataforma (`https://social.yosiftware.es/?vista=novedades`, o `GET`/`PUT /v1/cuenta/novedades/ajustes`) |
| `POST /clubes-lectura/{id}/unirse` y `/salir` | `POST /v1/espacios/{EspacioId}/entrar` y `DELETE /v1/espacios/{EspacioId}/miembros/yo` (abajo, «Los clubes») |
| `/clubes-lectura/{id}/invitaciones…`, `/clubes-lectura/{id}/solicitudes…` y `/bandejas/clubes/*` | Las invitaciones y solicitudes de los espacios (`/v1/espacios/…`, el SDK y sus fragmentos `#yosi-invitacion` y `#yosi-invitaciones`) |

### Campos que cambian en lo que se queda

- `GET /runtime-config` solo devuelve `Environment` y `QaDatasetVersion` (fuera `Firebase` y `RealtimeWsUrl`).
- `GET /verify` solo lista `api`, `sqlServer` y `plataformaFeedWorker`.
- `GET /comunidad/resumen` solo trae `Resumen.Clubes`; `GET /comunidad/capacidades`, solo `feed` y `clubes`.
- `GET /clubes-lectura/{id}`: `Metricas` pierde `Mensajes`; gana `EspacioId` y `ConversacionId`. Todos los clubes traen `EspacioId`; `EstadoMembresia` ya no vale `solicitud_pendiente` y `GET /clubes-lectura/resumen` ya no trae `BandejasAcceso` (fase 4).
- Los listados de clubes, debates y estadísticas ya no filtran por bloqueos (son de la plataforma).
- `PublicarActividad` en `/coleccion/{libros|antologias}/{id}/estado`, `/puntuacion` y `/resena`: `false` no publica la novedad de ese cambio; `true`, `null` u omitido la publican y decide la plataforma con los ajustes de la persona.
- Editar, borrar, comentar y reaccionar (`/comunidad/publicaciones/{id}…`) y denunciar publicaciones y comentarios (`POST /comunidad/denuncias`) solo valen para lo de los clubes: lo del muro antiguo es `404`.
- `GET /estadisticas/comunidad`: `ActividadComunidad30Dias` cuenta las publicaciones, comentarios y reacciones de los clubes abiertos (antes, las del muro público).

## Los clubes (fase 4: los espacios de la plataforma)

Cada club es un **espacio** de la plataforma (`ecosistema-kit/ESPACIOS.md`). La plataforma lleva quién está, con qué rol y cómo se entra, las invitaciones (también a un correo), las solicitudes y **sus avisos**, la conversación y el canal; Libros, todo lo demás del club. La web elige entre la ventana de invitaciones del SDK o su propia interfaz (`data-invitaciones="propias"`); la APK Kotlin usa `sesion.espacios` de la librería 1.7.0.

| Qué hace la persona | Antes en Libros | Ahora |
| --- | --- | --- |
| Crear el club | `POST /clubes-lectura` | Igual. Responde `{ Id, EspacioId }`: la API crea el espacio a su nombre (es su propiedad) en la misma transacción. Errores nuevos `club_space_*` (`503 club_space_unavailable` si la plataforma no responde: no se ha creado nada) |
| Entrar en uno abierto | `POST /clubes-lectura/{id}/unirse` | `POST /v1/espacios/{EspacioId}/entrar` con el token de la plataforma (`yosiftware.tokenPlataforma()`). `403 expulsado_del_espacio` si la sacaron: solo vuelve con una invitación |
| Pedir entrar en uno cerrado | `POST /clubes-lectura/{id}/solicitudes` `{ Mensaje }` | `POST /v1/espacios/{EspacioId}/solicitudes` `{ "mensaje"? }`; retirarla, `DELETE …/solicitudes/mia`. Quien puede aprobar recibe la notificación de la plataforma con «Aprobar» y «Rechazar», y quien la pidió se entera de la respuesta: Libros ya no avisa |
| Aprobar o rechazar una solicitud | `PATCH /clubes-lectura/{id}/solicitudes/{id}` y `GET /clubes-lectura/{id}/solicitudes` | `GET /v1/espacios/{EspacioId}/solicitudes` y `POST …/solicitudes/{idSolicitud}/aprobar` o `…/rechazar` (la propiedad y los moderadores) |
| Invitar | `POST /clubes-lectura/{id}/invitaciones` y `…/invitaciones/candidatos` | Buscar con `GET /v1/personas?q=` e invitar con `POST /v1/espacios/{EspacioId}/invitaciones` `{ "cuenta" }` o `{ "correo" }` (y `rol` opcional: `miembro` o `moderacion`). El correo lo envía la plataforma. Las pendientes, `GET /v1/espacios/{EspacioId}/invitaciones`; retirar una, `DELETE …/invitaciones/{id}` |
| Aceptar o rechazar una invitación | `PATCH /clubes-lectura/{id}/invitaciones/{id}` y `/bandejas/clubes/invitaciones` | **`#yosi-invitacion=<código>`** (el enlace del correo) y **`#yosi-invitaciones`** (desde la campana, vía la web social) en la raíz de la web: con el SDK, su ventana se abre sola y lanza `yosiftware:espacio` (`aceptada` con el espacio, o `rechazada`); con interfaz propia, `POST /v1/espacios/invitaciones/por-codigo` y `…/por-codigo/aceptar` `{ "codigo" }`, o `GET /v1/espacios/invitaciones` y `POST …/{id}/aceptar` o `…/rechazar`. Se acepta solo con un token de Libros (`403 acepta_en_la_web`); `correo_de_otra_cuenta`, `dos_pasos_necesarios` e `invitacion_no_encontrada` según `ESPACIOS.md` |
| Salir | `POST /clubes-lectura/{id}/salir` | `DELETE /v1/espacios/{EspacioId}/miembros/yo` (la propiedad no puede: traspasa antes con `POST /v1/espacios/{EspacioId}/traspaso`) |
| Expulsar o cambiar el rol | `DELETE` y `PATCH /clubes-lectura/{id}/miembros/{userId}` | **Igual** (solo la propiedad). La API lo hace en el espacio con su credencial de servicio; la persona expulsada recibe `club.expulsion` |
| Editar, borrar y restaurar el club | `PATCH`/`DELETE /clubes-lectura/{id}` y `POST …/restaurar` | Igual. Borrar borra el espacio (y su conversación); restaurar crea uno nuevo con la propiedad como único miembro: los demás vuelven entrando o con una invitación |
| El chat del club | `/chat/clubes/{id}` (retirado en la fase 3) | La conversación del espacio: `ConversacionId` del detalle, en `<yosi-chat-conversacion conversacion="…">` o en la interfaz de chat de Libros sobre `/v1/chat/…`. Entra cada miembro activo con su rol (los dos roles escriben); quien entra después no ve lo anterior. `null` hasta que la plataforma la da (segundos tras crear el club) |
| Lo que cambia en directo | El WebSocket propio (retirado) | El **canal del espacio**: `yosiftware.espacios.canal(EspacioId, (m) => …)`; `m.datos` es `{ tipo, ClubId, LecturaId?, HitoId?, EventoId? }` con `tipo` `club.updated`, `club.reading_updated`, `club.milestone_*` o `club.event_*`: refrescar por REST. `desfase`: recargar todo; `cerrado`: ya no es miembro activo. La APK, con el socket del gateway |

- **Botones**: `yo` del espacio (`yosiftware.espacios.mios()` o `GET /v1/espacios/{EspacioId}`) dice el rol y las capacidades (`gestionar`, `invitar`, `chat`) para enseñar u ocultar; quién puede hacer qué dentro del club (lecturas, hitos, encuestas, debates, moderar) lo sigue decidiendo Libros con su rol (`propietario`, `moderador`, `miembro`).
- **El feed tarda**: lo que se hace en la plataforma (entrar, aceptar, salir, un rol, un traspaso) llega a Libros por el feed (cada 5 minutos, o al momento con NATS). Justo después de entrar, las rutas del club pueden responder `404 club_access_unavailable`: reintentar tras unos segundos, o esperar a que `GET /clubes-lectura/mios` lo traiga.
- **Ya no existen** el límite de tres clubes por persona (la plataforma permite 300 espacios por cuenta), `BandejasAcceso`, `EstadoMembresia: solicitud_pendiente` ni las notificaciones propias de invitaciones y solicitudes. Sigue el de crear un solo club.
- **Retirado del descubrimiento** por moderación, el espacio queda con entrada por invitación hasta que se reabre.

## El panel de administración: plugin de la administración

Decisión 1 de la petición de migración (`ecosistema-kit/PLUGIN_ADMINISTRACION.md`). El plugin se llama `libros` («Libros»), versión **1.0.0**, con 27 acciones; su código está versionado en `admin-plugin/` (manifiesto e interfaz) y se empaqueta con `python -m scripts.empaquetar_plugin_admin`, que lo valida como la administración y deja el ZIP en `.runtime/entregas/libros.plugin-administracion-1.0.0.zip` (ignorado por Git). Contrato de cada acción: [ENDPOINTS.md](ENDPOINTS.md#plugin-de-la-administración).

**Qué hay en el plugin**, por pestañas:

- **Resumen**: las tres colas pendientes (peticiones, reseñas denunciadas y denuncias de clubes) con un botón a cada una, las cuentas por rol y por estado, y las estadísticas de las peticiones de catálogo (por estado y desglose por tipo y acción).
- **Peticiones de catálogo**: la cola por estado, con los datos de cada petición, Google Books si trae ISBN, y aprobar (creándola con sus datos o enlazándola a una obra que ya existe), devolver o rechazar con comentario. Avisa a quien la pidió.
- **Reseñas denunciadas**: la reseña, quién la escribió, las denuncias con su motivo; aceptar (la oculta) o rechazar, con comentario y, al aceptar, **un incidente en la plataforma** si el propietario lo decide (caso de moderación de la plataforma y mensaje para la persona).
- **Denuncias de clubes**: clubes, publicaciones y comentarios de club, con lo denunciado tal como estaba; aceptar (oculta, o retira el club del descubrimiento) o rechazar, con la misma opción de incidente.
- **Catálogo**: libros, antologías, autores, universos, sagas, idiomas, estilos, lugares de origen y estados de localización. Buscar y paginar; dar de alta y editar cada ficha (autores, saga con su orden o universo, idiomas, estilos, sinopsis, páginas, wiki, titular), rellenar un alta con Google Books por ISBN, **portadas** (el panel reduce la imagen a 600 × 900 antes de enviarla), **ediciones** (nueva, editar ISBN, fecha o portada, o compartir una existente), **secciones** de las antologías (nueva y editar), borrar idiomas y estilos sin usar, y corregir o fusionar lugares de origen.
- **Roles**: las cuentas con su cuenta de Yosiftware (`IdGlobal`), alias, rol y estado; buscar por alias o por la cuenta; cambiar el rol con motivo (no deja quitar el último administrador ni cambiarse a sí mismo).
- **Copias de seguridad**: generar una copia completa (en segundo plano: el ZIP queda en `.runtime/copias/` de la API, porque el plugin solo recibe JSON) y ver las guardadas. En QA no se hacen.
- **Auditoría**: las escrituras administrativas, con quién las hizo en la administración.

**Cómo se protege.** `/admin/v1/*` solo responde por la propia máquina: con cabeceras de Cloudflare o de proxy, desde otra dirección o con otro `Host` es `404`. Exige la credencial del plugin, de la que la API solo guarda la huella SHA-256 (`LIBROS_PLUGIN_ADMIN_CREDENCIAL_SHA256`, en la configuración privada, nunca en Git ni en el ZIP); actúa la cuenta de administración del entorno (`LIBROS_PLUGIN_ADMIN_ID_GLOBAL`); las `POST` aplican `Idempotency-Key` (tabla nueva `plugin_admin_idempotencia` en `0 - Creación.sql`) y piden confirmación en la administración; la interfaz no carga nada de fuera y pinta los datos con nodos (sin HTML). El paquete lo acepta `leer_paquete` de la administración (comprobado sin instalarlo). **Comprobado en la API de QA sin instalarlo** (2026-10-25): las lecturas responden con la credencial, sin ella es `401`, por el túnel `qa-api.yosiftware.es` es `404`, la misma `Idempotency-Key` no repite el cambio y las llamadas con las funciones de la propia administración funcionan. En QA y en producción (con waitress o el servidor de Flask) el túnel se reconoce por sus cabeceras `CF-*` y por el `Host`; waitress, además, borra `X-Forwarded-For` y `Forwarded` antes de que lleguen a la API.

**Direcciones**: `http://127.0.0.1:5101/admin/v1` en desarrollo y QA (la API de QA, que corre contra la plataforma de QA) y `http://127.0.0.1:5001/admin/v1` en producción.

### Lo que hace el propietario

**En QA** (cuando quiera; la API de QA ya tiene el plugin):

1. La credencial de QA ya existe y no se ha mostrado: `C:\Users\Yosi\Desktop\Memoria bibliográfica\.worktrees\api-adhesion\.runtime\plugin-administracion\qa.credencial`. Su huella (`07a48f2ed205fd8a3e521cc3c0e7e6f7db4467d2f58059b7cf320778750c96bf`) y la cuenta de administración de QA (`7042db67-5cc3-f111-8c4b-002315ef7116`) están en `qa/.env` del worktree (`LIBROS_PLUGIN_ADMIN_CREDENCIAL_SHA256` y `LIBROS_PLUGIN_ADMIN_ID_GLOBAL`).
2. Instalarlo en la administración de QA, desde su copia:

   ```powershell
   cd C:\Users\Yosi\yosiftware-cuentas\qa
   .venv\Scripts\python.exe -m cuentas.admin.plugins instalar "C:\Users\Yosi\Desktop\Memoria bibliográfica\.worktrees\api-adhesion\.runtime\entregas\libros.plugin-administracion-1.0.0.zip"
   .venv\Scripts\python.exe -m cuentas.admin.plugins credencial libros
   .venv\Scripts\python.exe -m cuentas.admin.plugins activar libros
   ```

   En `credencial libros`, pegar el contenido del archivo de la credencial (se escribe sin verse). No pasarla con una tubería de PowerShell 5.1 (`Get-Content … |`): la administración la rechaza (`PLUGIN_ADMINISTRACION.md`).
3. Abrir «Plugins › Libros» en la administración de QA.

**Al unir la rama** (QA vuelve a la copia principal): copiar esas dos líneas de `qa/.env` del worktree al `qa/.env` de la copia principal, y el archivo de la credencial a `Libros API\.runtime\plugin-administracion\`. Si el worktree se borra antes, basta con generar otra y repetir `credencial libros` (abajo).

**En el corte, en producción** (con el resto del esquema, fase 7):

1. Generar la credencial de producción en la copia principal, sin mostrarla (solo enseña la huella):

   ```powershell
   cd "C:\Users\Yosi\Desktop\Memoria bibliográfica\Libros API"
   New-Item -ItemType Directory -Force .runtime\plugin-administracion | Out-Null
   .venv\Scripts\python.exe -c "import hashlib,secrets,pathlib; c=secrets.token_urlsafe(32); pathlib.Path(r'.runtime\plugin-administracion\produccion.credencial').write_text(c); print(hashlib.sha256(c.encode()).hexdigest())"
   ```

2. En el `.env` de producción (`Libros API\.env`): `LIBROS_PLUGIN_ADMIN_CREDENCIAL_SHA256=<la huella>` y `LIBROS_PLUGIN_ADMIN_ID_GLOBAL=6b89e190-60c3-f111-8c4b-002315ef7116` (tu cuenta de producción, enlazada con `usuarios.id = 1`). La tabla `plugin_admin_idempotencia` llega con el esquema del corte. Reiniciar la API.
3. Comprobar: `http://127.0.0.1:5001/admin/v1/resumen` sin credencial da `401`; `https://libros-api.yosiftware.es/admin/v1/resumen` da `404`.
4. Instalarlo en la administración de producción (`C:\Users\Yosi\yosiftware-cuentas\produccion`) con las mismas tres órdenes y la credencial de producción (la de QA no se reutiliza).

Para cambiar una credencial: generar otra, poner su huella, reiniciar la API y repetir `credencial libros`. Para una versión nueva del plugin: subir `version` en `admin-plugin/manifest.json`, empaquetar y `actualizar <zip>` (conserva la credencial). La plataforma no necesita ningún cambio: instalar, dar la credencial y activar son órdenes de su kit.

## El plugin de Notificapp `libros-api` 1.1.0

Decisión 12 de la petición. `books_request` (con sus acciones y `onSuccess`) y `books_review_report` siguen; `books_appeal` desaparece; `books_community_report` queda para los clubes, sus publicaciones y sus comentarios. Detalle: [NOTIFICAPP.md](NOTIFICAPP.md).

Quitar un tipo de `eventKinds` cambia permisos, así que no se publica con `publish.py`. El ZIP es `.runtime/entregas/libros-api-1.1.0.notificapp.zip` del worktree (hecho con `pack.py` del kit; la lectura de paquetes de Notificapp lo acepta). **En el corte** (antes, producción aún envía alegaciones), el propietario lo instala:

```powershell
cd C:\Users\Yosi\Desktop\notificapp
.\.venv\Scripts\python.exe -m notificapp.plugin_cli upgrade "C:\Users\Yosi\Desktop\Memoria bibliográfica\.worktrees\api-adhesion\.runtime\entregas\libros-api-1.1.0.notificapp.zip"
```

`upgrade` conserva el espacio, los avisos y la credencial de emisor, y apaga las actualizaciones remotas: se vuelven a activar en la APK (Espacios de API › Libros) si se quieren. La credencial externa de `/notificapp/v1/…` no cambia.

## Errores de autenticación y de acceso

Siguen el formato de `ERRORES.md` (`error` para mostrar, `code` para decidir, `debug.requestId`).

| Estado | `code` | Cuándo | Qué hace el frontend |
| --- | --- | --- | --- |
| 401 | `authorization_required` | Falta `Authorization: Bearer` | Pedir que entre (`<yosi-acceso>`). |
| 401 | `access_token_expired` | El token ha caducado (duran 10 minutos) | Nada: `yosiftware.fetch()` pide otro y repite una vez. |
| 401 | `invalid_token` | Firma, emisor, audiencia o formato no válidos; también un JWT de la sesión antigua | Igual: el SDK renueva y repite; si vuelve a fallar, pedir que entre. |
| 403 | `account_deleted` | La cuenta se ha borrado en la plataforma | Volver a la vista sin sesión. |
| 403 | `platform_restriction_active` | La cuenta tiene limitado lo que intenta (`restricciones` del token o del feed) | Mostrar `error`. `details.Alcance` (`creacion`, `comunidad`, `publicacion`) y `details.Hasta` (ISO 8601 UTC o `null`). |
| 403 | `platform_rules_acceptance_required` | El token trae `normasPendientes` | Llevar a aceptar las normas con el SDK y pedir un token nuevo. |
| 503 | `authentication_unavailable` | La API no tiene configurada la validación | Error genérico; es un fallo del servidor. |

- **`restricciones`**: `creacion` bloquea solo lo que ven otras personas fuera de los clubes (decisión 10 de la petición): las portadas que se suben (`POST /image/set/cover/{nombre}`; el catálogo canónico ya no se escribe desde la web), las reseñas (`POST`/`PATCH /coleccion/{libros|antologias}/{id}/resena`) y las peticiones de catálogo (`/peticiones/catalogo…`). **Desde el 2026-10-24 ya no bloquea** la colección privada (estados, puntuaciones, ediciones e históricos), las notas, las entidades narrativas, la estructura propia (capítulos, partes, interludios, escenas, secciones de saga y universo) ni los reportes de reseñas (`POST /reportes`). `comunidad` bloquea las escrituras de los clubes (también sus publicaciones, comentarios y denuncias, porque implica `publicacion`). Las lecturas no se bloquean. Lo comprueba `tests/test_platform_social_services.py` (`RestrictionScopeTests`).
- **`normasPendientes`**: bloquea todo salvo las lecturas de arranque (las listas del catálogo, `/coleccion/items`, `/coleccion/universos`, `/comunidad/capacidades` y `GET /usuarios/me`).

## Lo que hace el backend por su cuenta

- **Feed de cambios** (`realtime/plataforma_feed_worker.py`; latido `plataformaFeedWorker` en `/verify`): aplica `cuenta.estado` (`suspendida` y `cerrada` esconden; `borrada` anonimiza el usuario local), copia el alias de `cuenta.creada` y `perfil.cambiado` y, desde la fase 4, la pertenencia de los clubes (`espacio.*` y `miembro.*` en `club_miembros`).
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

  **No hay tipo del equipo** (desde el 2026-10-24): las colas que esperan al administrador (peticiones de catálogo, reportes de reseñas y denuncias de clubes) las avisa Notificapp, como exige el kit; un tipo propio saldría en los ajustes de todas las personas. Las invitaciones y solicitudes de los clubes **no se declaran**: las avisa la plataforma en cuanto los clubes sean espacios (kit 1.39); hasta la fase 4 no generan notificación. `enviada: false` (la persona lo tiene apagado) no se reintenta. No se avisa a nadie de lo que hace él mismo, ni a quien no tiene cuenta de Yosiftware.
- **Novedades** (`utils/platform_novedades.py`, `NOVEDADES.md`; decisión 2). Catálogo declarado al arrancar (`PUT /v1/servicio/novedades/tipos`); cada cambio de la colección se publica tras confirmar y en segundo plano, en tercera persona y sin el nombre:

  | Tipo | Nombre | Texto | Cuándo |
  | --- | --- | --- | --- |
  | `libro.empezado` | Empezar un libro | «ha empezado a leer «Dune»» | estado `En marcha` |
  | `libro.terminado` | Terminar un libro | «ha terminado de leer «Dune»» | estado `Leido` |
  | `libro.puntuado` | Puntuar un libro | «ha puntuado «Dune» con 4 de 5» | puntuación |
  | `libro.resenado` | Reseñar un libro | «ha reseñado «Dune»» | reseña (se retira si se borra o la oculta la moderación) |

  Un `idExterno` por persona, obra y actividad (`lectura-<id global>-libro-7`, `puntuacion-…`, `resena-…`): empezar y terminar actualizan la misma tarjeta. Enlace: el catálogo de Libros con el libro listo para añadir (`/dashboard/catalog?addBook={id}`); imagen: la portada que sirve la API. Los demás estados no se comparten. `publicada: false` es decisión de la persona y no se reintenta.
- **Incidentes** (`utils/platform_moderation.py`, `MODERACION.md`): `registrar_incidente()` registra un aviso a la cuenta (`POST /v1/servicio/moderacion/incidentes`, con caso, mensaje e `idExterno`) y `casos()` lee los casos. Lo pide el administrador desde el plugin, al aceptar una denuncia de reseña o de club (`Incidente`, abajo).
- **Novedades de Yosiftware**: `python -m scripts.anunciar_novedad_yosiftware` anuncia en el feed de Yosiftware algo de Libros que la gente nota (`POST /v1/servicio/novedades/yosiftware`); `--corte` lleva preparado el anuncio del corte. Solo en producción y a mano.
- **Cómo se envía**: lo que se registra durante la transacción (`utils/after_commit.py`) solo se encola al confirmar; un hilo por proceso de la API (`utils/platform_dispatch.py`) llama a la plataforma, reintenta ante red, 5xx o 429 (10 s, 1 min, 5 min, 15 min y 1 h) y, si llega otra operación con la misma clave, solo cuenta la última. La respuesta HTTP nunca espera a la plataforma, y un fallo de la plataforma no deshace nada de la persona.
- **Canal del espacio** (`utils/platform_space_channel.publicar()`): `club.updated`, `club.reading_updated`, `club.milestone_*` y `club.event_*` se publican tras confirmar y en segundo plano (`POST /v1/servicio/espacios/club-<id>/canal`, con un `idExterno` por publicación que no se duplica al reintentar).
- **Permisos.** El rol de administrador y moderador sigue en la base de Libros, asociado al usuario local (y, por él, al `sub`; el plugin lo enseña con `IdGlobal`). El moderador no tiene hoy dónde moderar: el panel es del plugin, que solo usa el propietario (decisión 14).

## Lo previsto

- Las normas propias de Libros (`docs/legal/NORMAS_LIBROS_V1.md`): las revisa el propietario y las publica la plataforma en QA y producción; desde entonces el token trae `normasPendientes` a quien no las haya aceptado.
- En la web (roadmap del frontend): las pantallas de invitar, aceptar, pedir entrar, solicitudes y miembros sobre `/v1/espacios` o el SDK (ventana propia o `data-invitaciones="propias"`), los fragmentos `#yosi-invitacion` y `#yosi-invitaciones` en la raíz, la conversación del club y el canal.
- Lo que se borra al recibir `cuenta.borrada`, con el alcance aprobado (decisión 22).

Esta guía se actualiza en cada paso de la rama y al publicar el corte.
