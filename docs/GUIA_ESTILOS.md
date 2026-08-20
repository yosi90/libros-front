# Guía de estilos visuales

Fuente de verdad para decisiones visuales del frontend. Si una pantalla nueva o un ajuste visual contradice esta guía, actualiza primero esta guía o registra explícitamente la excepción.

## Dirección visual

- La aplicación mantiene tres temas: `wood`, `light` y `dark`. El tema no decide la estructura; la composición responde al espacio y a las capacidades de interacción.
- `wood` conserva el lenguaje editorial oscuro de cuero, papel envejecido, dorados apagados y profundidad sutil, y solo está disponible en escritorio.
- `light` y `dark` comparten una geometría moderna y funcional, sin imágenes de fondo. Se diferencian mediante tokens de color, contraste, bordes, elevación y estados.
- Prioriza una UI de herramienta de biblioteca: densa, clara, escaneable y consistente. Evita composiciones de landing dentro del dashboard.
- El contenido debe vivir dentro del shell correspondiente. En `desktop` el scroll permanece en el panel de ruta; en `compact` y `medium` cada pantalla declara un único propietario de scroll y evita encerrar toda la aplicación en `100vh` estático.
- Móvil, plegable, tablet y ultrawide son superficies contractuales. Un cambio visual no se considera cerrado hasta verificar los modos `compact`, `medium`, `desktop` y sus modificadores que le correspondan.

## Modos de composición y capacidades

- `compact`: `320-599px`. App bar contextual, navegación inferior, una columna, drawers superpuestos y modales a pantalla completa.
- `medium`: `600-1050px`. Navigation rail, paneles plegables y lista-detalle solo cuando ambos lados conservan ancho útil.
- `desktop`: más de `1050px`. Sidebar e índices persistentes, toolbars completas y ventanas flotantes cuando también existe altura suficiente.
- `wide` y `ultrawide` son modificadores de `desktop`, no shells distintos. Se consideran a partir de `1600px` y `2560px` respectivamente.
- Los breakpoints son estados semánticos centralizados; los componentes no deben introducir nuevos cortes globales ni leer `window.innerWidth` si el servicio de viewport o una container query resuelven el caso.
- Orientación, altura, `hover` y precisión del puntero complementan al ancho. No detectar marcas, modelos ni categorías mediante user-agent.
- Administración requiere composición `desktop` y puntero preciso. Fuera de ese contrato no se muestra y la navegación directa se rechaza.
- En plegables se favorece el reflow continuo. Ninguna acción crítica debe depender de conocer la posición de una bisagra; CSS Viewport Segments solo puede añadirse como mejora progresiva.
- En wide/ultrawide no se estiran indefinidamente formularios, párrafos o editores. Se usan anchos máximos de lectura, columnas adicionales con límite, espacios laterales controlados y paneles simultáneos solo cuando aportan contexto.
- Las superficies de datos pueden aprovechar ultrawide con más columnas o un tercer panel, pero navegación, targets, tipografía y densidad no escalan proporcionalmente al ancho total.
- Usar `100dvh`/`100svh` y `safe-area-inset-*` cuando el shell toque límites del viewport. Verificar siempre teclado virtual, portrait y landscape.
- Todo control táctil esencial reserva al menos `44x44px`. Hover, tooltip y drag and drop son ayudas, nunca el único acceso a una acción móvil.
- `AdaptiveLayoutService` es la fuente runtime de modo y capacidades. Publica `data-layout-mode`, orientación, puntero, hover, wide/ultrawide, estado del teclado virtual y las custom properties `--app-viewport-*`/`--app-keyboard-inset` sobre `<html>`.
- Las decisiones estructurales Angular consumen ese servicio. El acceso directo a `window.innerWidth`/`innerHeight` se limita a cálculos geométricos de overlays y ventanas flotantes; no crea modos ni navegación paralela.
- Las primitives globales `.app-shell-region`, `.app-scroll-region`, `.app-content-region`, `.app-readable-region` y `.app-touch-target` fijan geometría activa sin imponer colores de tema. Las geometrías aún no usadas de grid, container, app bar, bottom navigation, rail, sidebar, panel, modal y toolbar viven como mixins en `src/assets/css/_adaptive-layout.sass`; cada shell las emite solo cuando las consume para no inflar el bundle inicial.

## Temas y tokens

- Los componentes nuevos consumen custom properties semánticas; no codifican la paleta de un tema en su estructura.
- Familias mínimas de tokens: fondo, superficie, superficie elevada, texto principal/secundario, borde, acento, foco, éxito, aviso, error, scrim y sombra.
- El tema se aplica también al overlay container de Angular Material para que dialogs, selects, menus, tooltips y bottom sheets no queden fuera del contrato.
- La preferencia persistida y el tema efectivo son conceptos distintos: una preferencia `wood` aplica `dark` en `compact`/`medium` y se restaura al volver a escritorio.
- Light/dark no deben solicitar ni ocultar mediante overlay las texturas de wood: sus reglas no incluyen esos recursos.
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

### Colección privada

- Cards de libro/antología con portada a sangre y fondo texturizado.
- La parrilla debe ser compacta y aprovechar espacio sin mezclar visualmente sagas y autoconclusivos.
- Las luces de cards pueden variar, pero deben cachearse por entidad para evitar parpadeos.
- La búsqueda usa chips y sugerencias; los controles segmentados usan burbuja animada.
- En el índice de lectura, el orden del capítulo se presenta fuera del botón, en una burbuja circular fija situada en una columna propia a su izquierda. El título se centra dentro de todo el botón; si envuelve a varias líneas crece el botón, nunca la burbuja.

### Catálogo

- Las cards de catálogo son más informativas que las de colección, con portada ancha y metadatos compactos.
- El clic abre ficha pública en modal; no navegar a lectura salvo acción explícita y si el item está en biblioteca.
- No mostrar rótulos redundantes como “Libro”/“Antología” si el contexto ya lo comunica.

### Estadísticas

- Usar el mismo esquema de métricas y paneles oscuros que gestores.
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
