# Guía de portado

## 1. Adapta el modelo

Empieza por `portable-code/searchTypes.ts`. Cambia `SearchableCard` para que represente los objetos reales de tu app.

Si tu app no tiene cartas, puedes renombrarlo a `SearchableItem`.

Campos mínimos recomendados:

- `id`;
- nombre principal;
- texto descriptivo;
- arrays para categorías/etiquetas;
- campos numéricos para filtros rápidos;
- campos booleanos para toggles.

## 2. Adapta los filtros

Modifica `CardSearchFilters`.

Ejemplo para una app de inventario:

```ts
export interface CardSearchFilters {
  categories?: string[]
  locations?: string[]
  tags?: string[]
  condition?: string[]
  missing?: boolean
}
```

Después ajusta `applyCardFilters` en `filterEngine.ts`.

## 3. Adapta las opciones visuales

`SearchFilterBar` recibe `options`.

```ts
const filterOptions: CardSearchFilterOptions = {
  colors: [
    { value: 'Ruby', label: 'Ruby', iconSrc: '/icons/ruby.svg' },
  ],
  costs: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  types: [
    { value: 'Character', label: 'Personaje' },
  ],
  rarities: [],
  sets: [],
  traits: [],
}
```

En otra app, cambia `colors`, `costs`, `types`, etc. por tus grupos. Si quieres otros nombres, cambia tipos, motor y render del panel avanzado.

## 4. Integra en una página

Ejemplo de página contenedora:

```tsx
const [query, setQuery] = useState('')
const [filters, setFilters] = useState<CardSearchFilters>({})
const [sort, setSort] = useState<CardSortOption>({
  key: 'set-number',
  keys: ['set-number'],
  direction: 'asc',
  typeMode: 'grouped',
})
const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('owned')
const [viewMode, setViewMode] = useState<'images' | 'text'>('images')
const [cards, setCards] = useState<SearchableCard[]>([])

const visibleCards = useMemo(() => {
  let nextCards = applyCardSearchQuery(cards, query)
  nextCards = applyCardFilters(nextCards, filters)
  nextCards = applyAvailabilityFilter(nextCards, availabilityFilter)
  return sortCards(nextCards, sort)
}, [availabilityFilter, cards, filters, query, sort])

return (
  <SearchControls
    availabilityFilter={availabilityFilter}
    availabilityOptions={['all', 'owned', 'wants']}
    filters={filters}
    options={filterOptions}
    query={query}
    searchResultCount={visibleCards.length}
    sort={sort}
    viewMode={viewMode}
    onAvailabilityFilterChange={setAvailabilityFilter}
    onFiltersChange={setFilters}
    onQueryChange={setQuery}
    onSortChange={setSort}
    onViewModeChange={setViewMode}
  />
)
```

## 5. Carga async con debounce y request id

Si la app busca en API, usa este patrón:

```ts
const requestIdRef = useRef(0)

useEffect(() => {
  const timeout = window.setTimeout(() => {
    loadCards()
  }, 250)

  return () => window.clearTimeout(timeout)
}, [filters, query, availabilityFilter])

async function loadCards() {
  const requestId = requestIdRef.current + 1
  requestIdRef.current = requestId

  const result = query.trim()
    ? await provider.searchCards(query, filters)
    : await provider.listCachedCards('', filters)

  if (requestId !== requestIdRef.current) {
    return
  }

  setCards(result.cards)
}
```

## 6. Mantén la disponibilidad fuera del proveedor

No hagas que el proveedor de catálogo sepa qué cartas son tuyas, favoritas o están en un mazo. Eso normalmente viene de otro repositorio local o tabla.

```ts
function applyAvailabilityFilter(cards: SearchableCard[], availability: AvailabilityFilter) {
  if (availability === 'owned') {
    return cards.filter((card) => (card.ownedCount ?? 0) > 0)
  }

  if (availability === 'wants') {
    return cards.filter((card) => (card.wantsCount ?? 0) > 0)
  }

  if (availability === 'deck') {
    return cards.filter((card) => (card.deckCount ?? 0) > 0)
  }

  return cards
}
```

## 7. Añade persistencia opcional

Puedes persistir preferencias de UI:

```ts
localStorage.setItem('myapp.cardSort', JSON.stringify(sort))
localStorage.setItem('myapp.cardViewMode', viewMode)
localStorage.setItem('myapp.showSpecialCards', String(showSpecialCards))
```

No persistas `draftQuery`; solo `query` si quieres restaurar chips confirmados.

## 8. Checklist final

- El input convierte texto en chips al pulsar Enter.
- El menú de sugerencias no crea chips duplicados.
- El botón de limpiar borra query, draft y filtros estructurados.
- Los filtros rápidos crean chips visibles dentro del textbox.
- Los menús flotantes se cierran al tocar fuera y con Escape.
- Cambios rápidos de filtros no muestran resultados de una petición vieja.
- El orden siempre tiene al menos una clave activa.
- El layout no se rompe con varios chips en móvil.

