# Web claro/oscuro, Wood opcional y reorganización de navegación

## Objetivo

Dar al navegador su propia presentación **Web** en claro y oscuro —moderna, limpia y centrada en la usabilidad y la lectura, sin renunciar a la estética—, conservar **Wood** como alternativa estética y rompedora elegible solo en escritorio, y reorganizar la navegación web alrededor del perfil y de la administración. La APK Android no cambia.

## Decisiones fijadas (25/9/2026, propietario)

- **Tres presentaciones independientes:**
  - `native-mobile`: APK Android. Se considera terminada; esta iniciativa no toca sus vistas, tokens, navegación ni comportamiento.
  - `web`: navegador a cualquier ancho, desde 320 px hasta ultrawide. Temas claro y oscuro. Árbol de vistas propio; no depende de Mobile ni de Wood.
  - `wood`: navegador por encima de 1050 px, elegible. Apariencia única.
- **Tema por dispositivo.** Cada navegador recuerda su elección (Claro, Oscuro o Wood). La preferencia de cuenta (`/usuarios/me/preferencias-interfaz`, que ya acepta `wood|light|dark`) solo aporta el valor inicial de un dispositivo sin elección propia; un cambio en otro dispositivo no sobrescribe la elección local.
- **Wood por debajo de 1051 px** se sustituye por Claro sin perder la elección: al volver a escritorio se recupera Wood.
- **Selector de tema en Preferencias**, con las tres opciones y Wood deshabilitado con explicación por debajo de 1051 px.
- **Administración** existe en la Web con cualquier tema, no solo en Wood.
- **Navegación (Web y Wood):**
  - La navbar deja de enlazar Autores, Universos, Sagas, Libros y Antologías; esos listados se alcanzan desde el Perfil.
  - Los formularios de alta embebidos hoy en esos gestores salen a vistas propias, accesibles desde el panel de Administración.
  - Cuenta y seguridad y Preferencias se alcanzan desde el Perfil. (En la APK siguen siendo destinos de primer nivel, como hoy.)
- La paleta Mobile gusta como punto de partida para Web claro/oscuro, pero Web tendrá tokens propios en un parcial independiente.
- Funcionalidad nueva: se desarrolla y valida en QA; producción no cambia hasta la aceptación.

## Decisiones pendientes

- [x] **Propuestas de usuarios sin rol de administración** (resuelta el 25/9): las propuestas viven en Catálogo, que ya ofrece «Pedir nuevo libro» y «Pedir nueva antología» y se amplía a autores, universos y sagas. Las altas directas quedan en Administración. No requiere petición: `/peticiones/catalogo` ya acepta `TipoEntidad` `autor|universo|saga|libro|antologia`.

## Contexto de datos reales

- Muchos libros antiguos no tienen página final registrada. La barra de progreso de libros, sagas y universos se basa en el total de páginas, así que muestra menos progreso del real. Es un dato incompleto, no un bug visual; no debe «corregirse» visualmente.
- La biblioteca del propietario tiene muchos universos y sagas. Su estado abierto por defecto es «Sin universo» con la saga de la lectura actual desplegada; cualquier diseño de biblioteca debe probarse con ese volumen.

## Hito 0 — Dirección y documentación

- [x] **Pausar el roadmap anterior**
  - **Descripción:** pausar `ROADMAP_PAUSADO_lector-persistente-y-pulido-multisoporte.md`, sustituir su Hito 4 y transferir su Hito 5 aquí.
  - **Por qué se necesita:** solo puede existir un roadmap activo.
  - **Qué se espera lograr:** los pendientes Android quedan intactos y localizables.
  - **Peligros si se mantiene como estaba:** dos iniciativas amplias compitiendo por el mismo árbol web.
  - **Peligros del cambio:** olvidar validaciones físicas Android; quedan explícitas en el roadmap pausado.

- [x] **Guía de estilos y contrato de presentaciones**
  - **Descripción:** reescribir `docs/GUIA_ESTILOS.md` y `CONTRATO_PRESENTACIONES_WOOD_MOBILE.md` con las tres presentaciones, la resolución por ancho/plataforma/preferencia, el tema por dispositivo y la nueva navegación.
  - **Por qué se necesita:** la guía vigente fija «desktop = Wood» y «navegador pequeño = Mobile».
  - **Qué se espera lograr:** una fuente de verdad coherente antes de escribir código.
  - **Peligros si se mantiene como estaba:** implementaciones que siguen la guía antigua.
  - **Peligros del cambio:** reabrir decisiones Mobile aceptadas; la guía debe dejar Mobile/APK intacto.
  - **Hecho (25/9):** `docs/GUIA_ESTILOS.md` describe las tres presentaciones con un aviso de transición, añade la sección Web y limita las reglas Mobile a la APK tras el cierre. `CONTRATO_PRESENTACIONES_WEB.md` fija selección, tema por dispositivo, patrón de feature, transición con `webPresentationEnabled` y puertas; el contrato anterior queda como histórico para el navegador.

- [x] **Muestra visual Web aprobada**
  - **Descripción:** laboratorio local `/__web-design/:screen` (como el de Mobile) con biblioteca, libro/capítulo y perfil en claro y oscuro a 390, 1440 y 1920 px.
  - **Por qué se necesita:** fijar el lenguaje Web antes de multiplicarlo por todas las pantallas.
  - **Qué se espera lograr:** aprobación explícita del propietario sobre tipografía, color, densidad y navegación.
  - **Peligros si se mantiene como estaba:** rediseños tardíos sobre muchas vistas ya construidas.
  - **Peligros del cambio:** coste de una muestra desechable; se limita a tres pantallas.
  - **Estado (25/9):** laboratorio implementado en `src/app/components/pages/web-design-preview/` con tokens propios en `src/assets/css/web/_tokens.sass` (aún sin emisión global). Biblioteca, capítulo y perfil en claro/oscuro; sin overflow ni errores a 390, 1440 y 1920 px en Chromium. El propietario delega el diseño (25/9); se adoptan índice desplegable en compact y fuentes del sistema.

## Hito 1 — Infraestructura de presentación y tema

- [x] **Presentación `web` y resolución**
  - **Descripción:** añadir `web` a `PresentationModeService`: APK → `native-mobile`; navegador → `wood` si la elección del dispositivo es Wood y el ancho supera 1050 px, si no `web`. Atributos raíz `data-presentation-active` y `data-web-theme`.
  - **Por qué se necesita:** hoy el ancho decide la presentación y no existe la Web.
  - **Qué se espera lograr:** una única fuente de decisión, sin dos árboles DOM ni suscripciones duplicadas.
  - **Peligros si se mantiene como estaba:** no hay forma de ofrecer claro/oscuro en escritorio.
  - **Peligros del cambio:** alterar la APK; `native-mobile` debe resolverse exactamente igual que hoy.
  - **Hecho (25/9):** `PresentationModeService` conoce la elección Web (`isWebPresentation`, `webThemeChoice`) y admite el modo `web` tras el token `WEB_VIEWS_READY` (apagado hasta el Hito 3). Mientras tanto publica el mismo destino que antes, porque varias hojas compartidas dependen de `data-presentation-target`. La dependencia se invierte (`attachWebTheme`) para evitar ciclos de módulos.

- [x] **Tema por dispositivo**
  - **Descripción:** persistencia local por usuario y dispositivo; preferencia de cuenta solo como valor inicial; ignorar eventos realtime de otros dispositivos para la elección local.
  - **Por qué se necesita:** decisión del propietario (Wood en escritorio, oscuro en otro dispositivo).
  - **Qué se espera lograr:** cada navegador conserva su tema entre sesiones.
  - **Peligros si se mantiene como estaba:** cambiar el tema en un dispositivo cambiaría todos.
  - **Peligros del cambio:** perder la elección en navegación privada; se degrada a la preferencia de cuenta.
  - **Hecho (25/9):** `WebThemeService` guarda la elección en `libros:web-theme:<userId>` y `libros:web-theme:last`, adopta el tema de cuenta solo sin elección local y lo actualiza como valor inicial. En transición, `MobileThemeService` refleja el tema del dispositivo en el navegador y su sol/luna lo modifica; la APK no cambia.

- [x] **Selector en Preferencias**
  - **Descripción:** tres opciones con muestra visual en las Preferencias Web y Wood; Wood deshabilitado con motivo por debajo de 1051 px.
  - **Por qué se necesita:** hoy no existe selector web.
  - **Qué se espera lograr:** cambio de tema inmediato, sin recarga ni pérdida de borradores.
  - **Peligros si se mantiene como estaba:** Wood es la única experiencia de escritorio.
  - **Peligros del cambio:** perder estado al sustituir la vista; la fachada debe capturarlo antes.
  - **Hecho (25/9):** sección «Apariencia» con Claro, Oscuro y Wood (deshabilitado por debajo de 1051 px) y aviso de transición en escritorio. Validado en QA local (Chromium/Firefox) a 1440 y 390 px; oculto sin flag.

- [x] **Tokens y tema Material Web**
  - **Descripción:** `src/assets/css/web/_tokens.sass` y `_primitives.sass` propios; tema Material claro/oscuro para `web` en `_material-themes.scss`, incluido el overlay container.
  - **Por qué se necesita:** Web no debe depender de Mobile ni de Wood.
  - **Qué se espera lograr:** controles Material coherentes en ambos temas.
  - **Peligros si se mantiene como estaba:** colores por defecto de Material filtrándose.
  - **Peligros del cambio:** duplicar valores Mobile; se aceptan como punto de partida en un archivo independiente.
  - **Hecho (25/9):** `styles.sass` emite los tokens Web bajo `html[data-presentation-active='web']` (y `.web-ui`), con la variante oscura por `data-web-theme`. `_material-themes.scss` genera el tema Material `color-scheme` y sobrescribe sus colores de sistema con los tokens Web, de modo que un único bloque sirve para claro y oscuro, overlays incluidos. Comprobado forzando el atributo: `--mat-sys-primary` resuelve a `#0b6b5e` en claro y `#7fd6c4` en oscuro. Coste: +7,5 kB de CSS global sin comprimir (≈1 kB gzip); el presupuesto inicial ya se superaba antes del cambio.

- [x] **Transición controlada**
  - **Descripción:** flag de entorno `webPresentationEnabled` (activo en QA, apagado en producción). Mientras una ruta no tenga vista Web, Claro/Oscuro usan Wood en escritorio y Mobile en pantalla pequeña.
  - **Por qué se necesita:** construir por pantallas sin romper producción.
  - **Qué se espera lograr:** QA siempre navegable; producción idéntica hasta el cierre.
  - **Peligros si se mantiene como estaba:** una rama larga imposible de validar por partes.
  - **Peligros del cambio:** fallback incoherente; se documenta y se retira al cierre.
  - **Hecho (25/9):** `webPresentationEnabled` activo solo en `environment.qa.ts`. Desde el 25/9 la transición es por ruta (`data: { webView: true }`) en lugar de global.

## Hito 2 — Reorganización de navegación (Web y Wood)

- [x] **Gestores desde el Perfil**
  - **Descripción:** retirar de la navbar Autores, Universos, Sagas, Libros y Antologías y enlazarlos desde el Perfil.
  - **Por qué se necesita:** la navbar acumula dieciséis iconos sin agrupación.
  - **Qué se espera lograr:** navegación principal centrada en leer; los listados propios viven con la identidad del usuario.
  - **Peligros si se mantiene como estaba:** navegación saturada y difícil de descubrir.
  - **Peligros del cambio:** romper enlaces profundos; las rutas `/dashboard/<gestor>` se conservan.
  - **Hecho en Wood (25/9):** la barra lateral conserva Biblioteca, Catálogo, Estadísticas, Comunidad, Mensajes, notificaciones, Administración y cierre de sesión. El menú del Perfil añade «Tu biblioteca» (Autores, Universos, Sagas, Libros, Antologías) y se compacta en portátiles de poca altura para caber sin desplazamiento a 1366×768. La vista Web lo heredará en el Hito 4. Referencia visual `account-security` regenerada en Windows; la de Linux queda pendiente (la campaña nocturna la compara).

- [x] **Gestión del catálogo en Administración** *(replanteado el 25/9 tras la revisión del propietario)*
  - **Descripción:** los formularios de alta y edición salen por completo de los gestores personales. La «Gestión de libros» del panel de Administración aloja el formulario a la derecha (crear y editar) y se crean las gestiones equivalentes de Antologías, Autores, Universos y Sagas sobre `catalogo/admin/*`, agrupadas en el menú del panel.
  - **Por qué se necesita:** dar de alta entidades públicas es una tarea de administración y no debe vivir dentro del perfil privado.
  - **Qué se espera lograr:** administración gestiona todo el catálogo desde un único lugar, con listado y formulario lado a lado.
  - **Peligros si se mantiene como estaba:** formularios públicos mezclados con listados personales.
  - **Peligros del cambio:** perder capacidades del formulario actual (portada, ISBN, altas auxiliares); se migran una a una empezando por Libros.
  - **Libros hecho (25/9):** la «Gestión de libros» sustituye su modal por un panel lateral siempre visible que crea (portada obligatoria) y edita sobre `catalogo/admin/libros`. El panel queda a la derecha desde 1400 px, ocultando el ISBN de la tabla por debajo de 1700 px, y por debajo baja bajo el listado y se desplaza a la vista al editar. El menú de Administración se compacta por debajo de 1700 px. Antologías también cubiertas (ver abajo).
  - **Autores, Universos y Sagas hecho (25/9):** `AdminCatalogEntitiesComponent` gestiona los tres tipos con el mismo patrón (listado canónico paginado y panel lateral de alta y edición sobre `catalogo/admin/*`). Autores se lee del listado; universos y sagas cargan su detalle para precargar autores, universo y subtítulo. Las secciones cuelgan de Administración junto a «Gestión de libros» y también están disponibles para moderación de catálogo. Las rutas `/dashboard/<gestor>/new` y `/:id` de libros, autores, universos y sagas redirigen a su sección del panel.
  - **Antologías hecho (25/9):** «Gestión de libros» admite `kind="antologia"`: lista `/catalogo/antologias`, precarga el editor con `/catalogo/antologias/{id}/detalle-publico` (que ahora incluye `Universo` y `Saga`) y escribe con `catalogo/admin/antologias`. Funcionará de extremo a extremo cuando el backend despliegue el arreglo aceptado; comprobado con datos del contrato.

- [x] **Propuestas desde Catálogo**
  - **Hecho (25/9):** «Pedir nuevo libro» más un menú «Más peticiones» con antología, autor, universo, saga y «Proponer corrección». La corrección permite elegir el tipo y buscar el elemento concreto, porque el backend exige `EntidadId`. «Otro» (título opcional y texto obligatorio, `TipoEntidad: otro`) añadido tras la aceptación backend del 25/9.

- [x] **Listados personales dentro del Perfil**
  - **Descripción:** Autores, Universos, Sagas, Libros y Antologías pasan a ser apartados del panel del Perfil, de solo consulta. Pulsar un libro o antología abre su ficha; pulsar un autor, universo o saga lleva a la Biblioteca filtrada. Las rutas `/dashboard/<gestor>` redirigen al apartado.
  - **Por qué se necesita:** hoy los enlaces del Perfil sacan al usuario del Perfil.
  - **Qué se espera lograr:** consultar lo propio sin perder el contexto.
  - **Peligros si se mantiene como estaba:** navegación que salta entre pantallas sin relación visual.
  - **Peligros del cambio:** perder filtros, orden o paginación de los gestores actuales; se conservan.
  - **Hecho en Wood (25/9):** `ObjectManagerComponent` admite `embeddedKind`; incrustado en el Perfil muestra solo el listado (métricas, búsqueda, filtros, orden y paginación), sin formulario ni acción de edición, con filas pulsables por ratón y teclado. Libros y antologías abren su ficha; autores, universos y sagas dejan el filtro correspondiente en la Biblioteca y navegan a ella. `/dashboard/<gestor>` redirige a `/dashboard/profile?section=<tipo>`; las rutas `/new` y `/:id` siguen para administración hasta completar la gestión del catálogo.

- [x] **Cuenta y Preferencias desde el Perfil**
  - **Descripción:** el Perfil enlaza Cuenta y seguridad y Preferencias; la navbar web deja de hacerlo. La APK no cambia.
  - **Por qué se necesita:** decisión del propietario.
  - **Qué se espera lograr:** un único punto de entrada para todo lo personal.
  - **Peligros si se mantiene como estaba:** accesos duplicados y dispersos.
  - **Peligros del cambio:** contradice la regla Mobile vigente; la guía debe limitarla a la APK.
  - **Hecho en Wood (25/9):** el Perfil enlaza Cuenta y seguridad y Preferencias bajo «Cuenta»; la barra lateral deja de hacerlo. Mobile/APK sin cambios.

## Hito 3 — Shell Web responsive

- [x] **Navegación y shell**
  - **Descripción:** cabecera y navegación Web de 320 px a ultrawide, con límites de ancho de lectura y columnas contextuales en wide.
  - **Por qué se necesita:** es la base de todas las vistas Web.
  - **Qué se espera lograr:** navegación clara, teclado y foco completos, sin overflow horizontal.
  - **Peligros si se mantiene como estaba:** cada vista inventa su propio layout.
  - **Peligros del cambio:** copiar el shell Mobile; Web tiene composición propia.
  - **Hecho (25/9):** `WebNavigationComponent` (`src/app/components/web/ui/`) da navegación lateral con texto y plegable en escritorio (se recuerda en el dispositivo), rail en medium y app bar con cajón en compact; destinos Biblioteca, Catálogo, Comunidad, Mensajes y Estadísticas, y al pie Administración, Perfil y cierre de sesión. El dashboard la carga con `@defer` para no penalizar la carga inicial fuera de Web. Pendiente: centro de notificaciones Web.

## Hito 4 — Vistas Web

Cada punto incluye vista claro/oscuro, pruebas unitarias de la vista y validación Playwright Chromium/Firefox a 390, 1440 y 1920 px.

- [x] **Estadísticas globales** (primera vista Web, 25/9): `WebStatisticsViewComponent` reutiliza datos y series del contenedor y aplica colores del tema Web, recalculados al cambiar claro/oscuro. Validada en Chromium/Firefox a 1440 y 390 px en ambos temas; las rutas sin vista Web siguen en Wood.
- [ ] **Biblioteca y Catálogo** (probar con el volumen real del propietario).
- [ ] **Espacio de libro:** índice, capítulo/escenas/RTF, entidades narrativas, búsqueda y estadísticas.
- [ ] **Perfil, gestores, Cuenta y seguridad, Preferencias y Estadísticas globales.**
- [ ] **Comunidad, chat, clubes y notificaciones.**
- [ ] **Administración**, incluidas las nuevas vistas de alta.
- [ ] **Zona pública y autenticación.**

Para cada vista: **Descripción** — vista Web propia sobre la fachada existente. **Por qué** — completar la presentación. **Qué se espera** — paridad funcional sin tocar la lógica. **Peligros si no** — fallback permanente. **Peligros del cambio** — divergencia funcional; la fachada sigue siendo la única dueña del estado.

## Hito 5 — Pulido Wood (transferido del roadmap pausado)

- [ ] **Coherencia y ancho en escritorio**
  - **Descripción:** tokens y mixins Wood (`src/assets/css/wood/_tokens.sass`), titulares serif coherentes, acentos dorados en lugar de verdes, familia de botones única, límites de ancho en wide/ultrawide, paginación y espacios vacíos de gestores y comunidad, botón «Instalar» sin tapar contenido, chips de personajes con la paleta Wood y errores técnicos nunca visibles.
  - **Por qué se necesita:** auditoría del 25/9 con datos reales: «se le ven las costuras».
  - **Qué se espera lograr:** Wood cohesionado sin rediseño completo.
  - **Peligros si se mantiene como estaba:** deuda visual creciente.
  - **Peligros del cambio:** degradar la referencia histórica o extender Bootstrap legacy.

## Hito 6 — Cierre

- [ ] **Regresión y aceptación**
  - **Descripción:** unitarias, build, Playwright Chromium/Firefox, verificación de que la APK no cambia (build nativa QA y comparación de vistas), aceptación del propietario en QA y paso a producción retirando la flag y el fallback.
  - **Por qué se necesita:** la iniciativa cambia la presentación de toda la web.
  - **Qué se espera lograr:** producción con Web claro/oscuro, Wood opcional y navegación reorganizada.
  - **Peligros si se mantiene como estaba:** —
  - **Peligros del cambio:** regresiones en la APK; se verifican explícitamente.
