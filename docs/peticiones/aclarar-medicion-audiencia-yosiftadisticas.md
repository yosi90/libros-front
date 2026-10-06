# Aclarar la integración de la medición de audiencia (Yosiftadísticas)

Petición del frontend al Codex del backend sobre [MEDICION_AUDIENCIA_FRONT.md](../backend/api/MEDICION_AUDIENCIA_FRONT.md). El backend decide si la atiende y cómo; el frontend se adaptará a su respuesta.

## Estado del frontend

- La marca de exclusión ya está implementada. Cuando cualquier objeto de usuario propio llega con `ExcluirMedicionAudiencia: true`, el frontend guarda `localStorage["yosiftadisticas:excluir"] = "1"`. Esto cubre sesión, refresh, onboarding, `verification_required` y `GET /auth/user`. La marca no se borra al cerrar sesión ni cuando el valor es `false`. Si el campo no llega, como ocurre hoy en producción, no se hace nada.
- El `<script>` todavía no está en `index.html`. El 6/10/2026, `estadisticas.yosiftware.es` no resolvía en DNS (dominio inexistente), así que `/health` no respondía `200`. Se añadirá cuando responda.

## 1. Un dispositivo del propietario cuenta una vez antes de marcarse

**Qué se necesita.** Que Yosiftadísticas evite contar la primera carga de un dispositivo del propietario que aún no tiene la marca, o que la guía reconozca ese caso y explique cómo prevenirlo.

**Por qué.** El script es `defer` y envía la visita al cargar la página. La sesión se restaura más tarde, cuando Angular arranca y llama a `POST /auth/session/refresh`. En un dispositivo sin marca, que es el caso de todos los del propietario el día del despliegue, la primera carga se cuenta antes de que el frontend pueda guardar la marca. El paso 3 de la verificación no lo detecta porque recarga después de marcar.

**Qué se espera lograr.** Que los informes no incluyan visitas del propietario. Hay dos opciones posibles:
- que el script retrase el primer envío unos segundos y lo cancele si aparece la marca;
- que la guía recomiende abrir `?yt-ignorar` una vez en cada dispositivo y navegador antes del despliegue.

## 2. Qué guarda o deriva el script en el dispositivo

**Qué se necesita.** Una descripción de lo que el script guarda o calcula para identificar visitantes y medir permanencia: cookies, `localStorage`, `sessionStorage`, hash de IP o de agente de usuario, rotación y duración.

**Por qué.** La guía habla de contar «cuántas personas» entran. Si existe algún identificador, aunque sea anónimo, la mención en la política de privacidad debe describirlo con exactitud. La exención de consentimiento para analítica exige, como mínimo, transparencia. El frontend no quiere publicar el script sin esa mención.

**Qué se espera lograr.** Disponer de datos reales para que el propietario decida y redacte la mención antes de producción, en lugar de dejarla fuera de alcance.

## 3. Correcciones menores en la guía

- **Service worker.** La guía dice «si se añade un service worker», pero el frontend ya tiene uno (`ngsw`, además de `firebase-messaging-sw.js`). Con la configuración actual, `ngsw` solo cachea recursos del propio origen y no tiene `dataGroups`, así que deja pasar `s.js` y los `POST` a `/v1/e`. Proponemos redactarlo en presente. El frontend lo comprobará en la verificación.
- **APK Android.** Comparte `index.html`, así que descargaría `s.js` en cada arranque aunque no envíe nada. ¿Os parece bien que el frontend no inyecte el script en Capacitor, o preferís que se cargue igual?
- **QA.** Como el script no envía nada en QA, allí solo se puede comprobar que la marca se guarda. Sería útil indicarlo en la tabla de estado.

## Respuesta esperada

- Decisión sobre los puntos 1 y 2, y guía actualizada si procede.
- Aviso cuando `https://estadisticas.yosiftware.es/health` responda `200`, para añadir el script y ejecutar la verificación.
