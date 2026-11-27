# Common - Bugs y mejoras acotadas

> Los criterios de estilo vigentes viven en `docs/GUIA_ESTILOS.md`.

## Pendiente

- [ ] Registrar la tarea programada «Libros QA nocturna» con `scripts/qa/registrar-nocturna-servidor.ps1`. Depende del propietario: el modo automático del agente no puede registrarla. La campaña ya pasa entera desde el servidor (`scripts/qa/nocturna-servidor.ps1`, registros en `.runtime/qa-nocturna/`, aviso por Notificapp si falla). Desde GitHub no se puede: Cloudflare desafía al runner (`cf-mitigated=challenge`), y `qa-nightly.yml` solo corre `qa:ci` y `qa:browsers`.
- [ ] Mejora tras el clon: reenviar una petición devuelta no deja corregir sus campos (el ISBN, por ejemplo), solo añadir un comentario.
- [ ] Regenerar con Docker la referencia Linux de `chapter-editor` (Wood): cambió la alineación de los iconos de prefijo al compartir la paleta de campos.
- [ ] El Sass de `narrative-entity-placeholder` pasa de su presupuesto: 60 kB de 40 (aviso del `ng build` de producción, 26/11/2026). Viene de antes de la F1. Son los estilos de Mobile y Wood de ese controlador: la F3 rehízo los de la Web en su propia vista y no lo cambió. Repartirlo por presentación, al tocar Mobile o Wood.
- [ ] Duplicados del «Cuaderno» (revisor, 26/11/2026, `1dc79411..0f3901f2`), de más coste a menos:
  - **Un solo motor de autoguardado.** `ChapterComponent` y `NarrativeEntityPlaceholderComponent` (F3, `runFichaAutosave`) repiten el ciclo: espera tras el último cambio, un solo envío a la vez, otro al terminar si hubo cambios (`autosaveQueued` / `fichaSaveAgain`) y el estado del indicador. La F4 añadió la tercera copia, la nota que se guarda sola de `BookNotesComponent` (`autosaveComposer`, `composerAgain`), con su propio `window:online` (los tres lo tienen) y su apartado en `PendingWorkService` (`keepNoteDraft` / `restoreNoteDraft`). Sacarlo a un `AutosaveRunner` común, con sus pruebas (guardado a medias, sin red, cerrar la app y A → B → A). Es el autoguardado: no se toca sin una pasada completa de las e2e del capítulo, la ficha y las notas.
  - **Los modales Web, con `<dialog>`.** El alta rápida (F3) es el primer `<dialog>` nativo (`ModalDialogDirective`) y rehace a su manera la superficie y la cabecera de `web.dialog` (radio de 14 px sin borde, título de 20 px), que sigue siendo un velo con `div`. Dar a `web.dialog` la variante nativa (`::backdrop`) y pasar a ella los demás modales Web, como pide `WEB_MODERNA.md`; decidir antes con el diseñador si el alta conserva su forma.
  - **Preferencias por cuenta.** `BookElementTypePreferenceService` (F1) es el cuarto servicio que lee y escribe `localStorage` con `accountStorageKey` y su `try`/`catch` (con `BookScenePreferenceService`, `DictationPreferenceService` y `NarrativeEditorFontPreferenceService`); solo él recuerda en memoria si no hay almacenamiento. Un ayudante común de lectura y escritura, y decidir si todos guardan en memoria.
  - **`.icon-button` copiado en cada vista Web.** Trece vistas (26/11/2026, con las de la F3 y las notas de la F4) vuelven a declarar `.icon-button { @include web.icon-button }`, que ya emite `web/_classes.sass`. Quitarlo de todas a la vez, revisando con Playwright que nada pierda la caja (la copia local tiene más especificidad que la global).
  - **El «Guardado» del marco.** `web-book-shell-view` pinta dos veces a mano su aviso (cabecera y barra del índice) en vez de `app-web-save-status`; hace falta una variante de solo icono para menos de 600 px, que hoy esconde el texto desde el Sass del marco.
- [ ] Duplicados de la F4 y la F5 (revisor, 26/11/2026, `b6256e7f..8b485ed0`), de más coste a menos:
  - **APK: el autoguardado al servidor de la ficha, del capítulo y de las notas.** La F5c dio a `ElementosViewModel` su propio ciclo de envío (`autoguardado`, `guardando`, `otraVez`, `despuesDeGuardar`, `estado`), el mismo que ya tenía `CapituloViewModel`; la F5d añadió la tercera copia, el compositor de `NotasViewModel` (`autoguardar`, `guardando`, `otraVez`, su borrador en `BorradoresLocales` y su `recuperar`). Lo idéntico de los tres ya está en un sitio (revisor, 27/11/2026, `63062aa53d92..eb0cbfd8`): `reenviarAlVolverLaRed` y `EstadoDelGuardado.trasFallar`, en `CapituloViewModel.kt`. Amplía el punto 8 de `docs/roadmaps/ecosistema/ROADMAP_PAUSADO_duplicados-apk-kotlin.md` (el borrador con espera): ahora son el borrador y el envío los que se repiten. Un solo `AutoguardadoConEspera` con sus pruebas, que usen los tres (y que se lleve esos dos ayudantes); mismo cuidado que en la web (cerrar la app del todo en el Honor).
  - **Web: el aviso informativo.** El de lo recuperado del capítulo (`.recovered`, F4) es otra copia del aviso sobre `--web-color-info-soft` con su icono (`.notice` de la búsqueda del libro, `.web-stats__notice` de Estadísticas y `.summary__notice` del resumen social). Un mixin `web.notice` en `_primitives.sass`, revisando con Playwright cada vista (sus rellenos y márgenes difieren un poco).
  - **Web: la portada grande con el título si no hay imagen.** `.not-started__cover` (el libro sin empezar del marco) y `.summary__cover` (Resumen), las dos de la F4, repiten la portada 2:3 con borde, radio de 6 px y sombra, y la caja `--empty` sobre `--web-color-accent-soft` con el título en serif. Un mixin con el ancho, el relleno y el tamaño del título como parámetros; revisar las dos vistas con Playwright.
  - **APK: las barras que se separan al desplazar.** La Biblioteca, el Catálogo y la búsqueda del libro pintan en el mismo `drawBehind` la sombra de 6 dp y la raya de abajo; las rayas con `drawLine` (avisos, conversación, club, comunidad, perfil) trazan medio píxel más abajo que `rayaArriba` / `rayaAbajo`. Unirlas al tocar esas pantallas, viéndolas en el móvil. Prioridad baja.
  - **APK: los meses abreviados, en cinco sitios** (revisor, 27/11/2026, `63062aa53d92..eb0cbfd8`). El «25 oct» ya es uno (`diaYMes`, `datos/Fechas.kt`), pero los meses de Angular en español siguen escritos aparte: a mano en `Catalogo.mesesCortos` y `Estadisticas.meses` («oct 2026») y en `NotasDelLibro.meses` («25 oct 2026»), y con `DateTimeFormatter` y el punto quitado en `PanelDeLectura.diaMesYAnio` («25 oct 2026») y `PantallaActividad.formatoDeFecha` («25 oct 2026, 10:30»). Juntarlos en `datos/Fechas.kt` (los meses y esos dos formatos), con una prueba de septiembre («sept»). Es anterior al alcance; por eso no se ha tocado. Prioridad baja.

## Finalizado

Lo cerrado de la APK de Capacitor, Firebase, la sesión y el login propios, la página de administración, las normas y la moderación propias se retiró con la adhesión (etiqueta `apk-capacitor-final`); su historial está en Git.

### APK Kotlin

- [x] Pantalla de entrar (29/10/2026): en compacto, solo el titular y el panel; campos sin etiqueta visible (el ejemplo dice qué es) y «con tu sesión de…» en una línea. Cabe sin desplazar.
- [x] Al minimizar o cerrar el libro se cierra el teclado (`PantallaLibro`); en el Catálogo, los filtros y «pedir un libro» van en la fila del campo y los chips llevan margen (27/10/2026).
- [x] Píldora del libro minimizado (26/10/2026): altura intrínseca de 56 dp (el cierre con `fillMaxHeight` la estiraba); el contenido le deja sitio; se esconde con la hoja «Más», la campana, las cuentas y las pantallas completas, y reaparece al volver.
- [x] En horizontal, el contenido respeta las barras del sistema por los cuatro lados y la barra lateral se desplaza entre ellas (26/10/2026).
- [x] Estadísticas › General: en compacto, el botón de «Compartir mis lecturas» va debajo del texto (26/10/2026).
- [x] Hoja de alta rápida (26/10/2026): sube justo encima del teclado, lleva «Nuevo personaje» con su X y los selectores obligatorios vacíos enseñan su error tras un intento fallido.
- [x] Chat como WhatsApp (petición del propietario, 25/10/2026): tocar abre las reacciones, mantener añade responder, copiar, editar, denunciar y borrar, y deslizar a la derecha responde. Reacciones pequeñas sobre el borde inferior de la burbuja. La conversación baja sola si ya estabas al final y siempre al enviar.
- [x] Comunidad: en la tarjeta de invitación, los botones pasan a la línea siguiente si no caben.

### Web y APK

- [x] Tipografías propias (26/11/2026, decisión del propietario para que la política de privacidad no nombre a terceros): la web sirve sus fuentes desde `src/assets/fonts/` (fuera Google Fonts) y la cabecera del título divertido, en la web y en el WebView de la APK, solo usa recursos propios, con una familia propia de respaldo para las cabeceras antiguas (`docs/GUIA_ESTILOS.md`, «Tipografías»). El backend tampoco las pide ni las admite (`ebf8705`), pero su OpenAPI aún describe el saneado antiguo en `Estilos` (`docs/backend/openapi/paths/coleccion.yaml`).
- [x] Dragones del cargador (2026-10-25, aviso del propietario): uno de los tres al azar en cada arranque y el mismo en todas sus cargas, con sus frases.
- [x] «Tu cuenta de Yosiftware tiene limitado el chat» / «limitada la comunidad» (`9c66276`); la APK compone la frase con el `detalle` de `cuenta_restringida`.
- [x] Clubes en la vista móvil (25/10/2026, corregidos en web y APK): etiquetas legibles en `shared/club-labels.ts`; Mis clubes y Eventos completos al abrir su pestaña; a quien no es miembro solo se le piden los autores más leídos y no se le ofrecen debate, voto ni spoilers; perder el acceso vuelve a Clubes con aviso; volver y abandonar llevan a Clubes; sin dobles envíos; `pre-line` en los textos; métricas en dos columnas; crear club admite antologías; `forward_to_inbox`.
- [x] Perfil (25/10/2026): una «Otra petición» devuelta se reenvía añadiendo la respuesta al texto (`catalogRequestResponsePayload`); «Reenviar» se desactiva mientras envía; las antologías de «Actividad reciente» llevan a `/dashboard/books?antologia={id}`.
- [x] Editor narrativo: la barra refleja la fuente y el tamaño del texto (la preferida del libro solo rige en editores vacíos); se recalcula con cada `selectionchange` y el tamaño del texto se añade a las opciones (medios puntos de RichEdit) (26/9 y 25/10/2026).
- [x] Autoguardado (25/10/2026; el propietario perdió media escena al cerrar del todo la APK): el capítulo aparta su borrador 0,4 s después de cada cambio y, al ocultarse la página (`visibilitychange`, `pagehide`), lo aparta y lo envía al momento. El borrador se retira cuando el servidor tiene los cambios y se recupera al reabrir. La ficha de las entidades hace lo mismo.

### Web

- [x] El despliegue fallaba por un icono de 18 px en la Actividad (contrato de múltiplos de 4 px, `scripts/qa/final-contracts.test.mjs`); corregido en `ed5d042` (25/10/2026).
- [x] «Ver en biblioteca» tras añadir un libro o antología abre su universo y saga y desplaza hasta su tarjeta en Web y Wood (29/9).
- [x] Peticiones de libro y antología: año de publicación sin exigir mes y día; la sinopsis va en su campo y «Mis peticiones» la muestra en una fila de lectura (29/9).
- [x] Gate QA: la comprobación de rutas heredadas reconoce `params.get('addBook')` (29/9).
- [x] Navegación Web: la campana va en la barra lateral de escritorio con texto y se reduce a icono al plegarla; medium conserva el carril y compact la barra superior (28/9).
- [x] Editor RTF en claro: `shared/rtf/rtf-ink.ts` marca con `data-rtf-ink` los tramos cuyo color guardado no se lee en el tema y `web/_classes.sass` los pinta con la tinta Web; el color guardado no cambia (27/9).
- [x] Primera visita: `ThemeWelcomeService` decide la bienvenida «Elige tu estilo» desde el arranque y `DecisionNoticeService` retiene los avisos hasta que se elige el estilo.
- [x] Loader Web con fondo opaco `--web-color-canvas` (contraste 5,13:1 en claro y 8,55:1 en oscuro) (27/9).
- [x] Errores de campo: `markBackendFieldError` marca en rojo el control del `field` de `ErrorResponse` y se retira al editarlo, en libros, notas, alta de personaje y entidades narrativas (aprobado por el propietario el 26/9).
- [x] Biblioteca Wood: las antologías abren su panel lateral de secciones, como Web y Mobile (26/9).
- [x] Comunidad Wood: «Reintentar» usa el mixin `wood.button` de `assets/css/wood/_primitives.sass` (26/9).
- [x] Sass compartido (26/9): botones, iconos, antetítulos y estados Web en clases globales `:where()` (`web/_classes.sass`); la paleta Wood de campos Material en `wood/_global.sass`; fuera `_snackbar.sass` y `_frame.sass`.
- [x] Accesibilidad: `web-accessibility.spec.ts` con axe en claro y oscuro; `--web-color-ink-subtle` a #626b66 (claro) y #9aa59f (oscuro), ≥ 4,5:1; nombre accesible del editor narrativo (26/9).
- [x] «Estabas leyendo» también en Wood (26/9). `ReadingReturnService` recuerda dónde estabas: ventana plegable a píldora en pantallas grandes y chip en la Web de móvil.
- [x] Avisos: `SnackbarModule.openApiError` usa el texto genérico de la pantalla como título y el del backend como mensaje; si coinciden, solo el título (26/9).
- [x] Error frente a vacío: Catálogo y Estadísticas muestran un estado de error con «Reintentar»; Estadísticas conserva el aviso parcial (26/9).
- [x] Mensajes: en la navegación Web ya no se resaltan a la vez Comunidad y Mensajes; la ventana flotante de chats funciona en la Web de escritorio y Mensajes ofrece «Abrir en ventana» (26/9).
- [x] Biblioteca Web: las sagas cerradas cuelgan de una línea guía bajo «Sagas», con icono propio, contador en píldora y mini-pila de portadas (26/9).
- [x] Paneles laterales en pantalla pequeña: se cierran arrastrándolos hacia su borde (`SwipeToCloseDirective`, solo dedo o lápiz) (26/9).
- [x] Catálogo y Biblioteca en plegable abierto: tarjetas desde 250 px, dos columnas en cuanto caben (26/9).
- [x] QA: `mobile-design-system.spec.ts` simula `/notificaciones` (26/9).
- [x] Sin Wood de fondo al cargar: el tema del dispositivo se aplica antes de Angular (`src/tema-inicial.js`), `WebRouteSupportService` parte de la URL inicial y el loader usa los colores del tema Web.
- [x] Tooltips de ApexCharts con los tokens del tema Web.
- [x] `LibrarySyncService` invalida el libro y la biblioteca guardados tras cada alta o edición del catálogo.
- [x] Tras una publicación, `ChunkLoadRecoveryErrorHandler` reconoce el módulo bajo demanda que ya no existe y recarga una vez por minuto; la fuente Web no pide «Book Antiqua» (la bloquea la protección antihuella de Firefox) (26/9).
- [x] Iconos achatados con escalado del 125 %: iconos Web en múltiplos de 4 px, exigido por `final-contracts.test.mjs` (26/9).
- [x] Web de escritorio: abrir un chat fuera de Wood abre la página de Mensajes (`ChatFloatingCoordinatorService`).
- [x] Iconos inexistentes en la fuente Material Icons (`left_panel_close`, `person_book`, `monitoring`, `progress_activity`…): `final-contracts.test.mjs` comprueba que los iconos de las plantillas existen.
- [x] Perfil Wood: foto relativa al marco; Cuenta y seguridad y Preferencias son pestañas del Perfil (mixins `src/assets/css/wood/_profile.sass`) (26/9).
- [x] Catálogo Wood: el placeholder solo aparece cuando la etiqueta ha subido (`mat-form-field-hide-placeholder`).
- [x] Biblioteca: el scroll ya no refiltra ni reaplica la expansión automática; Wood distingue el gesto del usuario (`e2e/library-expansion.spec.ts`).
- [x] Gráficas de recuentos con ejes enteros (`src/app/shared/chart-axis.ts`); «Quiero leer» con color propio.
- [x] Wood: «Instalar aplicación» en la barra lateral, encima de «Cerrar sesión».
- [x] `getApiErrorMessage` nunca muestra el mensaje técnico de `HttpErrorResponse`: usa el texto de la pantalla o un aviso de conexión.
- [x] Tooltips de acento: fondo cuero oscuro con texto y borde dorados.
- [x] Cabecera del Catálogo Wood: los filtros pasan a su propia fila por debajo de 1600 px.
- [x] `409 part_order_conflict` con mensaje propio al solapar partes.
- [x] Estadísticas globales: cada métrica se degrada por separado a «Sin dato» (Wood) o «—» (Mobile).
- [x] Campos Material con `--mat-*` en lugar de `--mdc-*`; `final-contracts.test.mjs` impide reintroducir `--mdc-*`.
- [x] Fechas y números en español con `LOCALE_ID es-ES`.
- [x] Gestores Wood sin magnitudes repetidas en sus métricas.
- [x] `anthology_section_collection_forbidden`: `error-interceptor.service.ts` reconcilia la colección con la respuesta autoritativa (contrato en `docs/backend/api/SECCIONES_ANTOLOGIA_FRONT.md`).
- [x] Contador global de mensajes reconciliado al abrir una conversación desde una notificación.
- [x] Mantener las ventanas flotantes visibles con tooltips y menús, sus posiciones minimizadas y su foco sin perder la captura del puntero.
- [x] Firebase Hosting despliega `dist/book-front/browser`.
- [x] Fuera `@dchtools/ngx-loading-v18`: el loader de dragones es propio.

Ajustes visuales anteriores al 26/9 (gestores, catálogo, índice del libro, barra lateral, listados de personajes y entidades, texturas Wood): están en el historial de Git de este archivo.
