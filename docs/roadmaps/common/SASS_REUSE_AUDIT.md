# Auditoría de reutilización Sass

> Auditoría viva del Sass de `src/`. Orienta refactors incrementales; no autoriza mezclar Wood y Mobile ni reescribir en bloque superficies estables. Se actualiza cuando se resuelve uno de sus candidatos o aparece una familia nueva relevante.

## Criterio

- Se comparan archivos idénticos, bloques consecutivos de declaraciones repetidos, imports, `@include`, `@extend`, tamaños y familias visuales.
- Una coincidencia de `display: flex/grid` no basta para crear un mixin. Solo se extrae cuando coinciden intención, presentación y ciclo de cambio.
- La prioridad favorece CSS idéntico demostrable, varios consumidores reales y reducción de fuente sin aumentar emisión ni especificidad.
- Una extracción se comprueba compilando cada consumidor antes y después con Dart Sass: el CSS normalizado debe ser el mismo.

## Lo común que ya existe

- **Web:** `src/assets/css/web/_primitives.sass` reúne mixins sin emisión (eyebrow, foco, botón y variantes, botón icónico, segmentado, estado de lectura, progreso, spinner, `web.card`, `web.field`, `web.state`, `web.switch`, `web.settings-page`, `web.search-field` y `web.dialog($width)`, que emite velo, superficie, cabecera y pie de los modales). Las vistas y los modales Web nuevos parten de ellos. `web/_classes.sass` emite una vez, con `:where()`, botones, iconos, antetítulos y estados: un bloque que solo haría `@include` de una primitive no se copia en el componente; se usa la clase global.
- **Wood:** `wood/_primitives.sass` (botón, botón fantasma y `material-fields`), `wood/_global.sass` (emite `material-fields` una vez), `wood/_profile.sass` y `wood/_catalog-modal.sass` (velo, superficie, cierre y menú «Añadir» del modal, sin emisión; los consumen `WoodPublicDetailModalComponent`, la petición de catálogo y la hoja de alta rápida).
- **Mobile:** `mobile/_primitives.sass` con `.m-card`/`.m-surface` (primitive explícita, sin `@extend`), `.m-button`, `.m-icon-button`, `.m-list-item`, `.m-chip`, `.m-fullscreen-surface` (lienzo, capas y app bar con safe areas: ficha pública y selector de antologías), `.m-sheet`, `mobile-sheet-scrim($z-index)`, `mobile-option-panel` y `mobile-outlined-field-tokens`. El foco y `prefers-reduced-motion` se emiten una sola vez. Biblioteca y Catálogo comparten `MobileScopedSearchComponent`.
- **Tema Mobile:** los tokens claros se emiten en cada raíz `.mobile-ui`, y una raíz anidada bajo `html[data-mobile-theme='dark']` recibe también el mixin oscuro, para que shells y overlays cercanos no sobrescriban con claro los tokens del documento.
- **Editor RTF:** un único núcleo funcional; la capa Mobile se activa con `data-presentation-active="mobile"` y consume tokens Mobile, la Web tiene la suya y la base Wood no cambia. Escenas y las seis entidades comparten la misma toolbar: Mobile en una fila horizontal y Wood con su composición envolvente.
- **Altas repetibles:** escenas y entradas comparten `scrollMobileFormBlockIntoView` (esperar al DOM, centrar el bloque nuevo y respetar movimiento reducido). Los avisos explicativos son el tipo `info` del toast, con sus tokens Mobile; el icono es una opción del toast, no una variante Sass.
- **Canvas Mobile:** el fondo lo garantizan la raíz Mobile y los dos routers neutrales; las vistas de Libro solo lo repiten donde tienen scroll propio.
- No hay `@extend`.

## Se queda local, y por qué

- **Entidades narrativas Mobile:** búsqueda, filas, relaciones y composición de formularios, porque no hay un segundo consumidor con la misma semántica completa.
- **Comunidad y mensajería Mobile:** la composición de formularios (creador de chat, gestión de club y compositor), porque difieren en ciclo, densidad y teclado.
- **Shell de lectura Mobile:** la navegación inferior, el drawer del índice y Estadísticas viven en la vertical Libro, que ya los comparte entre sus subrutas. Los gestos de Índice y Elementos comparten umbral dentro del componente; no se extraen hasta que haya un tercer consumidor estable.
- **Controles narrativos Mobile:** el campo nativo del capítulo no se extrae: su autocomplete de escena y el control Material del gestor no comparten markup, aunque sí tokens y panel.
- **Perfil Mobile:** su vista no consume `ProfileUniverseMetricsComponent`, cuya composición es Wood; reutiliza tokens y primitives Mobile.
- **«Ver ediciones» en la Biblioteca Mobile:** composición local secundaria (texto de 12 px, target de 44 px, sin borde ni relleno) sobre `m-button` y el foco global; un solo consumidor.
- **El velo de los clubes** conserva el suyo: difiere en capa, centrado y color de `mobile-sheet-scrim`.

## Candidatos confirmados

### Prioridad alta: extraer al tocar la vertical

1. **Controles Wood sociales.** El botón dorado (`#f2c77c → #b87932`, borde claro y tinta oscura) aparece al menos 13 veces en hojas de perfil, comunidad, clubes y chat, y los campos oscuros con borde dorado, en comunidad, club y conversación. Deben vivir en `src/assets/css/wood/` como mixins pequeños de acción y control; altura, padding y radio quedan locales cuando tengan semántica distinta.
2. **Tokens Material Wood.** Los mismos grupos `--mat-select-*` y `--mat-option-*` se repiten en capítulo, entidades narrativas, libro, catálogo, perfil y object manager. Extraer mixins por familia de control, sin un megamixin Material.
3. **Superficie narrativa Wood.** Capítulo, estadísticas del libro y entidades comparten el fondo de `fondo_desplegable.png`, sus tres capas, borde, radio y sombra. Crear una surface Wood semántica cuando se vuelva a tocar los tres consumidores.
4. **Selector segmentado de dos estados.** Biblioteca, catálogo, object manager y preferencias repiten pista, indicador absoluto y desplazamiento al segundo estado. Consolidar geometría y transición; cada feature conserva labels, estado y anchuras.

### Prioridad media: compartir solo con evidencia de uso

1. **Ellipsis de una línea.** Candidato a mixin neutral, pero solo en archivos que ya importen un parcial neutral: crear un import para una sola regla puede empeorar la legibilidad.
2. **Texto solo para lectores de pantalla.** El patrón de 1 px/clip se repite; candidato a utility global accesible.
3. **Cajas de icono.** Tamaños repetidos sin semántica común (app bar, botón icónico, avatar, acción de tabla). No crear un mixin genérico: compartir dentro de cada familia cuando exista su primitive.

## Archivos de mayor deuda

- `narrative-entity-placeholder.component.sass`: unas 1850 líneas.
- `book.component.sass`: unas 1100.
- `community.component.sass`: unas 1050.
- `user-profile.component.sass`: unas 780.
- `catalog.component.sass`: unas 690.
- `object-manager.component.sass`: unas 520.

No se convierten en un parcial gigante: se dividen por presentación y responsabilidad cuando se toquen (tokens y primitives comunes, composición Wood, composición Mobile y overrides Material separados).

## Patrones que no se extraen

- Alineaciones flex/grid genéricas sin semántica compartida.
- Radios parecidos con componentes o densidades diferentes.
- Reglas que solo coinciden entre Wood y Mobile pero pertenecen a identidades distintas.
- Un único consumidor futuro o una parametrización que replique todas las propiedades originales.

## Puerta para cambios futuros

Antes de añadir Sass:

1. releer `docs/GUIA_ESTILOS.md`;
2. buscar tokens, mixins y primitives existentes en la presentación;
3. consultar esta auditoría para la familia afectada;
4. extraer en el segundo uso semántico real;
5. comparar build, CSS emitido y budget, y Playwright de las superficies tocadas.
