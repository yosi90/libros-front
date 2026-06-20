import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  getActiveSortKeys,
  getSortPriority,
  parseTextFilters,
  pruneEmptyFilters,
  serializeTextFilter,
  serializeTextFilters,
  toggleValue,
} from './filterEngine'
import type {
  CardSearchFilterOptions,
  CardSearchFilters,
  CardSortKey,
  CardSortOption,
  SearchOption,
  TextFilterScope,
} from './searchTypes'

interface SearchFilterBarProps {
  query: string
  filters: CardSearchFilters
  sort: CardSortOption
  options: CardSearchFilterOptions
  sortKeys?: CardSortKey[]
  searchRowAction?: ReactNode
  searchPlaceholder?: string
  advancedControls?: ReactNode
  onQueryChange: (query: string) => void
  onFiltersChange: (filters: CardSearchFilters) => void
  onSortChange: (sort: CardSortOption) => void
}

const TEXT_FILTER_SCOPES: {
  scope: TextFilterScope
  label: string
  toneClass: string
}[] = [
  { scope: 'contains', label: 'contiene', toneClass: 'text-filter-chip' },
  { scope: 'name', label: 'nombre', toneClass: 'name-filter-chip' },
  { scope: 'type', label: 'tipo', toneClass: 'type-text-filter-chip' },
  { scope: 'text', label: 'texto', toneClass: 'rules-text-filter-chip' },
  { scope: 'trait', label: 'característica', toneClass: 'trait-filter-chip' },
]

export function SearchFilterBar({
  query,
  filters,
  sort,
  options,
  sortKeys = ['name', 'set-number', 'cost', 'color'],
  searchRowAction,
  searchPlaceholder = 'Buscar...',
  advancedControls,
  onQueryChange,
  onFiltersChange,
  onSortChange,
}: SearchFilterBarProps) {
  const textChips = parseTextFilters(query)
  const activeChips = getActiveFilterChips(filters, options)
  const [draftQuery, setDraftQuery] = useState('')
  const [isSearchSuggestionOpen, setIsSearchSuggestionOpen] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const skipNextBlurCommitRef = useRef(false)
  const sortPanelRef = useRef<HTMLDetailsElement | null>(null)
  const advancedPanelRef = useRef<HTMLDetailsElement | null>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      const clickedInsideSort = sortPanelRef.current?.contains(target) ?? false
      const clickedInsideAdvanced = advancedPanelRef.current?.contains(target) ?? false

      if (!clickedInsideSort && !clickedInsideAdvanced) {
        setIsSortOpen(false)
        setIsAdvancedOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSortOpen(false)
        setIsAdvancedOpen(false)
        setIsSearchSuggestionOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function updateFilters(nextFilters: CardSearchFilters) {
    onFiltersChange(pruneEmptyFilters(nextFilters))
  }

  function updateTextChips(nextTextChips: string[]) {
    onQueryChange(serializeTextFilters(nextTextChips))
  }

  function addTextChip(scope: TextFilterScope, value: string) {
    const normalizedValue = value.trim()

    if (!normalizedValue) {
      return
    }

    const rawChip = serializeTextFilter({ scope, value: normalizedValue, raw: '' })

    if (!textChips.some((chip) => chip.raw.toLowerCase() === rawChip.toLowerCase())) {
      updateTextChips([...textChips.map((chip) => chip.raw), rawChip])
    }

    setDraftQuery('')
    setIsSearchSuggestionOpen(false)
  }

  function commitDraftQuery() {
    if (skipNextBlurCommitRef.current) {
      skipNextBlurCommitRef.current = false
      setIsSearchSuggestionOpen(false)
      return
    }

    const normalizedDraft = draftQuery.trim()

    if (!normalizedDraft) {
      setIsSearchSuggestionOpen(false)
      return
    }

    addTextChip('contains', normalizedDraft)
  }

  function selectSortKey(key: CardSortKey) {
    const activeSortKeys = getActiveSortKeys(sort, sortKeys)
    const isActive = activeSortKeys.includes(key)
    const nextSortKeys = isActive
      ? activeSortKeys.length === 1
        ? activeSortKeys
        : activeSortKeys.filter((sortKey) => sortKey !== key)
      : [...activeSortKeys, key]

    onSortChange({
      ...sort,
      key: nextSortKeys[0],
      keys: nextSortKeys,
      direction: getSortDirectionAfterKeyToggle(key, activeSortKeys, sort.direction),
    })
  }

  return (
    <div className="card-filter-system">
      {(isSortOpen || isAdvancedOpen) && (
        <div
          aria-hidden="true"
          className="filter-panel-viewport-shield"
          onPointerDown={() => {
            setIsSortOpen(false)
            setIsAdvancedOpen(false)
          }}
          onWheel={(event) => event.preventDefault()}
        />
      )}

      <div className={`filter-search-row ${searchRowAction ? 'has-search-row-action' : ''}`}>
        <details className="sort-order-panel" open={isSortOpen} ref={sortPanelRef}>
          <summary
            aria-label="Ordenar cartas"
            onClick={(event) => {
              event.preventDefault()
              setIsSortOpen((current) => !current)
              setIsAdvancedOpen(false)
            }}
          >
            Orden
          </summary>
          <div className="sort-order-menu">
            <div className="advanced-filter-group">
              <strong>Orden</strong>
              <div>
                {sortKeys.map((key) => (
                  <button
                    className={getActiveSortKeys(sort, sortKeys).includes(key) ? 'active' : ''}
                    key={key}
                    onClick={() => selectSortKey(key)}
                    type="button"
                  >
                    {getSortPriority(sort, sortKeys, key) && (
                      <span className="sort-priority-badge">
                        {getSortPriority(sort, sortKeys, key)}
                      </span>
                    )}
                    {getSortLabel(key)}
                  </button>
                ))}
              </div>
            </div>
            <div className="advanced-filter-group">
              <strong>Dirección</strong>
              <div>
                <button
                  className={sort.direction === 'asc' ? 'active' : ''}
                  onClick={() => onSortChange({ ...sort, direction: 'asc' })}
                  type="button"
                >
                  Asc
                </button>
                <button
                  className={sort.direction === 'desc' ? 'active' : ''}
                  onClick={() => onSortChange({ ...sort, direction: 'desc' })}
                  type="button"
                >
                  Desc
                </button>
              </div>
            </div>
            <div className="advanced-filter-group">
              <strong>Modo</strong>
              <div>
                <button
                  className={sort.typeMode === 'grouped' ? 'active' : ''}
                  onClick={() => onSortChange({ ...sort, typeMode: 'grouped' })}
                  type="button"
                >
                  Por tipo
                </button>
                <button
                  className={sort.typeMode === 'mixed' ? 'active' : ''}
                  onClick={() => onSortChange({ ...sort, typeMode: 'mixed' })}
                  type="button"
                >
                  Mezcladas
                </button>
              </div>
            </div>
          </div>
        </details>

        <div className="filter-search-box">
          {textChips.map((chip) => (
            <button
              className={`filter-chip ${getTextFilterScopeConfig(chip.scope).toneClass}`}
              key={`text-${chip.raw}`}
              onClick={() =>
                updateTextChips(
                  textChips.filter((value) => value.raw !== chip.raw).map((value) => value.raw),
                )
              }
              type="button"
            >
              {getTextFilterLabel(chip)}
              <span>x</span>
            </button>
          ))}

          {activeChips.map((chip) => (
            <button
              className={`filter-chip ${chip.toneClass}`}
              key={chip.key}
              onClick={() => updateFilters(chip.remove(filters))}
              type="button"
            >
              {chip.label}
              <span>x</span>
            </button>
          ))}

          <input
            aria-label="Buscar cartas"
            placeholder={searchPlaceholder}
            ref={searchInputRef}
            value={draftQuery}
            onBlur={commitDraftQuery}
            onChange={(event) => {
              setDraftQuery(event.target.value)
              setIsSearchSuggestionOpen(true)
            }}
            onFocus={() => setIsSearchSuggestionOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitDraftQuery()
                event.currentTarget.blur()
              }
            }}
          />

          {isSearchSuggestionOpen && draftQuery.trim() && (
            <div className="text-search-suggestion-menu">
              {TEXT_FILTER_SCOPES.map(({ scope, label }) => (
                <button
                  key={scope}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    skipNextBlurCommitRef.current = true
                    addTextChip(scope, draftQuery)
                    searchInputRef.current?.blur()
                  }}
                  type="button"
                >
                  <span>{label}:</span> {draftQuery.trim()}
                </button>
              ))}
            </div>
          )}

          {(draftQuery || textChips.length > 0 || activeChips.length > 0) && (
            <button
              aria-label="Limpiar todos los filtros"
              className="filter-query-clear"
              onClick={() => {
                setDraftQuery('')
                onQueryChange('')
                onFiltersChange({})
              }}
              type="button"
            >
              x
            </button>
          )}
        </div>

        <details className="advanced-filter-panel" open={isAdvancedOpen} ref={advancedPanelRef}>
          <summary
            aria-label="Filtros"
            onClick={(event) => {
              event.preventDefault()
              setIsAdvancedOpen((current) => !current)
              setIsSortOpen(false)
            }}
          >
            Filtros
          </summary>
          <div className="advanced-filter-grid">
            <FilterButtonGroup
              label="Tipo"
              options={options.types}
              selected={filters.types ?? []}
              onToggle={(type) =>
                updateFilters({ ...filters, types: toggleValue(filters.types, type) })
              }
            />
            <FilterButtonGroup
              label="Rareza"
              options={options.rarities}
              selected={filters.rarities ?? []}
              onToggle={(rarity) =>
                updateFilters({ ...filters, rarities: toggleValue(filters.rarities, rarity) })
              }
            />
            {options.traits && (
              <FilterButtonGroup
                label="Características"
                options={options.traits}
                selected={filters.traits ?? []}
                onToggle={(trait) =>
                  updateFilters({ ...filters, traits: toggleValue(filters.traits, trait) })
                }
              />
            )}
            <label className="set-filter-select">
              Set
              <select
                value={filters.setCodes?.[0] ?? ''}
                onChange={(event) =>
                  updateFilters({
                    ...filters,
                    setCodes: event.target.value ? [event.target.value] : [],
                  })
                }
              >
                <option value="">Todos los sets</option>
                {options.sets.map((set) => (
                  <option key={set.value} value={set.value}>
                    {set.label}
                  </option>
                ))}
              </select>
            </label>
            {advancedControls}
          </div>
        </details>

        {searchRowAction}
      </div>

      <div className="quick-filter-row" aria-label="Filtros rápidos">
        <div className="quick-filter-group">
          {options.colors.map((color) => (
            <button
              aria-label={`Filtrar color ${color.label}`}
              className={filters.colors?.includes(color.value) ? 'icon-filter active' : 'icon-filter'}
              key={color.value}
              onClick={() =>
                updateFilters({
                  ...filters,
                  colors: toggleValue(filters.colors, color.value),
                })
              }
              title={color.label}
              type="button"
            >
              {color.iconSrc ? <img src={color.iconSrc} alt="" /> : color.label}
            </button>
          ))}
        </div>

        <div className="quick-filter-group cost-filters">
          {options.costs.map((cost) => (
            <button
              aria-label={`Filtrar coste ${cost}`}
              className={filters.costs?.includes(cost) ? 'cost-filter active' : 'cost-filter'}
              key={cost}
              onClick={() =>
                updateFilters({
                  ...filters,
                  costs: toggleValue(filters.costs, cost),
                })
              }
              type="button"
            >
              {cost}
            </button>
          ))}
        </div>

        <div className="quick-filter-group">
          <button
            className={filters.inkwell === true ? 'active' : ''}
            onClick={() =>
              updateFilters({
                ...filters,
                inkwell: filters.inkwell === true ? undefined : true,
              })
            }
            type="button"
          >
            Entintable
          </button>
          <button
            className={filters.inkwell === false ? 'active' : ''}
            onClick={() =>
              updateFilters({
                ...filters,
                inkwell: filters.inkwell === false ? undefined : false,
              })
            }
            type="button"
          >
            No entintable
          </button>
        </div>
      </div>
    </div>
  )
}

function FilterButtonGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: SearchOption[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="advanced-filter-group">
      <strong>{label}</strong>
      <div>
        {options.map((option) => (
          <button
            aria-label={option.label}
            className={[
              selected.includes(option.value) ? 'active' : '',
              option.iconSrc ? 'advanced-icon-filter' : '',
            ].filter(Boolean).join(' ')}
            key={option.value}
            onClick={() => onToggle(option.value)}
            title={option.label}
            type="button"
          >
            {option.iconSrc ? <img src={option.iconSrc} alt="" /> : option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function getTextFilterScopeConfig(scope: TextFilterScope) {
  return TEXT_FILTER_SCOPES.find((option) => option.scope === scope) ?? TEXT_FILTER_SCOPES[0]
}

function getTextFilterLabel(chip: { scope: TextFilterScope; value: string }) {
  return `${getTextFilterScopeConfig(chip.scope).label}: ${chip.value}`
}

function getSortLabel(key: CardSortKey) {
  const labels: Record<CardSortKey, string> = {
    name: 'Alfabético',
    'set-number': 'Expansión',
    cost: 'Coste',
    color: 'Color',
    inkwell: 'Entintabilidad',
    'owned-count': 'Copias',
  }

  return labels[key]
}

function getSortDirectionAfterKeyToggle(
  key: CardSortKey,
  activeSortKeys: CardSortKey[],
  currentDirection: CardSortOption['direction'],
) {
  if (activeSortKeys.includes(key)) {
    return currentDirection
  }

  if (key === 'owned-count') {
    return 'desc'
  }

  return currentDirection
}

function getActiveFilterChips(filters: CardSearchFilters, options: CardSearchFilterOptions) {
  return [
    ...(filters.colors ?? []).map((color) => ({
      key: `color-${color}`,
      label: `Color: ${findOptionLabel(options.colors, color)}`,
      toneClass: 'filter-chip-color',
      remove: (current: CardSearchFilters) => ({
        ...current,
        colors: current.colors?.filter((value) => value !== color),
      }),
    })),
    ...(filters.costs ?? []).map((cost) => ({
      key: `cost-${cost}`,
      label: `Coste: ${cost}`,
      toneClass: 'filter-chip-cost',
      remove: (current: CardSearchFilters) => ({
        ...current,
        costs: current.costs?.filter((value) => value !== cost),
      }),
    })),
    ...(filters.types ?? []).map((type) => ({
      key: `type-${type}`,
      label: `Tipo: ${findOptionLabel(options.types, type)}`,
      toneClass: 'filter-chip-type',
      remove: (current: CardSearchFilters) => ({
        ...current,
        types: current.types?.filter((value) => value !== type),
      }),
    })),
    ...(filters.rarities ?? []).map((rarity) => ({
      key: `rarity-${rarity}`,
      label: `Rareza: ${findOptionLabel(options.rarities, rarity)}`,
      toneClass: 'filter-chip-rarity',
      remove: (current: CardSearchFilters) => ({
        ...current,
        rarities: current.rarities?.filter((value) => value !== rarity),
      }),
    })),
    ...(filters.setCodes ?? []).map((setCode) => ({
      key: `set-${setCode}`,
      label: `Set: ${findOptionLabel(options.sets, setCode)}`,
      toneClass: 'filter-chip-set',
      remove: (current: CardSearchFilters) => ({
        ...current,
        setCodes: current.setCodes?.filter((value) => value !== setCode),
      }),
    })),
    ...(filters.traits ?? []).map((trait) => ({
      key: `trait-${trait}`,
      label: `Caract.: ${findOptionLabel(options.traits ?? [], trait)}`,
      toneClass: 'filter-chip-trait',
      remove: (current: CardSearchFilters) => ({
        ...current,
        traits: current.traits?.filter((value) => value !== trait),
      }),
    })),
    ...(filters.inkwell === undefined
      ? []
      : [
          {
            key: 'inkwell',
            label: filters.inkwell ? 'Entintable' : 'No entintable',
            toneClass: filters.inkwell ? 'filter-chip-inkwell' : 'filter-chip-non-inkwell',
            remove: (current: CardSearchFilters) => ({
              ...current,
              inkwell: undefined,
            }),
          },
        ]),
  ]
}

function findOptionLabel(options: SearchOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

