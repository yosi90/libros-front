# Spike Android — Hito 5

> Estado: en progreso desde el 27 de agosto de 2026. La estructura y la APK QA compilan; el shell, contraseña, Google nativo y su cancelación, teléfono ficticio, la restauración y revocación de sesión, Firebase canónico/realtime y la entrega push real han pasado en el móvil físico del propietario. Solo permanece abierta la verificación automática de App Links.

## Resultado técnico actual

- Capacitor `8.5.0` se integra sobre la aplicación Angular existente, sin Ionic ni React.
- `@capacitor-firebase/authentication` `8.4.0` es compatible con Capacitor 8 y Firebase Web 12 y queda limitado a contraseña, Google y teléfono.
- Android usa `minSdk 24`, `compileSdk/targetSdk 36` y dos flavors:
  - `qa`: `es.yosiftware.libros.qa`;
  - `production`: `es.yosiftware.libros`.
- `native-mobile` continúa decidido por `PresentationModeService`, por lo que Android nunca habilita administración aunque su ventana supere 1050 px.
- `NativeFirebaseAuthAdapter` obtiene ID tokens efímeros mediante el SDK nativo y contempla Google Credential Manager, contraseña, teléfono y custom token canónico.
- `NativeSessionTransportAdapter` prueba el intercambio, restauración CSRF, refresh y logout mediante `CapacitorHttp`. Nunca lee `libros_refresh` con `CapacitorCookies`: la cookie debe permanecer opaca dentro del cookie jar nativo y CSRF solo vive en memoria.
- El proyecto nativo desactiva Android Backup. APK/AAB, `google-services.json`, keystores, configuración local y assets web copiados quedan ignorados.

## Evidencia reproducible

- Build Angular QA: verde.
- `cap sync android`: verde y detecta el plugin Firebase.
- Configuración Gradle: verde; existen variantes `qaDebug`, `qaRelease`, `productionDebug` y `productionRelease`.
- Suite unitaria completa: 287 pruebas verdes, incluidas autenticación/sesión nativas, cancelación de Credential Manager, teléfono, limpieza push y filtrado de App Links.
- Android Studio, Java 21, SDK 35/36, build-tools 36, platform-tools y command-line tools oficiales están instalados. `ANDROID_HOME` y `JAVA_HOME` quedan configurados para el usuario y `android/local.properties` enlaza el SDK sin entrar en Git.
- `assembleQaDebug`: verde. Produce localmente `android/app/build/outputs/apk/qa/debug/app-qa-debug.apk`; el artefacto está ignorado y todavía no constituye una APK distribuible.
- Los launcher icons Android y los iconos instalables PWA se generan reproduciblemente desde `src/favicon.ico` mediante `scripts/android/generate-launcher-icons.ps1`. Android usa densidades legacy y adaptive icon con zona segura y fondo pergamino; la APK actualizada quedó instalada en el dispositivo físico.
- La APK QA se instaló y abrió mediante depuración inalámbrica en un Honor Magic V3 con Android 16. La WebView terminó de renderizar Angular, expuso un viewport desplegado de `718x748` CSS px con DPR 3 y `PresentationModeService` seleccionó `native-mobile`. La feature flag Mobile continúa desactivada, por lo que todavía se muestra Wood de forma deliberada hasta H6-H12.
- `scripts/qa/native-webview-smoke.mjs` permite adjuntar Playwright por CDP a la WebView, comprobar DOM/modo/viewport y registrar fallos HTTP mediante origen y ruta, sin cabeceras, cookies, query strings ni cuerpos sensibles.
- El primer smoke detectó `530` en `/runtime-config` y `/auth/session/csrf`. La misma respuesta se reprodujo desde el PC y Cloudflare publicó `error code: 1033`, por lo que correspondía al stack QA detenido. Tras levantarlo, `runtime-config` cargó y el smoke quedó sin errores; el `401` de CSRF se clasifica como observación esperada en una instalación sin sesión.
- Firebase Android QA quedó registrado con el package y las huellas debug correctas. La configuración descargada se valida fuera de Git y se instala únicamente en `android/app/src/qa/google-services.json`; `processQaDebugGoogleServices` y `assembleQaDebug` pasan. Backend corrigió la guía para usar el ejecutable Firebase CLI versionado y el source set exclusivo de QA; la petición quedó aceptada en `docs/peticiones/respondidas/ACEPTADA_corregir-descarga-y-ubicacion-google-services-android.md`.
- El primer recorrido Google físico confirmó usuario Firebase nativo e ID token válidos, pero Credential Manager perdió el callback al volver a la WebView. `NativeFirebaseAuthAdapter` ahora reanuda un usuario ya autenticado y observa `authStateChange`, sin persistir tokens en JavaScript. La repetición alcanzó `POST /auth/session`, recibió `onboarding_required` y navegó a `/onboarding` con la política QA.
- El propietario completó el onboarding y aceptó la política. Antes de reiniciar, `/dashboard/books` conservaba usuario nativo, emitía un ID token y obtenía CSRF con HTTP 200. Tras forzar el cierre completo del proceso y relanzar la APK, se conservaron la ruta y el usuario, se renovó el ID token y `GET /auth/session/csrf` volvió a responder 200. Esto valida el cookie jar opaco y la restauración de sesión sin exponer el refresh.
- `scripts/qa/native-canonical-session-smoke.mjs` recarga la WebView y consume eventos QA sin datos sensibles. En el Honor acreditó recepción del custom token con UID esperado, autenticación de la instancia canónica, publicación de presencia, conexión a Realtime Database y socket Firebase abierto. Los eventos solo contienen etapas, booleanos y códigos de error; nunca UID, tokens ni rutas privadas de datos.
- El propietario completó el login telefónico nativo con el número y código ficticios QA sin compartirlos ni provocar un SMS real. La lectura posterior acreditó `/dashboard/books`, usuario Firebase nativo, ID token renovable, CSRF HTTP 200, custom token con UID canónico válido, presencia publicada/conectada y socket Realtime Database abierto, sin errores Firebase.
- Los plugins oficiales `@capacitor/app` `8.1.1` y `@capacitor/push-notifications` `8.1.2` quedan integrados. Push usa FCM nativo en Android, registra la plataforma `android` en la API y conserva el flujo Service Worker solo para web. Los listeners nunca escriben el token en consola y publican únicamente etapas QA sanitizadas.
- Los puentes de autenticación nativa tienen regresión focalizada para contraseña, Google, teléfono y uso fuera de Capacitor. El reto telefónico dispone de timeout propio y siempre retira listeners aunque Android falle durante su registro; login reconoce tanto los códigos de cancelación web como la cancelación textual de Credential Manager y libera el loader.
- El smoke físico completó permiso, alta push inicial y re-registro tras relanzar. Backend corrigió y documentó `PUT /notificaciones/preferencias` para aceptar la matriz completa de forma transaccional e idempotente; la petición quedó aceptada en `docs/peticiones/respondidas/ACEPTADA_corregir-guardado-preferencias-notificaciones-qa.md`. El propietario repitió después el recorrido en la APK QA y confirmó que el guardado funciona correctamente. El cliente limita el registro a 15 segundos, refleja el dispositivo activo y conserva la interfaz recuperable.
- Backend habilitó en `docs/backend/qa/SMOKES_MANUALES_ANDROID.md` los dos recorridos que requieren secretos custodiados. El propietario completó el login positivo por contraseña Firebase en la APK, que alcanzó la misma sesión SQL/canónica, y confirmó físicamente la recepción en segundo plano de una notificación FCM real emitida por `libros-qa`. La coordinación no expuso contraseña, token, cookie, JWT ni identificadores sensibles y backend restauró después `baseline`. La petición queda aceptada en `docs/peticiones/respondidas/ACEPTADA_habilitar-smokes-manuales-password-y-push-android-qa.md`.
- `scripts/qa/native-session-revocation-smoke.mjs` revocó la sesión Android actual desde Cuenta y seguridad y acreditó retorno a `/home`, Firebase nativo sin usuario, CSRF 401, ausencia de JWT/refresh legacy y limpieza de `push-device:*` de 1 a 0. La primera pasada descubrió un residuo histórico perteneciente a otra identidad del spike; el logout completo elimina ahora todo el namespace local antes de completar la revocación remota, sin intentar revocar dispositivos ajenos.
- QA y producción declaran intent filters separados para `/verify-email` y `/reset-password`. Un intent QA dirigido al paquete abrió correctamente `/reset-password` en Angular. El Hosting QA todavía publica `/.well-known/assetlinks.json` vacío, por lo que la verificación automática del dominio queda pendiente del siguiente despliegue QA; el build QA ya contiene la asociación de package/firma debug y el build productivo no la contiene.
- La validación principal se realiza en el Android físico del propietario. No se adopta un emulador como requisito del proyecto.

## Puerta pendiente

Desplegar el Hosting QA que ya contiene la asociación de package/firma, verificar que `/.well-known/assetlinks.json` deja de responder `[]`, forzar la comprobación del dominio Android y repetir los enlaces de verificación/reset sin dirigirlos explícitamente al paquete. La consulta del 28 de agosto de 2026 confirma que el Hosting público aún sirve `[]`; no es un bloqueo de backend ni invalida los smokes de autenticación y push ya superados.

La firma debug permite probar el spike sin adelantar la custodia de la clave release. Antes de distribuir o registrar producción se creará una clave estable fuera del repositorio, se conservará una copia offline y se registrarán sus SHA-1/SHA-256 para `es.yosiftware.libros`; esa puerta sigue perteneciendo a H13/H14.

Si el cookie jar nativo no restaura la cookie host-only `SameSite=Strict`, se detendrá solo Android y se redactará una petición backend para un transporte nativo seguro. No se cambiará la cookie web, no se añadirá `SameSite=None` y no se guardará el refresh en JavaScript.

## Comandos

```powershell
npm run build:native:qa
.\android\gradlew.bat -p android assembleQaDebug
.\android\gradlew.bat -p android installQaDebug
```

La prueba productiva y la firma release pertenecen a H13/H14; H5 solo puede declarar viable la arquitectura después del recorrido QA anterior.
