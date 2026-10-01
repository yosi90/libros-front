# Plugin de proyecto: API y panel de Notificapp

Copia esta carpeta completa en el repositorio de la **API que recibe y guarda las solicitudes** y añade `/plugin-kit/` al `.gitignore` raíz. El kit copiado queda fuera de Git. Su agente copia `plugin-kit/template/` a una carpeta **versionada** del proyecto, por ejemplo `notificapp-plugin/`, y allí crea `manifest.json` y `ui/index.html`. También implementa los endpoints declarados y entrega el ZIP. La pantalla HTML de este paquete es el panel **dentro de la APK de Notificapp**; no es el frontend web del proyecto. El código de Notificapp no necesita cambios para cada proyecto compatible.

Los avisos de nuevas solicitudes pertenecen a la API y deben salir después de confirmar la creación en su base de datos. El frontend web continúa enviando solicitudes a su propia API y no debe publicar por separado el mismo aviso. El agente que trabaja en la API también puede avisar de sus respuestas y preguntas, pero usa el canal independiente descrito en [AGENT_NOTIFICATIONS.md](AGENT_NOTIFICATIONS.md).

## 1. Qué aporta cada parte

- El plugin ZIP contiene un manifiesto y una pantalla HTML/CSS/JavaScript autocontenida. No contiene secretos ni código Android o Python ejecutable en el servidor.
- La API del proyecto envía avisos a Notificapp con una credencial de **emisor** asociada al plugin activo.
- La pantalla puede invocar acciones declaradas en el manifiesto. La APK habla con Notificapp; Notificapp habla con la API del proyecto mediante HTTPS y una credencial **externa** guardada en el servidor.
- El primer ZIP se entrega al propietario para revisión e instalación local. Las versiones siguientes solo pueden enviarse directamente si el propietario activa las actualizaciones remotas. Se usa una credencial de **actualización** distinta de la de avisos.

La instalación en el servidor es la puerta de acceso real. Un ZIP presente en un teléfono, por sí solo, no autoriza publicaciones.

## 2. Crear el paquete

Copia el ejemplo de `plugin-kit/template/` a `notificapp-plugin/` y edita `notificapp-plugin/manifest.json`. El código propio del plugin debe permanecer versionado aunque el kit esté ignorado por Git:

- `schemaVersion`: siempre `1`.
- `id`: ID estable, de 1 a 64 caracteres ASCII minúsculos, números, punto, guion o guion bajo. No uses `agents`.
- `name`: nombre mostrado en la APK, máximo 80 caracteres.
- `version`: versión `MAJOR.MINOR.PATCH`, estrictamente creciente.
- `eventKinds`: tipos de aviso que podrá publicar este proyecto. Ninguno puede empezar por `agent_`.
- `agents`: `[]` para proyectos. Este campo existe por compatibilidad del contrato; no convierte un proyecto en agente.
- `ui.entry`: `ui/index.html`.
- `api.baseUrl`: dominio HTTPS público de la API del proyecto, sin ruta ni credenciales. Puede ser el dominio de un túnel Cloudflare.
- `api.actions`: operaciones con nombre, método `GET` o `POST`, y ruta fija. Se admite `{id}` como único parámetro de ruta. No se admiten redirecciones. Una acción `POST` que **requiera una imagen** puede declarar además `"image": true`; es un permiso adicional sujeto a revisión local.

La v1 del ZIP admite exactamente `manifest.json` y `ui/index.html`. Incluye CSS y JS dentro del HTML. El paquete no puede superar 2 MiB y el HTML no puede superar 1 MiB. La WebView bloquea recursos externos, ventanas, navegación y acceso a archivos. La interfaz puede mostrar el tema con CSS propio.

Empaqueta desde la raíz del proyecto, indicando la carpeta versionada mediante `--template`:

```powershell
python plugin-kit/pack.py --template notificapp-plugin --output mi-proyecto.notificapp.zip
```

Entrega el ZIP y el código fuente de la interfaz al propietario por un canal privado para su primera revisión. No incluyas claves, contraseñas o URLs con tokens.

## 3. Publicar avisos

Tras la instalación inicial, el propietario te entregará por separado la credencial de emisor. Guárdala fuera de Git. Cuando una solicitud nueva quede **confirmada** en la base de tu API:

```http
POST https://notificapp-api.yosiftware.es/v1/events
Authorization: Bearer <senderToken>
Content-Type: application/json

{
  "externalId": "solicitud-123",
  "kind": "new_request",
  "title": "Nueva solicitud",
  "body": "Texto completo y exacto de la solicitud"
}
```

`kind` debe estar en `eventKinds`. El origen lo fija la credencial del plugin; no se manda libremente en el JSON. `externalId` debe ser estable: repetir el mismo evento exacto devuelve 200 y no duplica el aviso; cambiar contenido con ese ID devuelve 409. Una creación nueva devuelve 201. Conserva el cuerpo íntegro, con máximo 256 KiB UTF-8. Reintenta con el mismo ID si falla la red. No publiques antes del commit de tu transacción.

La API elige el `title` de cada solicitud, entre 1 y 200 caracteres; también puede cambiarlo según el tipo o el contexto de la petición. Esto es independiente del `--title` que el Codex o Claude del repositorio use para sus propios avisos en el espacio «Agentes».

## 4. API del proyecto y panel propio

El proyecto implementa las rutas que declara en `api.actions`. Notificapp añade `Authorization: Bearer <credencial externa>` y, en `POST`, `Idempotency-Key: <identificador>`. El proyecto debe proteger esas rutas y aplicar esa clave para evitar escrituras duplicadas. Las respuestas deben ser JSON y medir como máximo 256 KiB.

La pantalla usa el puente del anfitrión:

```javascript
const requestId = "req-" + Date.now();
Notificapp.request(JSON.stringify({
  requestId,
  action: "list",
  id: null,
  payload: {}
}));
window.notificappReceive = (requestId, raw) => {
  const result = JSON.parse(raw);
  // result.ok; si es true, result.data = {status, data};
  // si es false, result.error explica el fallo.
};
```

Una acción `POST` muestra una confirmación nativa antes de llamar a la API externa. El puente solo admite acciones presentes en el manifiesto instalado. No entrega credenciales al HTML. El proyecto decide cómo presentar sus solicitudes y respuestas dentro de su HTML; Notificapp conserva fuera de ese panel el historial de avisos y los contadores sin leer.

Al abrir un aviso de un proyecto con panel instalado, la APK entra directamente en su frontend. El panel puede leer el aviso que lo abrió mediante `JSON.parse(Notificapp.getLaunchEvent())`. Devuelve `null` si se abre desde el botón general del proyecto; en otro caso incluye `id`, `externalId`, `kind`, `title` y `body`. Sirve para mostrar una vista previa mientras se consulta la petición completa en la API del proyecto. El `body` puede contener datos privados y no debe enviarse a otros dominios. La API del proyecto sigue siendo la fuente para el estado actual y para responder.

El panel puede consultar `Notificapp.getTheme()`, que devuelve `"light"` o `"dark"` según el tema **efectivo** de la APK, incluida la preferencia manual. Aplica el resultado a tus variables CSS antes de pintar el contenido; conserva `prefers-color-scheme` como respaldo para APK antiguas que no tengan ese método. Al cambiar el tema del sistema mientras el panel está abierto, la APK recarga el WebView con el nuevo valor. Conserva el estado importante en la API del proyecto, no solo en memoria JavaScript.

### Adjuntar una imagen a una acción

Esta capacidad es genérica: el proyecto decide si la imagen será una portada, un justificante u otro dato. Declara una acción `POST` separada cuando la imagen sea opcional para una operación ya existente. Por ejemplo, `respond` puede seguir enviando JSON y `respond_image` puede apuntar a la **misma ruta externa** con `"image": true`:

```json
"respond_image": {"method": "POST", "path": "/requests/{id}/responses", "image": true}
```

El panel llama a `Notificapp.pickImage(requestId)`. Android abre el selector del sistema con filtro `image/*` y responde por `window.notificappReceive(requestId, raw)` con `{ "ok": true, "data": { "imageHandle": "..." } }`, o `{ "ok": false, "error": "Cancelado" }`. El identificador solo vale en el panel abierto; al elegir otra imagen, cerrarlo o recargarlo caduca. También se elimina tras una acción confirmada o cancelada. El HTML no recibe la ruta, bytes, URI ni una vista previa de la imagen. No lo guardes en la API del proyecto ni en el aviso. El selector requiere un gesto del usuario; el plugin no puede leer archivos por su cuenta.

Para enviar, llama a `Notificapp.request(JSON.stringify({requestId, action: "respond_image", id: "123", payload: {Estado: "aprobada"}, imageHandle}))`. La APK pide confirmación nativa y envía por HTTPS a `POST /v1/plugins/{pluginId}/actions/{action}/image` un formulario con `meta` (JSON con `id`, `payload`, `idempotencyKey`) e `image` (archivo). Este endpoint solo acepta acciones con `"image": true`; la ruta JSON ordinaria las rechaza. Notificapp comprueba el límite de **10 MiB** y la firma PNG, JPEG o WebP, y reenvía en una única petición `multipart/form-data` a la ruta HTTPS declarada: campo `payload` con el JSON del proyecto y campo `image` con el archivo. Añade la credencial externa y `Idempotency-Key` en el servidor. El nombre original del archivo no se reenvía. El backend del proyecto debe volver a validar contenido, tamaño y MIME, aplicar la escritura y la clave de idempotencia en su transacción y devolver JSON de hasta 256 KiB.

El panel puede reutilizar el mismo `requestId` para reintentar mientras siga abierto; Notificapp reutiliza entonces la clave de idempotencia de ese intento. Al cancelar el selector o la confirmación no se llama a la API. Si la conexión se corta después de enviar, el resultado puede ser incierto: consulta el estado vigente antes de otro intento y aplica idempotencia en la API del proyecto. Notificapp mantiene el URI elegido solo en memoria durante la vida del panel; el archivo recibido en el servidor usa almacenamiento temporal de la petición y no entra en el historial de avisos. El puente devuelve error si falta el permiso, el identificador caducó, el archivo es vacío o supera el límite, la firma no es válida o falla la conexión. Un cambio de tema que recargue el WebView también invalida el identificador.

## 5. Revisión inicial y actualizaciones

El propietario instala o revisa una versión con:

```powershell
.\.venv\Scripts\python.exe -m notificapp.plugin_cli install ruta\mi-proyecto.notificapp.zip
# Si el ID ya existía, como Libros o Fichas:
.\.venv\Scripts\python.exe -m notificapp.plugin_cli upgrade ruta\mi-proyecto.notificapp.zip
```

`install` guarda las credenciales iniciales de emisor y actualización en `.runtime/plugin-credentials/<id>.json`. `upgrade` conserva la credencial de emisor y apaga las actualizaciones remotas para volver a revisar los permisos. Al activar o regenerar desde la APK, **la credencial de actualización anterior deja de servir**, incluida la del JSON inicial. Si el panel necesita acciones externas, el propietario configura la credencial específica de tu API con `set-upstream-token <id> <archivo-privado>`.

**Libros y Fichas ya están registrados** en Notificapp. Libros tiene panel instalado; Fichas aún espera su primer ZIP. Deben conservar su identidad para mantener avisos y credenciales:

| API | `manifest.id` | Incluir en `eventKinds` | Versión actual |
| --- | --- | --- | --- |
| Libros | `libros-api` | `books_request` | `1.0.1`, panel instalado |
| Fichas | `fichas-api` | `sheets_request` | `0.0.0` |

Para la primera versión de Fichas y para cualquier revisión local posterior, el propietario usará `upgrade` con una versión superior a la instalada. No usar un ID nuevo ni solicitar otra credencial de avisos. El panel se descarga al abrirlo en la APK; no necesita recompilarla.

Solo después de aprobar una primera versión con panel, el propietario puede abrir **Menú → Espacios de API → tu proyecto → Activar actualizaciones** en la APK. **Esa acción registra la credencial en Notificapp; el agente de la API no tiene que llamar a una ruta de registro.** Notificapp genera una credencial nueva y la muestra una sola vez. En el servidor también queda en el archivo privado `.runtime/plugin-credentials/<id>-update.token`. El agente de un proyecto alojado allí debe copiarla a un archivo privado de su propio proyecto, por ejemplo `.runtime/notificapp-update.token`, sin imprimirla ni pegarla en conversaciones. Para proyectos en otro servidor, el propietario debe entregarla por un canal privado. Si se pierde, «Generar nueva credencial» invalida la anterior y el agente debe sustituir su copia privada. «Desactivar actualizaciones» revoca el permiso y la credencial; no publiques hasta que vuelva a activarse. Como alternativa administrativa desde el servidor existe:

```powershell
.\.venv\Scripts\python.exe -m notificapp.plugin_cli updates-on <id>
```

Ejemplo desde la raíz de **Libros API**, una vez que el propietario active Libros en la APK:

```powershell
New-Item -ItemType Directory -Force .runtime | Out-Null
Copy-Item -LiteralPath '..\notificapp\.runtime\plugin-credentials\libros-api-update.token' -Destination '.runtime\notificapp-update.token'
git check-ignore -v .runtime/notificapp-update.token
```

Si `git check-ignore` no confirma que el archivo está ignorado, añade `/.runtime/` al `.gitignore` raíz antes de continuar. No abras ni muestres el contenido para diagnosticarlo. El token de actualización es distinto del token **emisor** de avisos, de la credencial **externa** que Notificapp usa para llamar a tu API y del token de **agente** de Codex o Claude. Copiar el archivo al proyecto no modifica ninguno de esos otros canales.

Las actualizaciones entrantes se aceptan automáticamente solo si el plugin está activo, la credencial de actualización es correcta, la versión aumenta y `eventKinds`, `agents` y `api` no cambian. Pueden cambiar el nombre y el HTML. Cambiar permisos, incluido `"image": true`, dominio o rutas exige un nuevo `upgrade` local. Este `upgrade` conserva el ID, avisos y credencial de emisor, pero apaga las actualizaciones remotas; el propietario puede volver a activarlas en «Espacios de API» tras revisar el paquete. `updates-off <id>` revoca el permiso de publicación remota sin borrar el plugin. `disable <id>` revoca además la publicación de eventos, oculta su espacio y apaga las actualizaciones remotas; al reactivarlo habrá que habilitarlas de nuevo.

Para enviar una actualización desde el proyecto:

```powershell
python plugin-kit/publish.py --url https://notificapp-api.yosiftware.es --id mi.proyecto --token-file .runtime\notificapp-update.token mi-proyecto.notificapp.zip
```

En Libros, tras subir `manifest.version` por encima de la versión instalada, un ejemplo sería:

```powershell
python plugin-kit/pack.py --template notificapp-plugin --output .runtime/libros-api-update.notificapp.zip
python plugin-kit/publish.py --url https://notificapp-api.yosiftware.es --id libros-api --token-file .runtime/notificapp-update.token .runtime/libros-api-update.notificapp.zip
```

El token de actualización jamás debe ponerse en el ZIP o en Git. La APK obtiene el panel vigente al abrirlo; no requiere una nueva compilación para cambios compatibles del HTML. El agente del proyecto debe aumentar la versión del manifiesto antes de publicar cada actualización, empaquetar con `pack.py --template`, revisar que el ZIP solo contiene el manifiesto y el HTML, y ejecutar `publish.py` con el archivo privado. Un 200 confirma la versión instalada. Un 401 indica credencial antigua o incorrecta; un 403 indica permiso apagado o cambio de permisos; un 409 indica versión no creciente. Ante esos errores, no cambies el ID ni busques otra credencial de emisor: corrige la causa y reintenta.

`publish.py` usa `User-Agent: Notificapp-Publisher/1.0` para identificarse ante Cloudflare. Si la respuesta es JSON, muestra el rechazo de la API; si Cloudflare devuelve HTML, muestra el bloqueo por separado. No muestra el token ni la página HTML completa. Usa la URL HTTPS pública incluso cuando ambos proyectos compartan servidor; así compruebas el mismo recorrido que usarán otros equipos.

## 6. Qué entregar al propietario

- ZIP inicial y fuente de `ui/index.html`.
- URL HTTPS y descripción de las rutas declaradas.
- Cómo crear y revocar la credencial externa de tu API.
- Prueba de alta confirmada, reintento idempotente y respuesta con `Idempotency-Key`.
- Explicación de qué datos muestran y modifican las acciones `POST`.

La aprobación inicial y cualquier ampliación de permisos siguen siendo decisiones del propietario. El permiso de actualización remota es optativo y está apagado por defecto.
