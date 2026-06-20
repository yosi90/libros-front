import type {
  AvailabilityFilter,
  CardSearchFilters,
  CardSortKey,
  CardSortOption,
  SearchableCard,
  TextFilterChip,
  TextFilterScope,
} from './searchTypes'

export function applyCardFilters(cards: SearchableCard[], filters: CardSearchFilters = {}) {
  return cards.filter((card) => {
    if (
      filters.colors?.length &&
      !filters.colors.every((color) => card.colors.includes(color))
    ) {
      return false
    }

    if (
      filters.costs?.length &&
      !filters.costs.includes(card.cost ?? Number.NaN)
    ) {
      return false
    }

    if (
      filters.types?.length &&
      !filters.types.some((type) => card.types.includes(type))
    ) {
      return false
    }

    if (
      filters.rarities?.length &&
      !filters.rarities.some((rarity) => normalizeToken(card.rarity ?? '') === normalizeToken(rarity))
    ) {
      return false
    }

    if (
      filters.setCodes?.length &&
      !filters.setCodes.includes(card.setCode ?? '')
    ) {
      return false
    }

    if (
      filters.traits?.length &&
      !filters.traits.every((trait) => card.traits.includes(trait))
    ) {
      return false
    }

    if (filters.inkwell !== undefined && card.inkwell !== filters.inkwell) {
      return false
    }

    return true
  })
}

export function applyCardSearchQuery(cards: SearchableCard[], query: string) {
  const terms = parseTextFilters(query)

  if (terms.length === 0) {
    return cards
  }

  return cards.filter((card) => terms.every((term) => cardMatchesSearchTerm(card, term)))
}

export function applyAvailabilityFilter(
  cards: SearchableCard[],
  availabilityFilter: AvailabilityFilter,
) {
  if (availabilityFilter === 'owned') {
    return cards.filter((card) => (card.ownedCount ?? 0) > 0)
  }

  if (availabilityFilter === 'wants') {
    return cards.filter((card) => (card.wantsCount ?? 0) > 0)
  }

  if (availabilityFilter === 'deck') {
    return cards.filter((card) => (card.deckCount ?? 0) > 0)
  }

  return cards
}

export function parseTextFilters(query: string): TextFilterChip[] {
  return query
    .split('\n')
    .map(parseTextFilter)
    .filter((chip) => chip.value)
}

export function parseTextFilter(term: string): TextFilterChip {
  const raw = term.trim()
  const scopedMatch = raw.match(/^([a-z]+):(.*)$/i)
  const scope = parseTextFilterScope(scopedMatch?.[1])
  const value = (scope ? scopedMatch?.[2] : raw)?.trim() ?? ''

  return {
    scope: scope ?? 'contains',
    value,
    raw,
  }
}

export function parseTextFilterScope(scope: string | undefined): TextFilterScope | null {
  if (
    scope === 'contains' ||
    scope === 'name' ||
    scope === 'type' ||
    scope === 'text' ||
    scope === 'trait'
  ) {
    return scope
  }

  return null
}

export function serializeTextFilter(chip: TextFilterChip) {
  return chip.scope === 'contains' ? chip.value : `${chip.scope}:${chip.value}`
}

export function serializeTextFilters(textFilters: string[]) {
  return textFilters
    .map((term) => term.trim())
    .filter(Boolean)
    .join('\n')
}

export function sortCards(cards: SearchableCard[], sort: CardSortOption) {
  const sortKeys = getSortKeys(sort)

  return [...cards].sort((a, b) => {
    const typeComparison = sort.typeMode === 'grouped' ? compareCardTypeGroups(a, b) : 0

    if (typeComparison !== 0) {
      return typeComparison
    }

    for (const [index, sortKey] of sortKeys.entries()) {
      const comparison = compareCardsBySortKey(a, b, sortKey, {
        setOnly: sortKey === 'set-number' && index < sortKeys.length - 1,
      })

      if (comparison !== 0) {
        return sort.direction === 'asc' ? comparison : -comparison
      }
    }

    return compareCardsBySortKey(a, b, 'set-number') || compareCardNames(a, b)
  })
}

export function getActiveSortKeys(sort: CardSortOption, allowedKeys: CardSortKey[]) {
  const keys = (sort.keys?.length ? sort.keys : [sort.key]).filter((key) =>
    allowedKeys.includes(key),
  )

  return keys.length > 0 ? keys : [allowedKeys[0]]
}

export function getSortPriority(sort: CardSortOption, allowedKeys: CardSortKey[], key: CardSortKey) {
  const index = getActiveSortKeys(sort, allowedKeys).indexOf(key)
  return index === -1 ? null : index + 1
}

export function toggleValue<TValue>(values: TValue[] = [], value: TValue) {
  return values.includes(value)
    ? values.filter((existingValue) => existingValue !== value)
    : [...values, value]
}

export function pruneEmptyFilters(filters: CardSearchFilters): CardSearchFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) =>
      Array.isArray(value) ? value.length > 0 : value !== undefined,
    ),
  ) as CardSearchFilters
}

function cardMatchesSearchTerm(card: SearchableCard, term: TextFilterChip) {
  const haystack = getSearchHaystack(card, term.scope)
  return splitSearchTerm(term.value).every((token) => haystack.includes(token))
}

function getSearchHaystack(card: SearchableCard, scope: TextFilterScope) {
  const valuesByScope: Record<TextFilterScope, string[]> = {
    contains: [
      card.name,
      card.subtitle ?? '',
      card.fullName,
      card.rulesText ?? '',
      card.setName ?? '',
      card.setCode ?? '',
      card.collectorNumber ?? '',
      ...card.types,
      ...card.traits,
    ],
    name: [card.name, card.subtitle ?? '', card.fullName],
    type: card.types,
    text: [card.rulesText ?? ''],
    trait: card.traits,
  }

  return valuesByScope[scope].join(' ').toLowerCase()
}

function splitSearchTerm(term: string) {
  return term
    .replace(/["']/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, '-')
}

function getSortKeys(sort: CardSortOption) {
  return sort.keys?.length ? sort.keys : [sort.key]
}

function compareCardsBySortKey(
  a: SearchableCard,
  b: SearchableCard,
  key: CardSortKey,
  options: { setOnly?: boolean } = {},
) {
  if (key === 'name') {
    return compareCardNames(a, b)
  }

  if (key === 'cost') {
    return (a.cost ?? Number.MAX_SAFE_INTEGER) - (b.cost ?? Number.MAX_SAFE_INTEGER)
  }

  if (key === 'color') {
    return compareStringLists(a.colors, b.colors)
  }

  if (key === 'inkwell') {
    return compareBooleansTrueFirst(Boolean(a.inkwell), Boolean(b.inkwell))
  }

  if (key === 'owned-count') {
    return (a.ownedCount ?? 0) - (b.ownedCount ?? 0)
  }

  const setComparison = compareSetCodes(a.setCode ?? '', b.setCode ?? '')
  if (setComparison !== 0) {
    return setComparison
  }

  if (options.setOnly) {
    return 0
  }

  return compareCollectorNumbers(a.collectorNumber ?? '', b.collectorNumber ?? '')
}

function compareCardTypeGroups(a: SearchableCard, b: SearchableCard) {
  return getCardTypeGroupIndex(a) - getCardTypeGroupIndex(b)
}

function getCardTypeGroupIndex(card: SearchableCard) {
  const typeOrder = ['Character', 'Action', 'Song', 'Location', 'Item']
  const firstMatch = typeOrder.findIndex((type) => card.types.includes(type))
  return firstMatch === -1 ? Number.MAX_SAFE_INTEGER : firstMatch
}

function compareCardNames(a: SearchableCard, b: SearchableCard) {
  return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })
}

function compareStringLists(a: string[], b: string[]) {
  return a.join('|').localeCompare(b.join('|'), undefined, { sensitivity: 'base' })
}

function compareBooleansTrueFirst(a: boolean, b: boolean) {
  if (a === b) {
    return 0
  }

  return a ? -1 : 1
}

function compareSetCodes(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

function compareCollectorNumbers(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

