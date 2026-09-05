import { AnthologySection, Antology } from '../../../../interfaces/antology';
import { BookSimple } from '../../../../interfaces/book';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import { Saga } from '../../../../interfaces/saga';
import { Universe } from '../../../../interfaces/universe';
import { LibraryAvailabilityFilter, LibraryTextFilterChip, LibraryTextFilterScope, LibraryTextScopeOption } from '../../../../shared/library-search';

export type MobileCollectionCardItem = { kind: 'book' | 'antology'; item: BookSimple | Antology };

export interface MobileStatusCollectionGroup {
    id: ReadingStatusId;
    label: string;
    icon: string;
    items: MobileCollectionCardItem[];
}

export interface MobileLibraryController {
    draftQuery: string;
    availabilityFilter: LibraryAvailabilityFilter;
    collectionView: 'universes' | 'statuses';
    filtersOpen: boolean;
    isLoadingUniverses: boolean;
    universesToShow: Universe[];
    statusGroups: MobileStatusCollectionGroup[];
    activeStatusGroup: MobileStatusCollectionGroup | null;
    textFilterChips: LibraryTextFilterChip[];
    textScopeOptions: LibraryTextScopeOption[];
    hasLibraryItems: boolean;
    hasActiveLibraryFilters: boolean;
    searchResultCount: number;
    selectedAnthology: Antology | null;
    anthologySections: AnthologySection[];
    isLoadingAnthology: boolean;
    anthologyLoadFailed: boolean;
    openingAnthologySectionId: number | null;
    onDraftQueryInput(event: Event): void;
    commitDraftQuery(scope?: LibraryTextFilterScope): void;
    addTextFilter(scope: LibraryTextFilterScope, value: string): void;
    removeTextFilter(rawFilter: string): void;
    clearLibraryFilters(): void;
    toggleFilters(): void;
    setAvailabilityFilter(filter: LibraryAvailabilityFilter): void;
    setCollectionView(view: 'universes' | 'statuses'): void;
    setActiveStatus(statusId: ReadingStatusId): void;
    openBook(book: BookSimple): void;
    openAntology(antologyId: number): void;
    closeAnthology(): void;
    retryAnthology(): void;
    openAnthologySection(section: AnthologySection): void;
    openAnthologyDetails(): void;
    editSelectedAnthology(): void;
    findSimilarAnthologies(): void;
    requestAnthologySectionManagement(section: AnthologySection, event: Event): void;
    openCollectionModal(kind: 'book' | 'antology', item: BookSimple | Antology): void;
    isUniverseExpanded(universe: Universe): boolean;
    isSagaExpanded(saga: Saga): boolean;
    markUniverseExpanded(universeId: number): void;
    markUniverseCollapsed(universeId: number): void;
    markSagaExpanded(sagaId: number): void;
    markSagaCollapsed(sagaId: number): void;
    isRunningBook(book: BookSimple): boolean;
    handleCoverImageError(event: Event): void;
    latestStatusName(item: BookSimple | Antology): string;
    latestStatusClass(item: BookSimple | Antology): string;
    latestStatusIcon(item: BookSimple | Antology): string;
    completionPercent(book: BookSimple): number;
    getAuthors(authors: BookSimple['Autores']): string[];
    getTotalBooksFromUniverse(universe: Universe): number;
}
