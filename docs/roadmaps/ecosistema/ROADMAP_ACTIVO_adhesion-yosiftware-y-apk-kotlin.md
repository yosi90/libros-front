# Adhesión a Yosiftware (web) y APK nativa en Kotlin

Estado: ACTIVO
Abierto: 2026-10-24, a petición del propietario.
Roadmap maestro (orden global y backend): `../Libros API/docs/roadmaps/ACTIVO_adhesion-yosiftware/ROADMAP_ACTIVO_adhesion_yosiftware.md`. Las fases citadas como «fase N» son las de ese documento.
Checklist de pruebas: `docs/pruebas/ecosistema/[pendiente][adhesion-yosiftware-y-apk-kotlin].md`.
Kit del ecosistema: `ecosistema-kit/` (1.53, ignorado por Git). Fuente vigente: `C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit\`.

## Decisiones del propietario (2026-10-24)

1. Se adopta siempre el kit más reciente (hoy 1.53: SDK 1.22.0 y librería de la sesión 1.7.0), no el que cite cada petición.
2. El corte en producción sale en cuanto la API y la web estén listas. La APK de Capacitor queda sin soporte desde ese momento.
3. La APK Kotlin es un **clon exacto** de la actual en todo lo propio de Libros y **nace adherida**: lo que la adhesión retira (inicio de sesión propio, chat, notificaciones, amistades y bloqueos, moderación de cuentas) no se clona, se hace con la plataforma. Las mejoras llegan cuando el clon esté terminado.
4. Auditoría completa de duplicados del frontend al principio (hito 1). La de la app solo sobre `android-nativa/`, cuando el clon esté terminado (hito 14); nunca sobre `android/` (Capacitor).
5. Los clubes pasan a los espacios en esta misma migración.
6. **El chat es el de la plataforma, dibujado por Libros** (2026-10-24): las conversaciones, los mensajes y el tiempo real son los de la plataforma (`ecosistema-kit/CHAT.md`, rutas `/v1/chat/…` y su tiempo real), pero la interfaz la pinta Libros para que quede exactamente igual que la de ahora, en la web y en la APK Kotlin. Antecedente: el chat flotante de Rol (`Fichas 3.5/docs/roadmaps/FINALIZADO_chat-flotante-de-rol/`), que recuperó sus ventanas sobre el chat de la plataforma.
7. Permiso para publicar en producción cuando el agente lo considere necesario, con las comprobaciones del repositorio.

Decisión del agente, anotada para que el propietario la corrija si no le encaja: la APK Kotlin vive en este repositorio, en `android-nativa/`, junto a la de Capacitor (`android/`) mientras dure el clon. Así reutiliza el flujo de firma y publicación de GitHub Actions (`android-release-manual.yml`) y la misma clave, y puede instalarse encima de la actual con el mismo paquete.

## Punto de partida (inventario del 2026-10-24, solo lectura)

- **Dónde está cada cosa.** Cada ruta carga un container compartido de `src/app/components/shared` o `pages` con toda la lógica (formularios, autoguardado, API, stores) y delega el aspecto en `components/mobile/*` cuando la presentación es `native-mobile` (Capacitor siempre). El clon toma la **lógica de los containers** (unas 22.700 líneas de TS) y el **aspecto de `components/mobile`** (30 componentes, unas 11.900 líneas) y de `src/assets/css/mobile` (`_tokens.sass`, `_primitives.sass`). Algunos modales que ve Mobile están en el HTML de los containers: la petición de catálogo, `collection-state-modal` y `catalog-saga-sheet`.
- **Lo que hay que portar**, a grandes rasgos: unas 13.000 líneas de presentación Mobile, entre 14.000 y 16.000 de lógica alcanzable, 9.000 de servicios y 7.000 de modelos y helpers.
- **Posible código muerto** (se confirma antes de portar nada): `object-manager` y `mobile-object-manager-view`, `add-*`, `update-*` y `book-pages/character` (unas 4.150 líneas sin ruta), `FirebasePrivateStateService` y `NativeFirebaseAuthAdapter.signInCanonical`.
- **Lo difícil de portar**:
  - El editor RTF (`narrative-rtf-editor`, `shared/rtf/rtf-text.ts`): `contenteditable`, conversión RTF↔HTML compatible con RichEdit y enlaces a entidades.
  - ApexCharts en las estadísticas del libro y el Markdown con `innerHTML`.
  - Los gestos hechos a mano: hojas, el cajón del índice, los toasts y deslizar para descartar.
  - El botón Atrás guiado por el DOM y el teclado.
  - La actualización del bundle por Service Worker, que en nativo desaparece: cada cambio será una APK nueva.
- **Integraciones nativas actuales**: `@capacitor-firebase/authentication`, push con `ChatMessagingService` propio, App Links (`/verify-email`, `/reset-password`), red, navegador, barra de estado, teclado, cámara y galería para el avatar, el plugin `AppPermissions` y el cliente OkHttp con preferencia IPv4. Las actualizaciones de la APK se buscan en GitHub (`android-vX.Y.Z` con `.sha256`).

## Hitos

Cada hito lleva sus casillas. Se marcan durante la sesión, no al cerrar.

### Hito 0. Preparación

- **Descripción:** kit 1.53 en `ecosistema-kit/`, bloque de la plataforma en `AGENTS.md`, revisor de duplicados instalado en `.claude/agents/`, congelación anotada, este roadmap y su checklist.
- **Por qué se necesita:** el kit y el bloque son el primer paso de `MIGRACION.md`. El revisor es una norma del ecosistema (kit 1.51).
- **Qué se espera lograr:** que cualquier sesión, de Claude o de Codex, sepa qué es de la plataforma y qué no antes de tocar nada.
- **Peligros si se mantiene como estaba:** el riesgo es implementar en local lo que ya da la plataforma y seguir ampliando áreas congeladas.
- **Peligros del cambio:** ninguno funcional; solo documentación y archivos ignorados.

- [x] Kit 1.53 copiado e ignorado (`git check-ignore` comprobado).
- [x] Bloque de `BLOQUE_AGENTS.md` en `AGENTS.md`, con la adaptación de rutas.
- [x] Roadmap, checklist e índice de `docs/roadmaps/README.md`.
- [x] Revisor instalado en `.claude/agents/revisor-de-duplicados.md` y rellenado.
- [x] Preparación versionada: `5dc3120`, subida.
- [x] Congelación (2026-10-07) y aclaración (2026-10-09) anotadas en `docs/codex/PROJECT_WORKING_NOTES.md`.

### Hito 1. Auditoría completa de duplicados del frontend (fase 1)

- **Descripción:** el revisor en modo `completo` sobre la web y la presentación Mobile, en la rama `revisor/auditoria-completa-frontend-AAAA-MM-DD`, después de unir la del backend. Quedan fuera `android/` y las áreas que se retiran: autenticación, chat, notificaciones, relaciones sociales y moderación de cuentas.
- **Por qué se necesita:** el clon Kotlin copia la lógica de los containers. Si se clona con duplicados, se duplican también en Kotlin.
- **Qué se espera lograr:** containers y helpers sin repeticiones y código muerto confirmado. Con eso el clon parte de un frontend limpio.
- **Peligros si se mantiene como estaba:** el riesgo es portar dos o tres veces la misma lógica (formatos, estados de carga, filas de lista) y el código muerto.
- **Peligros del cambio:** el riesgo es alterar un comportamiento al unificar. Por eso solo se aplica lo seguro, con un commit por cambio, `npm run test:ci`, typecheck y Playwright de lo tocado; lo grande queda como propuesta en `bugs.md`.

- [x] Rama, base, commits, propuestas y cifras de pruebas; rama unida (2026-10-24). Base `5dc3120`, rama `revisor/auditoria-completa-frontend-2026-10-24`, 18 commits (120 archivos, +2.151 y −10.154 líneas): unos 6.900 de código muerto retirados y 14 duplicados unificados (ficha pública de Catálogo y Perfil en `PublicDetailHost`, modal Wood de la ficha, editor de estado en `shared/collection-state.ts`, `foldText`, fecha de publicación parcial, grupos de personajes, lógica repetida de vistas Mobile y Web llevada a los containers). Verificado al unir: Karma 666/666 (660 en la base), build con los mismos avisos de presupuesto, typecheck de e2e y `git diff --check`; Playwright en Chromium de las pantallas tocadas, 31 correctas y 3 capturas Wood que fallan igual en la base (el servidor tiene los navegadores de Playwright 1228 y el paquete pide 1234). Dos arreglos de comportamiento, anotados: la ficha ya no reenvía el estado si solo cambia la reseña o la puntuación (duplicaba el histórico) y el Perfil enseña el icono correcto de «Quiero leer» y «Descartado». Propuestas en `common/ROADMAP_PAUSADO_duplicados-frontend.md`.
- [x] Código muerto del inventario confirmado y retirado (o justificado). Rama `revisor/auditoria-completa-frontend-2026-10-24`: retirados `add-*`, `update-*`, `book-pages/character`, `mobile-object-manager-view` y la parte inalcanzable de `object-manager` (que sigue vivo como listado del Perfil); `FirebasePrivateStateService` y `NativeFirebaseAuthAdapter.signInCanonical` confirmados sin uso y anotados, sin retirar, en `common/ROADMAP_PAUSADO_duplicados-frontend.md`.
- [x] Veredicto anotado en `docs/codex/PROJECT_WORKING_NOTES.md`.

### Hito 2. Web: entrar con la cuenta de Yosiftware

- **Descripción:**
  - Se retiran Firebase Authentication y las pantallas propias: login, registro, recuperación, reset, verificación y onboarding. También `SessionService` y su CSRF y refresh, y el transporte nativo.
  - Se carga el SDK del entorno con `<yosi-acceso>` y su panel de cuentas.
  - Las llamadas a la API pasan a usar `yosiftware.token()` o `yosiftware.fetch()`.
  - CSP del kit, y la web de desarrollo en `https://libros.dev.yosiftware.es` contra la plataforma de QA (`MIGRACION.md`, paso 7).
  - Se incrementa `sessionVersion`.
- **Por qué se necesita:** es el núcleo de la adhesión. La API deja de aceptar los tokens de Firebase de Libros en el corte.
- **Qué se espera lograr:** entrar, salir y cambiar de cuenta sin salir de la web, y que una sesión de otra web del ecosistema se reconozca.
- **Peligros si se mantiene como estaba:** tras el corte, nadie podría entrar.
- **Peligros del cambio:** es una rotura total del acceso si la API de QA no está migrada a la vez (se coordina con la fase 2). `localhost` no sirve para probar: hace falta el nombre de desarrollo.

- [ ] Dependencias: API de QA con los tokens de la plataforma (fase 2) y la dirección `127.0.0.N` de la petición de migración.
- [ ] Firebase Auth y las pantallas propias, retirados; rutas públicas reconducidas.
- [ ] SDK, `<yosi-acceso>` (panel de cuentas) y token de la plataforma en los interceptores.
- [ ] CSP del kit y Yosiftadísticas: marca de propietario del SDK; retirada `ExcluirMedicionAudiencia`.
- [ ] Servidor de desarrollo HTTPS en `libros.dev.yosiftware.es` con el certificado del servidor (ruta en configuración privada).

### Hito 3. Web: lo social con la plataforma

- **Descripción:**
  - En la cabecera, `<yosi-webs>` y `<yosi-notificaciones>`, con `--yosi-avisos-arriba`.
  - El chat de la plataforma con la interfaz actual de Libros (decisión 6): la página de mensajes, la conversación y las ventanas flotantes se conservan y pasan a leer y escribir en `/v1/chat/…` con el tiempo real de la plataforma.
  - El perfil con `<yosi-perfil>`, más `<yosi-privacidad>` y `<yosi-reportar>`.
  - Enlaces a la web social con el símbolo del ecosistema.
  - Se retiran la campana y el centro propios, las preferencias de notificaciones y chat, las amistades, los bloqueos, los perfiles sociales y la moderación de cuentas.
  - Los clubes con los espacios: invitar, aceptar, pedir entrar y `#yosi-invitacion`.
  - «Tus datos» y `restricciones`.
- **Por qué se necesita:** lo exige la lista de comprobación del kit, y la API retira esas rutas (fases 3 y 4).
- **Qué se espera lograr:** una web que solo conserva lo propio de Libros y usa la plataforma para todo lo demás.
- **Peligros si se mantiene como estaba:** las pantallas llamarían a rutas retiradas y habría avisos y chats duplicados.
- **Peligros del cambio:** es mucho código que se retira. Hay que cuidar las rutas del shell, los enlaces internos (`notification-navigation`) y las pruebas de Playwright que dependen de ellas.

- [ ] `<yosi-webs>`, `<yosi-notificaciones>` y el símbolo en los enlaces a Social.
- [ ] Chat de la plataforma con la interfaz actual (decisión 6); retirados el chat, la RTDB de escritura y el realtime de chat propios.
- [ ] Perfil, privacidad, reportar y «Tus datos»; retiradas las pantallas de cuenta, seguridad y moderación propias.
- [ ] Clubes con espacios (fase 4): invitaciones, solicitudes y conversación del club.
- [ ] `restricciones` y `normasPendientes`: la creación bloqueada se explica, con su fecha.
- [ ] Preferencias por cuenta en `yosiftware.ajustes` (tema en el navegador).

### Hito 4. Web: limpieza al cambiar de cuenta, QA y corte

- **Descripción:**
  - Se cumple `CAMBIO_DE_CUENTA.md`: limpieza por `cuenta.id`, generaciones que descartan respuestas tardías, cachés y `localStorage` por cuenta y entorno, y canales cerrados.
  - Se recorre la lista de comprobación entera con su evidencia, en QA.
  - Antes del corte se etiqueta `apk-capacitor-final` y se retira el camino nativo de Capacitor (`android/`, `capacitor.config.ts`, `services/native/*`, plugins) junto con la publicación.
- **Por qué se necesita:** la limpieza es un requisito de adscripción. La APK de Capacitor queda sin soporte en el corte (decisión 2), y mantener su camino solo añade trabajo.
- **Qué se espera lograr:** publicar la web adherida con API y web a la vez, y conservar la APK de Capacitor en la etiqueta como referencia del clon.
- **Peligros si se mantiene como estaba:** se mostrarían datos de A como B, y quedaría código nativo muerto que habría que mantener.
- **Peligros del cambio:** perder la referencia del clon, que se evita con la etiqueta y el inventario. Las capturas de referencia del hito 5 se toman **antes** de retirar Capacitor.

- [ ] A → B → A, varias pestañas, cierre, revocación, red lenta y respuesta tardía, con evidencia (Playwright contra QA).
- [ ] Lista de comprobación del kit, web, marcada con su evidencia en la checklist.
- [ ] Etiqueta `apk-capacitor-final`; camino de Capacitor retirado.
- [ ] Publicación coordinada con la fase 7; humo en producción con el propietario.

### Hito 5. APK Kotlin: base del proyecto y referencia visual

- **Descripción:**
  - Proyecto Gradle `android-nativa/` con `app/` y `yosiftware-sesion/`. La librería es la 1.7.0, sin cambios, con `ORIGEN.md`.
  - Versiones como 3.5 Companion y Yosircana: AGP 9.3.2, Kotlin 2.3.21, Compose BOM 2026.09.00, `minSdk` 26 y `compileSdk` 37.
  - Flavors `qa` (`es.yosiftware.libros.qa`) y `produccion` (`es.yosiftware.libros`), con su API, su configuración de la plataforma y la firma actual.
  - El tema sale de `_tokens.sass`: claro y oscuro, radios, espaciados, tipografía y Material Icons.
  - Navegación adaptable: barra inferior (Biblioteca, Catálogo, Comunidad, Más) en compacta y rail en media o expandida.
  - Postura del plegable con `WindowInfoTracker`.
  - **Capturas de referencia** de cada pantalla de la APK actual, en claro y oscuro, plegada y desplegada.
- **Por qué se necesita:** es la base de todos los hitos del clon, y las capturas son el patrón del «clon exacto».
- **Qué se espera lograr:** un esqueleto que compila en los dos flavors, con el aspecto de Mobile y sin orientación ni proporción fijas.
- **Peligros si se mantiene como estaba:** el riesgo es clonar «de memoria» y que el aspecto se desvíe.
- **Peligros del cambio:** `minSdk` sube de 24 a 26 (lo exige la librería), así que los móviles con Android 7 se quedan fuera. Las capturas tienen que tomarse antes del corte, con la APK de producción y la cuenta del propietario (después, la APK de Capacitor ya no entra).

- [ ] Capturas de referencia (CDP con `scripts/qa/native-webview-smoke.mjs` o ADB) archivadas fuera de Git o en `docs/referencias/apk-capacitor/`.
- [x] Proyecto, flavors, firma, iconos (punto rojo en `qa`) y `assembleQaDebug` y `assembleProduccionDebug` en verde.
- [x] Tema, tipografía e iconos; primitivas Compose equivalentes a `.m-button`, `.m-card`, `.m-chip`, `.m-sheet`, `.m-dialog`, `.m-field` y `.m-list-item`.
- [x] Esqueleto de navegación con pantallas vacías, Atrás por pantalla y overlay, e `imePadding`.
- [x] Base unida en `main` (`1a57d3b`, 2026-10-24): 26 pruebas JVM, `assembleQaDebug`, `assembleProduccionDebug` y lint sin errores. El tema arranca en claro, como `MobileThemeService`. Por la tilde de la ruta del repositorio, `gradle.properties` lleva `android.overridePathCheck=true` y las pruebas JVM reciben un jar de clase de ruta (`app/build.gradle.kts`). Quedan diez `TODO(clon)` para comparar con las capturas (barra con teclado, respuesta al toque, foco de los campos, diálogo, bisagra…).

### Hito 6. APK Kotlin: la cuenta

- **Descripción:**
  - `SesionYosiftware` en la `Application`, `iniciar()` al arrancar y `comprobar()` en cada `onStart`.
  - Pantallas de todos los estados con el diseño de Mobile: entrar, alta, segundo factor, normas, borrado programado, sin conexión y abrir en el navegador.
  - «Continuar como @alias» y un panel de cuentas con varias cuentas.
  - Limpieza por `ConSesion.cuenta.id`, con generación, almacenamiento por cuenta y entorno, y trabajos cancelados.
  - El perfil con `/v1/perfil` y el avatar con la cámara o la galería. Lo de la cuenta abre la web social.
  - Servicio en primer plano corto mientras se entra con Google (MagicOS).
- **Por qué se necesita:** sustituye a las 8 pantallas de autenticación y a la de cuenta y seguridad, que se retiran.
- **Qué se espera lograr:** entrar y cambiar de cuenta como en las demás APK del ecosistema.
- **Peligros si se mantiene como estaba:** la app no podría hablar con la API migrada.
- **Peligros del cambio:** si el cliente OAuth Android del paquete sigue en `yosiftware-libros`, Google responde `DEVELOPER_ERROR`; lo da de alta la plataforma.

- [ ] Alta en la plataforma: paquete y huellas de las dos firmas por entorno, y cliente OAuth.
- [ ] Estados de la sesión y panel de cuentas.
- [ ] Limpieza A → B → A probada.

### Hito 7. APK Kotlin: datos y red

- **Descripción:**
  - Cliente de la API con OkHttp, que usa `tokens().api` y repite una vez con `tokensTrasRechazo`. Para la plataforma, `conTokenDePlataforma`.
  - Errores según `docs/backend/api/ERRORES.md`.
  - Modelos a partir de `docs/backend/openapi.yaml`.
  - Portadas con Coil y caché en disco.
  - Stores en `ViewModel` por cuenta.
  - Barrera sin conexión.
- **Por qué se necesita:** es la base común de todas las pantallas. Un solo cliente evita los duplicados que el revisor buscaría después.
- **Qué se espera lograr:** las mismas lecturas y escrituras que la web, con el mismo trato de errores.
- **Peligros si se mantiene como estaba:** no aplica (es nuevo).
- **Peligros del cambio:** el contrato de la API cambia durante las fases 2 a 4. Los modelos se generan o revisan contra el OpenAPI de cada momento.

- [ ] Cliente, errores, modelos y caché de portadas.
- [ ] Pruebas JVM del cliente (401 y reintento, errores y respuesta tardía descartada).

### Hito 8. APK Kotlin: Biblioteca, Catálogo y Estadísticas

- **Descripción:**
  - La Biblioteca con la jerarquía universo → saga → libro y las antologías con secciones (`library-view-helpers.ts`, `saga-chain.ts`), la búsqueda con ámbito y el modal de estado de colección.
  - El Catálogo con su hoja de saga, coincidencias y ediciones.
  - El modal de petición de catálogo, con Google Books, idiomas, estilos y lugares.
  - Las Estadísticas generales.
- **Por qué se necesita:** es el uso diario del propietario.
- **Qué se espera lograr:** las pantallas idénticas a las capturas y con los mismos datos que la web.
- **Peligros si se mantiene como estaba:** no aplica.
- **Peligros del cambio:** las reglas de dominio repartidas en helpers (ediciones poseídas, «Ver ediciones» solo con varias, secciones excluidas del catálogo) son fáciles de perder. Se portan con sus pruebas.

- [ ] Biblioteca y modal de estado.
- [ ] Catálogo, hoja de saga, ediciones y petición de catálogo.
- [ ] Estadísticas generales.
- [ ] Comparación con las capturas, en claro y oscuro, plegada y desplegada.

### Hito 9. APK Kotlin: el libro

- **Descripción:**
  - El shell del libro: cajón del índice arrastrable, hoja de Elementos, y partes e interludios.
  - Notas, búsqueda avanzada y estadísticas del libro (sustituir ApexCharts por gráficos de Compose).
  - Capítulos y escenas, con autoguardado, aviso de cambios pendientes y la preferencia de fuente.
  - El lector persistente y minimizable (`native-reader-island`), que conserva la pantalla al restaurar.
- **Por qué se necesita:** es el núcleo de lectura y edición.
- **Qué se espera lograr:** el mismo flujo que la APK actual, y sin perder lo escrito al plegar.
- **Peligros si se mantiene como estaba:** no aplica.
- **Peligros del cambio:** perder texto con el autoguardado o al cambiar de configuración. El estado va en el `ViewModel` y el guardado pendiente se fuerza al salir.

- [ ] Shell, índice, Elementos, y partes e interludios.
- [ ] Notas, búsqueda avanzada y estadísticas del libro.
- [ ] Capítulos y escenas, con autoguardado y cambios pendientes.
- [ ] Lector persistente.

### Hito 10. APK Kotlin: entidades narrativas y editor RTF

- **Descripción:**
  - Personajes, organizaciones, eventos, localizaciones, conceptos y citas, con apodos, entradas, participantes y relaciones (`narrative-entity-placeholder`, el mayor container).
  - Un editor RTF compatible con RichEdit, con los enlaces calculados a las entidades.
- **Por qué se necesita:** es parte de lo propio de Libros y de la paridad con el escritorio.
- **Qué se espera lograr:** editar entradas RTF en el móvil sin romper los RTF del escritorio.
- **Peligros si se mantiene como estaba:** no aplica.
- **Peligros del cambio:** el RTF es lo más difícil de portar. **Decisión pendiente del propietario:**
  - Propuesta del agente: portar el conversor de `rtf-text.ts` a Kotlin con las mismas fixtures (`npm run qa:rtf:fixtures` y el corpus de 1.317 RTF) y un editor Compose propio.
  - Alternativa: un WebView aislado solo para el editor, con el código actual.

- [ ] Decisión sobre el editor RTF.
- [ ] Pantallas de las seis entidades.
- [ ] Conversor RTF en Kotlin con las fixtures en verde (si se elige nativo).
- [ ] Editor y enlaces a entidades.

### Hito 11. APK Kotlin: Comunidad propia, clubes, perfil y preferencias

- **Descripción:**
  - Lo que se queda en Libros: los clubes (detalle, lecturas, progreso, hitos, calendario, encuestas y descubrimiento), con la pertenencia por `sesion.espacios`.
  - La actividad de la comunidad, según la decisión pendiente sobre las novedades.
  - Perfil: resumen, Mis peticiones y Mis reportes.
  - Preferencias: tema claro u oscuro y permisos de la app.
  - Lo que se va a la plataforma (personas, amistades, bloqueos y moderación) abre la web social.
- **Por qué se necesita:** completar la paridad con lo propio, ya adherido.
- **Qué se espera lograr:** la pestaña Comunidad y la hoja «Más» equivalentes a las actuales sin lo que se retira.
- **Peligros si se mantiene como estaba:** no aplica.
- **Peligros del cambio:** el Markdown con spoilers y el realtime de comunidad dependen de decisiones de las fases 3 y 4.

- [ ] Clubes con espacios.
- [ ] Actividad (según decisión).
- [ ] Perfil, Mis peticiones y Mis reportes.
- [ ] Preferencias y permisos.

### Hito 12. APK Kotlin: push, avisos, chat y actualizaciones

- **Descripción:**
  - El push central: registrar el dispositivo en `POST /v1/cuenta/dispositivos` por cuenta, comprobar el campo `cuenta` y mantener la versión pública y la privada en la pantalla de bloqueo.
  - Los avisos dentro de la app desde la API de la plataforma.
  - El chat de la plataforma con la interfaz actual (decisión 6): `/v1/chat/…` y su socket con el ticket de la sesión.
  - App Links.
  - La comprobación de versiones en GitHub (`android-vX.Y.Z` y `.sha256`), como `AndroidReleaseUpdateService`.
- **Por qué se necesita:** el push y los avisos pasan a la plataforma, y sin Service Worker las actualizaciones solo llegan como APK.
- **Qué se espera lograr:** que nada se pierda respecto a la APK actual.
- **Peligros si se mantiene como estaba:** no aplica.
- **Peligros del cambio:** mostrar un aviso de una cuenta que ya no está activa. Se descarta comparando `cuenta`.

- [ ] Push central y avisos.
- [ ] Chat con la interfaz actual sobre la plataforma.
- [ ] App Links y aviso de versión nueva.

### Hito 13. APK Kotlin: plegables, QA y publicación

- **Descripción:**
  - La lista «App Android» del kit entera.
  - Pruebas en los emuladores de plegable (de libro y de concha), en el redimensionable y en el Honor Magic V3.
  - QA del propietario con el flavor `qa`.
  - Publicación con el mismo paquete y la misma firma, encima de la de Capacitor.
  - La ficha de la app: icono de 512 × 512 e imagen de 1600 × 900.
  - Retirada de `android/` si no se retiró en el hito 4.
  - Novedad de Yosiftware: «la app de Libros ya se puede descargar».
- **Por qué se necesita:** es el cierre de la migración de la APK.
- **Qué se espera lograr:** la APK Kotlin en producción.
- **Peligros si se mantiene como estaba:** no aplica.
- **Peligros del cambio:** si cambia la clave de firma, no se puede instalar encima de la anterior. Se usa la misma.

- [ ] Lista «App Android» con su evidencia.
- [ ] Plegables y QA del propietario.
- [ ] Publicada, con su ficha y su novedad.

### Hito 14. Auditoría completa de duplicados de la APK Kotlin (fase 9)

- **Descripción:** el revisor en modo `completo` sobre `android-nativa/`, en su rama, con la búsqueda entre partes (API, web y APK).
- **Por qué se necesita:** es la decisión 4 del propietario y el punto 4 de la petición del revisor.
- **Qué se espera lograr:** que la app no repita lógica entre pantallas ni rehaga lo que da la librería 1.7.0.
- **Peligros si se mantiene como estaba:** duplicados que crecerían con las mejoras.
- **Peligros del cambio:** los mismos que en el hito 1, con `./gradlew :app:testQaDebugUnitTest :app:assembleQaDebug`.

- [ ] Rama, commits, propuestas y pruebas; rama unida y veredicto anotado.

### Hito 15. Mejoras

- **Descripción:** lo que pida el propietario una vez terminado el clon.
- **Por qué se necesita:** el propietario lo decidió así: primero clon exacto, después mejoras.
- **Qué se espera lograr:** —.
- **Peligros si se mantiene como estaba:** —.
- **Peligros del cambio:** mezclarlas con el clon haría imposible comparar con las capturas.

- [ ] Abrir su roadmap o sus entradas en `bugs.md` cuando se cierre el hito 14.
