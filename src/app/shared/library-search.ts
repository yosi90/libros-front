import { getLatestStatusName, isPurchasedStatus } from './reading-status';

export type LibraryItemKind = 'book' | 'antology';
export type LibraryAvailabilityFilter = 'all' | 'purchased' | 'unpurchased';
export type LibraryTextFilterScope = 'contains' | 'title' | 'author' | 'universe' | 'saga';

export interface SearchableLibraryItem {
    id: number;
    kind: LibraryItemKind;
    title: string;
    authors: string[];
    universeName: string;
    sagaName?: string;
    status: string;
    isPurchased: boolean;
}

export interface LibraryTextFilterChip {
    scope: LibraryTextFilterScope;
    value: string;
    raw: string;
}

export interface LibraryTextScopeOption {
    scope: LibraryTextFilterScope;
    label: string;
    prefix?: string;
}

export const libraryTextScopeOptions: LibraryTextScopeOption[] = [
    { scope: 'contains', label: 'general' },
    { scope: 'title', label: 'título', prefix: 'title' },
    { scope: 'author', label: 'autor', prefix: 'author' },
    { scope: 'universe', label: 'universo', prefix: 'universe' },
    { scope: 'saga', label: 'saga', prefix: 'saga' }
];

const prefixByScope: Record<Exclude<LibraryTextFilterScope, 'contains'>, string> = {
    title: 'title',
    author: 'author',
    universe: 'universe',
    saga: 'saga'
};

const scopeByPrefix: Record<string, LibraryTextFilterScope> = {
    name: 'title',
    nombre: 'title',
    title: 'title',
    titulo: 'title',
    author: 'author',
    autor: 'author',
    universe: 'universe',
    universo: 'universe',
    saga: 'saga'
};

export function applyLibrarySearch<TItem extends SearchableLibraryItem>(
    items: TItem[],
    query: string,
    availabilityFilter: LibraryAvailabilityFilter
): TItem[] {
    const chips = parseLibraryTextFilters(query);

    return items.filter(item =>
        matchesAvailabilityFilter(item, availabilityFilter) &&
        chips.every(chip => libraryItemMatchesTextFilter(item, chip))
    );
}

export function parseLibraryTextFilters(query: string): LibraryTextFilterChip[] {
    return query
        .split('\n')
        .map(parseLibraryTextFilter)
        .filter(chip => chip.value.length > 0);
}

export function parseLibraryTextFilter(term: string): LibraryTextFilterChip {
    const raw = term.trim();
    const scopedMatch = raw.match(/^([a-záéíóúñ]+):(.*)$/i);
    const scopedPrefix = scopedMatch?.[1];
    const scope = parseLibraryTextFilterScope(scopedPrefix);
    const value = (scope ? scopedMatch?.[2] : raw)?.trim() ?? '';

    return {
        scope: scope ?? 'contains',
        value,
        raw
    };
}

export function parseLibraryTextFilterScope(scope: string | undefined): LibraryTextFilterScope | null {
    if (!scope)
        return null;

    return scopeByPrefix[normalizeToken(scope)] ?? null;
}

export function serializeLibraryTextFilter(chip: Omit<LibraryTextFilterChip, 'raw'>): string {
    if (chip.scope === 'contains')
        return chip.value.trim();

    return `${prefixByScope[chip.scope]}:${chip.value.trim()}`;
}

export function serializeLibraryTextFilters(textFilters: string[]): string {
    return textFilters
        .map(term => term.trim())
        .filter(Boolean)
        .join('\n');
}

export function removeLibraryTextFilter(query: string, rawFilter: string): string {
    return serializeLibraryTextFilters(
        parseLibraryTextFilters(query)
            .filter(chip => chip.raw !== rawFilter)
            .map(chip => chip.raw)
    );
}

export function normalizeLibraryText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export function getLatestLibraryStatus(statuses: { Nombre: string }[] | undefined): string {
    return getLatestStatusName(statuses);
}

export function isPurchasedLibraryStatus(status: string): boolean {
    return isPurchasedStatus(status);
}

function matchesAvailabilityFilter(item: SearchableLibraryItem, availabilityFilter: LibraryAvailabilityFilter): boolean {
    if (availabilityFilter === 'purchased')
        return item.isPurchased;

    if (availabilityFilter === 'unpurchased')
        return !item.isPurchased;

    return true;
}

function libraryItemMatchesTextFilter(item: SearchableLibraryItem, chip: LibraryTextFilterChip): boolean {
    const haystack = getLibrarySearchHaystack(item, chip.scope);
    return splitSearchTerm(chip.value).every(token => haystack.includes(token));
}

function getLibrarySearchHaystack(item: SearchableLibraryItem, scope: LibraryTextFilterScope): string {
    const valuesByScope: Record<LibraryTextFilterScope, string[]> = {
        contains: [
            item.title,
            ...item.authors,
            item.universeName,
            item.sagaName ?? '',
            item.status,
            item.kind === 'book' ? 'libro' : 'antología'
        ],
        title: [item.title],
        author: item.authors,
        universe: [item.universeName],
        saga: [item.sagaName ?? '']
    };

    return normalizeLibraryText(valuesByScope[scope].join(' '));
}

function splitSearchTerm(term: string): string[] {
    return normalizeLibraryText(term)
        .replace(/["']/g, ' ')
        .split(/\s+/)
        .map(token => token.trim())
        .filter(Boolean);
}

function normalizeToken(value: string): string {
    return normalizeLibraryText(value).trim();
}
