# Especificación del sistema

## Objetivo

Crear un buscador de colección de cartas que funcione bien en móvil y sea fácil de adaptar a otra app. El usuario debe poder combinar texto, filtros rápidos, filtros avanzados, disponibilidad y orden sin salir de una barra compacta.

## Comportamiento esperado

### Textbox con chips

El textbox funciona como contenedor de filtros activos. Dentro aparecen:

- chips textuales;
- chips de filtros estructurados;
- input para escribir un nuevo término;
- botón de limpiar todo.

Cuando el usuario escribe, el texto queda en `draftQuery`. Todavía no filtra como chip final hasta que:

- pulsa Enter;
- el input pierde foco;
- elige una opción del menú flotante.

Al confirmar, el texto se convierte en chip. El input se limpia.

### Menú de sugerencias textuales

Si el usuario escribe `mickey`, se muestra un menú flotante con opciones como:

- `contiene: mickey`;
- `nombre: mickey`;
- `tipo: mickey`;
- `texto: mickey`;
- `característica: mickey`.

Al seleccionar una opción:

1. se crea un chip con alcance;
2. se serializa en `query`;
3. se cierra el menú;
4. se hace `blur()` para cerrar teclado móvil;
5. se evita que el `blur` cree otro chip genérico duplicado.

### Filtros rápidos

Son botones visibles siempre debajo del textbox. En una colección de cartas suelen ser:

- colores/tintas;
- costes;
- entintable/no entintable.

En otra app pueden ser:

- categorías principales;
- estados;
- etiquetas frecuentes;
- rangos numéricos.

### Menú avanzado

El menú avanzado contiene filtros menos usados o que ocupan más espacio:

- tipos;
- rarezas;
- sets;
- características;
- cualquier control extra inyectado por la página.

Debe ser un panel flotante, no una sección que empuje el layout.

### Menú de orden

El orden permite una o varias prioridades. Ejemplo:

1. expansión;
2. coste;
3. nombre.

Tocar una clave inactiva la añade como última prioridad. Tocar una clave activa la elimina, salvo si es la única activa. Así el sistema nunca se queda sin criterio de orden.

### Disponibilidad

La disponibilidad no es parte del catálogo. La página contenedora la aplica después de buscar.

Ejemplos:

- `all`: todas las cartas;
- `owned`: cartas con copias propias;
- `wants`: cartas en lista de deseos;
- `deck`: cartas que ya están en el mazo.

En otra app podrían ser `all`, `mine`, `favorites`, `archived`, `missing`, etc.

## Estados

Estado que vive en la página:

```ts
const [query, setQuery] = useState('')
const [filters, setFilters] = useState<CardSearchFilters>({})
const [sort, setSort] = useState<CardSortOption>(defaultSort)
const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('owned')
const [viewMode, setViewMode] = useState<'images' | 'text'>('images')
const [showSpecialCards, setShowSpecialCards] = useState(false)
```

Estado interno de la barra:

```ts
const [draftQuery, setDraftQuery] = useState('')
const [isSearchSuggestionOpen, setIsSearchSuggestionOpen] = useState(false)
const [isSortOpen, setIsSortOpen] = useState(false)
const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
```

## Serialización de chips textuales

`query` es un string con un chip por línea:

```txt
Mickey
name:Donald
text:draw card
classification:hero
```

Ventajas:

- fácil de guardar en URL/localStorage si hace falta;
- fácil de parsear;
- varios chips son acumulativos;
- no se mezclan filtros estructurados con texto.

Regla de búsqueda:

- cada línea debe cumplirse;
- cada palabra dentro de la línea debe aparecer en el campo buscado;
- no se exige frase exacta.

## Semántica recomendada de filtros

Define cada filtro de forma explícita:

- colores/tintas: AND si quieres encontrar cartas que tengan todos los colores seleccionados;
- coste: OR;
- tipo: OR;
- rareza: OR;
- set: OR o selección única;
- booleanos: igualdad exacta.

No dejes que la UI decida la semántica. La UI solo activa valores; el motor de filtros decide qué significa combinarlos.

## Flujo de datos

1. El usuario cambia `query`, `filters`, `sort` o disponibilidad.
2. La página espera un debounce corto, por ejemplo 250 ms.
3. La página carga datos desde API/cache si hace falta.
4. La página ignora respuestas antiguas con un `requestId`.
5. Se aplica `applyCardSearchQuery`.
6. Se aplica `applyCardFilters`.
7. Se aplica disponibilidad.
8. Se aplica `sortCards`.
9. Se renderiza la lista o grid.

## Reglas móviles importantes

- El textbox debe permitir `flex-wrap` para que los chips no desborden.
- Los menús flotantes deben tener `max-height` y `overflow: auto`.
- Al elegir una sugerencia, cerrar teclado con `input.blur()`.
- Para cerrar paneles, usar un escudo transparente fijo en vez de bloquear el scroll del documento.
- El botón de limpiar todo debe estar dentro del textbox.

