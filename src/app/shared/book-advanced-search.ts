import { Book } from '../interfaces/book';
import { Character } from '../interfaces/character';
import { SceneCharacterDetail } from '../interfaces/scene';
import { rtfToPlainText } from './rtf/rtf-text';

export type AdvancedSearchCategory = 'chapters' | 'characters' | 'organizations' | 'events' | 'locations' | 'concepts' | 'quotes';

export type AdvancedSearchFilters = Record<AdvancedSearchCategory, boolean>;

export interface AdvancedSearchCategoryOption {
    id: AdvancedSearchCategory;
    label: string;
    icon: string;
}

export interface AdvancedSearchMatch {
    field: string;
    snippet: string;
    exact: boolean;
    score: number;
}

export interface AdvancedSearchResult {
    id: number;
    category: AdvancedSearchCategory;
    title: string;
    subtitle: string;
    route: Array<string | number>;
    queryParams?: Record<string, string | number>;
    matches: AdvancedSearchMatch[];
    fuzzy: boolean;
}

export interface AdvancedSearchGroup {
    category: AdvancedSearchCategory;
    label: string;
    icon: string;
    enabled: boolean;
    total: number;
    results: AdvancedSearchResult[];
}

export interface AdvancedBookSearchResult {
    mode: 'empty' | 'exact' | 'fuzzy' | 'none';
    total: number;
    groups: AdvancedSearchGroup[];
}

interface IndexedField {
    label: string;
    value: string;
    normalized: string;
    compactNormalized: string;
}

interface IndexedSearchItem {
    id: number;
    category: AdvancedSearchCategory;
    title: string;
    subtitle: string;
    route: Array<string | number>;
    queryParams?: Record<string, string | number>;
    fields: IndexedField[];
}

const categoryOptions: AdvancedSearchCategoryOption[] = [
    { id: 'chapters', label: 'Capítulos', icon: 'auto_stories' },
    { id: 'characters', label: 'Personajes', icon: 'co_present' },
    { id: 'organizations', label: 'Organizaciones', icon: 'groups' },
    { id: 'events', label: 'Eventos', icon: 'event' },
    { id: 'locations', label: 'Localizaciones', icon: 'my_location' },
    { id: 'concepts', label: 'Conceptos', icon: 'auto_awesome' },
    { id: 'quotes', label: 'Citas', icon: 'format_quote' }
];

export const advancedSearchCategoryOptions = categoryOptions;

export function createAdvancedSearchFilters(value = true): AdvancedSearchFilters {
    return categoryOptions.reduce((filters, option) => ({
        ...filters,
        [option.id]: value
    }), {} as AdvancedSearchFilters);
}

export function searchBook(book: Book, query: string, filters: AdvancedSearchFilters = createAdvancedSearchFilters()): AdvancedBookSearchResult {
    const normalizedQuery = normalizeSearchText(query);
    const groups = categoryOptions.map(option => ({
        category: option.id,
        label: option.label,
        icon: option.icon,
        enabled: filters[option.id],
        total: 0,
        results: []
    } as AdvancedSearchGroup));

    if (!normalizedQuery) {
        return { mode: 'empty', total: 0, groups };
    }

    const items = buildBookSearchIndex(book).filter(item => filters[item.category]);
    const exactResults = items
        .map(item => toSearchResult(item, findExactMatches(item, normalizedQuery)))
        .filter((result): result is AdvancedSearchResult => !!result);

    if (exactResults.length > 0) {
        return groupResults(groups, exactResults, 'exact');
    }

    const fuzzyResults = items
        .map(item => toSearchResult(item, findFuzzyMatches(item, normalizedQuery), true))
        .filter((result): result is AdvancedSearchResult => !!result)
        .sort(compareFuzzyResults);

    const limitedFuzzyResults = categoryOptions.flatMap(option =>
        fuzzyResults.filter(result => result.category === option.id).slice(0, 2)
    );

    return groupResults(groups, limitedFuzzyResults, limitedFuzzyResults.length ? 'fuzzy' : 'none');
}

export function normalizeSearchText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function groupResults(baseGroups: AdvancedSearchGroup[], results: AdvancedSearchResult[], mode: AdvancedBookSearchResult['mode']): AdvancedBookSearchResult {
    const groups = baseGroups.map(group => {
        const categoryResults = results.filter(result => result.category === group.category);
        return {
            ...group,
            total: categoryResults.length,
            results: categoryResults
        };
    });

    return { mode, total: results.length, groups };
}

function toSearchResult(item: IndexedSearchItem, matches: AdvancedSearchMatch[], fuzzy = false): AdvancedSearchResult | null {
    if (matches.length === 0) {
        return null;
    }

    return {
        id: item.id,
        category: item.category,
        title: item.title,
        subtitle: item.subtitle,
        route: item.route,
        queryParams: item.queryParams,
        matches,
        fuzzy
    };
}

function findExactMatches(item: IndexedSearchItem, normalizedQuery: string): AdvancedSearchMatch[] {
    const tokens = normalizedQuery.split(' ').filter(Boolean);
    const compactQuery = compactSearchText(normalizedQuery);
    return item.fields
        .filter(field =>
            field.normalized.includes(normalizedQuery)
            || (canUseCompactExact(compactQuery) && field.compactNormalized.includes(compactQuery))
            || tokens.every(token => field.normalized.includes(token) || (canUseCompactExact(token) && field.compactNormalized.includes(token)))
        )
        .map(field => ({ field: field.label, snippet: field.value, exact: true, score: 0 }));
}

function findFuzzyMatches(item: IndexedSearchItem, normalizedQuery: string): AdvancedSearchMatch[] {
    const queryTokens = normalizedQuery.split(' ').filter(Boolean);
    const shortestTokenLength = Math.min(...queryTokens.map(token => token.length));
    if (queryTokens.length === 0) {
        return [];
    }

    return item.fields
        .filter(field => canUseFieldForFuzzy(field, shortestTokenLength))
        .map(field => {
            const score = fuzzyFieldScore(queryTokens, field.normalized);
            return score === null
                ? null
                : { field: field.label, snippet: field.value, exact: false, score };
        })
        .filter((match): match is AdvancedSearchMatch => !!match)
        .sort((current, next) => current.score - next.score);
}

function fuzzyFieldScore(queryTokens: string[], normalizedField: string): number | null {
    const compactField = compactSearchText(normalizedField);
    const fieldTokens = normalizedField.split(' ').filter(Boolean);
    if (fieldTokens.length === 0) {
        return null;
    }

    let totalScore = 0;
    for (const queryToken of queryTokens) {
        const tolerance = allowedDistance(queryToken);
        const bestDistance = fieldTokens.reduce((best, fieldToken) => {
            const distance = candidateDistance(queryToken, fieldToken, tolerance);
            return Math.min(best, distance);
        }, Number.MAX_SAFE_INTEGER);
        const compactDistance = canUseCompactFuzzy(queryToken)
            ? bestCompactDistance(queryToken, compactField, tolerance)
            : Number.MAX_SAFE_INTEGER;
        const bestTokenDistance = Math.min(bestDistance, compactDistance);

        if (bestTokenDistance > tolerance) {
            return null;
        }

        totalScore += bestTokenDistance;
    }

    return totalScore;
}

function canUseCompactExact(value: string): boolean {
    return value.length >= 5;
}

function canUseCompactFuzzy(value: string): boolean {
    return value.length >= 5;
}

function canUseFieldForFuzzy(field: IndexedField, shortestTokenLength: number): boolean {
    if (shortestTokenLength > 3) {
        return true;
    }

    return ['Nombre', 'Apodo', 'Personaje', 'Personajes', 'Localización', 'Localizaciones'].includes(field.label);
}

function candidateDistance(queryToken: string, candidate: string, tolerance: number): number {
    if (Math.abs(queryToken.length - candidate.length) > tolerance) {
        return Number.MAX_SAFE_INTEGER;
    }

    if (queryToken.length <= 3 && candidate.length > queryToken.length + 1) {
        return Number.MAX_SAFE_INTEGER;
    }

    if (queryToken.length <= 4 && candidate[0] !== queryToken[0]) {
        return Number.MAX_SAFE_INTEGER;
    }

    return levenshteinDistance(queryToken, candidate);
}

function bestCompactDistance(queryToken: string, compactField: string, tolerance: number): number {
    if (!compactField) {
        return Number.MAX_SAFE_INTEGER;
    }

    if (compactField.includes(queryToken)) {
        return 0;
    }

    const minLength = Math.max(1, queryToken.length - tolerance);
    const maxLength = Math.min(compactField.length, queryToken.length + tolerance);
    let bestDistance = Number.MAX_SAFE_INTEGER;

    for (let start = 0; start < compactField.length; start++) {
        for (let length = minLength; length <= maxLength && start + length <= compactField.length; length++) {
            const distance = levenshteinDistance(queryToken, compactField.slice(start, start + length));
            if (distance < bestDistance) {
                bestDistance = distance;
                if (bestDistance === 0) {
                    return 0;
                }
            }
        }
    }

    return bestDistance;
}

function allowedDistance(token: string): number {
    if (token.length <= 2) {
        return 0;
    }

    if (token.length <= 7) {
        return 1;
    }

    return 2;
}

function compareFuzzyResults(current: AdvancedSearchResult, next: AdvancedSearchResult): number {
    const currentScore = current.matches[0]?.score ?? Number.MAX_SAFE_INTEGER;
    const nextScore = next.matches[0]?.score ?? Number.MAX_SAFE_INTEGER;
    if (currentScore !== nextScore) {
        return currentScore - nextScore;
    }

    return current.title.localeCompare(next.title);
}

function levenshteinDistance(current: string, next: string): number {
    const previousRow = Array.from({ length: next.length + 1 }, (_, index) => index);
    let lastRow = previousRow;

    for (let currentIndex = 1; currentIndex <= current.length; currentIndex++) {
        const row = [currentIndex];
        for (let nextIndex = 1; nextIndex <= next.length; nextIndex++) {
            row[nextIndex] = Math.min(
                row[nextIndex - 1] + 1,
                lastRow[nextIndex] + 1,
                lastRow[nextIndex - 1] + (current[currentIndex - 1] === next[nextIndex - 1] ? 0 : 1)
            );
        }
        lastRow = row;
    }

    return lastRow[next.length];
}

function buildBookSearchIndex(book: Book): IndexedSearchItem[] {
    return [
        ...buildChapterItems(book),
        ...buildEntityItems(book, 'characters'),
        ...buildEntityItems(book, 'organizations'),
        ...buildEntityItems(book, 'events'),
        ...buildEntityItems(book, 'locations'),
        ...buildEntityItems(book, 'concepts'),
        ...buildEntityItems(book, 'quotes')
    ];
}

function buildChapterItems(book: Book): IndexedSearchItem[] {
    const regularChapters = (book.Capitulos ?? []).map(chapter => ({ ...chapter, EsInterludio: false }));
    const interludeChapters = (book.Interludios ?? []).flatMap(interlude =>
        (interlude.Capitulos ?? []).map(chapter => ({
            ...chapter,
            EsInterludio: true,
            Id_Interludio: chapter.Id_Interludio ?? interlude.Id
        }))
    );

    return [...regularChapters, ...interludeChapters].map(chapter => {
        const fields = [
            field('Título', chapter.Nombre),
            field('Orden', String(chapter.Orden ?? '')),
            ...((chapter.Escenas ?? []).flatMap(scene => [
                field('Escena', scene.Nombre),
                field('Texto de escena', toPlainText(scene.Descripcion)),
                field('Localización', scene.Localizacion?.Nombre ?? ''),
                field('Personajes', getSceneCharacterNames(book, scene.PersonajesDetalle ?? scene.Personajes).join(', '))
            ]))
        ];

        return {
            id: chapter.Id,
            category: 'chapters',
            title: chapter.Nombre,
            subtitle: chapter.EsInterludio ? 'Capítulo de interludio' : `Capítulo ${chapter.Orden}`,
            route: chapter.EsInterludio ? ['/book', book.Id, 'interlude_chapter', chapter.Id] : ['/book', book.Id, 'chapter', chapter.Id],
            fields: compactFields(fields)
        };
    });
}

function buildEntityItems(book: Book, category: Exclude<AdvancedSearchCategory, 'chapters'>): IndexedSearchItem[] {
    const items = getEntityCollection(book, category);
    return items.map(item => ({
        id: item.Id,
        category,
        title: item.Nombre,
        subtitle: getEntitySubtitle(book, category, item),
        route: getEntityRoute(book.Id, category),
        queryParams: { selected: item.Id },
        fields: compactFields(getEntityFields(book, category, item))
    }));
}

function getEntityCollection(book: Book, category: Exclude<AdvancedSearchCategory, 'chapters'>): any[] {
    const map: Record<Exclude<AdvancedSearchCategory, 'chapters'>, keyof Book> = {
        characters: 'Personajes',
        organizations: 'Organizaciones',
        events: 'Eventos',
        locations: 'Localizaciones',
        concepts: 'Conceptos',
        quotes: 'Citas'
    };
    const value = book[map[category]];
    return Array.isArray(value) ? value : [];
}

function getEntityRoute(bookId: number, category: Exclude<AdvancedSearchCategory, 'chapters'>): Array<string | number> {
    if (category === 'characters') {
        return ['/book', bookId, 'characters'];
    }

    return ['/book', bookId, category];
}

function getEntitySubtitle(book: Book, category: Exclude<AdvancedSearchCategory, 'chapters'>, item: any): string {
    if (category === 'quotes') {
        const characterName = getQuoteCharacterName(book, item);
        return characterName ? `Cita · ${characterName}` : 'Cita';
    }

    if (category === 'events') {
        const locationName = getLocationName(book, item.Id_Localizacion);
        return locationName ? `Evento · ${locationName}` : 'Evento';
    }

    const singularLabels: Record<Exclude<AdvancedSearchCategory, 'chapters'>, string> = {
        characters: 'Personaje',
        organizations: 'Organización',
        events: 'Evento',
        locations: 'Localización',
        concepts: 'Concepto',
        quotes: 'Cita'
    };
    return singularLabels[category];
}

function getEntityFields(book: Book, category: Exclude<AdvancedSearchCategory, 'chapters'>, item: any): IndexedField[] {
    const baseFields = [
        field('Nombre', item.Nombre),
        ...entryFields(item.Entradas)
    ];

    if (category === 'characters') {
        return [
            ...baseFields,
            field('Apodo', (item as Character).Apodos?.map(alias => alias.Apodo).join(', ') ?? ''),
            field('Estado', (item as Character).Estados?.map(status => status.Estado?.Nombre).join(', ') ?? ''),
            field('Relaciones', (item as Character).Relaciones?.map(relation => `${relation.Relativo?.Nombre ?? ''} ${relation.Parentesco}`).join(', ') ?? '')
        ];
    }

    if (category === 'organizations') {
        return [
            ...baseFields,
            field('Personajes', relationNames(item.Personajes, book.Personajes)),
            field('Localizaciones', relationNames(item.Localizaciones, book.Localizaciones))
        ];
    }

    if (category === 'events') {
        return [
            ...baseFields,
            field('Localización', getLocationName(book, item.Id_Localizacion)),
            field('Personajes', relationNames(item.Personajes, book.Personajes))
        ];
    }

    if (category === 'locations') {
        return [
            ...baseFields,
            field('Estado', item.Estado ?? item.Estados?.map((status: { Nombre: string }) => status.Nombre).join(', ') ?? '')
        ];
    }

    if (category === 'quotes') {
        return [
            ...baseFields,
            field('Página', String(item.Pagina ?? '')),
            field('Personaje', getQuoteCharacterName(book, item))
        ];
    }

    return baseFields;
}

function entryFields(entries: Array<{ Nombre?: string; Descripcion?: string }> | undefined): IndexedField[] {
    return (entries ?? []).flatMap(entry => [
        field('Título de entrada', entry.Nombre ?? ''),
        field('Texto de entrada', toPlainText(entry.Descripcion ?? ''))
    ]);
}

function relationNames(items: Array<number | { Id?: number; Nombre?: string }> | undefined, source: Array<{ Id: number; Nombre: string }> = []): string {
    return (items ?? [])
        .map(item => typeof item === 'number' ? source.find(sourceItem => sourceItem.Id === item)?.Nombre ?? '' : item.Nombre ?? source.find(sourceItem => sourceItem.Id === item.Id)?.Nombre ?? '')
        .filter(Boolean)
        .join(', ');
}

function getSceneCharacterNames(book: Book, characters: Array<number | SceneCharacterDetail> | undefined): string[] {
    return (characters ?? [])
        .map(character => typeof character === 'number' ? character : character.Id)
        .map(characterId => book.Personajes?.find(character => character.Id === characterId)?.Nombre ?? '')
        .filter(Boolean);
}

function getQuoteCharacterName(book: Book, item: any): string {
    return item.Personaje?.Nombre
        ?? item.PersonajeNombre
        ?? item.NombrePersonaje
        ?? book.Personajes?.find(character => character.Id === (item.PersonajeId ?? item.Id_Personaje))?.Nombre
        ?? '';
}

function getLocationName(book: Book, locationId: number | undefined): string {
    return book.Localizaciones?.find(location => location.Id === locationId)?.Nombre ?? '';
}

function field(label: string, rawValue: string): IndexedField {
    const value = rawValue.replace(/\s+/g, ' ').trim();
    const normalized = normalizeSearchText(value);
    return { label, value, normalized, compactNormalized: compactSearchText(normalized) };
}

function compactFields(fields: IndexedField[]): IndexedField[] {
    return fields.filter(field => !!field.normalized);
}

function toPlainText(value: string): string {
    return rtfToPlainText(value ?? '').replace(/\s+/g, ' ').trim();
}

function compactSearchText(value: string): string {
    return value.replace(/\s+/g, '');
}
