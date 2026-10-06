# Medición anónima de audiencia (Yosiftadísticas)

Guía para el front web de `https://libros.yosiftware.es`. Yosiftadísticas cuenta de forma anónima cuántas personas entran en la web y cuánto tiempo permanecen; el propietario recibe los informes en Notificapp. El script, el colector y la anonimización pertenecen a Yosiftadísticas. La web solo carga el script y marca los dispositivos del propietario. La API no envía nada a Yosiftadísticas.

## Estado

| Parte | Estado |
| --- | --- |
| API: `ExcluirMedicionAudiencia` | Implementado en local; pendiente de publicación en QA y producción |
| Colector `https://estadisticas.yosiftware.es/health` | En construcción. **No publiquéis el script en producción hasta que responda `200`** |
| Front: script y marca | Pendiente del front |

Esta tabla se actualizará al publicar la API y cuando el colector esté disponible.

## 1. Cargar el script

Añadid al `<head>` del `index.html`:

```html
<script defer src="https://estadisticas.yosiftware.es/s.js"></script>
```

- Puede ir en el `index.html` de todos los entornos. El script no envía nada en QA (`qa-libros.yosiftware.es`), `localhost`, `*.web.app`, `*.firebaseapp.com` ni en la WebView de la APK Android.
- Cargadlo siempre desde el colector: no lo copiéis, no lo empaquetéis y no le añadáis atributos ni configuración.
- No añadáis eventos propios ni le paséis datos: rutas, usuario, IDs o cualquier otro dato de Libros. La aplicación de una sola página cuenta una visita por carga, aunque se navegue por varias rutas.
- Si se añade un service worker, no debe cachear `s.js` ni interceptar los `POST` a `https://estadisticas.yosiftware.es/v1/e`.
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

## 3. Verificación después de publicar

Cuando `/health` responda `200` y la web esté publicada en producción:

1. En una ventana privada, sin sesión y fuera de la red de casa del propietario (por ejemplo, con datos móviles), abrid la web. Deben aparecer peticiones a `/v1/e` con respuesta `204` y un latido cada 15 segundos mientras haya actividad.
2. Iniciad sesión con una cuenta del propietario: `localStorage["yosiftadisticas:excluir"]` debe valer `"1"` y deben cesar las peticiones.
3. Recargad: no debe haber ninguna petición a `/v1/e`.
4. Comprobad que ninguna petición a `/v1/e` contiene la URL, el usuario ni otros datos de la web.

Comunicad el resultado al backend para cerrar la petición de Yosiftadísticas.

## Fuera de alcance

- Analítica de rutas, funcionalidades o eventos propios.
- Medir la APK Android.
- La mención en la política de privacidad queda pendiente de decisión del propietario.
