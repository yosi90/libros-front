import { CatalogSagaController } from '../../../shared/common/catalog-saga/catalog-saga.model';
import { CatalogItem, CatalogOption } from '../../../../interfaces/catalog';
import { PublicDetailController } from '../../../shared/common/public-detail/public-detail.model';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import { LibraryTextFilterChip, LibraryTextFilterScope, LibraryTextScopeOption } from '../../../../shared/library-search';

export interface MobileCatalogController extends CatalogSagaController, PublicDetailController {
    items: CatalogItem[];
    languages: CatalogOption[];
    styles: CatalogOption[];
    isLoading: boolean;
    /** Error de la última carga del catálogo; vacío si fue bien. */
    loadError: string;
    loadCatalog(): void;
    filterType: 'todos' | 'libro' | 'antologia';
    draftQuery: string;
    searchTerms: string[];
    textFilterChips: LibraryTextFilterChip[];
    textScopeOptions: LibraryTextScopeOption[];
    filtersOpen: boolean;
    hasActiveFilters: boolean;
    selectedStatusFilter: ReadingStatusId | '';
    selectedRatingFilter: number | '';
    selectedLanguageFilter: number | '';
    selectedStyleFilter: number | '';
    onDraftQueryInput(event: Event): void;
    commitDraftQuery(scope?: LibraryTextFilterScope): void;
    addTextFilter(scope: LibraryTextFilterScope, value: string): void;
    removeTextFilter(rawFilter: string): void;
    removeSearchTerm(term: string): void;
    clearFilters(): void;
    toggleFilters(): void;
    setTypeFilter(type: 'todos' | 'libro' | 'antologia'): void;
    applySelectFilters(): void;
    applySelectFilter(field: 'status' | 'rating' | 'language' | 'style', event: Event): void;
    openDetailCorrection(event: Event): void;
    openItem(item: CatalogItem): void;
    openNewRequest(type: 'libro' | 'antologia'): void;
    openCorrectionRequest(item: CatalogItem, event: MouseEvent): void;
    addToCollectionWithStatus(item: CatalogItem, statusId: ReadingStatusId, event?: MouseEvent): void;
    isInCollection(item: CatalogItem): boolean;
    authorsLabel(item: CatalogItem): string;
    languagesLabel(item: CatalogItem): string;
    stylesLabel(item: CatalogItem): string;
    latestStatusName(item: CatalogItem): string;
    statusClass(item: CatalogItem): string;
    statusIcon(item: CatalogItem): string;
}
