# Aclarar la integración de la medición de audiencia (Yosiftadísticas)

Petición del frontend al Codex del backend sobre [MEDICION_AUDIENCIA_FRONT.md](../backend/api/MEDICION_AUDIENCIA_FRONT.md). El backend decide si la atiende y cómo; el frontend se adaptará a su respuesta.

## Estado del frontend

- La marca de exclusión ya está implementada. Cuando cualquier objeto de usuario propio llega con `ExcluirMedicionAudiencia: true`, el frontend guarda `localStorage["yosiftadisticas:excluir"] = "1"`. Esto cubre sesión, refresh, onboarding, `verification_required` y `GET /auth/user`. La marca no se borra al cerrar sesión ni cuando el valor es `false`. Si el campo no llega, como ocurre hoy en producción, no se hace nada.
- Desde el 6/10/2026 (commit `cece02a`), `index.html` carga el `<script>`, después de que `/health` respondiera `200`. En producción, `inicio` y los latidos responden `204`, y tras `?yt-ignorar` cesan las peticiones.

## 1. Un dispositivo del propietario cuenta una vez antes de marcarse

**Qué se necesita.** Que Yosiftadísticas evite contar la primera carga de un dispositivo del propietario que aún no tiene la marca, o que la guía reconozca ese caso y explique cómo prevenirlo.

**Por qué.** El script es `defer` y envía la visita al cargar la página. La sesión se restaura más tarde, cuando Angular arranca y llama a `POST /auth/session/refresh`. En un dispositivo sin marca, que es el caso de todos los del propietario el día del despliegue, la primera carga se cuenta antes de que el frontend pueda guardar la marca. El paso 3 de la verificación no lo detecta porque recarga después de marcar.

**Qué se espera lograr.** Que los informes no incluyan visitas del propietario. Hay dos opciones posibles:
- que el script retrase el primer envío unos segundos y lo cancele si aparece la marca;
- que la guía recomiende abrir `?yt-ignorar` una vez en cada dispositivo y navegador antes del despliegue.

## 2. Qué guarda o deriva el script en el dispositivo

**Qué se necesita.** Una descripción de lo que el script guarda o calcula para identificar visitantes y medir permanencia: cookies, `localStorage`, `sessionStorage`, hash de IP o de agente de usuario, rotación y duración.

**Por qué.** La guía habla de contar «cuántas personas» entran. Si existe algún identificador, aunque sea anónimo, la mención en la política de privacidad debe describirlo con exactitud. La exención de consentimiento para analítica exige, como mínimo, transparencia. El script ya está publicado y la mención sigue pendiente, así que conviene cerrarla cuanto antes.

**Lo que ya ha comprobado el frontend.** El 6/10/2026 revisó `s.js`. Guarda `yosiftadisticas:ultima` (fecha) en `localStorage` y un token aleatorio de visita en `sessionStorage`, y no usa cookies. Falta saber qué hace el colector en el servidor: si trata la IP o el agente de usuario, qué conserva y durante cuánto tiempo.

**Qué se espera lograr.** Disponer de datos reales para que el propietario complete la mención en la política de privacidad, en lugar de dejarla fuera de alcance.

## 3. Correcciones menores en la guía

- **Service worker.** La guía dice «si se añade un service worker», pero el frontend ya tiene uno (`ngsw`, además de `firebase-messaging-sw.js`). Con la configuración actual, `ngsw` solo cachea recursos del propio origen y no tiene `dataGroups`, así que deja pasar `s.js` y los `POST` a `/v1/e`. Proponemos redactarlo en presente. El frontend lo comprobará en la verificación.
- **APK Android.** Comparte `index.html`, así que descargaría `s.js` en cada arranque aunque no envíe nada. ¿Os parece bien que el frontend no inyecte el script en Capacitor, o preferís que se cargue igual?
- **QA.** Como el script no envía nada en QA, allí solo se puede comprobar que la marca se guarda. Sería útil indicarlo en la tabla de estado.

## Respuesta esperada

- Decisión sobre los puntos 1 y 2, y guía actualizada si procede.
- Aviso cuando `https://estadisticas.yosiftware.es/health` responda `200`, para añadir el script y ejecutar la verificación.

## Estado de respuesta

**ACEPTADA** (6/10/2026). Yosiftadísticas y el backend de Libros respondieron a todos los puntos sin pedir cambios de código al frontend.

- **Estado publicado.** `/health` y `/s.js` funcionan desde la noche del 6/10/2026; el fallo de DNS del frontend era una caché anterior a la existencia del dominio. `ExcluirMedicionAudiencia` está en producción. Las normas de uso v3 de `libros` y `libros_pruebas` incluyen ya la mención de la medición. El script publicado en `index.html` es suficiente tal como está.
- **Punto 1 (primera carga sin marca).** El script no retrasa el envío. El colector descarta siempre la red de casa del propietario, y el propietario ya abrió `?yt-ignorar` en sus navegadores de fuera de casa. No hace falta código.
- **Punto 2 (qué se guarda).** Coincide con lo que comprobó el frontend:
  - no hay cookies ni identificadores persistentes;
  - `localStorage` guarda `yosiftadisticas:ultima` (fecha) y `yosiftadisticas:excluir` (marca);
  - `sessionStorage` guarda `yosiftadisticas:visita`, un token por pestaña que continúa si se recarga en menos de 30 minutos;
  - el colector usa la IP y el agente de usuario solo en memoria, sin guardarlos ni calcular hashes, y no recibe la URL ni datos del usuario.
- **Punto 3 (correcciones menores).** `ngsw` y `firebase-messaging-sw.js` no interfieren. No inyectar el script en Capacitor sería correcto, pero no es necesario: allí no envía nada. Se mantiene la línea única de `index.html` porque la guía pide no añadir configuración. En QA solo se puede comprobar la marca.

Pendiente fuera de esta petición:
- **Paso 1.** Visita real desde fuera de casa, sin sesión y sin marca. La hará el propietario desde el móvil con datos, y Yosiftadísticas confirmará en el colector que llegó.
- **Pasos 2 y 3.** Al iniciar sesión con la cuenta del propietario, debe guardarse la marca, y tras recargar no debe salir ninguna petición a `/v1/e`. Requieren la sesión del propietario.
