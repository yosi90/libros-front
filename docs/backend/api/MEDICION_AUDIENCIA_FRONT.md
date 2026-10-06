# Medición anónima de audiencia (Yosiftadísticas)

Guía para el front web de `https://libros.yosiftware.es`. Yosiftadísticas cuenta de forma anónima cuántas personas entran en la web y cuánto tiempo permanecen; el propietario recibe los informes en Notificapp. El script, el colector y la anonimización pertenecen a Yosiftadísticas. La web solo carga el script y marca los dispositivos del propietario. La API no envía nada a Yosiftadísticas.

## Estado

| Parte | Estado |
| --- | --- |
| API: `ExcluirMedicionAudiencia` | Publicado en QA y producción (`cccc9621be102751953774573f532003c2c484a7`, 2026-10-06). En QA siempre vale `false` |
| Normas de uso v2 con la sección de medición | Publicadas en producción el 2026-10-06; requieren nueva aceptación |
| Normas de uso v3 | Publicadas el 2026-10-06 en producción como versión 3 de `uso`. Precisan el token de visita, la IP y el user-agent según la sección 3. Requieren nueva aceptación con el flujo existente, sin cambios de contrato |
| Colector `https://estadisticas.yosiftware.es/health` | Disponible: el 2026-10-06 por la noche respondió `200` `{"estado":"ok"}` y `s.js` se sirve como `application/javascript`. Si vuestro DNS aún no resuelve el dominio, esperad a que se propague |
| Front: marca de exclusión | Implementada por el front |
| Front: script | **Listo para publicar en producción.** Las normas de uso v3 ya están activas. Ejecutad después la verificación de la sección 4 y comunicad el resultado |
| QA | El script no envía nada en `qa-libros.yosiftware.es` y `ExcluirMedicionAudiencia` siempre vale `false`. En QA solo se comprueba que el script carga sin errores; la marca y los envíos se verifican en producción |

Esta tabla se actualizará cuando el colector esté disponible.

## 1. Cargar el script

Añadid al `<head>` del `index.html`:

```html
<script defer src="https://estadisticas.yosiftware.es/s.js"></script>
```

- Puede ir en el `index.html` de todos los entornos web. El script no envía nada en QA (`qa-libros.yosiftware.es`), `localhost`, `*.web.app` ni `*.firebaseapp.com`.
- **No lo inyectéis en la APK (Capacitor).** La APK no se mide y así no descarga `s.js` en cada arranque.
- Cargadlo siempre desde el colector: no lo copiéis, no lo empaquetéis y no le añadáis atributos ni configuración.
- No añadáis eventos propios ni le paséis datos: rutas, usuario, IDs o cualquier otro dato de Libros. La aplicación de una sola página cuenta una visita por carga, aunque se navegue por varias rutas.
- Los service workers de la web (`ngsw` y `firebase-messaging-sw.js`) no deben cachear `s.js` ni interceptar los `POST` a `https://estadisticas.yosiftware.es/v1/e`. Con la configuración actual, `ngsw` solo cachea recursos del propio origen y no tiene `dataGroups`, así que no les afecta. Mantenedlo así y comprobadlo en la verificación.
- La CSP actual permite `script-src` y `connect-src` `https:`. Si se restringe, debe admitir `https://estadisticas.yosiftware.es`.

## 2. Marcar los dispositivos del propietario

Todo objeto de usuario propio incluye un booleano nuevo:

```json
"Usuario": {
  "Id": 1,
  "...": "...",
  "ExcluirMedicionAudiencia": true
}
```

Llega en `Usuario` de `POST /auth/session`, `POST /auth/session/refresh`, onboarding y `verification_required`, y en `user` de `GET /auth/user` y `PUT /auth/update`. Solo es `true` para las cuentas del propietario configuradas de forma privada en el servidor. La lista de cuentas no se expone.

Cuando el valor sea `true`, al iniciar sesión o al restaurarla con refresh, guardad la marca:

```javascript
try { localStorage.setItem("yosiftadisticas:excluir", "1"); } catch {}
```

- **No la borréis al cerrar sesión** ni cuando el valor sea `false`: la marca pertenece al dispositivo, no a la sesión.
- No depende de que el script haya cargado: el script lee la marca antes de cada envío.
- El propietario también puede marcar un dispositivo a mano abriendo cualquier página con `?yt-ignorar` y desmarcarlo con `?yt-incluir`. No hace falta código para esto.

### Primera carga de un dispositivo del propietario sin marca

El script abre la visita al cargar la página, antes de que Angular restaure la sesión. En un dispositivo del propietario que aún no tiene la marca, esa primera carga puede contarse una sola vez. Las cargas posteriores ya no se cuentan.

- No se retrasará el envío: Yosiftadísticas abre la visita al cargar para no perder visitas cortas, y retrasarlo afectaría a todas las webs medidas.
- Desde la red de casa no se cuenta nada, porque el colector descarta esa IP con o sin marca. El caso solo ocurre fuera de casa, por ejemplo con datos móviles, una vez por dispositivo y navegador.
- Prevención: antes de publicar el script, el propietario abrirá una vez `https://libros.yosiftware.es/?yt-ignorar` en cada navegador que use fuera de casa. Esta indicación es para el propietario y no requiere código del front.

## 3. Qué guarda y qué recibe la medición

Datos del diseño de Yosiftadísticas (2026-10-06). Las normas de uso v3 los recogen para la mención de privacidad.

| Dónde | Dato | Duración | Para qué |
| --- | --- | --- | --- |
| `localStorage["yosiftadisticas:ultima"]` | Fecha `AAAA-MM-DD` (calendario de Madrid) de la última visita a esta web | Hasta que el navegador la borre | Indicar si la visita es la primera del día, de la semana o del mes. El colector solo suma esos indicadores |
| `sessionStorage["yosiftadisticas:visita"]` | Token aleatorio de la visita y hora de la última actividad | Se borra al cerrar la pestaña; una recarga en menos de 30 minutos continúa la visita | Agrupar los latidos de una misma visita para medir su duración |
| `localStorage["yosiftadisticas:excluir"]` | `"1"` | Solo en dispositivos del propietario | No enviar nada |
| Cookies | Ninguna | — | — |

- **Envíos:** apertura, latido cada 15 segundos con la pestaña visible y actividad en los últimos 5 minutos, y cierre. Cada envío lleva el token de la visita, los tres indicadores y el tiempo visible acumulado. No incluye URL, ruta, título, referer, idioma, pantalla, cuenta ni datos de Libros.
- **IP y user-agent:** el colector los recibe con cualquier petición web, como cualquier servidor. Los usa solo en memoria, durante la petición, para descartar la red del propietario, bots y abusos. No se guardan, no se registran y no se calcula ningún hash con ellos.
- **Identificadores:** no hay ninguno persistente. El token de visita es aleatorio, dura una pestaña y no permite relacionar dos visitas. Ningún dato permite relacionar visitas de días distintos.
- **Retención:** las visitas brutas se conservan hasta agregar el día. Después solo quedan agregados diarios por web, sin terceros ni cruce con otros tratamientos.

## 4. Verificación después de publicar

Cuando `/health` responda `200`, las normas de uso v3 estén publicadas y la web esté en producción:

0. Antes de publicar, el propietario abre `?yt-ignorar` una vez en los navegadores que use fuera de casa (ver «Primera carga de un dispositivo del propietario sin marca»).
1. En una ventana privada, sin sesión y fuera de la red de casa del propietario (por ejemplo, con datos móviles), abrid la web. Deben aparecer peticiones a `/v1/e` con respuesta `204` y un latido cada 15 segundos mientras haya actividad.
2. Iniciad sesión con una cuenta del propietario: `localStorage["yosiftadisticas:excluir"]` debe valer `"1"` y deben cesar las peticiones.
3. Recargad: no debe haber ninguna petición a `/v1/e`.
4. Comprobad que ninguna petición a `/v1/e` contiene la URL, el usuario ni otros datos de la web.
5. Comprobad que ni `ngsw` ni `firebase-messaging-sw.js` sirven `s.js` desde caché ni interceptan los `POST` a `/v1/e`.

Comunicad el resultado al backend para cerrar la petición de Yosiftadísticas.

## Fuera de alcance

- Analítica de rutas, funcionalidades o eventos propios.
- Medir la APK Android. El script no se inyecta en Capacitor.
- No hay cambios de contrato en las políticas: las normas de uso v2 y v3 incluyen la sección «Medición anónima de audiencia» y se aceptan con el flujo de versiones ya existente (`GET`/`POST` de la política `uso` activa).
