# Project Working Notes

## Objetivo

Notas operativas vivas para los agentes (Codex y Claude Code) en este repositorio.

Este repositorio es `book-front`: la web Angular de una aplicación personal para gestionar lecturas de libros y la APK nativa en Kotlin (`android-nativa/`, Gradle propio; ver su `README`). La API que consume está documentada en `docs/backend/` (fuentes en `docs/backend/api/`, `docs/backend/realtime/` y `docs/backend/qa/`; `docs/backend/openapi.yaml` es el contrato estructurado). La APK de Capacitor se retiró en el corte de la adhesión (25/10/2026): la última publicada (`android-v1.0.21`) está en la etiqueta `apk-capacitor-final` (`4f1fecd`).

## Arquitectura

### Cuenta y sesión (plataforma Yosiftware)

- La web entra con la cuenta de Yosiftware. El SDK se carga de la página de acceso del entorno (`environment.plataforma.sdkUrl`).
- `PlatformSessionService` es el único servicio de sesión: estado del SDK, usuario local por `GET /usuarios/me`, generación por identidad y `storageScope` por entorno y cuenta.
- `PlatformTokenInterceptor` pone `yosiftware.token()`, repite una vez tras un 401 y descarta las respuestas de otra generación. `AccountScopeService` vacía los datos en memoria con cada cambio de identidad.
- No hay Firebase (Auth, Firestore, RTDB ni push web), sesión propia, CSRF, refresh, páginas de acceso ni `runtime-config` en el cliente. `sessionVersion` vigente: `2026-10-24-adhesion-yosiftware`.
- **Cambio de cuenta** (`ecosistema-kit/CAMBIO_DE_CUENTA.md`), verificado con `e2e/account-switch.spec.ts` (`@cambio-de-cuenta @smoke`) sobre el doble oficial del SDK. El trabajo sin enviar (capítulo y ficha de entidad) se aparta por entorno y cuenta con `PendingWorkService` (`libros:pendiente:<entorno>:<cuenta>:…`); solo lo recupera la misma cuenta y nunca se envía con el token de otra.

### Lo social es de la plataforma

- Chat: el de la plataforma con la interfaz de Libros (`services/platform/`: `PlatformApiService` para `/v1/…` con `yosiftware.tokenPlataforma()`, `PlatformChatService`, `PlatformRealtimeService` sobre `yosiftware.tiempoReal` y `ChatFloatingSettingsService` en `yosiftware.ajustes`, clave `chatFlotante`). El modelo de la plataforma se traduce en `shared/platform-chat.ts`.
- Cabeceras con `<yosi-webs>`, `<yosi-notificaciones>` y `<yosi-acceso>` (una sola campana por página). Perfil por `editarPerfil()`. Cuenta y seguridad con `<yosi-reportar>`, `<yosi-privacidad>` y «Tus datos». Comunidad = resumen, clubes y Mensajes; personas y relaciones, en la web social (con el símbolo).
- No hay chat, campana, push, tiempo real, normas, moderación de cuentas, perfiles sociales ni muro propios. De las capacidades de la API solo queda `clubes`. Las rutas antiguas (`/dashboard/community/people|friendships|blocks|users/:id`, `?section=policies|moderation|blocks`) llevan al resumen o a «Privacidad y normas».
- Clubes en los espacios: `PlatformSpacesService` (`/v1/espacios`), `ClubAccessService` (centro de acceso compuesto con los espacios), `ClubInvitationLinkService` (`#yosi-invitacion=` y `#yosi-invitaciones`; el SDK va con `data-invitaciones="propias"`) y `shared/club-spaces.ts` (errores, espera acotada del feed y `ClubChannelReconciler` para el canal del espacio). El chat del club es la conversación del espacio incrustada con `app-chat-conversation [floating]`.
- La administración es el plugin `libros` de la administración de la plataforma; `/adminpanel` lleva a la Biblioteca.
- Lo común de la plataforma: el reintento con token en `services/auth/token-request.ts`; la API de la plataforma, sus avatares y el error «sin sesión» en `shared/platform.ts`; una sola `PlataformaPersona` (`interfaces/platform-person.ts`); `escapeHtml` en `shared/html.ts`; las claves por cuenta con `accountStorageKey`; lo común de las e2e de la plataforma en `e2e/support/platform-fixtures.ts`.

### Presentaciones

- `web` (claro/oscuro, cualquier ancho), `wood` (escritorio, si el dispositivo la elige) y `mobile` (compacta y media, **solo en local** con la presentación Web apagada: `localStorage['book-front:web-presentation'] = 'off'`). Las reglas, en `docs/GUIA_ESTILOS.md`.

## Decisiones del propietario

- **Kit del ecosistema** (24/10/2026): se adopta siempre el más reciente (`ecosistema-kit/`, ignorado). Tenemos el 2026.11.6 (copiado el 27/11/2026), y el bloque de `AGENTS.md` está al día con él; el doble del SDK es el del kit 1.85 (`pruebas/yosiftware-doble/ORIGEN.md`) y la librería de la sesión de la APK, la del 1.83 (`android-nativa/yosiftware-sesion/ORIGEN.md`).
- **Producción o QA primero:** los bugs y mejoras de sistemas que ya existen se trabajan sobre la versión productiva y van a producción tras sus comprobaciones; QA no es parada obligatoria. Las funcionalidades o sistemas nuevos se validan primero en QA y pasan a producción tras su aceptación. Si una petición mezcla ambos, se separa el arreglo de la funcionalidad nueva.
- **Autoguardado sin pérdidas** (25/10/2026, el propietario perdió media escena al cerrar del todo la APK): lo escrito debe sobrevivir a cerrar la app del todo. El capítulo y la ficha de entidad apartan su borrador 0,4 s después de cada cambio y, al ocultarse la página, lo apartan y lo envían al momento.
- **«Ver ediciones»** (1/10/2026): solo si la persona posee más de una edición (`hasMultipleOwnedEditions`), en las tres presentaciones; el resto, desde el Catálogo.
- Bootstrap queda congelado como legado. No extender sus clases, utilidades ni patrones a temas, shells o componentes nuevos; las librerías externas de CSS o animación solo se incorporan tras justificar valor, coste, accesibilidad, peso y convivencia con Angular Material.
- Reutilizar y extraer Sass siempre que exista un patrón repetido o varios consumidores inmediatos, preferentemente con tokens, funciones y mixins sin emisión accidental. La reutilización no restringe diseños nuevos: una solución específica puede quedarse local hasta que exista una abstracción estable, y nunca se deforma una pantalla para encajarla en una primitive previa.

## Normas de trabajo

- Si el usuario propone una directiva, un cambio o una solución y hay indicios fundados de que empeora el estado actual, introduce riesgos innecesarios o existe una alternativa claramente mejor, hay que señalarlo y proponer la alternativa antes de ejecutar.
- Este repositorio no contiene la API backend aunque existan documentos de endpoints.
- `docs/backend/**` es una copia de solo lectura. Solo se sincroniza desde un commit backend identificado y con igualdad exacta de contenido; cualquier cambio contractual se pide al backend fuera de esa carpeta.
- **Peticiones al backend:** un Markdown en `docs/peticiones/` dirigido al Codex del backend, con qué se necesita, por qué y qué se espera lograr. El backend decide si la atiende y cómo; el frontend se adapta a su respuesta y no presupone el contrato. Estados y archivo de las respondidas: `docs/peticiones/README.md`. Una petición se entrega una sola vez; un alcance nuevo requiere otra.
- En código, nombres de variables, funciones, clases, rutas internas y comentarios técnicos evitan tildes y eñes. En textos visibles, mensajes, labels y documentación de producto en español, siempre con tildes y eñes.
- Con cambios incompatibles en la web o en la API, incrementar `environment.sessionVersion`: `PlatformSessionService` retira entonces lo que dejaron las versiones anteriores.
- **Puerta visual obligatoria:** antes de cualquier cambio visual o de Sass, releer `docs/GUIA_ESTILOS.md` completa, aunque siga en contexto, y revisar los tokens, mixins, primitives y patrones de la presentación afectada antes de crear reglas nuevas. La guía es la fuente de verdad visual.
- `docs/roadmaps/common/SASS_REUSE_AUDIT.md` registra familias repetidas, prioridades y excepciones. Consultarla junto a la guía antes de tocar Sass y actualizarla cuando se extraiga o descarte un patrón relevante.

## Convención de roadmaps y pruebas

- Cada vertical vive en `docs/roadmaps/<vertical>/`, con `roadmap.md` (dirección, deuda, líneas activas y referencias útiles) y `bugs.md` (bugs aislados, packs pequeños, ajustes visuales, copy/UX menor y mejoras acotadas de una superficie). Son documentos vivos permanentes, no «activos».
- Un roadmap dedicado solo se abre cuando el trabajo afecta a varias pantallas o subsistemas, dura varias sesiones, cambia contratos o integraciones o necesita fases y cierre propios. Se llama `ROADMAP_ACTIVO_<slug>.md`, `ROADMAP_PAUSADO_<slug>.md` o `ROADMAP_FINALIZADO_<slug>.md`, dentro de su vertical; su checklist de pruebas, `docs/pruebas/<vertical>/[pendiente|pausado|finalizado][slug].md`.
- Solo puede haber un `ROADMAP_ACTIVO_` en todo el repo. Si un trabajo urgente cambia el foco con pendientes en el activo, primero se pausa de forma explícita.
- Cada ítem de un roadmap dedicado es una casilla con `Descripción`, `Por qué se necesita`, `Qué se espera lograr`, `Peligros si se mantiene como estaba` y `Peligros del cambio`. Se marca al completarlo, no al cierre.
- Antes de empezar trabajo nuevo en código, comprobar que `roadmap.md`, `bugs.md` y el roadmap activo representan el estado real. Si el foco cambia o se abre o cierra una iniciativa, actualizar primero la vertical y el índice `docs/roadmaps/README.md`. Lo menor va a `bugs.md`; `roadmap.md` solo cambia si cambia la dirección o la deuda.
- Al terminar un cambio y pasar sus verificaciones, actualizar en la misma sesión `bugs.md` y el roadmap afectado.
- Estado de los roadmaps: en el índice `docs/roadmaps/README.md`.

## Revisores del kit

- **Duplicados** (`.claude/agents/revisor-de-duplicados.md`):
  - 24/10/2026, auditoría completa del frontend, base `5dc3120`, y 25/10/2026, `corregir` sobre lo nuevo de la adhesión (`478fc8e..33989c0`): «Quedan duplicados»; sus 11 propuestas se cerraron en `docs/roadmaps/common/ROADMAP_FINALIZADO_duplicados-frontend.md`.
  - 26/10/2026, auditoría completa de la APK Kotlin (solo `android-nativa/app/`), base `6826083`: «Quedan duplicados»; propuestas en `docs/roadmaps/ecosistema/ROADMAP_PAUSADO_duplicados-apk-kotlin.md`. Los cambios de interfaz 8 a 11 de esa ronda solo se compilaron: falta verlos en un móvil.
- **Documentación** (`.claude/agents/revisor-de-documentacion.md`): lo pide el contador `py -3 ecosistema-kit/herramientas/revision_de_documentacion.py`.
  - 25/11/2026, auditoría completa, base `9bae7418`, unida en `a9936a9d`: «Quedan propuestas»; resueltas el 26/11/2026.

## Convención operativa de tests Karma

- En este servidor, Karma necesita `CHROME_BIN` apuntando al Chromium de Playwright (`%LOCALAPPDATA%\ms-playwright\chromium-1228\chrome-win64\chrome.exe`) y el Node fijado de `.tools/`. En CI y aquí: `npm run test:ci` con `CI=true` y `NG_BUILD_MAX_WORKERS=2`.
- Una vez lanzado Chrome o `ChromeHeadless`, no esperar más de 1 minuto al resultado de Karma (la compilación previa no cuenta). Si pasa el minuto sin salida, inspeccionar el proceso y el launcher; no asumir éxito sin código de salida.
- `npm run test:ci` debe terminar por sí mismo, publicar cobertura y no dejar Chrome ni Node huérfanos. Una repetición completa en caliente tarda unos 13 segundos.
- Suelo global de cobertura: 28 % statements, 21 % ramas, 23 % funciones y 30 % líneas.
- `qs` sigue fijado a `6.16.0` con `overrides`: Karma depende de `body-parser@1.20.6`, cuyo rango aún excluye la primera versión corregida de `qs`. Retirar el override cuando una actualización de Karma o body-parser lo haga innecesario, no antes.
- La auditoría npm de la campaña manual completa reintenta solo errores transitorios del endpoint (tres intentos de 60 segundos); una vulnerabilidad real falla en el primer intento. Si el servicio sigue caído, el gate deja una advertencia y solo prosigue tras comprobar en `node_modules` la resolución segura de `qs` fijada por el lockfile.

## Comandos útiles

- Instalar dependencias: `npm install` (en un worktree, su propio `node_modules` con `npm ci`, no la unión con la copia principal).
- Servidor local: `npm start`. Web de desarrollo contra la plataforma de QA: `npm run start:dev-plataforma` (abajo).
- Build: `npm run build`; QA: `npm run build:qa`.
- Tests: `npm test` (en CI y en este servidor, `npm run test:ci`, ver Karma).
- Cambio de cuenta (local, doble del SDK): `npx playwright test e2e/account-switch.spec.ts --project=chromium --workers=1` (o `--grep @cambio-de-cuenta`).
- APK: la Kotlin de `android-nativa/` (Gradle con `--max-workers=2` y `gradlew --stop` al terminar).
- Gate QA local: `npm run qa:ci`.
- Campaña real aislada: `npm run qa:integration` dentro de una lease, con `node scripts/qa/run-local-campaign.mjs --env-file "..\Libros API\qa\.env" -- npm run qa:integration`. `product-surfaces.integration` prueba lo publicado sin sesión (las sesiones son de la plataforma). Cada noche la lanza el servidor (tarea «Libros QA nocturna», 03:30, `scripts/qa/nocturna-servidor.ps1`; registros en `.runtime/qa-nocturna/` y aviso por Notificapp si falla). Desde GitHub no se puede: Cloudflare desafía al runner (`cf-mitigated=challenge`), y `qa-nightly.yml` solo ejecuta `qa:ci` y `qa:browsers`. En las campañas, el semáforo protegido `GET /qa/status` se consume desde Node.
- Fixtures RTF/RichEdit en Windows: `npm run qa:rtf:fixtures`. Corpus RTF local de solo lectura: `npm run qa:rtf:corpus`.
- Referencias visuales Linux (las compara la campaña nocturna) desde Windows con Docker Desktop: `npx ng build --configuration development`, servir `dist/book-front/browser` con `node scripts/qa/serve-static.mjs --root dist/book-front/browser --host 0.0.0.0 --port 4400` y ejecutar Playwright en `mcr.microsoft.com/playwright:v<versión de @playwright/test>-noble` con el repo montado, `PLAYWRIGHT_SKIP_WEBSERVER=true` y `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4200`. Dentro del contenedor hace falta un proxy TCP de `127.0.0.1:4200` a `host.docker.internal:4400`: la fixture solo instala el doble del SDK cuando la URL base es `localhost`/`127.0.0.1`. Regenerar solo las referencias revisadas (`--update-snapshots` sobre el test concreto) y pasar después toda la suite `@visual`.
- La integración de Codex en Visual Studio no expone `node_repl` por un bug conocido y, por tanto, tampoco controla el navegador integrado. Mientras persista, usar Playwright del repositorio; no es una preferencia arquitectónica: volver a evaluarlo cuando el ejecutor esté disponible.

## Web de desarrollo contra la plataforma de QA

`localhost` no sirve para entrar: la sesión de Yosiftware es una cookie del mismo sitio y el acceso solo se deja incrustar desde `https://*.yosiftware.es` (`ecosistema-kit/MIGRACION.md`, paso 7).

- `npm run start:dev-plataforma` sirve la configuración `dev-plataforma` de `angular.json` en `https://libros.dev.yosiftware.es` (`127.0.0.15:443`, el DNS ya apunta ahí): `environment.dev-plataforma.ts` usa el SDK de QA (`https://qa-cuentas.yosiftware.es/sdk/v1/yosiftware.js`) y la API por `/api/`, que `proxy.dev-plataforma.json` lleva a la API de QA de Libros (`http://127.0.0.1:5101`), del mismo origen y sin CORS. El servidor manda la CSP de QA y COOP `same-origin-allow-popups`.
- El certificado comodín `*.dev.yosiftware.es` es del servidor y no entra en el repositorio. `scripts/dev/serve-dev-plataforma.mjs` lee sus rutas de `LIBROS_DEV_CERT` y `LIBROS_DEV_KEY` o de `.runtime/dev-plataforma.json` (ignorado): `{ "certificado": "C:/Users/Yosi/yosiftware-cuentas/certificados-desarrollo/certificates/_.dev.yosiftware.es.crt", "clave": "…/_.dev.yosiftware.es.key" }`.
- Se abre siempre por el nombre, nunca por la IP. En Windows el puerto 443 no pide administrador. Para pararlo, Ctrl+C en su terminal (si se lanzó en segundo plano, cerrar también el `ng serve` hijo).
- La cuenta del propietario en QA está enlazada al usuario 1 de `libros_qa`; una cuenta nueva empieza vacía.

## Playwright en este servidor

- Playwright 1.62.1 pide Chromium 1234: está su `chromium_headless_shell-1234`, así que las pasadas sin cabeza de `--project=chromium` arrancan; con cabeza, solo está el Chromium 1228, y hace falta una configuración temporal e ignorada (`.runtime/`) con `launchOptions.executablePath` a él.
- Playwright local: `.runtime/playwright.local.config.ts` (ignorado) con `LOCAL_PROJECT=chromium|compact-390` y el artefacto de `ng build --configuration development`.
- Las pruebas locales usan el doble oficial del SDK (`pruebas/yosiftware-doble/`, guía en `ecosistema-kit/PRUEBAS.md`): Karma lo importa con `crearDobleYosiftware` y Playwright lo sirve con `e2e/support/yosiftware-doble.ts`. No pinta los elementos del SDK (`<yosi-acceso>`… son etiquetas vacías) ni comunica las pestañas.
- El evento `request` de Playwright llega a la prueba con un retraso variable. Para comprobar el orden de las peticiones frente a un cambio de cuenta, se registran dentro de la página, con su cuenta y su tramo, como hace `e2e/account-switch.spec.ts` (lección de la revocación que fallaba a ratos, 25/10/2026).

## CSP

La CSP vive en `firebase.json` (producción; QA la deriva con `scripts/qa/prepare-hosting-config.mjs`, que solo cambia los orígenes) y en `angular.json`, cabeceras de `serve` › `dev-plataforma` (la de QA). No hay `<meta>` de CSP en `index.html`; el `<iframe srcdoc>` del título divertido lleva la suya (solo estilos en línea y la carpeta `assets/fonts/` de la web), que se suma a la heredada.

- `script-src` va **sin `'unsafe-inline'`** (revisión de la plataforma en `docs/peticiones/respondidas/ACEPTADA_migrar-libros-a-la-plataforma.md`): un HTML inyectado no ejecuta nada. Por eso `production` y `qa` llevan `optimization.styles.inlineCritical: false` (el CSS crítico se cargaba con un `onload="this.media='all'"` en línea, que la CSP bloquearía y dejaría la web sin estilos), y el tema previo a Angular está en `src/tema-inicial.js` (asset en la raíz, en el grupo `app-shell` del service worker y con `Cache-Control: no-cache` en Hosting), no en un `<script>` en línea.
- No metas scripts ni manejadores en línea (`<script>` sin `src`, `on…=`, `javascript:`) en `index.html`: `final-contracts.test.mjs` lo comprueba en la fuente y `scripts/qa/verify-pwa-artifact.mjs`, en el `dist` (forma parte de `qa:ci`, que corre antes de desplegar producción).
- El SDK de la plataforma y `s.js` de Yosiftadísticas no inyectan scripts en línea (`ecosistema-kit/ACCESO.md`, «Cabeceras de la web»).
- `style-src` es `'self' 'unsafe-inline'` (los estilos de componentes de Angular van en `<style>` y el título divertido los necesita) y `font-src`, `'self' data:`: sin Google Fonts ni CDN, porque las tipografías son de la propia web (`docs/GUIA_ESTILOS.md`, «Tipografías»). `final-contracts.test.mjs` lo comprueba y `e2e/own-fonts.spec.ts` mira que la web y la ficha de un libro no pidan nada a esos orígenes.
- El marco del título divertido tiene un origen opaco (`sandbox=""`) y pide sus fuentes con CORS: Hosting sirve `/assets/fonts/**` con `Access-Control-Allow-Origin: *`, y lo mismo hacen `scripts/qa/serve-static.mjs` y `ng serve` (configuraciones `development` y `dev-plataforma`, en este caso para todo lo que sirve). Sin esa cabecera, la cabecera pinta con las fuentes del sistema y la consola avisa del bloqueo.

## Entornos y credenciales

- La web se publica en Firebase Hosting. Versiones de la cadena: Angular 22.1 con Node 24.15.0 (`.node-version`); la matriz y los puntos de retorno de la migración, en `docs/roadmaps/common/ANGULAR_22_COMPATIBILITY.md`.
- El GitHub Environment `qa` contiene `QA_API_BASE_URL` y los cinco secretos compartidos con el host QA. Sus valores se copiaron directamente desde el entorno cargado en el servidor y nunca pasan por archivos ni logs del frontend.
- En el Honor, la captura por adb se pide por display: la pantalla interior es `4630946846403687043` (`android-nativa/README.md`); con el móvil plegado, el display 0 sale negro y se usó `4630946324137792644` (1/10/2026, con la APK de Capacitor).
- Para probar la APK sin conexión en el Honor no se usa el modo avión, que corta el ADB por wifi: se le quita la red solo a la app (`adb shell cmd connectivity set-package-networking-enabled false <paquete>`, y `true` para devolvérsela). Ese bloqueo propio también cuenta como sin red (`EstadoDeRed`, `onBlockedStatusChanged`, 27/11/2026).
