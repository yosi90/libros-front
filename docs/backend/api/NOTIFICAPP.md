# Integración de Libros con Notificapp

Libros tiene en Notificapp el plugin `libros-api` («Libros»), versión 1.3.0, versionado en `notificapp-plugin/` (manifiesto e `ui/index.html`). Avisa al propietario de lo que espera su decisión y le deja resolver las peticiones de catálogo desde el móvil. Las notificaciones a las personas no pasan por aquí: son de la plataforma (`utils/platform_notifications.py`, [ADHESION_YOSIFTWARE.md](ADHESION_YOSIFTWARE.md)). Guía del protocolo y del empaquetado: `docs/notificapp-plugin-kit/PROJECT_PLUGIN.md`.

## Avisos

Solo `LIBROS_ENVIRONMENT=produccion` envía avisos (`utils/notificapp_sender.py`). La API publica después del commit SQL y conserva el mismo `externalId` en la cola privada si Notificapp no responde:

| Tipo | Cuándo | `externalId` |
| --- | --- | --- |
| `books_request` | Nueva petición de catálogo (una por grupo de ISBN) | `catalog-request-{id}` |
| `books_review_report` | Nuevo grupo pendiente de reportes de reseña | `review-report-group-{id}` |
| `books_community_report` | Nuevo grupo pendiente de denuncias de un club, de una publicación o de un comentario de club | `community-report-group-{id}` |

Un reporte adicional sobre un grupo ya abierto no crea otro aviso. Los reportes y denuncias se resuelven en el plugin de Libros de la administración de Yosiftware ([ENDPOINTS.md](ENDPOINTS.md#plugin-de-la-administración)); el panel solo los rotula («Denuncia de reseña», «Denuncia en un club») y lo recuerda. Las peticiones de catálogo se resuelven aquí.

### El aviso de una petición nueva con la propuesta de la IA

Con la IA de las peticiones en `sombra` o `real` (roadmap `docs/roadmaps/PAUSADO_ia/`, IA1):

- El aviso `books_request` de un alta de libro o antología **espera a la IA**, como mucho `LIBROS_PETICIONES_IA_ESPERA_AVISO` minutos (15), y su cuerpo añade un bloque «— La IA, en sombra (no se ha aplicado nada) —» con lo que habría hecho: aprobar con la obra (título, autores, saga o universo con su orden, páginas, fecha, sinopsis, fuentes y avisos como «Sin portada» o «La sinopsis es una traducción») o escalar con sus motivos y el comentario («En Libros se llama X; las fuentes en español de España lo llaman Y»), y lo que costó.
- Mismo `externalId`: el panel abre la petición como siempre y el aviso sale **una sola vez** (la marca `ia_peticiones.fecha_aviso`).
- Sale en el momento, sin la propuesta, si la IA está apagada, si la espera es 0 o si el lector del feed no está vivo; y sin ella, con una línea que lo dice, si la IA no termina a tiempo o falla.
- En `real`, si la IA aprueba y se aplica, el título del aviso es «Petición #N aprobada automáticamente».

## Rutas privadas

| Acción | Ruta | Qué hace |
| --- | --- | --- |
| `list` | `GET /notificapp/v1/requests` | Hasta 100 peticiones pendientes y `HayMas` (el panel de una sola petición no la usa). |
| `detail` | `GET /notificapp/v1/requests/{id}` | La petición abierta. Las altas pendientes de libro y antología incluyen opciones de autores, universos, sagas, idiomas, estilos y `Opciones.LugaresOrigen`, `SugerenciaGoogleBooks` y `PropuestaIA`. |
| `respond` | `POST /notificapp/v1/requests/{id}/responses` | Resuelve por JSON. `onSuccess: "answered"`. |
| `respond_image` | La misma ruta, con `image: true` | Resuelve con portada (`multipart/form-data` con `payload` JSON e `image`). `onSuccess: "answered"`. |

- `POST …/responses` acepta `Estado` (`aprobada`, `rechazada`, `devuelta`) y `Comentario` opcional de hasta 500 caracteres. Aprobar un alta de libro o antología exige además `Obra` con el formulario editorial completo. El servidor de Notificapp exige confirmación nativa y añade `Idempotency-Key`.
- En la respuesta aprobada, `Obra.Autores` contiene IDs existentes y puede ser `[]` si se aporta `Obra.AutoresNuevos`; entre ambas listas se exige al menos un autor. `AutoresNuevos` admite hasta 20 fichas `{Nombre, IdiomaId?, Estilos?, LugarOrigenId? | LugarOrigenNombre?}`. El ID de lugar `0` es válido; un lugar nuevo se reutiliza por nombre normalizado o se crea.
- **Una sola transacción**: la API valida y crea lugar y autores, inserta la obra con sus relaciones y obtiene su ID **antes** de actualizar la petición y crear el aviso a la persona. Si algo falla, la petición sigue pendiente y no se avisa. Las ediciones modifican la entidad existente antes de resolver.
- **Portada** (`respond_image`): Libros valida MIME, formato y tamaño (PNG, JPEG o WebP, hasta 10 MiB), normaliza a PNG de 600x900, guarda el archivo y enlaza la portada antes de confirmar SQL; si se revierte, borra el archivo nuevo. Sin imagen, `respond` usa la portada provisional.
- **Idempotencia**: `peticiones_catalogo.notificapp_idempotency_key` y `notificapp_request_hash` guardan la clave y la huella de `Estado`, `Comentario`, `Obra` y el SHA-256 de la imagen. Una repetición idéntica devuelve el resultado previo sin reaplicar nada; otra clave sobre una petición ya resuelta recibe `409`.
- **Google Books** (`SugerenciaGoogleBooks`): con un ISBN válido, el detalle lo consulta después de cerrar SQL, con un plazo breve y sin portada. Da `encontrado` con título, ISBN, autores, estilos, páginas, idioma, fecha y sinopsis, o un estado que explica por qué no. Si falla, el detalle sale igual.
- **La propuesta de la IA** (`PropuestaIA`, `null` si no la ha estudiado): el último estudio terminado de `ia_peticiones`, con `Modo`, `Decision`, `Motivos` (en texto), `Comentario`, `Avisos`, `Modelo`, `Fecha` y `Obra`, con la forma de la que va a `resolve_request` (solo lo que la IA encontró y casa con el catálogo).

## Credenciales

- Las rutas privadas solo aceptan una credencial externa de servidor a servidor, en `.runtime/notificapp-upstream.json` (campos privados `token` y `adminUserId`). Para Libros, `adminUserId` es `1`; cada llamada comprueba en SQL que esa cuenta siga siendo administradora. En el servidor de Notificapp se configura con `set-upstream-token libros-api <archivo-privado>`.
- El emisor de avisos usa otra credencial, `.runtime/notificapp-sender.json`. La de las actualizaciones remotas, `.runtime/notificapp-update.token`.
- Ninguna entra en el repositorio, el ZIP ni el HTML. El panel no contiene credenciales.
- El paquete declara solo el dominio `https://libros-api.yosiftware.es` y las rutas de arriba.

## Panel

- Usa `Notificapp.getLaunchEvent()` para mostrar solo el aviso abierto. En una petición de catálogo enseña el formulario de decisión desde el primer momento, pero bloquea el envío hasta que la API confirma que sigue pendiente. Al abrir el espacio sin un aviso, muestra una indicación breve.
- Rellena el formulario de alta con la propuesta de la IA, después con Google Books y por último con lo que escribió la persona: nombre, ISBN, páginas, fecha, sinopsis, autores, saga o universo con su orden, idiomas y estilos. Encima dice en una línea qué hizo la IA («La IA habría aprobado…», «La IA la escaló…») con sus motivos y avisos. Si la IA encontró los autores, no ofrece crear fichas con lo que escribió la persona. Coteja autores, estilos e idioma con el catálogo y avisa de lo que no encuentra. La ubicación en universo o saga la decide el administrador. Todo se puede corregir antes de aprobar.
- Portada: `Notificapp.pickImage(requestId)` devuelve un `imageHandle` temporal (nunca bytes ni URI) por `window.notificappReceive`, y `Notificapp.request` lo envía con `respond_image`. Si la conexión falla después de enviar, el panel consulta el estado antes de repetir.
- Estética: el bloque «Estética de Notificapp» del kit (Terminal, Claro y Bento, con `Notificapp.getStyle()` y respaldo a `getTheme()` y al tema del sistema) y el icono `ui/icon.png` (192 × 192).

## Publicar una versión

- Cada versión sube `version` y conserva `eventKinds`, `agents`, `api.baseUrl` y `api.actions`. Si no cambian los permisos, se publica por actualización remota con `pack.py` y `publish.py` del kit (`docs/notificapp-plugin-kit/`) y la credencial de actualización.
- Si cambian (añadir o quitar un tipo de aviso, una acción o un permiso como `image` u `onSuccess`), el ZIP se entrega al propietario, que lo instala con `plugin_cli upgrade`: conserva el espacio, los avisos y la credencial de emisor, y apaga las actualizaciones remotas hasta que las reactive en la APK («Espacios de API»).
- El publicador del kit se identifica con `User-Agent: Notificapp-Publisher/1.0`: Cloudflare bloquea el agente por defecto de Python (`403`/`1010`; [petición de publicación remota](PETICION_NOTIFICAPP_PUBLICACION_REMOTA.md)).
- Las respuestas y preguntas de los agentes van al espacio «Agentes» y no usan este plugin.
