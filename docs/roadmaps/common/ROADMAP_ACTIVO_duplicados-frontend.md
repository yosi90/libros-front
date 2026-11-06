# Duplicados pendientes del frontend

**Activo desde el 29/10/2026** (el propietario lo activó mientras llega la IA1). **Pausado desde su apertura (24/10/2026) hasta entonces:** recoge lo que la auditoría completa de duplicados del frontend (hito 1 de `ecosistema/ROADMAP_FINALIZADO_adhesion-yosiftware-y-apk-kotlin.md`, rama `revisor/auditoria-completa-frontend-2026-10-24`, base `5dc3120`) no aplicó porque es grande, cambia una API interna con muchos llamadores o cruza con el backend. Solo puede haber un roadmap activo; se retoma cuando el propietario lo decida, idealmente antes de portar a Kotlin la parte afectada.

Las líneas citadas son las de la base `5dc3120`. Orden: de más ganancia y menos coste a menos.

## Frontend

- [x] **1. Una sola llamada por tipo de obra en los servicios de catálogo y colección**
  - **Hecho (29/10/2026):** `CollectionService.updateWork{Status,Rating,Review,Editions,StatusHistory}` y `deleteWorkStatusHistory`, y `CatalogService.getWork{PublicDetail,Editions}`, con el tipo (`CatalogItemType`) delante y la ruta de `workPath` (`interfaces/catalog.ts`). Fuera los catorce pares y sus ternarios (catálogo, ficha pública, colección, lectura flotante); lo que solo trabaja con libros pasa `'libro'`. Las URL no cambian. Karma 691/691.
  - **Descripción:** `CollectionService` y `CatalogService` tienen cada ruta por partida doble (`updateBookStatus`/`updateAnthologyStatus`, `updateBookRating`/`updateAnthologyRating`, `updateBookEditions`/`updateAnthologyEditions`, `getBookEditions`/`getAnthologyEditions`, `getBookPublicDetail`/`getAnthologyPublicDetail`), y cada llamador repite el ternario `item.Tipo === 'libro' ? … : …` (unos diez sitios: `public-detail-host.ts`, `shared/collection-state.ts`, `catalog.component.ts` 839-852, `all-books.component.ts` 249, 332 y 429, `catalog-moderation.component.ts` 111 y 136). Propuesta: métodos por obra (`updateWorkStatus({ Tipo, Id }, payload)`…) que construyan `libros/antologias` en un solo sitio, y retirar los pares.
  - **Por qué se necesita:** es la misma ruta escrita en dos sitios y elegida a mano en cada pantalla; la APK Kotlin portaría los diez ternarios.
  - **Qué se espera lograr:** un solo envoltorio por ruta y llamadores sin ternarios.
  - **Peligros si se mantiene como estaba:** que una pantalla nueva llame a la variante equivocada o se olvide de una de las dos.
  - **Peligros del cambio:** toca la API pública de dos servicios y sus pruebas; los llamadores que solo trabajan con libros (`book.component`, `floating-reading`, `book-statistics`) tendrían que pasar el tipo.

- [x] **2. Una base común para los getters de presentación de los containers**
  - **Se queda (29/10/2026):** ya sin Capacitor, son 23 getters de una línea sobre `PresentationModeService` y sus plantillas los leen con nombres distintos (`isWebView`, `mobileController`, `controller`). Quitarlos pediría tocar 23 contenedores y sus plantillas por una línea cada uno; como dice la propuesta, no compensa.
  - **Descripción:** 25 containers repiten `isMobilePresentation`, `isWebPresentation` y `mobileController` (getters de una línea sobre `PresentationModeService`). Propuesta: exponerlos desde una pieza común (por ejemplo, señales del servicio usadas directamente en las plantillas) y retirar las copias.
  - **Por qué se necesita:** es la misma decisión de presentación repetida en cada ruta.
  - **Qué se espera lograr:** containers más cortos y una sola forma de decidir qué vista se pinta.
  - **Peligros si se mantiene como estaba:** poco: son una línea cada uno; crecerán con cada ruta nueva.
  - **Peligros del cambio:** toca 25 containers y sus plantillas; una herencia forzada por esto no compensa. Conviene hacerlo al retirar Capacitor (hito 4), cuando `native-mobile` deje de existir en la web.

- [x] **3. Base común de `Book`, `BookSimple` y `Antology`**
  - **Hecho (29/10/2026):** `interfaces/work.ts` (`WorkFields`, lo de la obra y lo que dice la persona; `CollectionWorkFields`, lo que añade la colección); `Book` extiende la primera y `BookSimple` y `Antology` la segunda, con lo suyo aparte (capítulos y entidades, `Wiki`, `TituloPropio`, las secciones). `CollectionService.toWork` hace el mapeo común. Contrastado con OpenAPI: no se une nada que el backend separe (`Tipo`, `Secciones`, `SeccionesProgreso` siguen en cada una).
  - **Descripción:** `interfaces/book.ts` (16-50 y 65-91) y `interfaces/antology.ts` (42-60) repiten casi los mismos campos de obra (portada, ISBN, ediciones, idiomas, estilos, puntuación, reseña, fechas, permisos de narrativa), y `CollectionService.toBook`/`toAntology` copian el mismo mapeo campo a campo.
  - **Por qué se necesita:** cada campo nuevo del contrato se añade en tres sitios.
  - **Qué se espera lograr:** una interfaz `CollectionWork` de la que extiendan las tres y un mapeo común.
  - **Peligros si se mantiene como estaba:** un campo nuevo que llegue a libros y no a antologías por olvido.
  - **Peligros del cambio:** los tipos los distingue el contrato (`Tipo`, `Secciones`, `SeccionesProgreso`); hay que revisarlo contra `docs/backend/openapi.yaml` para no unir lo que el backend separa.

- [x] **4. Borrador de búsqueda por ámbitos en Biblioteca y Catálogo**
  - **Se queda (29/10/2026):** `CatalogComponent` ya hereda de `PublicDetailHost`, así que no puede compartir una clase base con la Biblioteca, y unirlas por composición obligaría a tocar las seis vistas (Web, Wood y Mobile de las dos) por unas 25 líneas; además, cada una confirma el borrador a su manera (la Biblioteca en su almacén, el Catálogo recargando del servidor).
  - **Descripción:** `books.component.ts` y `catalog.component.ts` repiten `onDraftQueryInput`, `textFilterChips`, `getScopeLabel`, `onSearchInputBlur` y `toggleFilters` (unas 25 líneas), con estados distintos detrás (`LibrarySearchStateService` frente a `searchTerms` propios).
  - **Por qué se necesita:** el mismo comportamiento de búsqueda vive en dos containers.
  - **Qué se espera lograr:** un pequeño controlador de borrador común que cada container alimente con su almacén.
  - **Peligros si se mantiene como estaba:** que el comportamiento del buscador diverja entre pantallas.
  - **Peligros del cambio:** el Catálogo recarga desde el servidor y la Biblioteca filtra en local; mezclarlos sin cuidado cambiaría cuándo se busca.

- [x] **5. Mensajes de validación de formularios**
  - **Resuelto por la adhesión:** la edición de la identidad se fue a la plataforma y `updateNameErrorMessage` solo queda en `chapter.component.ts`.
  - **Descripción:** `chapter.component.ts` (454-461) y `user-profile.component.ts` (651-658) repiten `updateNameErrorMessage` con los mismos textos. La edición de identidad del Perfil se va a `<yosi-perfil>` en el hito 3, así que la copia desaparecerá sola.
  - **Por qué se necesita:** textos de dominio en dos sitios.
  - **Qué se espera lograr:** revisarlo cuando se retire la identidad del Perfil; si aparece un segundo consumidor, un helper de mensajes por error de control.
  - **Peligros si se mantiene como estaba:** ninguno relevante hasta el hito 3.
  - **Peligros del cambio:** tocar ahora un área congelada.

## Entre el frontend y el backend (`../Libros API`, revisión `999e17d`)

Solo propuestas: no se toca el backend.

- [x] **6. Catálogo de mensajes de error repetido en el frontend**
  - **Hecho (06/11/2026):** una sola fuente, la API de Libros. Sus frases pasan a ser las buenas de las tablas, con tildes (21 frases en 6 controladores: el club, sus lecturas, hitos, eventos, encuestas y miembros, publicar, las secciones de antología y la cuenta borrada); las que decían lo que hace la pantalla («Se ha actualizado el club») se quedan sin esa parte, que es de cada app. Fuera `productStateMessages` de la web y la tabla de `MensajesDeError.kt` de la APK: sin frase del servidor, la de la pantalla. El tiempo real propio de Libros, que era lo que llegaba sin `error`, se retiró con la adhesión.
  - **En parte (29/10/2026):** fuera 34 de los 65 textos, los de códigos que ya no emite nadie (ni la API de Libros ni la plataforma: sanciones y moderación propias, chat y grupos propios, normas de uso antiguas, preferencias de notificaciones y la copia de seguridad del panel retirado); `isPolicyAcceptanceBlock` solo mira ya las normas de la plataforma. Los 31 que quedan son códigos vivos de la API, que ya manda su frase: la tabla solo se usa si llega sin ella. Quitarla del todo sigue pendiente de lo mismo que decía la propuesta.
  - **Descripción:** `src/app/shared/api-error-message.ts` (3-81) guarda unos 80 textos por `code` que el backend ya devuelve en `error` (ERRORES.md: «el backend garantiza que `error` es una frase final en español»). Solo se usan en `getProductStateMessage`, para errores que llegan sin frase (tiempo real). Muchos son de áreas que se retiran (sesión, chat, moderación, cuentas).
  - **Por qué se necesita:** el mismo texto vive en dos repositorios y puede divergir.
  - **Qué se espera lograr:** que el tiempo real traiga la frase del backend y el frontend conserve solo el aviso genérico; al retirar sesión, chat y moderación (hitos 2 y 3) desaparece la mayor parte del mapa.
  - **Peligros si se mantiene como estaba:** textos distintos para el mismo error según llegue por HTTP o por tiempo real.
  - **Peligros del cambio:** hace falta una petición al backend para los eventos de tiempo real que hoy llegan sin `error`.

- [x] **7. Validación de ISBN y de fecha de publicación en las dos partes**
  - **Hecho (06/11/2026), las validaciones:** la regla se queda en cada parte (la validación local hace falta para no esperar al servidor), pero con los mismos casos: `src/app/shared/casos-de-validacion.json` (ISBN-13 e ISBN-10, separadores, la X, prefijos y dígitos de control; fechas parciales, bisiestos y formatos que no valen), leído por `isbn.spec.ts` y `publication-date.spec.ts` de la web y por `CasosDeValidacionTest` de la APK. La fecha vacía no está: cada pantalla decide antes si el campo es obligatorio (la web la da por no válida y la APK por válida, y las dos lo tratan antes). La API (`utils/google_books.py`, `utils/editorial_metadata.py`) sigue con sus propias pruebas: está en otro repositorio.
  - **Descripción:** `src/app/shared/isbn.ts` (3-18) repite `normalize_isbn`/`is_valid_isbn` de `utils/google_books.py` (35-40), y `src/app/shared/publication-date.ts` (creado en esta auditoría a partir de `all-books` y `catalog`) repite `parse_publication_date` de `utils/editorial_metadata.py` (30). El backend acepta además fechas con hora (`T…`), que el frontend rechaza en el editor.
  - **Por qué se necesita:** una regla que cambie en una parte y no en la otra da errores que la persona no entiende.
  - **Qué se espera lograr:** documentar las reglas en `docs/backend/api/` (o exponer `/catalogo/validaciones`) y que el frontend y la APK Kotlin las sigan con las mismas pruebas.
  - **Peligros si se mantiene como estaba:** divergencia silenciosa, como la de las fechas con hora.
  - **Peligros del cambio:** la validación local sigue haciendo falta para no esperar al servidor; lo que se unifica es la regla y sus casos de prueba, no el código.

- [x] **8. Catálogos de dominio: estados de lectura y grupos de personajes**
  - **Se queda (06/11/2026):** el contrato ya los fija como enumeraciones cerradas (`docs/backend/openapi.yaml` de la API: los estados, `enum: [0, 1, 2, 3, 4, 5]`; `Grupo`, los seis nombres), así que la web no repite un catálogo que pueda cambiar sin avisar: añadir uno sería un cambio de contrato para la web y la APK a la vez. Lo que sí es de la web (los iconos y el orden narrativo) es presentación.
  - **Descripción:** `readingStatusOptions` (`shared/reading-status.ts` 14-21) repite `GET /estados`, y `CHARACTER_GROUP_ORDER` (`shared/character-groups.ts`, de esta auditoría) repite el orden de grupos del backend.
  - **Por qué se necesita:** si el backend añade un estado o un grupo, el frontend no lo sabrá.
  - **Qué se espera lograr:** cargar los catálogos del backend al iniciar, con los actuales como respaldo, o fijarlos en el contrato como enumeraciones cerradas.
  - **Peligros si se mantiene como estaba:** bajo mientras los catálogos no cambien.
  - **Peligros del cambio:** los iconos y el orden son de presentación y seguirían en el frontend.

## Lo nuevo de la adhesión (rama `adhesion/web`, 25/10/2026)

Revisor en modo `corregir` sobre lo que la adhesión añade a la web (`478fc8e..33989c0`, sin lo que trae `main` ni `android-nativa/`). Lo seguro se aplicó en la rama (commits `e2a3316` a `af0c459`); esto queda como propuesta. Las líneas citadas son las de `af0c459`.

- [x] **9. Una sola guardia de generación para lo que no pasa por `HttpClient`**
  - **Hecho (29/10/2026):** `whileCurrent(session)` (`services/auth/platform-session.service.ts`) en el club, el interceptor de errores, el acceso a clubes, la API y los espacios de la plataforma y los ajustes del chat flotante. Es una función y no un método para que los dobles de sesión de las pruebas sigan valiendo. Se quedan aparte el tiempo real (lleva su propia generación además de la de la sesión), el interceptor del token (la generación puede venir en la petición) y la carga inicial de `app.component` (compara además la generación de la restauración de la biblioteca).
  - **Descripción:** lo que habla con el SDK sin pasar por `PlatformTokenInterceptor` ni `PlatformApiService` repite a mano «guardar `session.generation` y comprobar `isCurrentGeneration` antes de aplicar»: `ChatFloatingSettingsService` (`assertGeneration`), `ClubAccessService.refresh`, `PlatformSpacesService.openChannel`, `PlatformRealtimeService.start` (con su propia generación además de la de la sesión), `club-detail.component.ts` (dos veces) y `app.component.ts` (la carga inicial). Propuesta: `PlatformSessionService.whileCurrent(): () => boolean` (o un operador `takeWhileCurrentAccount()`) que cada uno use en lugar de las dos líneas.
  - **Por qué se necesita:** es la obligación 2 de `CAMBIO_DE_CUENTA.md` escrita siete veces; la APK Kotlin la portaría igual.
  - **Qué se espera lograr:** una sola forma de descartar lo que llega de otra cuenta, fácil de buscar y de probar.
  - **Peligros si se mantiene como estaba:** que un servicio nuevo se olvide de la comprobación.
  - **Peligros del cambio:** son guardias de dos líneas con matices (el tiempo real se para y arranca con su propia generación; los ajustes lanzan `cambio_de_cuenta` para cortar el reintento): unificarlas sin cuidado cambiaría cuándo se descarta algo. Hacerlo con las pruebas de `account-switch.spec.ts` delante.

- [x] **10. Dos dobles del SDK de la plataforma (Karma y Playwright)**
  - **Hecho (06/11/2026):** la plataforma lo dio en el kit 1.85 (`ecosistema-kit/PRUEBAS.md`, revisión `bf6c050`; petición en `docs/peticiones/respondidas/ACEPTADA_un-doble-oficial-del-sdk-web-para-las-pruebas.md`). Copiado sin cambios en `pruebas/yosiftware-doble/` (con su `ORIGEN.md`; fuera de `src/` para que su `yosiftware.d.ts` no entre en la compilación de la web). Karma importa `crearDobleYosiftware` de `yosiftware-doble.js` en los cuatro specs que usaban el suyo; Playwright lo sirve en lugar de `/sdk/v1/yosiftware.js` con `e2e/support/yosiftware-doble.ts` (opciones en `__YOSIFTWARE_DOBLE__`, control en `window.yosiftwareDoble`). Retirados `yosiftware-sdk.testing.ts` y `e2e/support/yosiftware-sdk-double.ts`. Lo que las pruebas ponían a mano lo hace ahora el control del doble (`cambioDesdeOtraPestana`, `sesionCaducada`, `ponerTokens`, `ponerAjustes`, `guardarDesdeOtroDispositivo`, `emitir`, `publicarEnCanal`…). El doble no registra los elementos del SDK ni comunica las pestañas: `account-switch.spec.ts` ya no mira el `data-cuenta` de la campana (lo pintaba el doble viejo, no Libros) y entrega el cambio a la segunda pestaña con el control; `public-smoke` y `public.mobile` comprueban que está `<yosi-acceso>`, no su botón, y se regeneraron, revisadas, las referencias de Windows `home` y `account-security` (solo cambian los elementos del SDK, ahora vacíos, el correo de ejemplo y el alias del perfil del doble).
  - **Pedido a la plataforma (06/11/2026):** `administracion yosiftware/docs/peticiones/un-doble-oficial-del-sdk-web-para-las-pruebas.md`. Cuando el kit lo traiga, se retiran las dos imitaciones.
  - **Descripción:** `src/app/services/auth/yosiftware-sdk.testing.ts` (clase con espías de Jasmine) y `e2e/support/yosiftware-sdk-double.ts` (módulo que se inyecta como guion en la página) imitan cada uno el mismo SDK: estado y `alCambiar`, tokens (y uno por cuenta), `ajustes` con versión y conflicto, canales de los espacios y tiempo real. No se pueden unir dentro del proyecto sin escribir el doble en JavaScript plano y cargarlo en los dos sitios.
  - **Por qué se necesita:** cada cambio del SDK (kit nuevo) obliga a tocar dos imitaciones que pueden divergir del SDK y entre sí.
  - **Qué se espera lograr:** un doble oficial del SDK en el kit (`ecosistema-kit/`), con su comportamiento probado por la plataforma, que Libros cargue en Karma y en Playwright. Es lo que el kit debería dar: pedirlo con una petición a la plataforma antes de rehacerlo aquí.
  - **Peligros si se mantiene como estaba:** pruebas verdes con un doble que ya no se comporta como el SDK.
  - **Peligros del cambio:** depende de la plataforma; mientras no exista, el doble de Playwright sigue siendo el que manda en las pruebas del cambio de cuenta.

## Lo nuevo de los rediseños Web (rama `web/redisenos`, 6/11/2026)

Revisor en modo `corregir` sobre `main..60199408` (escenas plegadas, reparto con dos iconos, @ en el editor RTF y «Tu lectura» en casillas). Lo seguro se aplicó en la rama (commits `e2d0b642` a `7481872f`); esto queda como propuesta. Las líneas citadas son las de `7481872f`.

- [x] **11. Un solo campo de búsqueda Web (primitive `web.search-field`)**
  - **Hecho (06/11/2026):** `@mixin search-field($font, $radius, $outline, $background, $color, $input-min-width)` en `src/assets/css/web/_primitives.sass` (con `null` no emite el fondo, el borde o el radio, para quien los toma de `web.card`), usado por las siete hojas; cada una conserva su alto, relleno, ancho, icono, placeholder y botón de limpiar. Las siete compilan con Dart Sass a las mismas reglas que antes (comparadas como conjuntos de selector, propiedad y valor): no cambia nada en pantalla.
  - **Descripción:** el campo con lupa (contenedor flex con borde, anillo de foco con `:focus-within` y `input` transparente sin borde) está copiado en siete hojas Web: `web-book-notes-view` (`.search`, l. 56), `web-book-search-view` (`.search`, l. 29), `web-chapter-view` (`.search`, l. 369, el panel de personajes y el reparto), `web-narrative-entity-view` (`.search`, l. 315), `web-community-view` (`.search`, l. 79), `web-manager-list-view` (`.manager__search`, l. 60) y `web-scoped-search` (`.web-search`, l. 7). Cambian la altura (36–48 px), el relleno, el radio y el tamaño de letra; el resto es igual. El rediseño del capítulo añadió un segundo uso en la misma hoja (el buscador del reparto) sin crear otra copia, pero la familia sigue sin primitive.
  - **Por qué se necesita:** el foco, los colores y el `input` sin borde de los buscadores se cambian hoy en siete sitios; `SASS_REUSE_AUDIT.md` pide extraer en el segundo uso semántico real y aquí hay siete.
  - **Qué se espera lograr:** `@mixin search-field($height: 40px, $radius: var(--web-radius-md))` en `src/assets/css/web/_primitives.sass` con el contenedor, el foco, el icono y el `input`; cada vista conserva su ancho, márgenes y lo que añada (botón de limpiar, chips de ámbito).
  - **Peligros si se mantiene como estaba:** buscadores que divergen en el foco o en el contraste al tocar uno solo (ya difieren en `outline` frente a `outline-strong` y en si llevan `background`).
  - **Peligros del cambio:** son siete pantallas con capturas `@visual`; hay que comparar el CSS compilado de cada una antes y después (Dart Sass) y repasar sus capturas de Playwright. `web-scoped-search` envuelve chips y sugerencias: puede quedarse solo con el foco y el `input`.

## Fuera de alcance (se retira con la adhesión)

Se citan para que nadie los porte a Kotlin:
- `scripts/qa/native-*.mjs`: sondas de Capacitor y sesión que repiten el arranque de Playwright; se retiran con `android/` (hito 4).
- `register`/`reset-password`/`login` y sus vistas, `firebase-provider-auth`/`firebase-session`, `community-relationships`/`social-shell`, guards de sesión: duplicados dentro de áreas que se retiran en los hitos 2 y 3.
- Código muerto confirmado sin retirar, por estar en autenticación: `FirebasePrivateStateService` (sin referencias), `NativeFirebaseAuthAdapter.signInCanonical` (sin llamadas), `RegisterRequest`, `TokenJWT` y `AuthResponse` (sin uso).
