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

- [ ] **2. Una base común para los getters de presentación de los containers**
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

- [ ] **4. Borrador de búsqueda por ámbitos en Biblioteca y Catálogo**
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

- [ ] **6. Catálogo de mensajes de error repetido en el frontend**
  - **Descripción:** `src/app/shared/api-error-message.ts` (3-81) guarda unos 80 textos por `code` que el backend ya devuelve en `error` (ERRORES.md: «el backend garantiza que `error` es una frase final en español»). Solo se usan en `getProductStateMessage`, para errores que llegan sin frase (tiempo real). Muchos son de áreas que se retiran (sesión, chat, moderación, cuentas).
  - **Por qué se necesita:** el mismo texto vive en dos repositorios y puede divergir.
  - **Qué se espera lograr:** que el tiempo real traiga la frase del backend y el frontend conserve solo el aviso genérico; al retirar sesión, chat y moderación (hitos 2 y 3) desaparece la mayor parte del mapa.
  - **Peligros si se mantiene como estaba:** textos distintos para el mismo error según llegue por HTTP o por tiempo real.
  - **Peligros del cambio:** hace falta una petición al backend para los eventos de tiempo real que hoy llegan sin `error`.

- [ ] **7. Validación de ISBN y de fecha de publicación en las dos partes**
  - **Descripción:** `src/app/shared/isbn.ts` (3-18) repite `normalize_isbn`/`is_valid_isbn` de `utils/google_books.py` (35-40), y `src/app/shared/publication-date.ts` (creado en esta auditoría a partir de `all-books` y `catalog`) repite `parse_publication_date` de `utils/editorial_metadata.py` (30). El backend acepta además fechas con hora (`T…`), que el frontend rechaza en el editor.
  - **Por qué se necesita:** una regla que cambie en una parte y no en la otra da errores que la persona no entiende.
  - **Qué se espera lograr:** documentar las reglas en `docs/backend/api/` (o exponer `/catalogo/validaciones`) y que el frontend y la APK Kotlin las sigan con las mismas pruebas.
  - **Peligros si se mantiene como estaba:** divergencia silenciosa, como la de las fechas con hora.
  - **Peligros del cambio:** la validación local sigue haciendo falta para no esperar al servidor; lo que se unifica es la regla y sus casos de prueba, no el código.

- [ ] **8. Catálogos de dominio: estados de lectura y grupos de personajes**
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

- [ ] **10. Dos dobles del SDK de la plataforma (Karma y Playwright)**
  - **Descripción:** `src/app/services/auth/yosiftware-sdk.testing.ts` (clase con espías de Jasmine) y `e2e/support/yosiftware-sdk-double.ts` (módulo que se inyecta como guion en la página) imitan cada uno el mismo SDK: estado y `alCambiar`, tokens (y uno por cuenta), `ajustes` con versión y conflicto, canales de los espacios y tiempo real. No se pueden unir dentro del proyecto sin escribir el doble en JavaScript plano y cargarlo en los dos sitios.
  - **Por qué se necesita:** cada cambio del SDK (kit nuevo) obliga a tocar dos imitaciones que pueden divergir del SDK y entre sí.
  - **Qué se espera lograr:** un doble oficial del SDK en el kit (`ecosistema-kit/`), con su comportamiento probado por la plataforma, que Libros cargue en Karma y en Playwright. Es lo que el kit debería dar: pedirlo con una petición a la plataforma antes de rehacerlo aquí.
  - **Peligros si se mantiene como estaba:** pruebas verdes con un doble que ya no se comporta como el SDK.
  - **Peligros del cambio:** depende de la plataforma; mientras no exista, el doble de Playwright sigue siendo el que manda en las pruebas del cambio de cuenta.

## Fuera de alcance (se retira con la adhesión)

Se citan para que nadie los porte a Kotlin:
- `scripts/qa/native-*.mjs`: sondas de Capacitor y sesión que repiten el arranque de Playwright; se retiran con `android/` (hito 4).
- `register`/`reset-password`/`login` y sus vistas, `firebase-provider-auth`/`firebase-session`, `community-relationships`/`social-shell`, guards de sesión: duplicados dentro de áreas que se retiran en los hitos 2 y 3.
- Código muerto confirmado sin retirar, por estar en autenticación: `FirebasePrivateStateService` (sin referencias), `NativeFirebaseAuthAdapter.signInCanonical` (sin llamadas), `RegisterRequest`, `TokenJWT` y `AuthResponse` (sin uso).
