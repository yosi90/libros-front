# Guía de estilos visuales

Fuente de verdad para decisiones visuales del frontend. Si una pantalla nueva o un ajuste visual contradice esta guía, actualiza primero esta guía o registra explícitamente la excepción.

## Dirección visual

- La zona autenticada usa un lenguaje editorial oscuro: cuero, papel envejecido, dorados apagados y superficies con profundidad sutil.
- Prioriza una UI de herramienta de biblioteca: densa, clara, escaneable y consistente. Evita composiciones de landing dentro del dashboard.
- El contenido debe vivir dentro del shell autenticado, sin salirse del panel del router ni provocar scroll del shell completo.
- Desktop es la prioridad actual. La responsividad móvil se mantiene funcional, pero los problemas móviles no bloquean salvo que rompan el uso básico.

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
- No reintroducir `fondo.png` en código activo; queda como asset legacy descartado.

## Tipografía y jerarquía

- Titulares editoriales: Georgia o serif equivalente, peso medio, color dorado.
- Texto operativo: sans-serif del proyecto/Material, compacto y legible.
- Evita títulos hero dentro de paneles de herramienta. En cards, sidebars, tablas y modales usa tamaños contenidos.
- Los textos largos deben truncar con ellipsis o envolver de forma controlada; nunca deben ensanchar cards, columnas o botones.

## Iconografía y botones

- Usa Material Icons ya presentes en el proyecto.
- Los botones puramente icónicos deben tener dimensiones estables y centrar explícitamente el `mat-icon`.
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
- Si un componente supera budget por una razón legítima y no hay duplicación, documenta el motivo en la PR/cambio.
