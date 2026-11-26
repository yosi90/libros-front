# Medición anónima de audiencia (Yosiftadísticas)

Guía para el front web de `https://libros.yosiftware.es`. Yosiftadísticas cuenta de forma anónima cuántas personas entran en la web y cuánto tiempo permanecen; el propietario recibe los informes en Notificapp. El script, el colector y la anonimización pertenecen a Yosiftadísticas. La web solo carga el script, y la marca de los dispositivos del propietario la pone el SDK de la plataforma (decisión 13 de la petición de migración). La API no interviene ni envía nada a Yosiftadísticas. Integración cerrada el 2026-10-07; mantened las condiciones de la sección 1 en cambios futuros de `index.html`, CSP o service workers.

## 1. Cargar el script

Añadid al `<head>` del `index.html`:

```html
<script defer src="https://estadisticas.yosiftware.es/s.js"></script>
```

- Puede ir en el `index.html` de todos los entornos web. El script no envía nada en QA (`qa-libros.yosiftware.es`), `localhost`, `*.web.app` ni `*.firebaseapp.com`.
- **La APK no se mide**: no se le inyecta el script.
- Cargadlo siempre desde el colector: no lo copiéis, no lo empaquetéis y no le añadáis atributos ni configuración.
- No añadáis eventos propios ni le paséis datos: rutas, usuario, IDs o cualquier otro dato de Libros. La aplicación de una sola página cuenta una visita por carga, aunque se navegue por varias rutas.
- Los service workers de la web no deben cachear `s.js` ni interceptar los `POST` a `https://estadisticas.yosiftware.es/v1/e`.
- Si se restringe la CSP, `script-src` y `connect-src` deben admitir `https://estadisticas.yosiftware.es`.

## 2. Los dispositivos del propietario

La marca es `localStorage["yosiftadisticas:excluir"] = "1"`, y la pone el SDK de la plataforma con la cuenta del propietario (`ecosistema-kit/ACCESO.md`).

- **No se borra al cerrar sesión**: la marca pertenece al dispositivo, no a la sesión.
- No depende de que el script haya cargado: el script lee la marca antes de cada envío.
- El propietario también puede marcar un dispositivo a mano abriendo cualquier página con `?yt-ignorar` y desmarcarlo con `?yt-incluir`.
- **Primera carga sin marca**: el script abre la visita al cargar la página, antes de que la web restaure la sesión, así que en un dispositivo del propietario sin marca esa primera carga puede contarse una vez. No se retrasa el envío, porque se perderían visitas cortas en todas las webs medidas. Desde la red de casa no se cuenta nada (el colector descarta esa IP), así que solo pasa fuera de casa, una vez por dispositivo y navegador. Se evita abriendo una vez `https://libros.yosiftware.es/?yt-ignorar` en cada navegador que el propietario use fuera de casa.

## 3. Qué guarda y qué recibe la medición

Datos del diseño de Yosiftadísticas (2026-10-06). Las normas de uso los recogen para la mención de privacidad.

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

## 4. Comprobar tras un cambio de `index.html`, CSP o service workers

1. En una ventana privada, sin sesión y fuera de la red de casa del propietario, abrir la web: debe haber peticiones a `/v1/e` con `204` y un latido cada 15 segundos mientras haya actividad.
2. Con una cuenta del propietario, `localStorage["yosiftadisticas:excluir"]` vale `"1"` y no hay peticiones a `/v1/e`, tampoco al recargar.
3. Ninguna petición a `/v1/e` contiene la URL, el usuario ni otros datos de la web, y ningún service worker sirve `s.js` desde caché ni intercepta esos `POST`.

## Fuera de alcance

- Analítica de rutas, funcionalidades o eventos propios.
- Medir la APK.
