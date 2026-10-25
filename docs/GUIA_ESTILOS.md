# Guía de estilos visuales

Fuente de verdad para decisiones visuales del frontend. Si una pantalla o ajuste contradice esta guía, se actualiza primero la guía o se registra explícitamente la excepción.

## Dirección visual

> **Estado (27/9/2026).** El navegador usa la presentación `web` (claro/oscuro) en todas las rutas, zona pública incluida, y Wood cuando el dispositivo lo elige por encima de 1050 px. El mecanismo de transición por ruta se retiró; Mobile en navegador solo existe con la presentación Web desactivada en local, para las regresiones.
>
> **Corte de la adhesión (hito 4, 25/10/2026).** La APK de Capacitor (`native-mobile`) se retiró de la web: queda sin soporte y su código está en la etiqueta `apk-capacitor-final`. La APK nueva es la nativa en Kotlin de `android-nativa/`, clon exacto de la de Capacitor, con su tema sacado de los tokens Mobile (`_tokens.sass`). Lo que esta guía dice de la APK o de Android describe la de Capacitor y sirve de referencia para el clon. La administración tampoco está ya en la web: es el plugin de la administración de la plataforma.

- La web tiene tres presentaciones, no temas intercambiables: `web`, `wood` y `mobile` (solo en local, para las regresiones y como referencia del clon Kotlin).
- `web` es la presentación del navegador a cualquier ancho: estándar, moderna, limpia y centrada en la usabilidad y la lectura, sin renunciar a la estética. Ofrece tema claro y oscuro.
- `wood` es la alternativa estética y rompedora del navegador de escritorio: cuero, papel envejecido, dorados apagados, navegación flotante y profundidad sutil. Solo es elegible por encima de 1050 px y conserva una única apariencia.
- `mobile` es el aspecto de la APK (antes `native-mobile` con Capacitor, retirado en el hito 4). Se considera terminado: ninguna decisión Web o Wood modifica sus vistas, tokens, navegación ni comportamiento. Conserva claro/oscuro desde su app bar.
- Rutas, permisos, contratos, estado, autosave y lógica son compartidos. Cada presentación tiene componentes, HTML, Sass, navegación, cabeceras y composición independientes; Web no reutiliza vistas ni tokens de Mobile ni de Wood.
- Nunca se adapta Wood mediante una cascada de media queries ni se construye una presentación como recoloreado del markup de otra.
- Solo se instancia una vista de cada feature. Su container/fachada conserva estado al cambiar de ancho, tema, orientación o plataforma.

## Modos de presentación

- **Selección.** `wood` si el tema elegido en ese dispositivo es Wood y el ancho supera 1050 px; en cualquier otro caso `web` con el tema claro u oscuro del dispositivo. Sin la presentación Web (solo en local), `mobile` por debajo de 1051 px.
- **Tema por dispositivo.** Cada navegador recuerda su elección (Claro, Oscuro o Wood) y la conserva al cambiar de cuenta. Con la cuenta de Yosiftware el tema no se guarda en la cuenta (`ACCESO.md`, «Los ajustes de la web»); la bienvenida «Elige tu estilo» sale en un dispositivo que aún no ha elegido.
- **Wood por debajo de 1051 px** se sustituye por Claro sin olvidar la elección: al volver a escritorio se recupera Wood.
- **El selector de tema** vive en Preferencias, con las tres opciones y una muestra visual. Wood aparece deshabilitado, con su motivo, por debajo de 1051 px. Mobile conserva su interruptor sol/luna.
- Rangos de ancho Web: `compact` `320-599px`, `medium` `600-1050px`, `desktop` desde `1051px`, `wide` desde `1600px`, `ultrawide` desde `2560px`. Wood solo existe en `desktop` y superiores, con los mismos modificadores `wide`/`ultrawide`.
- La selección usa el ancho disponible y la elección del dispositivo; nunca marca/modelo o user-agent.
- Orientación, altura, `hover`, puntero y teclado virtual complementan el layout sin crear otros shells globales.
- La administración no existe en la web: es el plugin de Libros de la administración de la plataforma (hito 4 de la adhesión). `/adminpanel` y `/dashboard/adminpanel` llevan a la Biblioteca.
- El chat flotante existe en Web `desktop` y en Wood; en anchos menores y en la APK se usa navegación de página completa o maestro-detalle. Mensajes ofrece «Abrir en ventana» (lista y conversación) cuando el escritorio lo admite. Desde la adhesión (hito 3) el chat es el de la plataforma (`/v1/chat/…` y su tiempo real) pintado con la interfaz de siempre: texto plano, las cinco reacciones de Libros por su emoji (❤️ 😂 😮 😢 👍) y las demás reacciones tal cual, los susurros marcados junto a la fecha y los avisos del chat como mensajes de sistema. Cómo quedan las ventanas va en los ajustes de Libros de la cuenta (`yosiftware.ajustes`, clave `chatFlotante`).
- **Lectura en curso.** Al salir de un libro al panel se recuerda dónde estaba: en Web `desktop` y en Wood, ventana flotante «Estabas leyendo» plegable a píldora; en Web `compact`, chip inferior (como la píldora de la APK).
- En plegables se prioriza reflow continuo. La bisagra solo puede tratarse como mejora progresiva.

## Separación de responsabilidades

- Cada ruta compleja usa un container/fachada de aplicación y dos vistas presentacionales cuando ambas sean necesarias.
- El container posee carga, comandos, errores, borradores, autosave y reconciliación. Las vistas reciben estado y emiten intenciones.
- Al cruzar `1050/1051` con Wood elegido, o al cambiar de tema entre Web y Wood, la fachada sobrevive, captura el estado editable síncronamente y solo después sustituye la vista.
- No mantener dos árboles DOM ocultos ni duplicar subscriptions, sockets, efectos o llamadas HTTP.
- Se permite reutilizar un widget funcional neutral —por ejemplo, el núcleo RTF— cuando no imponga layout ni estética. Si impone composición, tendrá variante por presentación.
- Los overlays abiertos se cierran o transfieren de forma controlada antes de cambiar de presentación.

## Wood

- El commit `272376f497ec189241a35d3353a95af1b018c639` es referencia visual, no fuente para un rollback literal.
- No se revierten TypeScript, rutas, Firebase, permisos, contratos, PWA, realtime ni correcciones funcionales posteriores.
- Fondo principal de paneles: variantes cercanas a `rgba(20, 17, 13, .72-.78)`.
- Bordes editoriales: variantes cercanas a `rgba(218, 166, 91, .22-.32)`.
- Texto principal: `#f6e6c9`, `#f0dfc5` o `#fbecd6`; secundario: `#d8c3a2`, `#cdb895` o `#bfa77f`.
- Acentos dorados: `#e9b66b`, `#d9a956`, `#f2c77c`.
- Titulares: Georgia o serif equivalente. Texto operativo: sans-serif compacta y legible.
- Se conservan `fondo_router.png`, `fondo_menu.png`, `fondo_desplegable.png` y `fondo_libro.png` en sus superficies históricas. No reintroducir `fondo.png` descartado.
- Las funciones nuevas se integran con discreción dentro del lenguaje Wood; no se insertan cards Material modernas sin adaptación.
- Wide/ultrawide puede añadir columnas o espacio contextual, pero limita lectura, formularios y editores. El contenido no se estira proporcionalmente al monitor.

## Web

- **Carácter.** Una web de lectura: jerarquía tipográfica clara, superficies limpias, mucho aire útil y color al servicio del estado. La estética se expresa en la tipografía, las portadas y el ritmo, no en texturas ni fondos decorativos.
- **Tokens propios** en `src/assets/css/web/_tokens.sass`, con variantes claro y oscuro redefinidas en la raíz (`data-web-theme`). La paleta parte de la de Mobile —fondos cálidos, tinta oscura, acento verde azulado sobrio— pero vive en su propio archivo y puede evolucionar sin afectar a la APK.
- **Tipografía.** Serif de lectura para títulos, nombres de libros y texto largo; sans-serif compacta para la interfaz operativa. Los textos largos no superan unos 72 caracteres por línea.
- **Composición.** En `desktop` la navegación principal es lateral con icono y texto, plegable a iconos; en `medium`, rail; en `compact`, app bar con menú lateral. La cabecera nunca repite lo que ya dice la navegación.
- **Ancho.** Contenido limitado (del orden de 1280 px) y centrado; `wide`/`ultrawide` añaden columnas o paneles contextuales, nunca estiran listas, formularios o editores.
- **Forma.** Retícula de 4/8 px, radios moderados (8-12 px), bordes de 1 px y sombras mínimas reservadas a elementos flotantes.
- **Estados.** Contraste WCAG AA en ambos temas, foco siempre visible, estados que no dependan solo del color, movimiento de `150-200ms` y `prefers-reduced-motion` respetado.
- Material/CDK aportan infraestructura y accesibilidad; su tema Web se genera desde los tokens Web y se aplica también al overlay container.
- Un laboratorio local `/__web-design/:screen`, solo en `localhost`/`127.0.0.1`, fija las referencias visuales antes de construir vistas.
- **Clases compartidas.** `web/_classes.sass` emite una vez, con `:where()` (especificidad mínima), `.web-button` (y `--primary`, `--small`), `.icon-button`, `.eyebrow`/`.web-eyebrow` y `.state`. Un componente no vuelve a declararlas si solo harían `@include` de la primitive; las usa y ajusta localmente lo que necesite.
- **Iconos.** Tamaños múltiplos de 4 px (16, 20, 24…): con escalados de pantalla no enteros (125 %, 150 %) los tamaños intermedios se recortan. `final-contracts.test.mjs` lo exige en Web y Mobile.
- **Contraste.** `--web-color-ink-subtle` cumple 4,5:1 sobre los fondos habituales; `e2e/web-accessibility.spec.ts` audita con axe las pantallas principales en ambos temas y no admite infracciones críticas ni graves.
- **Avisos.** Los errores de la API usan `SnackbarModule.openApiError`: título genérico de la pantalla y mensaje concreto del backend. Si el backend indica `field`, `markBackendFieldError` marca ese control en rojo.
- **Texto RTF.** Los colores explícitos del escritorio no se reescriben: si un tramo sin resaltado no se lee sobre el tema Web, se pinta con `--web-color-ink` mediante `data-rtf-ink`.
- **Primera visita.** La bienvenida «Elige tu estilo» va primero: mientras está pendiente o abierta, los avisos de decisión esperan y se presentan al elegir el estilo. Las normas pendientes las enseña el SDK de la plataforma.

## Mobile (APK)

> Las reglas de esta sección describen el aspecto de la APK: la de Capacitor (`native-mobile`, retirada en el hito 4) y, como referencia, el clon Kotlin. El navegador pequeño usa la presentación Web; `mobile` solo existe en local.


- Material 3 y CDK aportan infraestructura, accesibilidad y overlays; la identidad visual es propia, no el tema prebuilt de Material.
- Base visual: fondos cálidos muy claros, tinta oscura, superficies blancas/crema, acento verde azulado y un apoyo terroso reservado para estados o énfasis.
- Los tokens canónicos viven en `src/assets/css/mobile/_tokens.sass`: canvas `#f5f2ea`, superficie `#fffdf8`, tinta `#18211e`, primario `#006b5d` y contenedor primario `#9ff2df`. Las verticales consumen estas variables; no duplican la paleta en sus componentes.
- La variante oscura Mobile redefine esos mismos tokens en el nodo raíz. Ningún componente decide colores según el tema ni el selector altera Wood.
- Los avisos informativos Mobile usan los tokens azules `--mobile-color-info` y `--mobile-color-info-container`; cuando explican por qué una acción todavía no está disponible pueden usar `help_outline` sin convertir el aviso en error.
- Las primitives Sass canónicas viven en `src/assets/css/mobile/_primitives.sass`. App bar, navegación inferior/rail y estados reutilizables viven en `src/app/components/mobile/ui/`; una feature puede mantener composición propia sin convertir prematuramente cada bloque en una abstracción global.
- Contraste mínimo WCAG AA, foco visible y estados que no dependan solo del color.
- Sin texturas, fondos fotográficos, gradientes de madera ni sombras pesadas.
- Movimiento de `160-240ms` para cambios de estado y navegación local. `prefers-reduced-motion` elimina desplazamientos no esenciales.
- Todo control táctil esencial reserva al menos `44x44px`.
- Hover, tooltip y drag and drop son aceleradores, nunca el único acceso a una acción.
- Usar `100dvh`/`100svh`, `safe-area-inset-*` y el inset del teclado cuando el shell toque el viewport.
- En Android, la apertura del teclado conserva visible el control o caret enfocado mediante el desplazamiento mínimo del propietario de scroll más cercano. Se espera a que el viewport visual se estabilice, se reserva espacio temporal y se restaura al cerrar; no se centra indiscriminadamente el campo ni se desplaza a la vez documento y panel interno.
- Cada pantalla declara un único propietario de scroll. Evitar scrolls anidados salvo paneles maestro-detalle con límites claros.
- En compact, los modales complejos y editores auxiliares pueden ocupar toda la pantalla; en medium se permiten sheets o paneles laterales.
- La navegación compacta fija Biblioteca, Catálogo, Comunidad y Más. El alta es contextual; Más agrupa perfil, seguridad, preferencias, estadísticas y gestores. El cierre de sesión vive en Cuenta y seguridad, junto a la gestión de dispositivos, y no compite con los destinos de navegación.
- En `medium`, el rail aprovecha el alto disponible: Perfil abre la navegación, Estadísticas acompaña a los destinos principales antes de Más y Preferencias cierra la navegación al pie. La app bar autenticada muestra el avatar como acceso directo a Perfil y reserva el selector de tema para Más.
- Medium usa rail y solo muestra dos paneles cuando no comprime formularios, listas o acciones.
- El laboratorio `/__mobile-design/:screen` solo existe para revisión local en `localhost`/`127.0.0.1` y no activa la feature flag. Sus referencias son `login`, `library`, `chapter`, `community`, `security` y `onboarding` a 390/800 px (la isla del lector nativo se retiró con Capacitor).

## Sass, CSS y librerías

- Antes de cualquier cambio visual, releer esta guía y revisar los parciales, tokens, mixins y primitives de la presentación afectada. Esta comprobación es obligatoria aunque la tarea parezca pequeña o la guía se haya leído en una sesión anterior.
- Antes de crear una regla nueva, buscar en el Sass existente estilos con la misma intención. Si el patrón ya tiene un consumidor común, se reutiliza; si aparece por segunda vez con el mismo significado, se extrae en ese mismo cambio.
- Wood y Mobile mantienen entradas/parciales de presentación separados. Ningún selector de tema modifica ambos árboles.
- Solo se comparten reset, accesibilidad, tipografía base, funciones, tokens neutrales y primitives con varios consumidores demostrados.
- Reutilizar Sass al segundo uso real o antes cuando el roadmap identifica varios consumidores inmediatos.
- No deformar una pantalla para hacerla encajar en un mixin existente. Una solución específica puede generalizarse cuando aparezca un patrón estable.
- Los parciales compartidos prefieren variables, funciones y mixins sin emisión accidental. Las clases globales se emiten una sola vez.
- Elegir la abstracción más pequeña que resuelva la repetición:
  - **Token:** un valor con significado estable, como color, radio, spacing, ancho o duración.
  - **Función:** un cálculo puro reutilizado que devuelve un valor.
  - **Mixin:** un comportamiento o bloque de declaraciones repetido; sus parámetros representan variaciones reales y limitadas, no cada declaración posible.
  - **Primitive/componente:** un patrón visual y semántico completo con varios consumidores, como botón, campo, card, app bar o estado vacío.
- Los mixins de Wood y Mobile viven separados. Un parcial neutral solo puede cruzar ambas presentaciones cuando no contiene color, textura, geometría de shell ni decisiones de identidad.
- No crear un megamixin configurable para aparentar reutilización. Si dos bloques solo se parecen pero representan componentes distintos, comparten tokens o un mixin pequeño y conservan su composición local.
- Evitar `@extend` entre componentes o features: puede fusionar selectores no relacionados y aumentar el CSS emitido. Preferir mixins sin emisión, custom properties o una clase primitive explícita.
- Los parciales de feature no importan directamente Sass de otra feature. Un patrón compartido se mueve a `src/assets/css/wood/`, `src/assets/css/mobile/` o al área neutral correspondiente y ambos consumidores lo importan.
- Al cerrar un cambio visual, revisar el diff Sass, la emisión CSS y los budgets. Una extracción solo se considera mejora si reduce duplicación sin aumentar especificidad, acoplamiento o tamaño de forma injustificada.
- Bootstrap está congelado como legado Wood. No añadir clases, utilidades, mixins, componentes o dependencias Bootstrap.
- No incorporar React, Ionic, Tailwind ni otra librería CSS durante este roadmap.
- Las transiciones sencillas usan CSS o Web Animations. Otra dependencia requiere decisión técnica, accesibilidad, tree-shaking y budget.
- No elevar budgets para ocultar CSS duplicado; revisar primero emisión global, especificidad y lazy loading.

## Navegación y shells

### Shell general

- Wood recupera navbar/sidebar flotante, composición y fondos históricos.
- Mobile compacta usa app bar y bottom navigation; medium usa app bar y rail.
- Android medium puede retirar la app bar: en ese caso el contenido del router principal empieza bajo la safe area superior, pero el rail puede conservar altura completa hasta el borde físico cuando su composición lo requiera.
- Las rutas permanecen iguales y el cambio de presentación no añade entradas al historial.
- Las rutas desconocidas autenticadas vuelven a biblioteca a través de guards vigentes.
- En escritorio (Web y Wood, más de 1050 px y ratón), Ctrl+K / ⌘K abre la paleta de órdenes: diálogo centrado con buscador, resultados agrupados con cabecera en eyebrow y pie con los atajos. No existe en la APK ni en pantallas táctiles, que ya tienen su navegación propia.
- **Las webs, la campana y la cuenta** (hito 3 de la adhesión): `<yosi-webs>`, `<yosi-notificaciones>` y `<yosi-acceso>` van juntas en cada cabecera: al pie de la navegación lateral Web (en columna en medium y con la navegación plegada) y en su barra superior en compact, en la barra lateral de Wood bajo la cuenta, en la barra del libro (Web y Wood) y en la app bar de Mobile. Hay una sola campana en la página (es la que pone los avisos emergentes), que baja sus avisos con `--yosi-avisos-arriba` donde la cabecera es fija y toma el color de los iconos de la cabecera con `--yosi-color-campana` (los `_yosiftware.sass` de cada presentación). No hay campana, centro ni avisos propios. Las ventanas flotantes (chats y «Estabas leyendo») existen solo en el escritorio con sitio para ellas (≥1250 × 700, ratón); en el resto, Mensajes es la página de la comunidad y el libro aparcado es la píldora de la APK.

### Espacio de libro

- Wood recupera índice persistente y composición editorial de escritorio.
- Web ocupa la pantalla completa con una cabecera de una sola fila (volver, portada y título, pestañas Resumen/Notas/entidades, búsqueda y wiki). El índice lateral se pliega desde su propia cabecera a un carril; por debajo de 1051 px se superpone y se cierra también arrastrándolo. El capítulo ocupa todo el ancho; en escritorio con ratón los personajes se asignan arrastrando desde un panel fijo y en táctil o pantallas menores con «Añadir». El Resumen usa gráficos ApexCharts con los colores del tema.
- Todas las presentaciones tienen «Notas» del libro (notas personales de lectura).
- Mobile usa atrás, portada/título y accesos a Estadísticas, Wiki y Buscar en la cabecera. Wiki permanece visible pero deshabilitada cuando el libro no tiene un enlace válido.
- En compact, la navegación inferior del libro contiene únicamente Índice y Elementos. En medium sustituye Elementos por accesos directos a Personajes, Localizaciones, Organizaciones, Eventos, Conceptos y Citas; cada listado ofrece una acción textual inequívoca para crear un elemento nuevo.
- El índice Mobile es un drawer lateral superpuesto tanto en compact como en medium para no comprimir la lectura. Reutiliza la estructura de Wood, aloja las acciones de nuevo capítulo, parte e interludio y se cierra al navegar, tocar fuera, usar Atrás o arrastrarlo suficientemente en horizontal desde cualquier punto de su superficie; un gesto corto retorna a origen. No necesita una X visible.
- El selector de elementos narrativos reúne Personajes, Localizaciones, Organizaciones, Eventos, Conceptos y Citas, con acciones separadas para listar y crear. Su tirador permite cerrarlo hacia abajo con umbral cancelable y conserva cierre táctil y Atrás como alternativas accesibles.
- Búsqueda, estadísticas y editores limitan su ancho útil y no producen overflow horizontal.
- Toda raíz y router Mobile pinta el canvas light/dark durante el alto completo disponible; una subvista con poco contenido nunca revela fondos Wood o bandas negras.

## Patrones de producto

### Biblioteca y catálogo

- Wood conserva cards texturizadas y tratamiento editorial.
- Mobile usa cards limpias, una columna en compact y más columnas solo con ancho útil.
- Filtros nunca desaparecen por breakpoint; en compact viven en panel o sheet accesible.
- Consulta, filtros, vista y scroll se conservan al abandonar y volver.
- La ficha pública es fullscreen en compact y modal/panel en medium según contenido.
- En Android, Atrás cierra primero toda ficha, editor o diálogo fullscreen que conserve detrás la misma ruta. Solo después puede actuar sobre el lector o el historial del dashboard.
- En Android, Biblioteca y Catálogo usan el ancho completo del lienzo. Su fila de consulta es la cabecera `sticky` del único propietario de scroll: el campo se integra sin borde ni superficie propios y el separador inferior solo aparece después de desplazar contenido.
- La jerarquía Android no deja hueco entre universos plegados. Un universo abierto gana aire vertical; los universos reales y las sagas identifican su nivel con iconos discretos, mientras «Sin universo» permanece neutro. Las sagas cerradas consecutivas forman una cascada: desde la segunda, el contorno lateral nace bajo la anterior sin borde ni radios superiores; al abrirse recupera contorno completo y separación.
- Sagas encadenadas (relación del backend, nunca por el título): van juntas y en orden de lectura. En Web y Mobile se unen en un bloque con una barra de acento continua a la izquierda; en las tres presentaciones, bajo el nombre, «Sigue a Era 1» y, si la siguiente no está en la colección, «Continúa en Era 3».

### Gestores

- En Web y Wood los gestores son listados de consulta alcanzables desde el Perfil. El catálogo canónico se edita en el plugin de administración de la plataforma; desde la web se propone desde Catálogo mediante `/peticiones/catalogo`.

- Wood conserva tabla, métricas y formulario lateral histórico.
- Mobile usa listas/cards y editor de ruta completa en compact; medium puede usar maestro-detalle.
- Altas y ediciones usan rutas canónicas `/new` y `/:id`, con back que restaura listado, filtros, página y scroll.
- Portadas, sugerencias y altas auxiliares son accesibles sin hover.

### Capítulos, escenas y RTF

- El estado editable pertenece a la fachada de feature y sobrevive a orientación/cambio de presentación.
- Mobile apila título, localización, contenido y asignaciones; medium paraleliza solo por container query y ancho real.
- Asignar personajes no depende del arrastre; selectores y acciones táctiles mantienen orden alfabético.
- La toolbar RTF restaura la selección antes de aplicar comandos desde overlays. En Wood puede envolver grupos; en Mobile conserva una sola fila horizontal desplazable, controles densos de 28 px e iconografía de 13 px para no convertir el editor en varias filas. Si el conjunto cabe, adopta ancho intrínseco y se alinea a la derecha; si no, se limita al ancho disponible y permite scroll. Es una excepción deliberada al target general de 44 px: el editor mantiene scroll horizontal y nombres accesibles, mientras las acciones primarias conservan 44 px.
- Los triggers y valores de fuente/tamaño consumen siempre tinta Mobile light/dark; no heredan el dorado de Wood. Los paneles de la toolbar no heredan el ancho reducido de su trigger: fuente y párrafo disponen de ancho legible, color escapa del recorte horizontal de la toolbar y todos usan radios compactos. Su posición se limita al viewport y su apertura táctil no depende del comportamiento nativo de `details`.
- En Mobile, el alta de capítulo comparte campos HTML propios con las entidades narrativas y no conserva una cabecera vacía. Localización y asignaciones de personajes en escenas son autocompletes buscables; aceptan solo IDs del catálogo y explican la ausencia de la localización canónica sin inventarla.
- Las entradas narrativas nuevas comienzan con «Descripción de {tipo de entidad}» en RTF y seleccionan el texto completo al primer foco mientras siga intacto. El título genérico «Descripción» conserva el mismo comportamiento en su input.
- Escenas y entradas son bloques repetibles: una nueva alta solo se admite cuando todos los bloques existentes son válidos. Una escena válida contiene título, descripción, localización y al menos un personaje presente o nombrado. La escena sin personajes solo es aceptable mientras se crea un capítulo, no habilita otra escena y no se persiste. El intento inválido marca los campos pendientes y lo explica con un aviso informativo; una alta válida desplaza el nuevo bloque al centro visible respetando movimiento reducido.
- Autosave muestra guardando/guardado/error. Un estado inválido nunca se presenta como guardado.
- Abandonar la ruta espera el guardado o bloquea la navegación.

### Entidades narrativas

- Personajes, organizaciones, eventos, localizaciones, conceptos y citas comparten contrato de guardado, no necesariamente markup.
- Mobile usa una columna en compact y expansión progresiva en medium.
- Los formularios Mobile agrupan sus campos mediante secciones planas de ancho completo y separadores, no mediante una sucesión de cards. La sección inicial empieza directamente por los campos; las restantes muestran un único título útil, sin eyebrow verde redundante. Las unidades repetibles internas pueden conservar superficie propia cuando ayude a distinguir cada borrador.
- Relaciones, apodos y entradas se editan con toque y teclado, sin depender de drag.
- Renombrar por cambio narrativo puede conservar el nombre anterior como apodo.

### Perfil, comunidad y chat

- Wood conserva superficies editoriales; Mobile usa el sistema contemporáneo.
- Perfil Mobile presenta identidad compacta y apartados alcanzables sin sidebar de escritorio.
- En la APK, Perfil contiene identidad, resumen y actividad propia; Preferencias y Cuenta y seguridad son destinos de primer nivel, no pestañas internas del perfil.
- En Web y Wood, el Perfil es el punto de entrada de todo lo personal: enlaza Cuenta y seguridad, Preferencias y los listados propios de Autores, Universos, Sagas, Libros y Antologías. La navegación principal no los repite.
- El perfil (nombre, avatar, biografía) es el de la cuenta de Yosiftware: el avatar y «Editar perfil» abren su vista (`yosiftware.editarPerfil()`) y el perfil público se enlaza en la web social con el símbolo. El Perfil de Libros conserva el resumen de la colección, Mis peticiones y Mis reportes.
- Cuenta y seguridad tiene tres apartados: «Tu cuenta» (perfil, cambiar de cuenta, `<yosi-reportar>`, gestionar la cuenta y cerrar sesión), «Privacidad y normas» (`<yosi-privacidad>` y los enlaces a las normas, la moderación y los bloqueos de la web social) y «Tus datos». Las normas, la moderación, las alegaciones y los bloqueos propios se retiraron; los enlaces antiguos abren «Privacidad y normas».
- «Denunciar» está a la vista en las reseñas ajenas y en los clubes (la denuncia propia de Libros) y en los mensajes del chat (`yosiftware.denunciar`).
- En Mobile, el avatar de la app bar indica mensajes de chat sin leer mediante aro y punto de error sobre la propia circunferencia. El nombre accesible expone también el total y el indicador no sustituye los contadores de la bandeja.
- Comunidad compacta usa una columna; medium puede combinar navegación y contenido.
- Chat compacta sustituye bandeja/conversación por subruta; medium usa maestro-detalle.
- El compositor respeta teclado y safe areas, y el historial es la zona flexible desplazable.
- No duplicar listeners realtime al sustituir vistas.

### Notificaciones y administración

- Las notificaciones son las de la plataforma (`<yosi-notificaciones>`): su centro y sus avisos los pinta el SDK. Lo que sigue aplica a los avisos propios de la interfaz (los toasts de errores y confirmaciones) y a los avisos de decisión.
- Los avisos Mobile con acciones se presentan como tarjetas flotantes no modales: no añaden scrim, no atrapan el foco ni bloquean la tarea actual. Pueden exigir una acción para desaparecer sin impedir que la persona siga navegando o editando.
- Los toast Mobile se anclan sobre la navegación inferior y la safe area, dentro del alcance del pulgar. Un arrastre suficiente, hacia abajo o hacia arriba, los cierra; un gesto corto vuelve a su posición. Ya no hay campana propia a la que entregarlos. Los gestos y transiciones respetan `prefers-reduced-motion` y siempre conservan una alternativa táctil accesible.
- Los switches Mobile consumen siempre tokens `light`/`dark`: pista, indicador, texto e iconos no reutilizan colores Wood fijos. El selector de tema representa ambos estados con sol/luna y mantiene nombre accesible de la acción resultante.
- En Android, el fondo de la barra de estado acompaña al tema Mobile y sus iconos usan siempre el contraste inverso: oscuros sobre `light`, claros sobre `dark`.
- La administración (también las copias de seguridad) es el plugin de la plataforma: la web no la pinta en ninguna presentación.

## Zona pública y autenticación

- **La cuenta es la de Yosiftware** (adhesión, 24/10/2026): entrar, crear la cuenta, recuperar la contraseña, verificar el correo y cambiar de cuenta los pinta el SDK de la plataforma (`<yosi-acceso>` y sus ventanas). Libros no tiene formularios de acceso propios ni rutas `/login`, `/register`…, que llevan a la portada.
- La zona pública es la portada: Web usa `WebPublicShellComponent` (marca, `<yosi-acceso>` en las acciones y claro/oscuro del dispositivo), Wood su composición histórica con el botón en la barra superior, y Mobile `MobilePublicShellComponent` con el botón a la derecha de la marca. «Crear mi biblioteca» y «Ya tengo cuenta» abren el acceso de Yosiftware (registro o entrar), y la línea «Entra con tu cuenta de Yosiftware» lleva el símbolo del ecosistema (`YosiftwareMarkComponent`, `MARCA.md`). Debajo, en Web y Wood, «Normas y privacidad de Yosiftware» (con el símbolo) enlaza las normas comunes y la política de privacidad, que se ven sin entrar (`?vista=normas` de la web social, `PRIVACIDAD.md`).
- **`<yosi-acceso>` en cada cabecera** (`YosiftwareAccountComponent`), con `<yosi-webs>` (`YosiftwareWebsComponent`) y `<yosi-notificaciones>` (`YosiftwareNotificationsComponent`, que abre sin recargar los enlaces de Libros): barra lateral de Wood y su barra superior del libro, navegación Web (barra compacta y pie de la lateral), cabecera del libro Web y app bar de Mobile. Su aspecto sale de las variables `--yosi-*` de cada presentación (`assets/css/<presentación>/_yosiftware.sass`, declaradas junto a sus tokens); nunca se restila su HTML. Las ventanas de la plataforma reciben `assets/yosiftware.css` (paleta Web en claro y oscuro) y siguen el tema de `<html>` (`dataset.theme`; Wood es oscuro).
- Todo enlace a la web social («Gestionar tu cuenta de Yosiftware») lleva el símbolo del ecosistema delante.
- Links secundarios son `<a>` semánticos; no usar `span` con `routerLink`.

## PWA, Android y conectividad

- PWA y APK son online-first. Sin red muestran una superficie clara y no prometen lectura o escritura offline de datos privados.
- Angular Service Worker controla la raíz web. El push es el de la plataforma (se activa en la web social): el push web propio se retiró en el hito 2, el de la APK de Capacitor en el hito 3 y `firebase-messaging-sw.js`, con Capacitor, en el hito 4.
- La caché web contiene shell y recursos públicos, nunca API, imágenes privadas, tokens o datos de cuenta.
- La web anuncia una versión nueva y requiere acción explícita para activarla, de modo que la persona pueda terminar cualquier cambio pendiente.
- Lo que sigue sobre Android describe la APK de Capacitor (retirada en el hito 4, etiqueta `apk-capacitor-final`) y queda como referencia del clon Kotlin; la web ya no tiene adaptadores nativos. En la APK de Capacitor, una versión de recursos web ya preparada por Angular Service Worker se activaba tras una barrera interna breve; en la Kotlin cada cambio es una APK nueva.
- Android usa la misma UI Mobile con adaptadores nativos para auth, sesión, push, links, red y ciclo de vida.
- Android no intenta mantener WebSocket ni WebView activos cuando queda suspendido. FCM entrega en segundo plano los eventos que requieren atención; al volver, la app reconecta y reconcilia el estado canónico mediante REST. Los estados transitorios de conexión disponen de un breve periodo de gracia antes de convertirse en aviso visible.
- El push Android de chat admite una versión privada con remitente/vista previa y una versión pública genérica para bloqueo seguro. Android y los ajustes del usuario deciden cuál mostrar. En primer plano se usa la notificación interna deduplicada; tocar el aviso consulta la notificación canónica y abre su conversación, sin interpretar URLs del payload.
- Preferencias ofrece en Android una lectura canónica de permisos de notificaciones, fotos, cámara y micrófono, incluida la selección limitada de fotos. Pedir notificaciones registra además el dispositivo FCM; los demás permisos se solicitan al sistema y siempre existe salida a los ajustes de la aplicación. Web no simula permisos nativos.
- Android puede colorear el área del sistema con el tema activo, pero ningún control ni texto de la app invade sus insets. En tema claro usa iconos de sistema oscuros y en tema oscuro iconos claros.
- No persistir tokens en Web Storage ni en cookies propias: los de la plataforma los guarda el SDK en memoria.
- La descarga de APK abre un destino externo; Android controla la instalación y valida la firma.

## Angular Material, iconos y modales

- Aplicar tokens de la presentación al overlay container para que dialogs, selects, menus y tooltips no queden fuera del contrato visual.
- Revisar siempre label, input, caret, outline, select, panel y estados MDC; no permitir el violeta Material por defecto si contradice la presentación.
- Evitar placeholder y `mat-label` compitiendo visualmente.
- Los botones puramente icónicos tienen caja estable, `aria-label` y foco visible.
- `mat-icon` no debe recortarse por igualar exactamente caja y glifo; reservar espacio y aplicar ellipsis solo al texto vecino.
- En presentación Mobile, los editores complejos son superficies fullscreen en Android a cualquier ancho y en web `compact`; en web `medium` conservan formato modal. Los avisos con acción siguen siendo notificaciones flotantes no modales. Wood mantiene su composición editorial vigente.
- Toda superficie Mobile, fullscreen o modal, consume los tokens light/dark raíz; no debe conservar colores Wood codificados.
- Los modales cierran mediante X y, salvo operaciones sensibles o cambios pendientes, mediante backdrop. Las superficies fullscreen vuelven mediante flecha y no se descartan tocando el fondo. El click interno detiene propagación.
- El editor compartido de estado/puntuación/reseña conserva seis estados, estrellas, retirada de puntuación y título contextual en todos sus formatos.

## Accesibilidad, validación visual y budgets

- Toda acción es operable con teclado y toque; foco/hover no cambian dimensiones.
- Los identificadores técnicos nunca son datos que la persona deba conocer, copiar o interpretar.
- Antes de cerrar un hito visual, inspeccionar con Playwright los tamaños contractuales que afecte y comparar Wood con sus referencias.
- Verificar Chromium y Firefox; PWA/Service Worker se acredita en Chromium y Android en emulador más dispositivo físico final.
- Revisar Sass nuevo, CSS duplicado, reglas globales y chunks antes de ampliar budgets.
- Un exceso legítimo se documenta en el roadmap con su causa y alternativa descartada.
