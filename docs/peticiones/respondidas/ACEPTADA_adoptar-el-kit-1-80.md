# Petición de la plataforma Yosiftware: cerrar lo que se abre y las cuentas con el correo sin confirmar (kit 1.80)

Fecha: 2026-11-05
Solicitante: la plataforma Yosiftware (`administracion yosiftware`), por decisión del propietario
Afecta a: el `AGENTS.md` de cada proyecto; y, según lo que tenga cada uno, su web (SDK 1.32) o su APK (librería de la sesión 1.9.0)
Estado: entregada el 2026-11-05, con lo de la plataforma ya en QA y producción (`d76d187`: SDK 1.32, librería 1.9.0, app Yosiftware 0.4.0 y la política de privacidad 14)

## Contexto

El kit 1.80 (`ecosistema-kit/README.md`) trae dos cosas que decidió el propietario el 5 de noviembre de 2026.

1. **Cerrar lo que se abre.** Sus palabras: «cuando terminen de usar una herramienta cualquiera, ya sea un emulador (evitar siempre si hay algún móvil en adb), un navegador, un cmd o lo que sea, que lo cierren». Es para todos los proyectos, con o sin web o APK.
2. **Crear una cuenta con correo ya no exige confirmar el correo** (a petición de Rol):
   - la persona entra al momento, y la plataforma se lo recuerda al entrar y, como mínimo, una vez al día;
   - a los 7 días sin confirmarlo, la cuenta se borra;
   - **mientras no lo confirma, no puede usar nada social**, para que no entren bots: amistades, seguir, chat, publicar, comentar y «me gusta», espacios y denuncias responden `403 correo_sin_confirmar`.

   Guía: `docs/publica/ACCESO_E_IDENTIDAD.md`, «El correo sin confirmar».

## Qué necesitamos

1. **Todos los proyectos: la línea nueva en el `AGENTS.md`.** Copiad la línea «Cierra lo que abras» de `ecosistema-kit/BLOQUE_AGENTS.md` en el apartado de la plataforma de vuestro `AGENTS.md`, y seguidla desde ya:
   - al terminar de usar una herramienta, cerradla: un emulador, un navegador (también el de Playwright o una depuración remota), una consola (cmd, PowerShell, bash), un servidor de desarrollo o un proceso de Gradle o de Node que hayáis dejado en marcha;
   - **nunca un emulador si hay un móvil conectado por adb** (`adb devices`); si no queda otra, apagadlo al terminar (`adb emu kill`);
   - cerrad solo lo que hayáis abierto vosotros: lo que ya estaba abierto (del propietario o de otro agente) no se toca.

   Si vuestro proyecto no copia el bloque de la plataforma (Notificapp, Yosiftadísticas, la plantilla de proyectos), poned la regla en vuestras instrucciones de trabajo con esas mismas palabras.
2. **Si vuestro `AGENTS.md` tiene la línea «Si el proyecto tiene APK, se publica en Google Play»**, cambiadla por la nueva del bloque: el aviso «Gratis, por ahora» sigue obligatorio, y Google Play está en pausa desde el kit 1.79.
3. **Si tenéis web con el SDK:** el SDK 1.32 lo hace todo solo. Abre la página de acceso con el código cuando toca recordarlo (se cierra con «Ahora no») y ofrece confirmar el correo cuando lo social de la plataforma responde `correo_sin_confirmar`. Si vuestra web tiene **partes sociales propias** (un chat, comentarios o mensajes entre personas que no pasan por la plataforma), limitadlas igual mientras `cuenta.correoVerificado` sea `false` y ofreced `yosiftware.confirmarCorreo()`. Si no las tiene, no hay nada que hacer.
4. **Si tenéis APK nativa:** pasad a la librería de la sesión 1.9.0 (`ecosistema-kit/APK.md`, «La librería 1.9.0»). Es obligatoria si vuestra app crea cuentas con correo (la 1.8.0); para las demás, recomendada.
   - Cuando `ConSesion.recordarCorreo` sea `true`, enseñad un aviso que se pueda cerrar: el correo, la fecha límite, que hasta confirmarlo no hay parte social, el código de 6 cifras, «Enviar otro código» y «Ahora no». Llamad a `correoRecordado()`.
   - Ante un `403 correo_sin_confirmar`, abrid directamente ese aviso del código, que ya explica que sin confirmarlo no hay parte social. No metáis la frase en una barra inferior con botón: queda apretada.
   - Si la app tiene partes sociales propias, limitadlas igual con `cuenta.correoVerificado`.
   - La app Yosiftware 0.4.0 es el ejemplo (`apps/social-android`, `ui/pantallas/CorreoSinConfirmar.kt`).
5. **La cookie común de la medición** (petición de Yosiftadísticas): si vuestra política de privacidad copia el apartado «Medición de audiencia» en vez de remitir a la de la plataforma, sustituidlo por el de la versión 2 de `estadisticas-kit/POLITICA_DE_COOKIES.md`, tal cual. Comprobad que ni vuestra web ni vuestra API leen, guardan o registran la cookie `yosiftadisticas_ultima`, tampoco en registros que guarden la cabecera `Cookie` completa. Si alguno la registra, decídselo a Yosiftadísticas.
6. **Todos los que guardan datos por cuenta:** una cuenta borrada a los 7 días llega como cualquier otra baja (`CAMBIO_DE_CUENTA.md`): `cuenta.estado` `cerrada` y, en la hora siguiente, `borrada`. Si ya tratáis las bajas, no hay nada nuevo.

## Calendario y dependencias

Sin fecha. El punto 1 es inmediato y no depende de nada. Los demás están disponibles en QA y producción desde la publicación de esta versión.

## Fuera de alcance

- Google Play (en pausa desde el kit 1.79).
- Las cuentas que entran con Google: su correo ya viene confirmado.

## Estado de respuesta

**Aceptada** (2026-11-05). Libros adopta el kit 1.80, copiado con `git archive` en `front/ecosistema-kit/` y `Libros API/ecosistema-kit/` (los dos, ignorados por Git).

1. **«Cierra lo que abras»:** copiada en el apartado de la plataforma de los dos `AGENTS.md` (frontend y backend), junto con las otras dos líneas nuevas del bloque desde la 1.65 (los servicios en el servidor y el aviso de gratuidad).
2. **La línea de Google Play:** Libros no la tenía; entra directamente la nueva del aviso «Gratis, por ahora».
3. **Web con el SDK 1.32:** la web carga el SDK de la página de acceso, así que el recordatorio y el `correo_sin_confirmar` de lo social de la plataforma (chat y clubes) ya los hace el SDK. **Partes sociales propias:** las reseñas públicas y denunciarlas. Con `cuenta.correoVerificado === false`, la web pide `yosiftware.confirmarCorreo()` antes de guardar una reseña con texto o enviar una denuncia, y no llama a la API si no se confirma (`front/src/app/shared/email-gate.ts`).
4. **APK nativa:** pasa a la librería de la sesión 1.9.0, copiada sin cambios (`android-nativa/yosiftware-sesion/`). Con `ConSesion.recordarCorreo` la app abre una hoja que se puede cerrar: el correo, el plazo, que hasta confirmarlo no hay chat, clubes ni reseñas, las 6 cifras, «Enviar otro código» y «Ahora no»; llama a `correoRecordado()`. Un `403 correo_sin_confirmar` de la plataforma abre esa misma hoja (no hay barra inferior). Las reseñas y las denuncias se limitan igual con `cuenta.correoVerificado`. La app no crea cuentas con correo (sigue en el navegador).
5. **La cookie común de la medición:** la política de Libros no copia «Medición de audiencia» (remite a la de la plataforma), y ni la web ni la API leen, guardan o registran la cabecera `Cookie`. Nada que cambiar.
6. **Bajas a los 7 días:** Libros ya trata `cerrada` y `borrada` por el feed de cambios. Nada nuevo.

Pruebas: API (unittest de peticiones, plugins y notificaciones), web (Karma 694/694 y `ng build`), APK (357 pruebas JVM y `assembleQaDebug`; las de la propia librería no arrancan en este servidor por `ClassNotFoundException` del ejecutor de pruebas, y la copia es idéntica a la del kit). Aviso de gratuidad y menú comprobados en el Honor con la variante de QA.
