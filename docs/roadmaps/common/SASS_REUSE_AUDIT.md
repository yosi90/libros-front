# Auditoría de reutilización Sass

> Corte revisado: 28 de agosto de 2026. Alcance: los 93 archivos `.sass`/`.scss` bajo `src/`. Esta auditoría orienta refactors incrementales; no autoriza mezclar Wood y Mobile ni reescribir en bloque superficies estables.

## Criterio

- Se compararon archivos idénticos, bloques consecutivos de declaraciones repetidos, imports, `@include`, `@extend`, tamaños y familias visuales.
- Una coincidencia de `display: flex/grid` no basta para crear un mixin. Solo se extrae cuando coinciden intención, presentación y ciclo de cambio.
- La prioridad favorece CSS idéntico demostrable, varios consumidores reales y reducción de fuente sin aumentar emisión ni especificidad.
- Light/dark, el selector de tema y sus fallbacks retirados no reciben abstracciones nuevas salvo que sean necesarias para eliminarlos con seguridad en H12.

## Ejecutado en esta auditoría

- **Editores CRUD Wood legacy:** autor, universo, saga, antología y libro repetían el mismo frame, card y composición entre altas y ediciones. Diez consumidores pasan a `src/assets/css/wood/_legacy-entity-editors.sass` con cuatro mixins semánticos y solo un parámetro real para la anchura de autor.
- **Resultado de fuente:** los diez consumidores pasan de 432 a 26 líneas; el parcial común añade 113, con una reducción neta de 293 líneas.
- **Equivalencia:** se compiló cada consumidor antes/después mediante Dart Sass y el CSS normalizado fue idéntico en los diez casos.
- **`@extend`:** se eliminaron sus dos únicos usos. Mobile comparte `.m-surface, .m-card` mediante una primitive explícita sin aumentar el CSS; el libro agrupa `.drawer-toggle, .book-back`, incluida la touch target MDC. Ambas salidas se compararon con su versión anterior y son idénticas.
- **Autenticación pública:** H7 centralizó el layout público Mobile en `MobileAuthPageComponent` y sus patrones repetidos de formulario en `src/assets/css/mobile/_public-auth.sass`, emitidos una sola vez bajo `.mobile-ui`. Los imports legacy de las vistas Wood quedaron reunidos en `src/assets/css/wood/_public-auth-view.sass`; cada feature conserva únicamente su composición específica.
- **Editor RTF compartido:** H10 conserva un único núcleo funcional para Wood/Mobile, pero la variante táctil dejó de depender de los temas retirados `light/dark`. Sus reglas de superficie, foco, toolbar, menús y touch targets se activan exclusivamente mediante `data-presentation-active="mobile|native-mobile"` y consumen tokens Mobile; la base Wood no cambia.
- **Entidades narrativas Mobile:** H10 reúne personajes, organizaciones, eventos, localizaciones, conceptos y citas en una sola vista parametrizada. Consume las primitives globales `.m-card`, `.m-button` y `.m-icon-button`; foco y `prefers-reduced-motion` permanecen emitidos una sola vez por `_primitives.sass`. Búsqueda, filas, relaciones y composición de formularios siguen locales porque aún no existe un segundo consumidor con la misma semántica completa.
- **Comunidad y mensajería Mobile:** H11 reutiliza `.m-card`, `.m-button`, `.m-icon-button`, `.m-list-item`, `.m-chip`, tipografía y tokens en perfil, clubes, bandeja, conversación y notificaciones. La composición de formularios permanece local: creador de chat, gestión de club y compositor de mensajes difieren en ciclo, densidad y comportamiento de teclado, por lo que una abstracción común exigiría parametrizar casi todas sus reglas. Foco y reducción de movimiento continúan emitidos una sola vez por `_primitives.sass`.
- **Retirada definitiva de light/dark:** H12 eliminó el selector, sus servicios, los tokens alternativos y 3.507 líneas de bloques Sass muertos repartidos en 28 componentes. No se creó una abstracción para código retirado ni se alteró la cascada activa Wood/Mobile; una barrera QA impide reintroducir `data-theme`, almacenamiento local de tema o consumidores de esos servicios.
- **Lector nativo y país:** el autocomplete compartido consume los campos y tokens existentes de cada presentación; la píldora del lector permanece local porque solo existe en `native-mobile`. No se ha creado una primitive transversal para una única superficie ni se ha filtrado su composición a Wood.
- **Autenticación Mobile adaptable:** `MobileAuthPageComponent` admite ahora, mediante custom properties con fallback, ajustar separación de columnas, ancho y alineación del panel sin duplicar su grid ni afectar a las demás rutas. La cita compacta se activa mediante un input explícito y Login la combina con el catálogo corto para conservar una altura predecible. La superficie fullscreen de correo/teléfono permanece local al Login mientras no exista un segundo consumidor; el atributo funcional `data-native-back-overlay` sí queda como contrato reutilizable del runtime Android.
- **Herencia de apariencia Mobile:** los tokens light se siguen emitiendo en cada raíz `.mobile-ui`, pero una raíz anidada bajo `html[data-mobile-theme='dark']` recibe también el mixin oscuro. Esto evita que shells y overlays cercanos vuelvan a sobrescribir con light los tokens canónicos del documento.

## Candidatos confirmados

### Prioridad alta — extraer al tocar la vertical

1. **Controles Wood sociales.** El botón dorado (`#f2c77c → #b87932`, borde claro y tinta oscura) aparece al menos 13 veces en ocho hojas de perfil, comunidad, clubes y chat. Los campos oscuros con borde dorado aparecen repetidos en comunidad, club y conversación. Deben vivir en `src/assets/css/wood/` como mixins pequeños de acción y control; altura, padding y radio permanecen locales cuando tengan semántica distinta.
2. **Tokens MDC Wood.** Los mismos grupos `--mdc-outlined-text-field-*`, `--mat-select-*` y `--mat-option-*` se repiten en capítulo, entidades narrativas, object manager y administración de libros. Extraer mixins por familia de control, sin agruparlos en un único megamixin Material.
3. **Superficie narrativa Wood.** Capítulo, estadísticas de libro y entidades comparten exactamente el fondo de `fondo_desplegable.png`, sus tres capas, borde, radio y sombra. Crear una surface Wood semántica para bloques narrativos cuando H10 vuelva a tocar los tres consumidores.
4. **Selector segmentado de dos estados.** Biblioteca/libros, catálogo, object manager y preferencias repiten pista, indicador absoluto y desplazamiento al segundo estado. Consolidar geometría y transición; cada feature conserva labels, estado y anchuras necesarias.
5. **Cabeceras y acciones administrativas.** Las pantallas de administración ya consumen `modern-admin`, pero conservan bloques Wood duplicados para título, botón dorado, tabla y estados. Añadir primitives Wood administrativas en el próximo cambio de esa vertical, sin extender `modern-admin` a Wood.

### Prioridad media — compartir solo con evidencia de uso

1. **Ellipsis de una línea.** `overflow/text-overflow/white-space` aparece en al menos nueve lugares. Es candidato a mixin neutral porque no expresa identidad, pero solo debe importarse en archivos que ya necesiten un parcial neutral; crear un import para una sola regla puede empeorar la legibilidad.
2. **Texto solo para lectores de pantalla.** El patrón de 1px/clip aparece en catálogo, selector retirado y administración. Crear una utility global accesible cuando sobrevivan al retiro de light/dark los consumidores definitivos.
3. **Cajas de icono.** Se repiten tamaños 18, 22, 30, 32, 36 y 38px. No crear un mixin parametrizable genérico; app bar, botón icónico, avatar y acción de tabla tienen semánticas distintas. Compartir dentro de cada familia cuando exista su componente/primitive.
4. **Imports de autenticación Wood — resuelto en H7.** Login, registro, recuperación, reset, onboarding y verificación consumen `src/assets/css/wood/_public-auth-view.sass`; no volver a copiar los tres imports legacy en vistas nuevas.
5. **Snackbar/forms con `::ng-deep`.** Su import repetido emite reglas encapsuladas en numerosos componentes. Antes de globalizar hay que verificar overlays, scope y orden; moverlos sin esa prueba puede cambiar MDC de forma transversal.

## Archivos de mayor deuda

- `narrative-entity-placeholder.component.sass`: 1902 líneas.
- `user-profile.component.sass`: 1510 líneas.
- `catalog.component.sass`: 1371 líneas.
- `object-manager.component.sass`: 1244 líneas.
- `community.component.sass`: 1234 líneas.
- `book.component.sass`: 1113 líneas.

Estos archivos no deben convertirse en un parcial gigante. Se dividirán por presentación y responsabilidad al pasar por H8-H11: tokens/primitives comunes, composición Wood, composición Mobile y overrides Material claramente separados.

## Patrones que no se extraen

- Alineaciones flex/grid genéricas sin semántica compartida.
- Radios parecidos con componentes o densidades diferentes.
- Reglas que solo coinciden entre Wood y Mobile pero pertenecen a identidades distintas.
- Código light/dark que será retirado en H12.
- Un único consumidor futuro o una parametrización que replique todas las propiedades originales.

## Puerta para cambios futuros

Antes de añadir Sass:

1. releer `docs/GUIA_ESTILOS.md`;
2. buscar tokens, mixins y primitives existentes en la presentación;
3. consultar esta auditoría para la familia afectada;
4. extraer en el segundo uso semántico real;
5. comparar build, CSS emitido/budget y Playwright de las superficies tocadas.

La auditoría se actualiza cuando se resuelve uno de sus candidatos o aparece una familia nueva relevante.
