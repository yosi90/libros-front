export interface SearchableCard {
  id: string
  name: string
  subtitle?: string
  fullName: string
  rulesText?: string
  colors: string[]
  cost?: number
  types: string[]
  traits: string[]
  rarity?: string
  setCode?: string
  setName?: string
  collectorNumber?: string
  releasedAt?: string
  inkwell?: boolean
  ownedCount?: number
  wantsCount?: number
  deckCount?: number
}

export interface CardSearchFilters {
  colors?: string[]
  costs?: number[]
  types?: string[]
  rarities?: string[]
  setCodes?: string[]
  traits?: string[]
  inkwell?: boolean
}

export type TextFilterScope = 'contains' | 'name' | 'type' | 'text' | 'trait'

export interface TextFilterChip {
  scope: TextFilterScope
  value: string
  raw: string
}

export type CardSortKey =
  | 'name'
  | 'set-number'
  | 'cost'
  | 'color'
  | 'inkwell'
  | 'owned-count'

export type CardSortDirection = 'asc' | 'desc'
export type CardTypeSortMode = 'grouped' | 'mixed'

export interface CardSortOption {
  key: CardSortKey
  keys?: CardSortKey[]
  direction: CardSortDirection
  typeMode: CardTypeSortMode
}

export type AvailabilityFilter = 'all' | 'owned' | 'wants' | 'deck'

export interface SearchOption {
  value: string
  label: string
  iconSrc?: string
}

export interface SetSearchOption extends SearchOption {
  releasedAt?: string
}

export interface CardSearchFilterOptions {
  colors: SearchOption[]
  costs: number[]
  types: SearchOption[]
  rarities: SearchOption[]
  sets: SetSearchOption[]
  traits?: SearchOption[]
}

