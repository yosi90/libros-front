import type { ReactNode } from 'react'
import { SearchFilterBar } from './SearchFilterBar'
import type {
  AvailabilityFilter,
  CardSearchFilterOptions,
  CardSearchFilters,
  CardSortKey,
  CardSortOption,
} from './searchTypes'

interface SearchControlsProps<TViewMode extends string> {
  filters: CardSearchFilters
  sort: CardSortOption
  query: string
  options: CardSearchFilterOptions
  showSpecialCards?: boolean
  availabilityFilter: AvailabilityFilter
  availabilityOptions?: AvailabilityFilter[]
  viewMode: TViewMode
  imageViewMode: TViewMode
  textViewMode: TViewMode
  sortKeys?: CardSortKey[]
  searchRowAction?: ReactNode
  searchResultCount?: number
  onFiltersChange: (filters: CardSearchFilters) => void
  onSortChange: (sort: CardSortOption) => void
  onQueryChange: (query: string) => void
  onShowSpecialCardsChange?: (showSpecialCards: boolean) => void
  onAvailabilityFilterChange: (availabilityFilter: AvailabilityFilter) => void
  onViewModeChange: (viewMode: TViewMode) => void
}

const availabilityLabels: Record<AvailabilityFilter, string> = {
  all: 'Todas',
  owned: 'Solo mías',
  wants: 'Wants',
  deck: 'Deck',
}

export function SearchControls<TViewMode extends string>({
  filters,
  sort,
  query,
  options,
  showSpecialCards = false,
  availabilityFilter,
  availabilityOptions = ['all', 'owned'],
  viewMode,
  imageViewMode,
  textViewMode,
  sortKeys,
  searchRowAction,
  searchResultCount,
  onFiltersChange,
  onSortChange,
  onQueryChange,
  onShowSpecialCardsChange,
  onAvailabilityFilterChange,
  onViewModeChange,
}: SearchControlsProps<TViewMode>) {
  return (
    <div className="card-search-controls">
      <SearchFilterBar
        advancedControls={
          onShowSpecialCardsChange ? (
            <div className="advanced-filter-group">
              <strong>Visualización</strong>
              <div className="single-toggle">
                <label className={showSpecialCards ? 'toggle-filter active' : 'toggle-filter'}>
                  <input
                    checked={showSpecialCards}
                    onChange={(event) => onShowSpecialCardsChange(event.target.checked)}
                    type="checkbox"
                  />
                  Mostrar cartas especiales
                </label>
              </div>
            </div>
          ) : null
        }
        filters={filters}
        onFiltersChange={onFiltersChange}
        onQueryChange={onQueryChange}
        onSortChange={onSortChange}
        options={options}
        query={query}
        searchPlaceholder={getSearchPlaceholder(searchResultCount)}
        searchRowAction={searchRowAction}
        sort={sort}
        sortKeys={sortKeys}
      />

      <div className="builder-toggle-row">
        <div className="segmented-toggle" aria-label="Modo de vista">
          <label className={viewMode === imageViewMode ? 'toggle-filter active' : 'toggle-filter'}>
            <input
              checked={viewMode === imageViewMode}
              name="card-result-view-mode"
              onChange={() => onViewModeChange(imageViewMode)}
              type="radio"
            />
            Imagen
          </label>
          <label className={viewMode === textViewMode ? 'toggle-filter active' : 'toggle-filter'}>
            <input
              checked={viewMode === textViewMode}
              name="card-result-view-mode"
              onChange={() => onViewModeChange(textViewMode)}
              type="radio"
            />
            Texto
          </label>
        </div>

        <div className="segmented-toggle" aria-label="Disponibilidad de cartas">
          {availabilityOptions.map((option) => (
            <label
              className={availabilityFilter === option ? 'toggle-filter active' : 'toggle-filter'}
              key={option}
            >
              <input
                checked={availabilityFilter === option}
                name="ownership-visibility"
                onChange={() => onAvailabilityFilterChange(option)}
                type="radio"
              />
              {availabilityLabels[option]}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function getSearchPlaceholder(searchResultCount: number | undefined) {
  if (searchResultCount === undefined) {
    return 'Buscar...'
  }

  return `Buscar entre ${new Intl.NumberFormat('es-ES').format(searchResultCount)} cartas`
}

