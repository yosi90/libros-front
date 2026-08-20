# Guía de estilos visuales

Fuente de verdad para decisiones visuales del frontend. Si una pantalla nueva o un ajuste visual contradice esta guía, actualiza primero esta guía o registra explícitamente la excepción.

## Dirección visual

- La aplicación mantiene tres temas y dos familias de shell. Rutas, contenido, estado, permisos y contratos funcionales son compartidos, pero la familia visual sí puede organizar de forma distinta navegación, cabeceras, paneles y espacio útil.
- `wood` conserva el lenguaje editorial y la composición de escritorio existentes: cuero, papel envejecido, dorados apagados, navegación flotante y profundidad sutil. Es una experiencia exclusiva de escritorio; no se adapta ni se reduce para móvil o tablet.
- `light` y `dark` comparten un único shell moderno y funcional, sin imágenes de fondo. Ese shell se adapta de `compact` a `ultrawide`; ambos temas mantienen la misma geometría y se diferencian mediante tokens de color, contraste, bordes, elevación y estados.
- No duplicar outlets, estado de pantallas ni lógica de negocio para separar las dos familias. Se permiten markup y componentes de navegación específicos cuando la composición lo requiera, dejando el contenido en un único host compartido.
- Prioriza una UI de herramienta de biblioteca: densa, clara, escaneable y consistente. Evita composiciones de landing dentro del dashboard.
- El contenido debe vivir dentro del shell correspondiente. En `desktop` el scroll permanece en el panel de ruta; en `compact` y `medium` cada pantalla declara un único propietario de scroll y evita encerrar toda la aplicación en `100vh` estático.
- Móvil, plegable, tablet y ultrawide son superficies contractuales. Un cambio visual no se considera cerrado hasta verificar los modos `compact`, `medium`, `desktop` y sus modificadores que le correspondan.

## Modos de composición y capacidades

- `compact`: `320-599px`. App bar contextual, navegación inferior, una columna, drawers superpuestos y modales a pantalla completa.
- `medium`: `600-1050px`. Navigation rail, paneles plegables y lista-detalle solo cuando ambos lados conservan ancho útil.
- `desktop`: más de `1050px`. En light/dark usa sidebar moderna con etiquetas, índices persistentes, toolbars completas y ventanas flotantes cuando también existe altura suficiente. Wood conserva su navegación editorial compacta de escritorio.
- El shell general compacto fija Biblioteca, Catálogo, Comunidad y Más en la navegación inferior; el alta contextual vive en la app bar y Más agrupa destinos secundarios, tema y sesión. El shell de libro sustituye esa navegación por atrás, título, índice superpuesto y acciones propias del libro.
- `wide` y `ultrawide` son modificadores de `desktop`, no shells distintos. Se consideran a partir de `1600px` y `2560px` respectivamente.
- Los breakpoints son estados semánticos centralizados; los componentes no deben introducir nuevos cortes globales ni leer `window.innerWidth` si el servicio de viewport o una container query resuelven el caso.
- Orientación, altura, `hover` y precisión del puntero complementan al ancho. No detectar marcas, modelos ni categorías mediante user-agent.
- Administración requiere composición `desktop` y puntero preciso. Fuera de ese contrato no se muestra y la navegación directa se rechaza.
- Las ventanas flotantes de chat solo se inicializan y renderizan en `desktop`; fuera de escritorio el chat siempre navega como página completa.
- En plegables se favorece el reflow continuo. Ninguna acción crítica debe depender de conocer la posición de una bisagra; CSS Viewport Segments solo puede añadirse como mejora progresiva.
- En wide/ultrawide no se estiran indefinidamente formularios, párrafos o editores. Se usan anchos máximos de lectura, columnas adicionales con límite, espacios laterales controlados y paneles simultáneos solo cuando aportan contexto.
- Las superficies de datos pueden aprovechar ultrawide con más columnas o un tercer panel, pero navegación, targets, tipografía y densidad no escalan proporcionalmente al ancho total.
- Usar `100dvh`/`100svh` y `safe-area-inset-*` cuando el shell toque límites del viewport. Verificar siempre teclado virtual, portrait y landscape.
- Todo control táctil esencial reserva al menos `44x44px`. Hover, tooltip y drag and drop son ayudas, nunca el único acceso a una acción móvil.
- `AdaptiveLayoutService` es la fuente runtime de modo y capacidades. Publica `data-layout-mode`, orientación, puntero, hover, wide/ultrawide, estado del teclado virtual y las custom properties `--app-viewport-*`/`--app-keyboard-inset` sobre `<html>`.
- Las decisiones estructurales Angular consumen ese servicio. El acceso directo a `window.innerWidth`/`innerHeight` se limita a cálculos geométricos de overlays y ventanas flotantes; no crea modos ni navegación paralela.
- Las primitives globales `.app-shell-region`, `.app-scroll-region`, `.app-content-region`, `.app-readable-region` y `.app-touch-target` fijan geometría activa sin imponer colores de tema. Las geometrías aún no usadas de grid, container, app bar, bottom navigation, rail, sidebar, panel, modal y toolbar viven como mixins en `src/assets/css/_adaptive-layout.sass`; cada shell las emite solo cuando las consume para no inflar el bundle inicial.

### Separación de shells

- Shell editorial: se activa únicamente cuando el tema efectivo es `wood` y el modo es `desktop`. Preserva la identidad y disposición actuales salvo correcciones funcionales o de accesibilidad.
- Shell moderno: se activa con `light` o `dark` en cualquier modo. Usa app bar y navegación inferior en compact, rail en medium, sidebar con identidad y etiquetas en desktop, y contención de contenido en wide/ultrawide.
- Cambiar entre familias no recrea la ruta activa ni mantiene dos árboles de contenido simultáneos. La selección afecta a los elementos de encuadre; el router outlet y sus servicios siguen siendo únicos.
- Las verticales nuevas se diseñan primero contra el shell moderno. Wood puede reutilizar su presentación existente y solo recibe cambios necesarios para conservar funcionalidad, corregir errores o consumir contratos compartidos.
- Esta separación evita trasladar a móvil geometrías nacidas para el escritorio editorial y permite evolucionar light/dark sin erosionar el carácter deliberadamente singular de wood.

## Temas y tokens

- Los componentes nuevos consumen custom properties semánticas; no codifican la paleta de un tema en su estructura.
- Familias mínimas de tokens: fondo, superficie, superficie elevada, texto principal/secundario, borde, acento, foco, éxito, aviso, error, scrim y sombra.
- El tema se aplica también al overlay container de Angular Material para que dialogs, selects, menus, tooltips y bottom sheets no queden fuera del contrato.
- Angular Material usa su sistema M3: verde mineral y apoyo azul para `light`/`dark`, y ámbar/verde para `wood`. Estructura, tipografía, forma y densidad se emiten una sola vez; cada tema solo aporta variables de color.
- La preferencia persistida y el tema efectivo son conceptos distintos: una preferencia `wood` aplica `dark` en `compact`/`medium` y se restaura al volver a escritorio.
- Light/dark no deben solicitar ni ocultar mediante overlay las texturas de wood: sus reglas no incluyen esos recursos.
- Las texturas se referencian únicamente mediante `--app-texture-*`; en `light` y `dark` estos tokens valen `none`. No introducir URLs editoriales directamente en estilos de componentes.
- Contraste mínimo WCAG AA y foco visible son obligatorios en light/dark. Las animaciones respetan `prefers-reduced-motion`.

## CSS y animación nueva

- Bootstrap queda congelado como legado. No añadir clases, utilidades, mixins, componentes o patrones Bootstrap a temas, shells ni componentes nuevos.
- La base recomendada es CSS/Sass nativo, custom properties, Angular Material y Angular CDK.
- Reutilizar el máximo Sass razonable: cuando una geometría, estado, control o composición se repita o tenga consumidores claramente previstos en varias superficies, extraerla a tokens, funciones, mixins o primitives compartidas.
- La reutilización no limita el diseño. Si una necesidad nueva no encaja limpiamente en una primitive existente, se crea una solución específica y después se generaliza solo cuando aparezca un patrón estable; no deformar una interfaz para forzar reutilización.
- Evitar abstracciones prematuras para reglas de un único componente. Como criterio práctico, extraer al segundo uso real o antes cuando el roadmap ya identifica varios consumidores inmediatos.
- Los parciales Sass compartidos deben evitar emisión accidental de CSS duplicado: preferir variables, funciones y mixins; las clases globales se emiten una sola vez desde la entrada global y los mixins se incluyen únicamente donde se consumen.
- Una primitive compartida ofrece parámetros y defaults coherentes, pero permite variantes explícitas. No acumular excepciones, selectores de pantallas concretas o flags ambiguos dentro de un mixin común.
- Tailwind u otra librería CSS está permitida únicamente tras una decisión técnica documentada que demuestre menor complejidad o duplicación, integración limpia con los tokens/Material y budgets aceptables. No se incorpora por defecto.
- Las transiciones sencillas se implementan con CSS o Web Animations. Una librería externa de animación necesita justificar interacción, accesibilidad, mantenimiento, tree-shaking y peso final.
- No subir budgets para absorber un framework o animación sin revisar primero duplicación y coste por ruta.
- La evaluación del Hito 2 descarta incorporar Tailwind o una librería de animación: Sass, custom properties, Material/CDK y CSS/Web Animations cubren los shells previstos; añadir otro sistema aumentaría bundle, especificidad, configuración y duplicación sin reducir todavía CSS medido. La decisión puede reabrirse solo con un caso y una comparación cuantificada.

## Paleta y superficies

- Fondo principal de paneles: `rgba(20, 17, 13, .72-.78)` o variantes cercanas.
- Bordes editoriales: `rgba(218, 166, 91, .22-.32)`.
- Texto principal: `#f6e6c9`, `#f0dfc5` o `#fbecd6`.
- Texto secundario: `#d8c3a2`, `#cdb895` o `#bfa77f`.
- Acento dorado: `#e9b66b`, `#d9a956`, `#f2c77c`.
- Botones principales: gradiente `linear-gradient(180deg, #f2c77c, #b87932)` con texto oscuro `#24170b`.
- Paneles, cards, modales y métricas deben usar borde, radio moderado y `box-shadow`/`inset` suave; no superficies planas claras dentro del dashboard.

## Texturas e imágenes

- Shell autenticado:
  - `fondo_router.png` en el contenedor principal.
  - `fondo_menu.png` en menú/sidebar.
- Colección:
  - `fondo_desplegable.png` para desplegables.
  - `fondo_libro.png` para cards de libro/antología.
- Las texturas se usan como patrón repetido o fondo natural, con overlays oscuros para preservar legibilidad.
- Estas texturas pertenecen exclusivamente a `wood`; light/dark usan superficies generadas por tokens y no imágenes decorativas de fondo.
- No reintroducir `fondo.png` en código activo; queda como asset legacy descartado.

## Tipografía y jerarquía

- Titulares editoriales: Georgia o serif equivalente, peso medio, color dorado.
- Texto operativo: sans-serif del proyecto/Material, compacto y legible.
- Evita títulos hero dentro de paneles de herramienta. En cards, sidebars, tablas y modales usa tamaños contenidos.
- Los textos largos deben truncar con ellipsis o envolver de forma controlada; nunca deben ensanchar cards, columnas o botones.

## Iconografía y botones

- Usa Material Icons ya presentes en el proyecto.
- Los botones puramente icónicos deben tener dimensiones estables y centrar explícitamente el `mat-icon`.
- Angular Material define `overflow: hidden` en el host de `mat-icon`. Al reducir un icono y hacer coincidir exactamente `width`, `height`, `font-size` y `line-height` (por ejemplo, todo a `18px`), las métricas y el rasterizado de la fuente pueden sobresalir fracciones de píxel y cortar el glifo arriba y abajo, especialmente con zoom o escalado de Windows. La base global del proyecto fuerza `overflow: visible` para iconos no inline; no debe revertirse desde un componente salvo que el recorte sea deliberado y esté comprobado visualmente.
- `overflow: visible` evita el recorte de la caja, pero no corrige el *hinting* de la fuente: algunos glifos circulares de Material Icons se deforman en tamaños intermedios aunque tengan espacio. Para indicadores redondos compactos se consideran tamaños estables `15px` y `21px`; usa `21px` en listados de personajes y comprueba otros tamaños en Chromium y Firefox antes de generalizarlos.
- Para iconos compactos, reserva una caja estable igual o ligeramente mayor que el glifo, usa `flex-shrink: 0` y centra desde el contenedor con grid/flex. Si una fila necesita ellipsis, aplica `overflow: hidden` únicamente al nodo de texto, no a la fila ni al `mat-icon`.
- Para acciones reconocibles, prefiere icono antes que texto decorativo.
- Los botones de tres puntos abren acciones contextuales; deben detener propagación si la card/fila también tiene click.
- Los toggles grandes usan cápsula oscura, burbuja dorada desplazable y altura estable de `42px`. Son el patrón por defecto para alternar vistas o filtros de pocas opciones; todos sus textos usan peso regular (`400`), incluidos los valores activos.
- Los estados de lectura deben mantener icono y color diferenciados:
  - `Leído`: verde.
  - `En marcha`: azul/verde azulado.
  - `En espera` y `Quiero leer`: dorado/ámbar.
  - `Por comprar`: neutro claro.
  - `Descartado`: rojo apagado.

## Layouts del dashboard

### Gestores

- Estructura base: header, métricas, toolbar, listado y formulario/aside.
- Métricas: tiles oscuros con icono circular dorado, número grande y label secundario.
- Listados: cabecera sticky, filas compactas, columnas con ancho estable y ellipsis.
- Paginador: ocultar si la cantidad filtrada no supera `pageSize`.
- Menús de orden: panel oscuro, chips compactos y control segmentado con burbuja.
- Formularios: no anidar cards dentro de cards; usa campos Material con colores MDC definidos localmente cuando sea necesario.
- En light/dark, compact y medium presentan el índice mediante `ManagerEntityCardComponent`; la tabla se reserva para anchuras donde sus columnas y el formulario lateral caben sin compresión.
- Las rutas de alta y edición son el contrato de composición: en compact/medium —y en desktop estrecho cuando no cabe una lista-detalle útil— muestran un editor completo con back explícito al índice. No comprimir simultáneamente tabla y formulario.
- Cada tipo conserva durante la sesión búsqueda, filtros, orden, paginación y posición de scroll. Abrir un editor y volver debe restaurar el mismo contexto.
- Los formularios de libro y antología refluyen a una columna en compact; portada, sugerencias externas y alta rápida de autores siguen accesibles sin depender de hover. Los modales auxiliares complejos son fullscreen en compact.
- Light/dark limitan el ancho útil de los gestores a `1900px` en ultrawide. Wood mantiene la composición editorial de escritorio y no consume las cards modernas.

### Colección privada

- En wood, cards de libro/antología con portada a sangre y fondo texturizado. En light/dark, cards de superficie limpia, borde semántico, tipografía sans y estados con contraste propio; no trasladar iluminación aleatoria ni texturas al shell moderno.
- La parrilla debe ser compacta y aprovechar espacio sin mezclar visualmente sagas y autoconclusivos.
- En wood, las luces de cards pueden variar, pero deben cachearse por entidad para evitar parpadeos.
- La búsqueda usa chips y sugerencias; los controles segmentados usan burbuja animada.
- En compact/medium, búsqueda, organización y disponibilidad viven en un panel `Buscar y filtrar` plegable; nunca se ocultan por breakpoint. Las pestañas de estados permiten desplazamiento horizontal.
- Las cards usan una sola columna en compact. Las lecturas destacadas dejan de forzar tres columnas y trasladan el resumen bajo el cuerpo cuando falta ancho.
- Consulta, disponibilidad, vista activa y posición de scroll se preservan al abandonar la ruta y regresar durante la sesión.
- En el índice de lectura, el orden del capítulo se presenta fuera del botón, en una burbuja circular fija situada en una columna propia a su izquierda. El título se centra dentro de todo el botón; si envuelve a varias líneas crece el botón, nunca la burbuja.

### Catálogo

- Las cards de catálogo son más informativas que las de colección, con portada ancha y metadatos compactos.
- El clic abre ficha pública en modal; no navegar a lectura salvo acción explícita y si el item está en biblioteca.
- No mostrar rótulos redundantes como “Libro”/“Antología” si el contexto ya lo comunica.
- En compact/medium, tipo, estado, puntuación, idioma y estilo se agrupan en un panel de filtros; las peticiones de alta permanecen accesibles como acciones táctiles independientes.
- La ficha pública y los formularios de petición ocupan el viewport completo en compact, con cierre fijo y un único propietario de scroll. Metadatos, estadísticas y reseñas refluyen a una columna.
- Light/dark limitan el ancho útil del catálogo a `1900px` en ultrawide; el espacio extra no alarga cards, formularios ni líneas de lectura.
- Los filtros y la posición de scroll se conservan al cambiar de ruta y regresar durante la sesión.

### Exploración compartida

- Biblioteca, catálogo y futuras superficies de exploración reutilizan `src/assets/css/_modern-browse.sass` para cabeceras sticky, controles elevados y colores de estados. El parcial solo emite reglas mediante mixins consumidos localmente.
- Los estados modernos derivan éxito, aviso y error de tokens semánticos y mantienen contraste tanto en light como en dark; wood conserva sus tratamientos editoriales.
- En compact, los modales de estado de colección son fullscreen, usan dos columnas para los seis estados y fijan cabecera y acciones sin generar overflow horizontal.

### Espacio de trabajo del libro

- Wood conserva en escritorio su índice y composición editorial. Light/dark usan un workspace limpio, sin texturas, construido con tokens y los mixins sin emisión propia de `src/assets/css/_modern-workspace.sass`.
- En `compact`, el índice comienza plegado y se abre superpuesto con backdrop; al navegar se cierra para devolver todo el ancho al contenido. En `medium`, comienza plegado pero se abre como panel lateral sin backdrop y conserva su estado al navegar. En `desktop`, permanece visible.
- La app bar moderna muestra atrás, título, acceso al índice y un único botón `+`. Su panel agrupa las acciones en Crear estructura, Explorar y Entidades narrativas; ninguna acción esencial puede depender de hover.
- Botones del índice y de estructura respetan targets táctiles de al menos `44px` en compact. El estado activo se comunica con color, borde y contraste, no solo con elevación.
- Búsqueda avanzada apila la cabecera en compact y permite desplazamiento horizontal de filtros sin ensanchar la página. Estadísticas refluyen a dos columnas de métricas en compact y una métrica impar ocupa la fila completa.
- En wide/ultrawide, el workspace cubre todo el fondo disponible, pero las páginas de búsqueda y estadísticas limitan el contenido útil a `1900px` y lo centran.

### Capítulos, escenas y editor enriquecido

- Light/dark usan un único propietario de scroll por debajo de desktop y reservan `--app-keyboard-inset` al final del formulario. Paneles de escenas y personajes no mantienen scrolls anidados cuando la página necesita desplazarse completa.
- La escena decide si muestra contenido y asignaciones en paralelo según el ancho real del componente mediante container query. No debe calcularse solo con el viewport, porque el índice del libro reduce el espacio disponible en desktop.
- En compact, título, localización y borrado refluyen sin comprimir el editor. Las zonas En escena y Solo nombrados se apilan; en medium pueden compartir fila cuando ambas conservan un ancho útil.
- Asignar personajes nunca depende exclusivamente del arrastre. Cada zona ofrece un selector alfabético táctil y los chips permiten mover entre presente/nombrado o eliminar. Drag and drop queda como acelerador de escritorio.
- La toolbar RTF moderna envuelve sus grupos sin overflow, usa targets de al menos `42px` en compact y mantiene accesibles fuente, tamaño, estilo, color, alineación, sangría y párrafo. Sus menús restauran la selección del editor antes de aplicar cambios.
- El estado de autosave es visible y usa estados semánticos de éxito/aviso. Un cambio inválido no se presenta como guardado; abandonar la ruta debe esperar al guardado o impedir la navegación.
- Los formularios de capítulos y escenas limitan su contenido útil a `1900px` en ultrawide. Wood conserva en escritorio la composición y las texturas editoriales existentes.

### Estadísticas

- En wood, usar el mismo esquema de métricas y paneles oscuros que gestores. En light/dark, métricas y paneles consumen superficies, bordes y texto semánticos del tema.
- ApexCharts debe heredar textos claros (`foreColor`) y series en dorado/verde/azul apagado.
- Estados vacíos dentro de paneles: caja oscura o dashed border, no bloques claros.

## Modales

- El modal único para estado, puntuación y reseña es `CollectionStateModalComponent`.
- Reutilizarlo en colección privada, catálogo y detalles desde gestores.
- Estados: seis botones con icono y texto en tres columnas y dos filas.
- Reseña: solo editable cuando hay puntuación; si no, mostrar placeholder informativo.
- Puntuación: estrellas sin borde; la X para quitar puntuación va antes de la primera estrella.
- El título sigue el patrón `Actualizando <nombre>`.

## Formularios Angular Material

- En tema oscuro, revisar siempre variables MDC/Material de:
  - label normal/hover/focus,
  - input text/caret,
  - outline normal/hover/focus,
  - select arrow,
  - paneles de opciones,
  - opciones hover/active/selected.
- No permitir texto negro en hover ni violeta Material por defecto en focus/active si rompe el tema.
- Evita placeholder y `mat-label` compitiendo visualmente. Si hace falta un aviso temporal, condiciona label/placeholder.

## Separadores

- Separadores principales tipo menú: línea fina con gradiente y extremos transparentes.
- Ejemplo: `linear-gradient(90deg, transparent, rgba(240, 200, 117, .34), transparent)` o vertical equivalente.

## Accesibilidad y estabilidad visual

- Todo botón icónico debe tener `aria-label` o tooltip si el significado no es evidente.
- Los identificadores técnicos pueden usarse internamente en rutas, bindings y payloads, pero nunca deben ser un dato que la persona tenga que conocer, copiar, introducir o interpretar. Toda referencia visible se resolverá mediante nombres, títulos, avatares, catálogos o contexto humano, también en Administración.
- Dimensiones de botones, iconos, toolbars, grids y tiles deben ser estables para evitar saltos en hover o por contenido dinámico.
- Evita que hover/focus cambie el tamaño del elemento.
- Los modales deben cerrar por X y backdrop, y el click interno debe detener propagación.

## Build y budgets

- No subir budgets para tapar CSS duplicado. Primero extrae estilos comunes a componentes compartidos.
- Antes de cerrar cada hito visual, revisar el Sass nuevo para detectar declaraciones repetidas, mixins que emitan reglas no utilizadas y estilos globales que puedan permanecer lazy en su vertical.
- Si un componente supera budget por una razón legítima y no hay duplicación, documenta el motivo en la PR/cambio.
