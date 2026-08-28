# Restauración Wood y cliente móvil Angular/Capacitor

> Estado: activo desde el 26 de agosto de 2026. Sustituye la dirección visual de light/dark por dos presentaciones Angular independientes y conserva el Hito 15 anterior como puerta QA final.

## Objetivo

Restaurar fielmente Wood para escritorio y ultrawide, construir una interfaz Mobile nueva para móvil, plegable y tablet, y distribuir esa misma presentación como APK Android firmada mediante Capacitor. Rutas, contratos, permisos, autenticación, stores, realtime y reglas de negocio continúan siendo únicos; HTML, Sass, navegación y composición visual se separan cuando las necesidades de presentación difieren.

## Decisiones contractuales

- `compact`: 320-599 CSS px, presentación Mobile con app bar y navegación inferior.
- `medium`: 600-1050 CSS px, presentación Mobile con navigation rail y maestro-detalle cuando exista ancho útil.
- `desktop`: más de 1050 CSS px, presentación Wood. `wide` desde 1600px y `ultrawide` desde 2560px son modificadores Wood.
- Capacitor fuerza `native-mobile` con independencia del viewport. No se detectan dispositivos mediante user-agent.
- Las mismas URLs resuelven contenedores de feature que instancian una sola vista Wood o Mobile. Las fachadas conservan estado, borradores y autoguardado al cambiar de presentación.
- Wood y Mobile tienen HTML/Sass propios. Solo comparten lógica, reset, accesibilidad, tipografía base y utilidades neutrales demostradas.
- Light/dark y el selector de tema se retiran. Los valores backend `wood|light|dark` se toleran por compatibilidad, pero no deciden la presentación ni originan nuevos `PATCH`.
- Bootstrap queda congelado en el legado Wood; Mobile usa Sass, custom properties, Angular Material 3 y CDK, sin React, Ionic, Tailwind ni nuevo Bootstrap.
- Administración y backup solo existen en Wood desktop y requieren su guard; Mobile web y Android rechazan también la navegación directa.
- Mobile permanece tras una feature flag hasta alcanzar paridad. La primera APK es Android, online-first, firmada y distribuida fuera de Play Store.
- Angular permanece en 22 durante esta iniciativa salvo corrección imprescindible y compatible. No se recuperan rutas API retiradas ni se modifica `docs/backend/**`.

## Checklist por hitos

- [x] **Hito 0 - Cerrar la iniciativa responsive anterior y abrir este roadmap.**
  - **Descripción:** archivar el roadmap y la checklist anteriores, preservar su evidencia, trasladar el Hito 15 y actualizar las fuentes documentales activas.
  - **Por qué se necesita:** la documentación todavía presentaba light/dark y el HTML/Sass compartido como objetivo vigente.
  - **Qué se espera lograr:** un único roadmap activo y una fuente de verdad coherente con Wood/Mobile/Capacitor.
  - **Peligros si se mantiene como estaba:** futuras sesiones continuarían extendiendo una arquitectura visual retirada o ejecutarían QA sobre un SHA obsoleto.
  - **Peligros del cambio:** el cierre podría interpretarse como una campaña QA superada; debe quedar explícito que Hito 15 se traslada sin falsear evidencia.
  - **Trabajo incluido:** cancelar si es posible la campaña antigua en cola, actualizar índices/notas/guía, retirar decisiones visuales obsoletas y crear la nueva matriz QA.
  - **Cierre:** el roadmap y la checklist responsive quedaron archivados como finalizados por sustitución; `QA_HITO_15_COVERAGE.md` conserva la evidencia histórica; el índice, las notas operativas, la guía visual y la vertical QA apuntan ya a esta iniciativa. La matriz nueva absorbe producto, autenticación, PWA, seguridad, realtime, accesibilidad y añade Wood/Mobile/Android. Solo existe este `ROADMAP_ACTIVO_`. GitHub rechazó cancelar `32984701188` alegando que estaba completada aunque la API aún publica `queued/conclusion=null`; queda registrada como ejecución obsoleta sin valor de QA y no bloquea el cierre documental.

- [x] **Hito 1 - Definir el contrato de presentaciones y las referencias Wood.**
  - **Descripción:** inventariar rutas y funciones vigentes, usar `272376f497ec189241a35d3353a95af1b018c639` como referencia exclusivamente visual y establecer contenedores/fachadas de presentación.
  - **Por qué se necesita:** un rollback literal de 121 plantillas y estilos eliminaría funciones posteriores y desajustaría el HTML con Angular 22.
  - **Qué se espera lograr:** separar `wood`, `mobile` y `native-mobile` sin duplicar lógica ni llamadas y disponer de referencias Wood a 1440, 1920 y 2560 px.
  - **Peligros si se mantiene como estaba:** Wood y Mobile volverían a erosionarse mutuamente mediante selectores, breakpoints y markup compartidos.
  - **Peligros del cambio:** destruir una vista al cruzar 1050/1051 puede perder estados transitorios; la fachada de ruta debe sobrevivir y vaciar borradores/overlays de forma segura.
  - **Trabajo incluido:** tipo `PresentationMode`, servicio por media query/plataforma, feature flag, guard desktop, inventario funcional y patrón de container + vistas presentacionales.
  - **Cierre:** `PresentationModeService` publica `wood`, `mobile` o `native-mobile`, mantiene Mobile desactivado por environment y deja preparado el detector Capacitor sin incorporar aún la dependencia. `desktopAdministrationGuard` consume este contrato. `CONTRATO_PRESENTACIONES_WOOD_MOBILE.md` fija containers, fachadas, cambio 1050/1051 y aislamiento Sass; `INVENTARIO_RESTAURACION_WOOD.md` registra 121 archivos visuales y 157 TypeScript modificados desde el baseline, además de las funciones que un rollback literal eliminaría. Home inaugura el patrón con container de ruta, `HomeFacade` estable y `HomeWoodViewComponent` con HTML/Sass propios. Las referencias reproducibles de Home, login y biblioteca a 1440/1920/2560 viven en `docs/referencias/wood-baseline/`; las restantes son puertas por vertical de H3/H4 y se capturarán con sus fixtures representativos. Build de producción, 268 unitarias y los dos snapshots Playwright públicos quedan verdes con Node 24.15; permanecen solo los dos avisos Sass históricos.

- [x] **Hito 2 - Restaurar los fundamentos y la zona pública Wood.**
  - **Descripción:** recuperar composición, navbar, fondos, texturas, tipografía, paleta, modales y autenticación pública de la versión anterior.
  - **Por qué se necesita:** el roadmap anterior alteró el lenguaje visual singular de Wood al hacerlo convivir con los temas modernos.
  - **Qué se espera lograr:** home, login, registro, recuperación, verificación y onboarding fieles al baseline, manteniendo Firebase y Angular actuales.
  - **Peligros si se mantiene como estaba:** Wood seguiría pareciendo una variante rota del shell moderno.
  - **Peligros del cambio:** el markup antiguo no contiene Google, teléfono, onboarding ni estados modernos; se recupera semánticamente, nunca mediante checkout masivo.
  - **Trabajo incluido:** referencias desktop, overlays Material, accesibilidad, límites ultrawide y eliminación de reglas light/dark que contaminen Wood.
  - **Cierre:** Home coincide con la composición histórica mediante una vista Wood aislada y conserva su fachada. El shell común de login, registro, recuperación, reset, verificación y onboarding recuperó fondo, tarjeta, paleta y controles Material legibles de Wood sin depender del tema guardado; se retiraron de esta zona los selectores light/dark, imports modernos y selectores visibles de tema. Google, teléfono, vinculación, handlers y onboarding permanecen funcionalmente intactos e integrados en la tarjeta editorial. Build de producción y 268 unitarias quedan verdes. Playwright suma snapshots Home/login reproducibles, 12 smokes públicos locales, cinco gates Hosting omitidos de forma esperada, el smoke compact 390 y la matriz ultrawide 2560; no hay overflow ni infracciones Axe A/AA en las cinco rutas públicas comprobadas.

- [x] **Hito 3 - Restaurar Wood en el área de usuario.**
  - **Descripción:** restaurar dashboard, biblioteca, catálogo, perfil, Cuenta y seguridad, estadísticas, notificaciones, gestores y administración.
  - **Por qué se necesita:** estas superficies concentran las regresiones de layout y el acceso diario principal.
  - **Qué se espera lograr:** fidelidad Wood con todas las funciones posteriores integradas discretamente y administración únicamente desktop.
  - **Peligros si se mantiene como estaba:** el escritorio conservaría cards, barras y superficies nacidas para light/dark.
  - **Peligros del cambio:** una restauración visual podría ocultar rutas nuevas, permisos, backup o estados de sesión.
  - **Trabajo incluido:** autores, universos, sagas, antologías, libros, comunidad, chat flotante desktop y contención wide/ultrawide.
  - **Cierre:** el dashboard elige Wood exclusivamente por presentación desktop y deja de depender de la preferencia remota o local `light|dark`; el selector de tema desaparece también del área autenticada. Biblioteca recupera su cascada Wood sin el mixin moderno y el shell vuelve a usar directamente sus fondos históricos, conservando navegación, gestores, comunidad, chat, notificaciones, Cuenta y seguridad y el acceso administrativo. Las reglas responsive modernas existentes permanecen encapsuladas bajo `data-theme=light|dark` como fallback transitorio y no contaminan escritorio; no se duplicaron selectores ni aparecieron avisos Sass nuevos. Cuenta y seguridad, función posterior al baseline, recibió una integración Wood propia sin alterar sus contratos Firebase. Administración conserva backup y queda protegida por `desktopAdministrationGuard`, incluida la navegación directa desde 390px. Una regresión Playwright determinista fuerza preferencia `dark`, demuestra tema efectivo `wood`, compara el snapshot de seguridad y comprueba el rechazo administrativo Mobile. Build de producción, typecheck E2E, 270 unitarias y cuatro visuales Chromium quedan verdes; solo permanecen los dos avisos Sass históricos.

- [x] **Hito 4 - Restaurar Wood en libros y narrativa.**
  - **Descripción:** recuperar shell, índice, estadísticas, búsqueda, capítulos, interludios y todas las entidades narrativas.
  - **Por qué se necesita:** el workspace y los editores sufrieron el mayor acoplamiento entre geometría moderna y estética Wood.
  - **Qué se espera lograr:** edición Wood fiel sin perder autoguardado, escenas aceptables, RTF, keywords, apodos ni asignación accesible de personajes.
  - **Peligros si se mantiene como estaba:** los editores continuarían mezclando texturas y primitives móviles dentro de una composición inestable.
  - **Peligros del cambio:** restaurar componentes antiguos puede reintroducir pérdida de selección, rutas retiradas o fallos de guardado.
  - **Trabajo incluido:** capítulos, personajes, organizaciones, eventos, localizaciones, conceptos, citas, overlays y baselines visuales de edición.
  - **Cierre:** el shell del libro, su índice persistente, estadísticas, búsqueda avanzada, capítulos y la superficie compartida por personajes, organizaciones, eventos, localizaciones, conceptos y citas vuelven a tomar directamente las texturas históricas de Wood. Las capas modernas heredadas se aislaron bajo el objetivo de presentación Mobile y dejaron de responder a `light|dark`, por lo que ya no recolorean ni alteran el escritorio. Se conservó el HTML funcional actual y, con él, autoguardado, escenas aceptables, sincronización de páginas, RTF, keywords, apodos, relaciones y rutas canónicas; no se recuperó ningún contrato legacy. La regresión visual autenticada incorpora fixtures deterministas para búsqueda, editor de capítulo y personajes, fija el scroll antes de comparar y prueba además el guard administrativo Mobile. El chunk lazy del libro bajó de aproximadamente 649 kB a 582 kB y el Sass narrativo de 76,12 kB a 62,10 kB al retirar emisión duplicada; queda como deuda histórica su exceso de budget, sin introducir avisos nuevos. Build de producción, typecheck E2E, 270 unitarias y siete visuales Chromium quedan verdes.

- [x] **Hito 5 - Ejecutar el spike técnico Android.**
  - **Estado:** finalizado. Capacitor 8, flavors Android, Firebase QA y los adaptadores nativos están incorporados. En un Honor Magic V3 han pasado contraseña, Google, teléfono, sesión opaca, Firebase canónico/realtime, revocación, entrega FCM real y App Links verificados. Evidencia completa en `ANDROID_SPIKE_HITO_5.md`.
  - **Descripción:** incorporar un esqueleto Capacitor 8 y probar el contrato nativo antes de construir la APK completa.
  - **Por qué se necesita:** la cookie refresh host-only, `HttpOnly` y `SameSite=Strict`, Google web y FCM no pueden darse por válidos dentro de una WebView.
  - **Qué se espera lograr:** una decisión basada en evidencia para sesión, Firebase nativo, custom token, realtime, push y app links.
  - **Peligros si se mantiene como estaba:** la incompatibilidad nativa podría descubrirse después de terminar toda la interfaz Mobile.
  - **Peligros del cambio:** un plugin podría exponer tokens o divergir del modelo SQL/JWT; no se relaja `SameSite` ni se persiste el refresh en JavaScript.
  - **Trabajo incluido:** `es.yosiftware.libros`/`.qa`, prueba de `@capacitor-firebase/authentication`, transporte HTTP/cookie jar, reinicio de app, Google, teléfono, push y enlaces de correo.
  - **Puerta:** si la sesión segura falla, pausar solo Android y crear una petición backend de transporte nativo; Mobile web continúa.
  - **Cierre:** la sesión segura se restauró tras matar el proceso sin exponer refresh, los tres proveedores Firebase intercambiaron con SQL/JWT, el UID canónico y realtime quedaron operativos, FCM llegó físicamente y Android verificó automáticamente `qa-libros.yosiftware.es`. La campaña QA Hosting `33159122855` desplegó exactamente `67b53d1`, validó la asociación publicada y terminó completamente verde. No se abre petición de transporte alternativo; firma y producción siguen reservadas para H13/H14.

- [ ] **Hito 6 - Construir el sistema visual Mobile.**
  - **Descripción:** crear una identidad editorial contemporánea única mediante Material 3 propio, sin imágenes decorativas ni selector de tema.
  - **Por qué se necesita:** Mobile debe ser una interfaz nueva y funcional, no Wood comprimido ni recoloreado.
  - **Qué se espera lograr:** primitives accesibles para appbar, bottom navigation, rail, cards, listas, sheets, diálogos, formularios, loaders y estados vacíos.
  - **Peligros si se mantiene como estaba:** cada vertical inventaría patrones diferentes y repetiría los problemas del roadmap anterior.
  - **Peligros del cambio:** abstraer demasiado pronto puede limitar el diseño; solo se comparte Sass neutral o con varios consumidores claros.
  - **Trabajo incluido:** prototipos de login, biblioteca, capítulo, comunidad y seguridad a 390/800 px, safe areas, teclado, reduced motion y WCAG AA.

- [ ] **Hito 7 - Crear el shell, la zona pública y la autenticación Mobile.**
  - **Descripción:** implementar home, login, registro, onboarding, recuperación y verificación con vistas Mobile propias.
  - **Por qué se necesita:** son la entrada a web móvil y APK y deben resolver correctamente redirecciones, cancelaciones y teclado.
  - **Qué se espera lograr:** paridad de contraseña, Google, teléfono, vinculación y reautenticación con Firebase JS en web y adaptador aprobado en Android.
  - **Peligros si se mantiene como estaba:** OAuth puede abrir la SPA en el popup o dejar loaders bloqueados, y los enlaces de correo pueden perderse al entrar desde Android.
  - **Peligros del cambio:** mezclar sesiones nativa/web puede crear identidades parciales; el custom token canónico sigue siendo `libros:<id_usuario>`.
  - **Trabajo incluido:** shells públicos, handlers propios, cancelación recuperable y Android App Links.

- [ ] **Hito 8 - Adaptar biblioteca y cuenta a Mobile.**
  - **Descripción:** crear biblioteca, catálogo, búsqueda, ficha, perfil, políticas, notificaciones, estadísticas y Cuenta y seguridad Mobile.
  - **Por qué se necesita:** constituye el recorrido principal y valida la navegación antes de verticales más complejas.
  - **Qué se espera lograr:** compact con Biblioteca/Catálogo/Comunidad/Más y medium con rail y panel secundario útil.
  - **Peligros si se mantiene como estaba:** las acciones secundarias quedarían ocultas o dependerían de overlays nacidos para escritorio.
  - **Peligros del cambio:** reorganizar acciones puede degradar descubribilidad o perder filtros/scroll.
  - **Trabajo incluido:** estado de colección, detalle, preferencias vigentes, sesiones/métodos de acceso y guard administrativo.

- [ ] **Hito 9 - Adaptar gestores a Mobile.**
  - **Descripción:** crear vistas Mobile para autores, universos, sagas, antologías y libros.
  - **Por qué se necesita:** sus tablas y formularios laterales no son adecuados para toque ni ancho reducido.
  - **Qué se espera lograr:** listas/cards compactas y maestro-detalle tablet con CRUD, filtros, paginación, confirmaciones e imágenes completos.
  - **Peligros si se mantiene como estaba:** móvil dependería de tablas comprimidas y scroll horizontal.
  - **Peligros del cambio:** una simplificación visual puede omitir acciones o romper la vuelta al contexto de listado.
  - **Trabajo incluido:** altas/edición canónicas, restauración de filtros/scroll, modales auxiliares y errores recuperables.

- [ ] **Hito 10 - Adaptar libros y narrativa a Mobile.**
  - **Descripción:** crear shell Mobile del libro, índice, búsqueda, estadísticas y editores narrativos táctiles.
  - **Por qué se necesita:** es la superficie funcional más compleja y sensible a teclado, overlays y pérdida de trabajo.
  - **Qué se espera lograr:** todas las entidades y relaciones de escritorio disponibles en compact/medium sin depender de drag, hover ni controles pequeños.
  - **Peligros si se mantiene como estaba:** escenas, RTF y selectores seguirían siendo frágiles en móvil y plegables.
  - **Peligros del cambio:** destruir vistas al rotar o cruzar el breakpoint puede perder selección y borradores.
  - **Trabajo incluido:** índice superpuesto/rail, sheets o pantallas completas, autosave, guards, selección RTF y transición 1050/1051.

- [ ] **Hito 11 - Adaptar comunidad y mensajería a Mobile.**
  - **Descripción:** crear vistas Mobile para resumen, actividad, perfiles, amistades, bloqueos, clubes, chat y notificaciones sociales.
  - **Por qué se necesita:** combina navegación profunda, realtime, scroll y compositor con teclado.
  - **Qué se espera lograr:** una columna en compact, maestro-detalle en tablet y reconexión sin duplicados ni pérdida de contexto.
  - **Peligros si se mantiene como estaba:** conversaciones y acciones sociales quedarían recortadas o competirían con la navegación global.
  - **Peligros del cambio:** listeners duplicados o vistas simultáneas pueden repetir eventos y notificaciones.
  - **Trabajo incluido:** badges, scroll, teclado, estados de conexión y exclusión total de moderación administrativa.

- [ ] **Hito 12 - Consolidar web móvil, PWA y plegables.**
  - **Descripción:** activar Mobile en QA, validar todos los anchos y retirar definitivamente light/dark cuando exista paridad.
  - **Por qué se necesita:** las verticales aisladas no demuestran transiciones, orientación, workers ni actualización del conjunto.
  - **Qué se espera lograr:** una PWA online-first estable en compact/medium y una transición segura hacia Wood en 1051px.
  - **Peligros si se mantiene como estaba:** podrían reaparecer versiones obsoletas, overflow o pérdida de estado al plegar y rotar.
  - **Peligros del cambio:** activar la flag antes de paridad expondría rutas incompletas; producción permanece apagada hasta cumplir el checklist.
  - **Trabajo incluido:** 360/390/600/800/1050/1051, portrait/landscape, offline explicativo, Service Worker/Firebase Messaging y limpieza de tema.

- [ ] **Hito 13 - Completar la integración Android.**
  - **Descripción:** convertir el spike aprobado en adaptadores productivos y completar las capacidades nativas necesarias.
  - **Por qué se necesita:** web móvil y WebView comparten UI, pero autenticación, push, enlaces, archivos y ciclo de vida requieren puentes nativos.
  - **Qué se espera lograr:** paridad no administrativa con autenticación, sesión, realtime, push, archivos, Atrás, red, splash, iconos y app links.
  - **Peligros si se mantiene como estaba:** el APK sería solo un navegador empaquetado con flujos rotos o permisos incoherentes.
  - **Peligros del cambio:** configuraciones QA, secretos o credenciales podrían filtrarse; los artefactos se inspeccionan antes de publicar.
  - **Trabajo incluido:** builds QA/prod separados, actualización sobre instalación previa y cierre seguro al revocar sesión.

- [ ] **Hito 14 - Firmar y distribuir la APK directa.**
  - **Descripción:** producir APK reproducibles y publicarlas manualmente mediante GitHub Releases, sin Play Store.
  - **Por qué se necesita:** Android exige una firma estable para aceptar actualizaciones y el usuario necesita un canal simple de descarga.
  - **Qué se espera lograr:** APK universal firmada, checksum, notas y aviso interno no intrusivo de nueva versión.
  - **Peligros si se mantiene como estaba:** perder la clave impediría actualizar instalaciones existentes; distribuir archivos sin checksum dificulta verificar integridad.
  - **Peligros del cambio:** un actualizador invasivo amplía permisos; la app solo abre la descarga y Android controla la instalación.
  - **Trabajo incluido:** keystore fuera del repo y con copia offline, GitHub secrets, Gradle/Actions, SemVer/`versionCode` y release manual.

- [ ] **Hito 15 - Actualizar y ejecutar la QA integral final heredada.**
  - **Descripción:** absorber la matriz anterior y validar Wood, Mobile web, PWA y APK sobre el resultado completo.
  - **Por qué se necesita:** la campaña alojada anterior no llegó a ejecutarse y su objetivo visual fue sustituido.
  - **Qué se espera lograr:** una puerta reproducible con cero defectos críticos/altos y evidencia sanitizada de web y Android.
  - **Peligros si se mantiene como estaba:** se podría publicar una APK o activar Mobile con regresiones de sesión, edición, permisos o actualización.
  - **Peligros del cambio:** concentrar la regresión al final puede revelar fallos transversales tarde; cada hito mantiene unitarias, build y smokes focalizados.
  - **Trabajo incluido:** Wood 1440/1920/2560; Mobile 360/390/600/800/1050 y límite 1050/1051; Chromium/Firefox; PWA; emulador y Android físico; auth completa, realtime, producto, accesibilidad, seguridad, secretos y actualización de APK.
  - **Puerta:** no publicar la APK productiva ni finalizar el roadmap hasta que la campaña esté verde y el propietario complete el smoke físico.

## Dependencias y secuencia

1. H0 cierra la documentación antes de tocar producto.
2. H1 define la separación y bloquea toda restauración o UI Mobile.
3. H2-H4 restauran Wood de forma incremental sin checkout masivo.
4. H5 debe terminar antes de comprometer la arquitectura Android; un bloqueo backend no detiene H6-H12.
5. H6 fija el sistema visual y precede a H7-H11.
6. H8 valida navegación y datos antes de H9-H11; H10 y H11 pueden avanzar independientemente después de H8.
7. H12 exige paridad de H7-H11 y controla el corte web de la feature flag.
8. H13 depende de una puerta verde de H5 y de la presentación Mobile estable.
9. H14 depende de H13 y de la custodia confirmada de la clave de firma.
10. H15 es deliberadamente el último hito y absorbe toda la QA integral pendiente.

## Criterio de cierre

- Wood es fiel a su baseline y estable en escritorio, wide y ultrawide.
- Mobile posee HTML/Sass propios y no parece un recoloreado o compresión de Wood.
- Toda función no administrativa existe en Mobile web y Android.
- Cruzar breakpoints, plegar, rotar o volver de segundo plano no pierde trabajo.
- Light/dark y sus selectores no permanecen activos; los valores backend legacy se toleran sin decidir la presentación.
- APK funciona conectada, explica el estado offline y ofrece actualización manual firmada.
- No se reintroducen rutas, tokens o contratos legacy ni secretos en artefactos.
- La checklist asociada y el Hito 15 quedan finalizados con cero críticos/altos abiertos.
