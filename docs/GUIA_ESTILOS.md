# Guía de estilos visuales

Fuente de verdad para decisiones visuales del frontend. Si una pantalla o ajuste contradice esta guía, se actualiza primero la guía o se registra explícitamente la excepción.

## Dirección visual

- La aplicación tiene dos presentaciones, no temas intercambiables: `wood` y `mobile`.
- `wood` restaura fielmente el lenguaje editorial histórico de escritorio: cuero, papel envejecido, dorados apagados, navegación flotante y profundidad sutil.
- `mobile` es una interfaz nueva, editorial contemporánea y funcional: superficies limpias, tipografía protagonista, base cálida/neutra y acento verde azulado sobrio, sin imágenes decorativas.
- `wood` conserva una única apariencia editorial. `mobile` y `native-mobile` permiten alternar entre claro y oscuro desde la app bar; la preferencia se persiste con el contrato de interfaz existente sin cambiar de presentación.
- Rutas, permisos, contratos, estado, autosave y lógica son compartidos. Wood y Mobile pueden y deben tener componentes, HTML, Sass, navegación, cabeceras y composición independientes.
- Nunca se adapta Wood mediante una cascada de media queries ni se construye Mobile como recoloreado de su markup.
- Solo se instancia una vista de cada feature. Su container/fachada conserva estado al cambiar de ancho, orientación o plataforma.
- Durante la transición del roadmap, Mobile permanece tras una feature flag hasta que todas sus rutas no administrativas alcancen paridad.

## Modos de presentación

- `compact`: `320-599px`, Mobile con app bar, una columna, navegación inferior y overlays a pantalla completa cuando corresponda.
- `medium`: `600-1050px`, Mobile con navigation rail y maestro-detalle únicamente si ambos paneles conservan ancho útil.
- `desktop`: más de `1050px`, Wood.
- `wide`: desde `1600px`, modificador Wood.
- `ultrawide`: desde `2560px`, modificador Wood.
- Capacitor usa siempre `native-mobile`, independientemente del viewport.
- La selección usa ancho disponible y plataforma Capacitor, nunca marca/modelo o user-agent.
- Orientación, altura, `hover`, puntero y teclado virtual complementan el layout sin crear otros shells globales.
- Administración requiere Wood desktop y puntero preciso. El enlace se oculta y el guard rechaza navegación directa en Mobile y Android.
- Chat flotante solo existe en Wood desktop; Mobile usa navegación de página completa o maestro-detalle.
- En plegables se prioriza reflow continuo. La bisagra solo puede tratarse como mejora progresiva.

## Separación de responsabilidades

- Cada ruta compleja usa un container/fachada de aplicación y dos vistas presentacionales cuando ambas sean necesarias.
- El container posee carga, comandos, errores, borradores, autosave y reconciliación. Las vistas reciben estado y emiten intenciones.
- Al cruzar `1050/1051`, la fachada sobrevive, captura el estado editable síncronamente y solo después sustituye la vista.
- No mantener dos árboles DOM ocultos ni duplicar subscriptions, sockets, efectos o llamadas HTTP.
- Se permite reutilizar un widget funcional neutral —por ejemplo, el núcleo RTF— cuando no imponga layout ni estética. Si impone composición, tendrá variante Wood/Mobile.
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

## Mobile

- Material 3 y CDK aportan infraestructura, accesibilidad y overlays; la identidad visual es propia, no el tema prebuilt de Material.
- Base visual: fondos cálidos muy claros, tinta oscura, superficies blancas/crema, acento verde azulado y un apoyo terroso reservado para estados o énfasis.
- Los tokens canónicos viven en `src/assets/css/mobile/_tokens.sass`: canvas `#f5f2ea`, superficie `#fffdf8`, tinta `#18211e`, primario `#006b5d` y contenedor primario `#9ff2df`. Las verticales consumen estas variables; no duplican la paleta en sus componentes.
- La variante oscura Mobile redefine esos mismos tokens en el nodo raíz. Ningún componente decide colores según el tema ni el selector altera Wood.
- Las primitives Sass canónicas viven en `src/assets/css/mobile/_primitives.sass`. App bar, navegación inferior/rail y estados reutilizables viven en `src/app/components/mobile/ui/`; una feature puede mantener composición propia sin convertir prematuramente cada bloque en una abstracción global.
- Contraste mínimo WCAG AA, foco visible y estados que no dependan solo del color.
- Sin texturas, fondos fotográficos, gradientes de madera ni sombras pesadas.
- Movimiento de `160-240ms` para cambios de estado y navegación local. `prefers-reduced-motion` elimina desplazamientos no esenciales.
- Todo control táctil esencial reserva al menos `44x44px`.
- Hover, tooltip y drag and drop son aceleradores, nunca el único acceso a una acción.
- Usar `100dvh`/`100svh`, `safe-area-inset-*` y el inset del teclado cuando el shell toque el viewport.
- Cada pantalla declara un único propietario de scroll. Evitar scrolls anidados salvo paneles maestro-detalle con límites claros.
- En compact, los modales complejos y editores auxiliares pueden ocupar toda la pantalla; en medium se permiten sheets o paneles laterales.
- La navegación compacta fija Biblioteca, Catálogo, Comunidad y Más. El alta es contextual; Más agrupa perfil, seguridad, estadísticas, gestores y sesión.
- En `medium`, el rail aprovecha el alto disponible: Perfil abre la navegación y Estadísticas la cierra al pie, mientras los destinos primarios conservan el orden de compact. La app bar autenticada muestra el avatar como acceso directo a Perfil y reserva el selector de tema para Más.
- Medium usa rail y solo muestra dos paneles cuando no comprime formularios, listas o acciones.
- El laboratorio `/__mobile-design/:screen` solo existe para revisión local en `localhost`/`127.0.0.1`, rechaza Capacitor y no activa la feature flag. Sus referencias iniciales son `login`, `library`, `chapter`, `community` y `security` a 390/800 px.

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
- Las rutas permanecen iguales y el cambio de presentación no añade entradas al historial.
- Las rutas desconocidas autenticadas vuelven a biblioteca a través de guards vigentes.

### Espacio de libro

- Wood recupera índice persistente y composición editorial de escritorio.
- Mobile compacta usa atrás, título, índice superpuesto y acciones agrupadas; medium puede mostrar índice lateral plegable.
- El índice se cierra al navegar cuando es overlay y conserva estado cuando es panel.
- Búsqueda, estadísticas y editores limitan su ancho útil y no producen overflow horizontal.

## Patrones de producto

### Biblioteca y catálogo

- Wood conserva cards texturizadas y tratamiento editorial.
- Mobile usa cards limpias, una columna en compact y más columnas solo con ancho útil.
- Filtros nunca desaparecen por breakpoint; en compact viven en panel o sheet accesible.
- Consulta, filtros, vista y scroll se conservan al abandonar y volver.
- La ficha pública es fullscreen en compact y modal/panel en medium según contenido.
- En Android, Biblioteca y Catálogo usan el ancho completo del lienzo. Su fila de consulta es la cabecera `sticky` del único propietario de scroll: el campo se integra sin borde ni superficie propios y el separador inferior solo aparece después de desplazar contenido.
- La jerarquía Android no deja hueco entre universos plegados. Un universo abierto gana aire vertical; sus sagas mantienen una sangría breve, contorno difuminado en los cuatro lados y solo se separan entre sí al abrirse.

### Gestores

- Wood conserva tabla, métricas y formulario lateral histórico.
- Mobile usa listas/cards y editor de ruta completa en compact; medium puede usar maestro-detalle.
- Altas y ediciones usan rutas canónicas `/new` y `/:id`, con back que restaura listado, filtros, página y scroll.
- Portadas, sugerencias y altas auxiliares son accesibles sin hover.

### Capítulos, escenas y RTF

- El estado editable pertenece a la fachada de feature y sobrevive a orientación/cambio de presentación.
- Mobile apila título, localización, contenido y asignaciones; medium paraleliza solo por container query y ancho real.
- Asignar personajes no depende del arrastre; selectores y acciones táctiles mantienen orden alfabético.
- La toolbar RTF envuelve grupos sin overflow y restaura selección antes de aplicar comandos desde overlays.
- Autosave muestra guardando/guardado/error. Un estado inválido nunca se presenta como guardado.
- Abandonar la ruta espera el guardado o bloquea la navegación.

### Entidades narrativas

- Personajes, organizaciones, eventos, localizaciones, conceptos y citas comparten contrato de guardado, no necesariamente markup.
- Mobile usa una columna en compact y expansión progresiva en medium.
- Relaciones, apodos y entradas se editan con toque y teclado, sin depender de drag.
- Renombrar por cambio narrativo puede conservar el nombre anterior como apodo.

### Perfil, comunidad y chat

- Wood conserva superficies editoriales; Mobile usa el sistema contemporáneo.
- Perfil Mobile presenta identidad compacta y apartados alcanzables sin sidebar de escritorio.
- Comunidad compacta usa una columna; medium puede combinar navegación y contenido.
- Chat compacta sustituye bandeja/conversación por subruta; medium usa maestro-detalle.
- El compositor respeta teclado y safe areas, y el historial es la zona flexible desplazable.
- No duplicar listeners realtime al sustituir vistas.

### Notificaciones y administración

- Notificaciones Mobile ocupan el espacio entre app bar y navegación inferior sin quedar recortadas.
- Sus acciones son táctiles, no producen overflow y quedan por encima del contenido de ruta.
- Los avisos Mobile con acciones se presentan como tarjetas flotantes no modales: no añaden scrim, no atrapan el foco ni bloquean la tarea actual. Pueden exigir una acción para desaparecer sin impedir que la persona siga navegando o editando.
- Los toast Mobile se anclan sobre la navegación inferior y la safe area, dentro del alcance del pulgar. Un arrastre descendente suficiente los marca como leídos y los cierra; uno ascendente los entrega a la campana como aviso no leído; un gesto corto vuelve a su posición sin cambiar estado.
- Durante el arrastre ascendente, la campana se convierte en destino visible aunque estuviera oculta y confirma la recepción con una animación breve. Los gestos y transiciones respetan `prefers-reduced-motion` y siempre conservan una alternativa táctil accesible.
- El centro de notificaciones Mobile se abre como panel flotante anclado a la campana, nunca como pantalla completa. Debe caber bajo la app bar, limitar su altura, tener un único scroll interno y usar una capa superior a las vistas de ruta y editores ordinarios. En `medium` se alinea al borde derecho seguro y gana anchura en lugar de altura. Tocar fuera lo cierra; cada fila se puede descartar hacia ambos lados con retorno para gestos cortos y conserva una acción táctil/teclado equivalente.
- El cierre exterior del centro de notificaciones responde al inicio del toque (`pointerdown`). El descarte lateral exige un umbral proporcional al ancho de la fila, nunca inferior a 112 px, para que una exploración o gesto corto sea cancelable.
- Los switches Mobile consumen siempre tokens `light`/`dark`: pista, indicador, texto e iconos no reutilizan colores Wood fijos. El selector de tema representa ambos estados con sol/luna y mantiene nombre accesible de la acción resultante.
- En Android, el fondo de la barra de estado acompaña al tema Mobile y sus iconos usan siempre el contraste inverso: oscuros sobre `light`, claros sobre `dark`.
- No existe composición Mobile de administración ni backup.
- Wood mantiene confirmación, progreso, prevención de doble envío y errores recuperables del backup.

## Zona pública y autenticación

- Wood restaura sus fondos y composición histórica; Mobile usa un shell público propio sin imágenes decorativas.
- Login, registro, recuperación, reset, verificación y onboarding conservan el mismo contrato funcional en ambas vistas.
- Formularios Mobile permiten scroll con teclado, autofill legible y campos dentro del viewport desde 320px.
- Links secundarios son `<a>` semánticos; no usar `span` con `routerLink`.
- Cancelar Google, teléfono o un flujo nativo siempre libera loaders y deja una salida recuperable.
- Los handlers de correo resuelven tanto navegación web como Android App Links.

## PWA, Android y conectividad

- PWA y APK son online-first. Sin red muestran una superficie clara y no prometen lectura o escritura offline de datos privados.
- Angular Service Worker controla la raíz web; Firebase Messaging conserva su scope aislado. Android usa push nativo.
- La caché web contiene shell y recursos públicos, nunca API, imágenes privadas, tokens o datos de cuenta.
- La web anuncia una versión nueva y requiere acción explícita para activarla, de modo que la persona pueda terminar cualquier cambio pendiente.
- En la APK Android, una versión de recursos web ya preparada por Angular Service Worker se activa automáticamente tras mostrar una barrera interna bloqueante, breve y sin confirmación. Este flujo no sustituye la instalación de una nueva APK.
- Android usa la misma UI Mobile con adaptadores nativos para auth, sesión, push, links, red y ciclo de vida.
- Android no intenta mantener WebSocket ni WebView activos cuando queda suspendido. FCM entrega en segundo plano los eventos que requieren atención; al volver, la app reconecta y reconcilia el estado canónico mediante REST. Los estados transitorios de conexión disponen de un breve periodo de gracia antes de convertirse en aviso visible.
- Android puede colorear el área del sistema con el tema activo, pero ningún control ni texto de la app invade sus insets. En tema claro usa iconos de sistema oscuros y en tema oscuro iconos claros.
- No persistir refresh, ID token, custom token o access JWT en Web Storage. No debilitar cookies web para hacer funcionar la APK.
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
