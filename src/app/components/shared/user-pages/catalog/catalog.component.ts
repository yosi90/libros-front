import { CatalogSagaMatchesComponent } from '../../common/catalog-saga/catalog-saga-matches.component';
import { CatalogSagaSheetComponent } from '../../common/catalog-saga/catalog-saga-sheet.component';
import { getApiErrorCode, getApiErrorMessage } from '../../../../shared/api-error-message';
import { getApiErrorField } from '../../../../shared/backend-field-error';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, forkJoin, Observable, Subscription, switchMap } from 'rxjs';
import { Saga, SagaCatalogDetail } from '../../../../interfaces/saga';
import { orderSagasByReading } from '../../../../shared/saga-chain';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../../environment/environment';
import {
    CatalogOption,
    CatalogEntityType,
    Edition,
    CatalogItem,
    CatalogOwnCollection,
    CatalogPublicDetail,
    CatalogPublicReview,
    CatalogPublicStats,
    CatalogQuery,
    CatalogRequestAction
} from '../../../../interfaces/catalog';
import { ownedEditionIds, preferredEdition } from '../../../../shared/edition-selection';
import { Universe } from '../../../../interfaces/universe';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { SessionService } from '../../../../services/auth/session.service';
import { CatalogRequestService } from '../../../../services/entities/catalog-request.service';
import { isValidIsbn } from '../../../../shared/isbn';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { CollectionService } from '../../../../services/entities/collection.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import {
    getLatestStatus,
    getLatestStatusName,
    getStatusClass,
    getStatusIcon,
    readingStatusOptions
} from '../../../../shared/reading-status';
import { CollectionStateModalComponent } from '../../common/collection-state-modal/collection-state-modal.component';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { CatalogViewStateService } from '../../../../shared/catalog-view-state.service';
import { WebCatalogViewComponent } from '../../../web/user/web-catalog-view/web-catalog-view.component';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileFullscreenReturnService } from '../../../../services/navigation/mobile-fullscreen-return.service';
import { MobileCatalogViewComponent } from '../../../mobile/user/mobile-catalog-view/mobile-catalog-view.component';
import {
    applyLibrarySearch,
    libraryTextScopeOptions,
    LibraryTextFilterChip,
    LibraryTextFilterScope,
    normalizeLibraryText,
    parseLibraryTextFilters,
    serializeLibraryTextFilter
} from '../../../../shared/library-search';

type CatalogTypeFilter = 'todos' | 'libro' | 'antologia';

@Component({
    standalone: true,
    selector: 'app-catalog',
    imports: [
        CatalogSagaMatchesComponent,
        CatalogSagaSheetComponent,
        CommonModule,
        WebCatalogViewComponent,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatMenuModule,
        MatSelectModule,
        MatAutocompleteModule,
        MatTooltipModule,
        CollectionStateModalComponent,
        CoverCachePipe,
        SnackbarModule,
        MobileCatalogViewComponent
    ],
    templateUrl: './catalog.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './catalog.component.sass'
})
export class CatalogComponent implements OnInit, OnDestroy {
    private detailRequests?: Subscription;
    private addBookRequests?: Subscription;
    readonly imgUrl = environment.getImgUrl;
    readonly statusOptions = readingStatusOptions;
    readonly ratingOptions = [1, 2, 3, 4, 5];
    readonly textScopeOptions = libraryTextScopeOptions.filter(option => ['contains', 'title', 'author'].includes(option.scope));

    items: CatalogItem[] = [];
    /** Sagas cuyo nombre coincide con la búsqueda: dan acceso a su ficha. */
    sagaMatches: Saga[] = [];
    selectedSaga: SagaCatalogDetail | null = null;
    sagaItems: CatalogItem[] = [];
    isLoadingSaga = false;
    sagaLoadFailed = false;
    private sagaMatchesRequest?: Subscription;
    private sagaRequest?: Subscription;
    languages: CatalogOption[] = [];
    styles: CatalogOption[] = [];
    isLoading = false;
    /** Error de la última carga: las vistas lo distinguen de «sin resultados». */
    loadError = '';
    isSavingCollection = false;
    isSavingEditions = false;
    editionSelectionError = '';
    isSendingRequest = false;
    isLoadingPublicDetail = false;
    publicDetailLoadFailed = false;

    filterType: CatalogTypeFilter = 'todos';
    query = '';
    selectedStatusFilter: ReadingStatusId | '' = '';
    selectedRatingFilter: number | '' = '';
    selectedLanguageFilter: number | '' = '';
    selectedStyleFilter: number | '' = '';
    draftQuery = '';
    searchTerms: string[] = [];
    isSearchSuggestionOpen = false;
    filtersOpen = false;

    selectedCollectionItem: CatalogItem | null = null;
    selectedCollectionStatus: ReadingStatusId | null = null;
    selectedCollectionRating: number | null = null;
    selectedCollectionReview = '';
    private selectedCollectionOriginalReview = '';
    excludeCollectionActivity = false;
    selectedDetailItem: CatalogItem | null = null;
    selectedPublicDetail: CatalogPublicDetail | null = null;
    selectedEditionId: number | null = null;
    publicReviewPage = 0;
    expandedOwnReview = false;
    expandedPublicReviews = new Set<string>();

    isRequestModalOpen = false;
    requestEntityType: CatalogEntityType = 'libro';
    requestAction: CatalogRequestAction = 'alta';
    requestEntityId: number | null = null;
    requestTargetName = '';
    requestSuggestedName = '';
    requestSuggestedIsbn = '';
    requestIsbnError = '';
    activeRequestCount: number | null = null;
    isLoadingRequestAllowance = false;
    requestAllowanceError = '';
    private requestAllowance?: Subscription;
    requestSuggestedPublicationDate = '';
    requestSuggestedSynopsis = '';
    requestComment = '';
    private pendingScrollRestore = true;

    constructor(
        private catalogSrv: CatalogService,
        private collectionSrv: CollectionService,
        private catalogRequestSrv: CatalogRequestService,
        private universeStore: UniverseStoreService,
        private sessionSrv: SessionService,
        private snackBar: SnackbarModule,
        private router: Router,
        private viewState: CatalogViewStateService,
        private host: ElementRef<HTMLElement>,
        private presentation: PresentationModeService,
        private fullscreenReturn: MobileFullscreenReturnService,
        private route: ActivatedRoute
    ) {
        const state = this.viewState.snapshot;
        this.filterType = state.filterType;
        this.searchTerms = state.searchTerms;
        this.query = state.searchTerms.join('\n');
        this.selectedStatusFilter = state.selectedStatusFilter;
        this.selectedRatingFilter = state.selectedRatingFilter;
        this.selectedLanguageFilter = state.selectedLanguageFilter;
        this.selectedStyleFilter = state.selectedStyleFilter;
    }

    ngOnInit(): void {
        this.loadMetadata();
        this.loadCatalog();
        // Los gestores enlazan aquí para proponer altas de su tipo.
        const requested = this.router.url ? this.router.parseUrl(this.router.url).queryParams['request'] : null;
        if (requested === 'libro' || requested === 'antologia' || requested === 'autor' || requested === 'universo' || requested === 'saga')
            this.openNewRequest(requested);
        const requestedSaga = Number(this.router.url ? this.router.parseUrl(this.router.url).queryParams['saga'] : 0);
        if (Number.isInteger(requestedSaga) && requestedSaga > 0)
            this.openSaga(requestedSaga);
        const pendingDetail = this.viewState.consumePendingDetail();
        if (pendingDetail)
            this.openItem(pendingDetail);
        // Con el catálogo ya abierto, otra parte de la app (la paleta Ctrl+K) puede pedir una ficha.
        this.detailRequests = this.viewState.detailRequested$.subscribe(() => {
            const detail = this.viewState.consumePendingDetail();
            if (detail) this.openItem(detail);
        });
        this.addBookRequests = this.route.queryParamMap.subscribe(params => {
            const rawId = params.get('addBook');
            if (!rawId) return;
            const bookId = Number(rawId);
            void this.router.navigate([], { relativeTo: this.route, queryParams: { addBook: null }, queryParamsHandling: 'merge', replaceUrl: true });
            if (Number.isSafeInteger(bookId) && bookId > 0) this.openApprovedBookCollectionModal(bookId);
        });
    }

    ngOnDestroy(): void {
        this.requestAllowance?.unsubscribe();
        this.sagaMatchesRequest?.unsubscribe();
        this.sagaRequest?.unsubscribe();
        this.detailRequests?.unsubscribe();
        this.addBookRequests?.unsubscribe();
    }

    get canSubmitCollection(): boolean {
        return !!this.selectedCollectionItem && this.selectedCollectionStatus !== null && !this.isSavingCollection;
    }

    get isMobilePresentation(): boolean {
        return this.presentation.snapshot.isMobilePresentationActive;
    }

    get isWebPresentation(): boolean {
        return this.presentation.snapshot.activeMode === 'web';
    }

    get mobileController(): this {
        return this;
    }

    get collectionModalTitle(): string {
        return this.selectedCollectionItem
            ? `Actualizando ${this.selectedCollectionItem.Nombre}`
            : 'Actualizando lectura';
    }

    loadCatalog(): void {
        this.persistViewState();
        this.isLoading = true;
        this.loadError = '';
        const query = this.getCatalogQuery();
        const requests: Observable<CatalogItem[]>[] = [];
        this.loadSagaMatches();

        if (this.filterType === 'todos' || this.filterType === 'libro')
            requests.push(this.catalogSrv.getBooks(query));
        if (this.filterType === 'todos' || this.filterType === 'antologia')
            requests.push(this.catalogSrv.getAnthologies(query));

        forkJoin(requests).subscribe({
            next: results => {
                const searchableItems = results.flat().map(item => ({
                    id: item.Id,
                    kind: item.Tipo === 'libro' ? 'book' as const : 'antology' as const,
                    title: item.Nombre,
                    authors: item.Autores.map(author => author.Nombre),
                    universeName: '',
                    sagaName: '',
                    status: '',
                    isPurchased: false,
                    item
                }));
                this.items = applyLibrarySearch(searchableItems, this.query, 'all')
                    .map(entry => entry.item)
                    .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
                this.isLoading = false;
                this.restoreScrollPosition();
            },
            error: error => {
                this.items = [];
                this.loadError = getApiErrorMessage(error, 'No hemos podido cargar el catálogo. Comprueba tu conexión e inténtalo de nuevo.');
                this.isLoading = false;
            }
        });
    }

    loadMetadata(): void {
        forkJoin({
            languages: this.catalogSrv.getLanguages(),
            styles: this.catalogSrv.getStyles()
        }).subscribe({
            next: ({ languages, styles }) => {
                this.languages = languages;
                this.styles = styles;
            },
            error: () => {
                this.languages = [];
                this.styles = [];
            }
        });
    }

    clearFilters(): void {
        this.filterType = 'todos';
        this.query = '';
        this.draftQuery = '';
        this.searchTerms = [];
        this.isSearchSuggestionOpen = false;
        this.selectedStatusFilter = '';
        this.selectedRatingFilter = '';
        this.selectedLanguageFilter = '';
        this.selectedStyleFilter = '';
        this.loadCatalog();
    }

    toggleFilters(): void {
        this.filtersOpen = !this.filtersOpen;
        if (!this.filtersOpen)
            this.isSearchSuggestionOpen = false;
    }

    @HostListener('scroll')
    rememberScrollPosition(): void {
        if (!this.pendingScrollRestore)
            this.viewState.setScrollTop(this.host.nativeElement.scrollTop);
    }

    private persistViewState(): void {
        this.viewState.update({
            filterType: this.filterType,
            searchTerms: this.searchTerms,
            selectedStatusFilter: this.selectedStatusFilter,
            selectedRatingFilter: this.selectedRatingFilter,
            selectedLanguageFilter: this.selectedLanguageFilter,
            selectedStyleFilter: this.selectedStyleFilter
        });
    }

    private restoreScrollPosition(): void {
        if (!this.pendingScrollRestore)
            return;
        requestAnimationFrame(() => {
            this.host.nativeElement.scrollTop = this.viewState.snapshot.scrollTop;
            this.pendingScrollRestore = false;
        });
    }

    onDraftQueryInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.draftQuery = target.value;
        this.isSearchSuggestionOpen = this.draftQuery.trim().length > 0;
    }

    get textFilterChips(): LibraryTextFilterChip[] {
        return parseLibraryTextFilters(this.query);
    }

    commitDraftQuery(scope: LibraryTextFilterScope = 'contains'): void {
        const value = this.draftQuery.trim();
        if (!value)
            return;

        const serialized = serializeLibraryTextFilter({ scope, value });
        if (!this.searchTerms.some(term => normalizeLibraryText(term) === normalizeLibraryText(serialized)))
            this.searchTerms = [...this.searchTerms, serialized];
        this.query = this.searchTerms.join('\n');
        this.draftQuery = '';
        this.isSearchSuggestionOpen = false;
        this.loadCatalog();
    }

    addTextFilter(scope: LibraryTextFilterScope, value: string): void {
        this.draftQuery = value;
        this.commitDraftQuery(scope);
    }

    removeSearchTerm(term: string): void {
        this.searchTerms = this.searchTerms.filter(item => item !== term);
        this.query = this.searchTerms.join('\n');
        this.loadCatalog();
    }

    removeTextFilter(rawFilter: string): void { this.removeSearchTerm(rawFilter); }

    getScopeLabel(scope: LibraryTextFilterScope): string {
        return this.textScopeOptions.find(option => option.scope === scope)?.label ?? 'general';
    }

    onSearchInputBlur(): void {
        window.setTimeout(() => {
            this.commitDraftQuery();
            this.isSearchSuggestionOpen = false;
        }, 120);
    }

    setTypeFilter(filterType: CatalogTypeFilter): void {
        this.filterType = filterType;
        this.loadCatalog();
    }

    applySelectFilters(): void {
        this.loadCatalog();
    }

    get hasActiveFilters(): boolean {
        return this.searchTerms.length > 0 ||
            this.draftQuery.trim().length > 0 ||
            this.filterType !== 'todos' ||
            this.selectedStatusFilter !== '' ||
            this.selectedRatingFilter !== '' ||
            this.selectedLanguageFilter !== '' ||
            this.selectedStyleFilter !== '';
    }

    openCollectionModal(item: CatalogItem, event?: MouseEvent): void {
        event?.stopPropagation();
        if (this.selectedDetailItem?.Tipo === item.Tipo && this.selectedDetailItem.Id === item.Id)
            this.closePublicDetailModal();
        this.selectedCollectionItem = item;
        this.selectedCollectionStatus = getLatestStatus(item.Estados)?.EstadoId ?? null;
        this.selectedCollectionRating = item.Puntuacion ?? null;
        this.selectedCollectionReview = item.Resena ?? '';
        this.selectedCollectionOriginalReview = this.selectedCollectionReview;
        this.excludeCollectionActivity = false;
    }

    private openApprovedBookCollectionModal(bookId: number): void {
        this.catalogSrv.getBookPublicDetail(bookId).subscribe({
            next: detail => {
                if (detail.MiColeccion?.EnBiblioteca || this.isInCollection(detail)) {
                    this.snackBar.openSnackBar('Este libro ya está en tu biblioteca', 'infoBar');
                    return;
                }
                this.openCollectionModal(detail);
            },
            error: error => this.snackBar.openApiError(error, 'No se ha podido abrir el libro')
        });
    }

    addToCollectionWithStatus(item: CatalogItem, statusId: ReadingStatusId, event?: MouseEvent): void {
        event?.stopPropagation();
        if (this.isSavingCollection)
            return;

        this.isSavingCollection = true;
        const request = item.Tipo === 'libro'
            ? this.collectionSrv.updateBookStatus(item.Id, { EstadoId: statusId })
            : this.collectionSrv.updateAnthologyStatus(item.Id, { EstadoId: statusId });

        request.pipe(
            switchMap(() => this.collectionSrv.getUniverses())
        ).subscribe({
            next: universes => {
                this.universeStore.setUniverses(universes);
                this.applyStatusToCatalogItem(item, statusId, this.findCollectionCatalogItem(universes, item));
                this.snackBar.openSnackBar('Añadido a tu biblioteca', 'successBar', 5200, {
                    title: item.Nombre,
                    dedupeKey: `catalog:added:${item.Tipo}:${item.Id}`,
                    action: {
                        label: 'Ver en biblioteca',
                        execute: () => this.revealAddedCollectionItem(item)
                    }
                });
            },
            error: error => {
                this.snackBar.openApiError(error, 'Error al añadir a tu biblioteca');
                this.isSavingCollection = false;
            },
            complete: () => {
                this.isSavingCollection = false;
            }
        });
    }

    private async revealAddedCollectionItem(item: CatalogItem): Promise<void> {
        const target = {
            type: item.Tipo === 'libro' ? 'book' : 'antology',
            id: item.Id
        } as const;
        this.viewState.queuePendingLibraryReveal(target);
        if (await this.router.navigate(['/dashboard/books']))
            this.viewState.requestPendingLibraryReveal();
    }

    closeCollectionModal(): void {
        this.selectedCollectionItem = null;
        this.selectedCollectionStatus = null;
        this.selectedCollectionRating = null;
        this.selectedCollectionReview = '';
        this.selectedCollectionOriginalReview = '';
        this.excludeCollectionActivity = false;
    }

    setCollectionRating(rating: number | null): void {
        this.selectedCollectionRating = rating;
        if (rating === null)
            this.selectedCollectionReview = '';
    }

    saveToCollection(): void {
        if (!this.selectedCollectionItem || this.selectedCollectionStatus === null) {
            this.snackBar.openSnackBar('Selecciona un estado de lectura', 'errorBar');
            return;
        }

        this.isSavingCollection = true;
        const item = this.selectedCollectionItem;
        const wasInCollection = this.isInCollection(item);
        const statusRequest = item.Tipo === 'libro'
            ? this.collectionSrv.updateBookStatus(item.Id, { EstadoId: this.selectedCollectionStatus, ...(this.excludeCollectionActivity ? { PublicarActividad: false } : {}) })
            : this.collectionSrv.updateAnthologyStatus(item.Id, { EstadoId: this.selectedCollectionStatus, ...(this.excludeCollectionActivity ? { PublicarActividad: false } : {}) });

        const requests: Observable<unknown>[] = [statusRequest];
        if (this.selectedCollectionRating !== null) {
            const ratingRequest = item.Tipo === 'libro'
                ? this.collectionSrv.updateBookRating(item.Id, {
                    Puntuacion: this.selectedCollectionRating,
                    Resena: this.reviewPayloadValue(),
                    ...(this.excludeCollectionActivity ? { PublicarActividad: false } : {})
                })
                : this.collectionSrv.updateAnthologyRating(item.Id, {
                    Puntuacion: this.selectedCollectionRating,
                    Resena: this.reviewPayloadValue(),
                    ...(this.excludeCollectionActivity ? { PublicarActividad: false } : {})
                });
            requests.push(ratingRequest);
        }

        forkJoin(requests).pipe(
            switchMap(() => this.collectionSrv.getUniverses())
        ).subscribe({
            next: universes => {
                this.universeStore.setUniverses(universes);
                if (wasInCollection) {
                    this.snackBar.openSnackBar('Biblioteca personal actualizada', 'successBar');
                } else {
                    this.snackBar.openSnackBar('Añadido a tu biblioteca', 'successBar', 5200, {
                        title: item.Nombre,
                        dedupeKey: `catalog:added:${item.Tipo}:${item.Id}`,
                        action: {
                            label: 'Ver en biblioteca',
                            execute: () => this.revealAddedCollectionItem(item)
                        }
                    });
                }
                this.syncSelectedDetailFromCollectionModal();
                this.closeCollectionModal();
                this.loadCatalog();
            },
            error: error => {
                this.snackBar.openApiError(error, 'Error al actualizar tu biblioteca');
                this.isSavingCollection = false;
            },
            complete: () => {
                this.isSavingCollection = false;
            }
        });
    }

    /** Ficha de saga: sus datos, la cadena (anteriores y siguientes) y sus títulos. */
    openSaga(sagaId: number): void {
        this.sagaRequest?.unsubscribe();
        this.selectedSaga = null;
        this.sagaItems = [];
        this.sagaLoadFailed = false;
        this.isLoadingSaga = true;
        this.sagaRequest = forkJoin({
            detail: this.catalogSrv.getSagaPublicDetail(sagaId),
            books: this.catalogSrv.getBooks({ sagaId }),
            anthologies: this.catalogSrv.getAnthologies({ sagaId })
        }).subscribe({
            next: ({ detail, books, anthologies }) => {
                this.selectedSaga = detail;
                this.sagaItems = [...books, ...anthologies];
                this.isLoadingSaga = false;
            },
            error: () => {
                this.sagaLoadFailed = true;
                this.isLoadingSaga = false;
            }
        });
    }

    closeSaga(): void {
        this.sagaRequest?.unsubscribe();
        this.selectedSaga = null;
        this.sagaItems = [];
        this.isLoadingSaga = false;
        this.sagaLoadFailed = false;
    }

    get isSagaOpen(): boolean {
        return this.isLoadingSaga || this.sagaLoadFailed || !!this.selectedSaga;
    }

    openSagaItem(item: CatalogItem): void {
        this.closeSaga();
        this.openItem(item);
    }

    private loadSagaMatches(): void {
        this.sagaMatchesRequest?.unsubscribe();
        const text = parseLibraryTextFilters(this.query)
            .find(chip => chip.scope === 'contains' || chip.scope === 'saga')?.value.trim() ?? '';
        if (text.length < 2) {
            this.sagaMatches = [];
            return;
        }
        this.sagaMatchesRequest = this.catalogSrv.getSagas(text).subscribe({
            next: sagas => this.sagaMatches = orderSagasByReading(sagas).slice(0, 8),
            error: () => this.sagaMatches = []
        });
    }

    openItem(item: CatalogItem): void {
        this.selectedDetailItem = item;
        this.selectedPublicDetail = null;
        this.selectedEditionId = preferredEdition(item.Ediciones ?? [])?.Id ?? null;
        this.editionSelectionError = '';
        this.resetReviewDisplayState();
        this.publicDetailLoadFailed = false;
        this.isLoadingPublicDetail = true;

        const request = item.Tipo === 'libro'
            ? this.catalogSrv.getBookPublicDetail(item.Id)
            : this.catalogSrv.getAnthologyPublicDetail(item.Id);

        request.subscribe({
            next: detail => {
                if (this.selectedDetailItem?.Id !== item.Id || this.selectedDetailItem.Tipo !== item.Tipo)
                    return;
                this.selectedPublicDetail = detail;
                this.selectedEditionId = preferredEdition(detail.Ediciones ?? item.Ediciones ?? [], detail.MiColeccion?.EdicionesIds)?.Id ?? null;
                this.applyOwnCollectionFromDetail(detail);
                this.isLoadingPublicDetail = false;
            },
            error: () => {
                if (this.selectedDetailItem?.Id !== item.Id || this.selectedDetailItem.Tipo !== item.Tipo)
                    return;
                this.publicDetailLoadFailed = true;
                this.isLoadingPublicDetail = false;
            }
        });
    }

    closePublicDetailModal(): void {
        if (this.fullscreenReturn.restoreForwardedOverlay())
            return;
        this.selectedDetailItem = null;
        this.selectedPublicDetail = null;
        this.selectedEditionId = null;
        this.editionSelectionError = '';
        this.resetReviewDisplayState();
        this.publicDetailLoadFailed = false;
        this.isLoadingPublicDetail = false;
    }

    openReadingFromDetail(): void {
        if (!this.selectedDetailItem || this.selectedDetailItem.Tipo !== 'libro' || !this.isDetailInCollection())
            return;

        const bookId = this.selectedDetailItem.Id;
        this.closePublicDetailModal();
        this.router.navigate(['/book', bookId]);
    }

    readonly otherRequestTypes: ReadonlyArray<{ type: CatalogEntityType; icon: string; label: string }> = [
        { type: 'antologia', icon: 'auto_stories', label: 'Antología' },
        { type: 'autor', icon: 'groups', label: 'Autor' },
        { type: 'universo', icon: 'public', label: 'Universo' },
        { type: 'saga', icon: 'bookmark', label: 'Saga' }
    ];

    readonly correctionTypes: ReadonlyArray<{ type: CatalogEntityType; label: string }> = [
        { type: 'libro', label: 'Libro' },
        { type: 'antologia', label: 'Antología' },
        { type: 'autor', label: 'Autor' },
        { type: 'universo', label: 'Universo' },
        { type: 'saga', label: 'Saga' },
        { type: 'otro', label: 'Otro' }
    ];
    // Corrección genérica: la persona elige tipo y elemento dentro del modal.
    requestPicksEntity = false;
    correctionQuery = '';
    // «Otro»: comentario libre sin ficha concreta (TipoEntidad otro).
    otherRequestTitle = '';
    otherRequestText = '';
    correctionOptions: Array<{ Id: number; Nombre: string }> = [];
    isSearchingCorrection = false;
    private correctionSearchTimer: ReturnType<typeof setTimeout> | null = null;
    private correctionSearchSequence = 0;

    openGenericCorrection(): void {
        this.refreshRequestAllowance();
        this.requestAction = 'edicion';
        this.requestPicksEntity = true;
        this.requestSuggestedIsbn = '';
        this.requestSuggestedPublicationDate = '';
        this.requestSuggestedSynopsis = '';
        this.requestComment = '';
        this.selectCorrectionType('libro');
        this.isRequestModalOpen = true;
    }

    get isOtherRequest(): boolean {
        return this.requestEntityType === 'otro';
    }

    selectCorrectionType(type: CatalogEntityType): void {
        this.requestEntityType = type;
        this.requestAction = type === 'otro' ? 'comentario' : 'edicion';
        this.cancelCorrectionSearch();
        this.otherRequestTitle = '';
        this.otherRequestText = '';
        this.requestEntityId = null;
        this.requestTargetName = '';
        this.requestSuggestedName = '';
        this.requestSuggestedIsbn = '';
        this.requestSuggestedPublicationDate = '';
        this.requestSuggestedSynopsis = '';
        this.correctionQuery = '';
        this.correctionOptions = [];
        if (type !== 'otro')
            this.searchCorrectionTargets('');
    }

    searchCorrectionTargets(query: string): void {
        this.correctionQuery = query;
        if (this.requestEntityId !== null && query !== this.requestTargetName) {
            this.requestEntityId = null;
            this.requestTargetName = '';
        }
        if (this.correctionSearchTimer)
            clearTimeout(this.correctionSearchTimer);
        this.correctionSearchTimer = setTimeout(() => this.runCorrectionSearch(query.trim()), 250);
    }

    readonly correctionDisplay = (option: { Nombre: string } | string | null): string =>
        typeof option === 'string' ? option : option?.Nombre ?? '';

    selectCorrectionTarget(option: { Id: number; Nombre: string }): void {
        this.requestEntityId = option.Id;
        this.requestTargetName = option.Nombre;
        this.correctionQuery = option.Nombre;
    }

    // Invalida búsquedas pendientes o en vuelo al cambiar de tipo o cerrar el modal.
    private cancelCorrectionSearch(): void {
        if (this.correctionSearchTimer)
            clearTimeout(this.correctionSearchTimer);
        this.correctionSearchTimer = null;
        this.correctionSearchSequence++;
        this.isSearchingCorrection = false;
    }

    private runCorrectionSearch(query: string): void {
        const type = this.requestEntityType;
        if (type === 'otro')
            return;
        const sequence = ++this.correctionSearchSequence;
        const source: Observable<Array<{ Id: number | string; Nombre: string }>> =
            type === 'libro' ? this.catalogSrv.getBooks({ q: query }) :
            type === 'antologia' ? this.catalogSrv.getAnthologies({ q: query }) :
            type === 'autor' ? this.catalogSrv.getAuthors(query) :
            type === 'universo' ? this.catalogSrv.getUniverses(query) :
            this.catalogSrv.getSagas(query);
        this.isSearchingCorrection = true;
        source.subscribe({
            next: items => {
                if (sequence !== this.correctionSearchSequence) return;
                this.correctionOptions = items.slice(0, 20).map(item => ({ Id: Number(item.Id), Nombre: item.Nombre }));
                this.isSearchingCorrection = false;
            },
            error: () => {
                if (sequence !== this.correctionSearchSequence) return;
                this.correctionOptions = [];
                this.isSearchingCorrection = false;
            }
        });
    }

    openNewRequest(entityType: CatalogEntityType): void {
        this.refreshRequestAllowance();
        this.requestEntityType = entityType;
        this.requestPicksEntity = false;
        this.requestAction = 'alta';
        this.requestEntityId = null;
        this.requestTargetName = '';
        this.requestSuggestedName = '';
        this.requestSuggestedIsbn = '';
        this.requestIsbnError = '';
        this.requestSuggestedPublicationDate = '';
        this.requestSuggestedSynopsis = '';
        this.requestComment = '';
        this.isRequestModalOpen = true;
    }

    openCorrectionRequest(item: CatalogItem, event: MouseEvent): void {
        this.refreshRequestAllowance();
        event.stopPropagation();
        this.requestEntityType = item.Tipo === 'libro' ? 'libro' : 'antologia';
        this.requestAction = 'edicion';
        this.requestPicksEntity = false;
        this.requestEntityId = item.Id;
        this.requestTargetName = item.Nombre;
        this.requestSuggestedName = item.Nombre;
        this.requestSuggestedIsbn = item.ISBN ?? '';
        this.requestIsbnError = '';
        this.requestSuggestedPublicationDate = item.FechaPublicacion ?? '';
        this.requestSuggestedSynopsis = '';
        this.requestComment = '';
        this.isRequestModalOpen = true;
    }

    closeRequestModal(): void {
        this.requestAllowance?.unsubscribe();
        this.cancelCorrectionSearch();
        this.isRequestModalOpen = false;
        this.requestPicksEntity = false;
    }

    private refreshRequestAllowance(): void {
        this.requestAllowance?.unsubscribe();
        this.activeRequestCount = null;
        this.isLoadingRequestAllowance = true;
        this.requestAllowanceError = '';
        this.requestAllowance = this.catalogRequestSrv.listMine('activas').subscribe({
            next: requests => {
                this.activeRequestCount = requests.filter(request => request.Estado === 'pendiente' || request.Estado === 'devuelta').length;
                this.isLoadingRequestAllowance = false;
            },
            error: () => {
                this.requestAllowanceError ||= 'No se ha podido consultar cuántas peticiones tienes activas. El límite se comprobará al enviar.';
                this.isLoadingRequestAllowance = false;
            }
        });
    }

    private handleRequestLimitError(error: unknown): void {
        if (getApiErrorCode(error) !== 'catalog_active_request_limit')
            return;
        this.refreshRequestAllowance();
        this.requestAllowanceError = getApiErrorMessage(error, 'Ya tienes cinco peticiones activas. Espera a que se resuelva alguna antes de crear otra.');
    }

    requestModalTitle(): string {
        if (this.requestPicksEntity)
            return 'Proponer corrección';
        if (this.requestAction === 'edicion')
            return `Proponer corrección de ${this.requestEntityLabel().toLocaleLowerCase()}`;

        return ({
            libro: 'Pedir nuevo libro',
            antologia: 'Pedir nueva antología',
            autor: 'Pedir nuevo autor',
            universo: 'Pedir nuevo universo',
            saga: 'Pedir nueva saga',
            otro: 'Proponer corrección'
        } as const)[this.requestEntityType];
    }

    requestEntityLabel(): string {
        return ({ libro: 'Libro', antologia: 'Antología', autor: 'Autor', universo: 'Universo', saga: 'Saga', otro: 'Otro' } as const)[this.requestEntityType];
    }

    requestActionLabel(): string {
        return this.requestAction === 'edicion' ? 'Corrección de ficha' : 'Alta en catálogo';
    }

    requestNameLabel(): string {
        if (this.requestPicksEntity)
            return 'Nombre correcto (si cambia)';
        return this.requestAction === 'edicion' ? 'Nombre correcto' : 'Nombre';
    }

    requestIsbnLabel(): string {
        return this.requestAction === 'edicion' ? 'ISBN correcto' : 'ISBN';
    }

    requestCommentLabel(): string {
        return this.requestAction === 'edicion'
            ? 'Coméntanos qué deberíamos cambiar'
            : 'Nota con más detalles';
    }

    submitRequest(): void {
        if (this.isSendingRequest)
            return;
        if (this.isOtherRequest) {
            this.submitOtherRequest();
            return;
        }
        if (this.requestAction === 'edicion' && this.requestEntityId === null) {
            this.snackBar.openSnackBar('Elige qué elemento quieres corregir', 'errorBar');
            return;
        }
        if (this.isBookLikeRequest() && (this.requestAction === 'alta' || this.requestSuggestedIsbn.trim())) {
            if (!isValidIsbn(this.requestSuggestedIsbn)) {
                this.requestIsbnError = 'Indica un ISBN-10 o ISBN-13 válido para el alta.';
                return;
            }
        }
        this.requestIsbnError = '';
        if (this.isBookLikeRequest() && !this.validPublicationDate(this.requestSuggestedPublicationDate.trim())) {
            this.snackBar.openSnackBar('Escribe un año, un año y mes o una fecha completa válidos', 'errorBar');
            return;
        }
        const payload = this.buildRequestPayload();
        if (Object.keys(payload).length === 0) {
            this.snackBar.openSnackBar('Indica al menos un dato o comentario para la petición', 'errorBar');
            return;
        }

        this.isSendingRequest = true;
        this.catalogRequestSrv.create({
            TipoEntidad: this.requestEntityType,
            Accion: this.requestAction,
            EntidadId: this.requestAction === 'edicion' ? this.requestEntityId : null,
            Payload: payload
        }).subscribe({
            next: result => {
                if (result.Estado === 'aprobada' && result.EntidadId && result.EdicionId && this.isBookLikeRequest()) {
                    const type = this.requestEntityType;
                    const workId = result.EntidadId;
                    const editionId = result.EdicionId;
                    this.snackBar.openSnackBar('Petición aprobada. La edición ya está en el catálogo; puedes añadirla a tu biblioteca.', 'successBar', 10000, {
                        action: { label: 'Añadir edición', execute: () => this.addApprovedEdition(type, workId, editionId) }
                    });
                } else if (result.HttpStatus === 200) {
                    this.snackBar.openSnackBar('Esta petición ya estaba activa. Puedes seguirla en Mis peticiones.', 'successBar');
                } else {
                    this.snackBar.openSnackBar('Petición enviada para revisión', 'successBar');
                }
                this.closeRequestModal();
            },
            error: error => {
                this.handleRequestLimitError(error);
                if (getApiErrorCode(error) === 'catalog_request_isbn_required' && getApiErrorField(error) === 'Payload.ISBN')
                    this.requestIsbnError = getApiErrorMessage(error, 'Revisa el ISBN de esta edición.');
                this.snackBar.openApiError(error, 'Error al enviar la petición');
                this.isSendingRequest = false;
            },
            complete: () => {
                this.isSendingRequest = false;
            }
        });
    }

    private addApprovedEdition(type: CatalogEntityType, workId: number, editionId: number): void {
        const getEditions = type === 'libro'
            ? this.catalogSrv.getBookEditions(workId)
            : this.catalogSrv.getAnthologyEditions(workId);
        getEditions.pipe(switchMap(current => {
            const edition = current.Ediciones.find(item => item.Id === editionId);
            if (!edition)
                throw new Error('La edición aprobada ya no está disponible en esta obra.');
            if (edition.EnMiBiblioteca) {
                this.snackBar.openSnackBar('Ya tienes esta edición', 'successBar');
                return EMPTY;
            }
            const ids = [...ownedEditionIds(current.Ediciones), editionId];
            return type === 'libro'
                ? this.collectionSrv.updateBookEditions(workId, ids)
                : this.collectionSrv.updateAnthologyEditions(workId, ids);
        }), switchMap(() => this.collectionSrv.getUniverses())).subscribe({
            next: universes => {
                this.universeStore.setUniverses(universes);
                this.snackBar.openSnackBar('Edición añadida a tu biblioteca', 'successBar');
            },
            error: error => {
                if (error instanceof Error && !('status' in error))
                    this.snackBar.openSnackBar(error.message, 'errorBar');
                else
                    this.snackBar.openApiError(error, 'No se ha podido añadir la edición');
            }
        });
    }

    private submitOtherRequest(): void {
        const text = this.otherRequestText.trim();
        const title = this.otherRequestTitle.trim();
        if (!text) {
            this.snackBar.openSnackBar('Describe tu petición en el texto', 'errorBar');
            return;
        }
        this.isSendingRequest = true;
        this.catalogRequestSrv.create({
            TipoEntidad: 'otro',
            Accion: 'comentario',
            Payload: title ? { Texto: text, Titulo: title } : { Texto: text }
        }).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Petición enviada', 'successBar');
                this.closeRequestModal();
            },
            error: errorData => {
                this.handleRequestLimitError(errorData);
                this.snackBar.openApiError(errorData, 'Error al enviar la petición');
                this.isSendingRequest = false;
            },
            complete: () => {
                this.isSendingRequest = false;
            }
        });
    }

    isInCollection(item: CatalogItem): boolean {
        return (item.Estados?.length ?? 0) > 0 ||
            !!item.Ediciones?.some(edition => edition.EnMiBiblioteca) ||
            item.Puntuacion !== null && item.Puntuacion !== undefined ||
            !!item.Resena;
    }

    latestStatusName(item: CatalogItem): string {
        return getLatestStatusName(item.Estados);
    }

    statusClass(item: CatalogItem): string {
        return getStatusClass(getLatestStatus(item.Estados));
    }

    statusIcon(item: CatalogItem): string {
        if (!(item.Estados?.length) && item.Ediciones?.some(edition => edition.EnMiBiblioteca))
            return 'library_books';
        return getStatusIcon(getLatestStatus(item.Estados));
    }

    authorsLabel(item: CatalogItem): string {
        return item.Autores?.map(author => author.Nombre).join(', ') || 'Sin autor';
    }

    languagesLabel(item: CatalogItem): string {
        return this.catalogOptionsLabel(item.IdiomasDisponibles);
    }

    stylesLabel(item: CatalogItem): string {
        return this.catalogOptionsLabel(item.Estilos?.slice(0, 1));
    }

    handleCoverImageError(event: Event): void {
        (event.target as HTMLImageElement).src = 'assets/media/img/error.png';
    }

    publicDetailTitle(): string {
        return this.selectedPublicDetail?.Nombre ?? this.selectedDetailItem?.Nombre ?? '';
    }

    publicDetailCoverName(): string | null {
        return this.selectedEdition()?.Portada ?? this.selectedPublicDetail?.Portada ?? this.selectedDetailItem?.Portada ?? null;
    }

    publicDetailEditions(): Edition[] {
        return this.selectedPublicDetail?.Ediciones ?? this.selectedDetailItem?.Ediciones ?? [];
    }

    selectedEdition(): Edition | null {
        return this.publicDetailEditions().find(edition => edition.Id === this.selectedEditionId)
            ?? preferredEdition(this.publicDetailEditions(), this.selectedPublicDetail?.MiColeccion?.EdicionesIds);
    }

    selectEdition(editionId: number): void {
        if (this.publicDetailEditions().some(edition => edition.Id === editionId)) {
            this.selectedEditionId = editionId;
            this.editionSelectionError = '';
        }
    }

    publicDetailIsbn(): string | null {
        return this.selectedEdition()?.ISBN ?? (this.publicDetailEditions().length ? null : this.selectedPublicDetail?.ISBN ?? this.selectedDetailItem?.ISBN ?? null);
    }

    publicDetailPublicationDate(): string | null {
        return this.selectedEdition()?.FechaPublicacion ?? (this.publicDetailEditions().length ? null : this.selectedPublicDetail?.FechaPublicacion ?? this.selectedDetailItem?.FechaPublicacion ?? null);
    }

    toggleSelectedEditionOwnership(): void {
        const item = this.selectedDetailItem;
        const edition = this.selectedEdition();
        if (!item || !edition || this.isSavingEditions)
            return;

        this.isSavingEditions = true;
        const getEditions = item.Tipo === 'libro'
            ? this.catalogSrv.getBookEditions(item.Id)
            : this.catalogSrv.getAnthologyEditions(item.Id);
        getEditions.pipe(switchMap(current => {
            const selected = current.Ediciones.find(candidate => candidate.Id === edition.Id);
            if (!selected)
                throw new Error('La edición ya no pertenece a esta obra.');
            const ids = ownedEditionIds(current.Ediciones).filter(id => id !== selected.Id);
            if (!selected.EnMiBiblioteca)
                ids.push(selected.Id);
            return item.Tipo === 'libro'
                ? this.collectionSrv.updateBookEditions(item.Id, ids)
                : this.collectionSrv.updateAnthologyEditions(item.Id, ids);
        })).subscribe({
            next: response => {
                this.editionSelectionError = '';
                if (this.selectedDetailItem?.Id === item.Id && this.selectedDetailItem.Tipo === item.Tipo) {
                    const ownedIds = ownedEditionIds(response.Ediciones);
                    this.selectedDetailItem = { ...this.selectedDetailItem, Ediciones: response.Ediciones };
                    if (this.selectedPublicDetail) {
                        this.selectedPublicDetail = {
                            ...this.selectedPublicDetail,
                            Ediciones: response.Ediciones,
                            MiColeccion: {
                                ...this.selectedPublicDetail.MiColeccion,
                                EnBiblioteca: this.selectedPublicDetail.MiColeccion?.EnBiblioteca || ownedIds.length > 0,
                                Estados: this.selectedPublicDetail.MiColeccion?.Estados ?? [],
                                EdicionesIds: ownedIds
                            }
                        };
                    }
                }
                this.items = this.items.map(candidate => ({
                    ...candidate,
                    Ediciones: candidate.Ediciones?.map(existing => {
                        const updated = response.Ediciones.find(value => value.Id === existing.Id);
                        return updated ? { ...existing, EnMiBiblioteca: updated.EnMiBiblioteca } : existing;
                    })
                }));
                this.collectionSrv.getUniverses().subscribe({
                    next: universes => this.universeStore.setUniverses(universes),
                    error: () => this.universeStore.clear()
                });
                this.snackBar.openSnackBar(response.Ediciones.find(value => value.Id === edition.Id)?.EnMiBiblioteca
                    ? 'Edición añadida a tu biblioteca'
                    : 'Edición retirada; la obra y su historial permanecen en tu biblioteca', 'successBar');
            },
            error: error => {
                if (getApiErrorCode(error) === 'edition_selection_invalid' && getApiErrorField(error) === 'EdicionesIds')
                    this.editionSelectionError = getApiErrorMessage(error, 'Revisa las ediciones seleccionadas.');
                if (error instanceof Error && !('status' in error))
                    this.snackBar.openSnackBar(error.message, 'errorBar');
                else
                    this.snackBar.openApiError(error, 'No se ha podido actualizar la edición');
                this.isSavingEditions = false;
            },
            complete: () => { this.isSavingEditions = false; }
        });
    }

    publicDetailAuthorsLabel(): string {
        const authors = this.selectedPublicDetail?.Autores ?? this.selectedDetailItem?.Autores ?? [];
        return authors.map(author => author.Nombre).join(', ') || 'Sin autor';
    }

    publicDetailLanguagesLabel(): string {
        return this.catalogOptionsLabel(this.selectedPublicDetail?.IdiomasDisponibles ?? this.selectedDetailItem?.IdiomasDisponibles);
    }

    publicDetailStylesLabel(): string {
        return this.catalogOptionsLabel(this.selectedPublicDetail?.Estilos ?? this.selectedDetailItem?.Estilos);
    }

    publicDetailAverageRatingLabel(): string {
        const stats = this.publicDetailStats();
        if (!stats || stats.PuntuacionMedia === null || stats.PuntuacionMedia === undefined)
            return 'Sin datos';

        return `${stats.PuntuacionMedia.toFixed(1)} (${this.formatStat(stats.TotalPuntuaciones)} puntuaciones)`;
    }

    publicDetailStats(): CatalogPublicStats | null {
        return this.selectedPublicDetail?.Estadisticas ?? null;
    }

    isDetailInCollection(): boolean {
        const ownCollection = this.selectedPublicDetail?.MiColeccion;
        if (ownCollection)
            return ownCollection.EnBiblioteca ||
                !!ownCollection.EdicionesIds?.length ||
                this.ownCollectionStatuses(ownCollection).length > 0 ||
                ownCollection.Puntuacion !== null && ownCollection.Puntuacion !== undefined ||
                !!ownCollection.Resena ||
                !!ownCollection.FechaAgregado;

        return this.selectedDetailItem ? this.isInCollection(this.selectedDetailItem) : false;
    }

    publicDetailPersonalStatusName(): string {
        const ownCollection = this.selectedPublicDetail?.MiColeccion;
        const ownStatuses = this.ownCollectionStatuses(ownCollection);
        if (ownStatuses.length > 0)
            return getLatestStatusName(ownStatuses);

        return this.selectedDetailItem ? this.latestStatusName(this.selectedDetailItem) : '';
    }

    publicDetailPersonalRating(): number | null {
        if (this.selectedPublicDetail?.MiColeccion)
            return this.selectedPublicDetail.MiColeccion.Puntuacion ?? this.selectedPublicDetail.Puntuacion ?? this.selectedDetailItem?.Puntuacion ?? null;

        return this.selectedDetailItem?.Puntuacion ?? null;
    }

    publicDetailPersonalReview(): string {
        if (this.selectedPublicDetail?.MiColeccion)
            return this.selectedPublicDetail.MiColeccion.Resena ?? this.selectedPublicDetail.Resena ?? this.selectedDetailItem?.Resena ?? '';

        return this.selectedDetailItem?.Resena ?? '';
    }

    publicDetailPersonalReviewHidden(): boolean {
        if (this.selectedPublicDetail?.MiColeccion)
            return this.selectedPublicDetail.MiColeccion.ResenaOculta ?? false;

        return this.selectedDetailItem?.ResenaOculta ?? false;
    }

    publicDetailHasPersonalReview(): boolean {
        return !!this.publicDetailPersonalReview().trim() && !this.publicDetailPersonalReviewHidden();
    }

    ratingStarValues(): number[] {
        return this.ratingOptions;
    }

    publicReviewRows(): CatalogPublicReview[] {
        const detail = this.selectedPublicDetail;
        if (!detail)
            return [];

        const aliases: Array<CatalogPublicReview[] | undefined> = [
            detail.Resenas,
            detail.ResenasPublicas,
            detail.ResenasVisibles,
            (detail as unknown as Record<string, CatalogPublicReview[] | undefined>)['Reseñas'],
            (detail as unknown as Record<string, CatalogPublicReview[] | undefined>)['ReseñasPublicas']
        ];
        const personalReview = this.publicDetailPersonalReview().trim();

        const reviews = aliases.find((candidate): candidate is CatalogPublicReview[] => Array.isArray(candidate)) ?? [];

        return reviews.filter(review => {
            const reviewText = review.Resena?.trim() ?? '';
            if (!reviewText || review.ResenaOculta)
                return false;
            if (review.EsMia || review.EsPropia)
                return false;
            return !personalReview || reviewText !== personalReview;
        });
    }

    pagedPublicReviewRows(): CatalogPublicReview[] {
        const start = this.publicReviewPage * 3;
        return this.publicReviewRows().slice(start, start + 3);
    }

    publicReviewTotalPages(): number {
        return Math.max(1, Math.ceil(this.publicReviewRows().length / 3));
    }

    hasPublicReviewPages(): boolean {
        return this.publicReviewRows().length > 3;
    }

    nextPublicReviewPage(): void {
        this.publicReviewPage = Math.min(this.publicReviewPage + 1, this.publicReviewTotalPages() - 1);
        this.expandedPublicReviews.clear();
    }

    previousPublicReviewPage(): void {
        this.publicReviewPage = Math.max(this.publicReviewPage - 1, 0);
        this.expandedPublicReviews.clear();
    }

    publicReviewAuthorLabel(review: CatalogPublicReview): string {
        return review.Usuario?.Nombre || 'Usuario';
    }

    publicReviewAuthorHandle(review: CatalogPublicReview): string {
        return this.toUserHandle(this.publicReviewAuthorLabel(review));
    }

    publicOwnReviewAuthorHandle(): string {
        return this.toUserHandle(this.sessionSrv.username ?? this.sessionSrv.displayName ?? (this.sessionSrv.userName || 'Usuario'));
    }

    publicReviewDate(review: CatalogPublicReview): string | null {
        return review.Fecha ?? review.FechaCreacion ?? null;
    }

    reviewTextNeedsToggle(text: string | null | undefined): boolean {
        return (text?.trim().length ?? 0) > 180;
    }

    publicReviewKey(review: CatalogPublicReview, index: number): string {
        return String(review.Id ?? `${this.publicReviewPage}-${index}-${review.UsuarioId ?? review.Usuario?.Id ?? 'anonimo'}`);
    }

    isPublicReviewExpanded(review: CatalogPublicReview, index: number): boolean {
        return this.expandedPublicReviews.has(this.publicReviewKey(review, index));
    }

    togglePublicReview(review: CatalogPublicReview, index: number): void {
        const key = this.publicReviewKey(review, index);
        if (this.expandedPublicReviews.has(key)) {
            this.expandedPublicReviews.delete(key);
            return;
        }

        this.expandedPublicReviews.add(key);
    }

    toggleOwnReview(): void {
        this.expandedOwnReview = !this.expandedOwnReview;
    }

    openReviewFromDetail(event: MouseEvent): void {
        event.stopPropagation();
        if (!this.selectedDetailItem)
            return;

        this.openCollectionModal(this.selectedDetailItem, event);
    }

    ratingDistributionRows(): NonNullable<CatalogPublicStats['DistribucionPuntuaciones']> {
        return [...(this.selectedPublicDetail?.Estadisticas.DistribucionPuntuaciones ?? [])]
            .sort((a, b) => b.Puntuacion - a.Puntuacion);
    }

    stateDistributionRows(): NonNullable<CatalogPublicStats['DistribucionEstados']> {
        return [...(this.selectedPublicDetail?.Estadisticas.DistribucionEstados ?? [])]
            .sort((a, b) => b.Total - a.Total);
    }

    formatStat(value: number | null | undefined): string {
        return value === null || value === undefined ? 'Sin datos' : String(value);
    }

    formatAverageRating(value: number | null | undefined): string {
        return value === null || value === undefined ? 'Sin datos' : value.toFixed(1);
    }

    formatPercent(value: number | null | undefined): string {
        return value === null || value === undefined ? 'Sin datos' : `${value.toFixed(1)}%`;
    }

    formatRanking(metric: { Ranking?: number; TotalItems?: number } | null | undefined): string {
        if (!metric?.Ranking || !metric.TotalItems)
            return 'Sin datos';

        return `#${metric.Ranking} de ${metric.TotalItems}`;
    }

    private getCatalogQuery(): CatalogQuery {
        return {
            estadoId: this.selectedStatusFilter === '' ? undefined : this.selectedStatusFilter,
            puntuacionMin: this.selectedRatingFilter === '' ? undefined : this.selectedRatingFilter,
            idiomaId: this.selectedLanguageFilter === '' ? undefined : this.selectedLanguageFilter,
            estiloId: this.selectedStyleFilter === '' ? undefined : this.selectedStyleFilter
        };
    }

    private catalogOptionsLabel(options: CatalogOption[] | string[] | null | undefined): string {
        if (!options?.length)
            return '';

        return options
            .map(option => typeof option === 'string' ? option : option.Nombre)
            .filter(Boolean)
            .join(', ');
    }

    private applyOwnCollectionFromDetail(detail: CatalogPublicDetail): void {
        if (!this.selectedDetailItem || !detail.MiColeccion)
            return;

        const ownStatuses = this.ownCollectionStatuses(detail.MiColeccion);
        const updatedItem: CatalogItem = {
            ...this.selectedDetailItem,
            Ediciones: detail.Ediciones ?? this.selectedDetailItem.Ediciones,
            Estados: ownStatuses,
            Puntuacion: detail.MiColeccion.Puntuacion ?? detail.Puntuacion ?? this.selectedDetailItem.Puntuacion ?? null,
            Resena: detail.MiColeccion.Resena ?? detail.Resena ?? this.selectedDetailItem.Resena ?? null,
            ResenaOculta: detail.MiColeccion.ResenaOculta ?? false,
            PuedeAbrirNarrativa: detail.MiColeccion.PuedeAbrirNarrativa ?? detail.PuedeAbrirNarrativa ?? this.selectedDetailItem.PuedeAbrirNarrativa,
            NarrativaPersonalDisponible: detail.MiColeccion.NarrativaPersonalDisponible ?? detail.NarrativaPersonalDisponible ?? this.selectedDetailItem.NarrativaPersonalDisponible
        };

        this.selectedDetailItem = updatedItem;
        this.items = this.items.map(item =>
            item.Tipo === updatedItem.Tipo && item.Id === updatedItem.Id ? updatedItem : item
        );
    }

    private ownCollectionStatuses(ownCollection: CatalogOwnCollection | null | undefined) {
        if (!ownCollection)
            return [];

        if (ownCollection.Estados?.length)
            return ownCollection.Estados;

        return ownCollection.EstadoActual ? [ownCollection.EstadoActual] : [];
    }

    private toUserHandle(name: string): string {
        const trimmed = name.trim() || 'Usuario';
        return '@' + trimmed.replace(/^@+/, '').replace(/\s+/g, '');
    }

    private resetReviewDisplayState(): void {
        this.publicReviewPage = 0;
        this.expandedOwnReview = false;
        this.expandedPublicReviews.clear();
    }

    private buildRequestPayload(): Record<string, unknown> {
        const payload: Record<string, unknown> = {};
        const name = this.requestSuggestedName.trim();
        const isbn = this.requestSuggestedIsbn.trim();
        const publicationDate = this.requestSuggestedPublicationDate.trim();
        const synopsis = this.requestSuggestedSynopsis.trim();
        const comment = this.requestComment.trim();

        if (name)
            payload['Nombre'] = name;
        if (this.isBookLikeRequest() && isbn)
            payload['ISBN'] = isbn;
        if (this.isBookLikeRequest() && publicationDate)
            payload['FechaPublicacion'] = publicationDate;
        if (this.isBookLikeRequest() && synopsis)
            payload['Sinopsis'] = synopsis;
        if (comment)
            payload['Comentario'] = comment;

        return payload;
    }

    private isBookLikeRequest(): boolean {
        return this.requestEntityType === 'libro' || this.requestEntityType === 'antologia';
    }

    private validPublicationDate(value: string): boolean {
        if (!value) return true;
        const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
        if (!match) return false;
        const year = Number(match[1]);
        const month = match[2] ? Number(match[2]) : 1;
        const day = match[3] ? Number(match[3]) : 1;
        if (month < 1 || month > 12 || day < 1) return false;
        const lastDay = new Date(0);
        lastDay.setUTCFullYear(year, month, 0);
        return day <= lastDay.getUTCDate();
    }

    private reviewPayloadValue(): string | null {
        const review = this.selectedCollectionReview.trim();
        return review ? review : null;
    }

    private hasReviewChanged(): boolean {
        return this.selectedCollectionReview.trim() !== this.selectedCollectionOriginalReview.trim();
    }

    private syncSelectedDetailFromCollectionModal(): void {
        if (!this.selectedDetailItem || !this.selectedCollectionItem)
            return;
        if (this.selectedDetailItem.Tipo !== this.selectedCollectionItem.Tipo || this.selectedDetailItem.Id !== this.selectedCollectionItem.Id)
            return;

        const selectedStatus = this.statusOptions.find(status => status.Id === this.selectedCollectionStatus);
        const updatedStatuses = selectedStatus
            ? [{ Id: selectedStatus.Id, EstadoId: selectedStatus.Id, Nombre: selectedStatus.Nombre, Fecha: new Date().toISOString() }]
            : this.selectedDetailItem.Estados;
        const review = this.reviewPayloadValue();

        this.selectedDetailItem = {
            ...this.selectedDetailItem,
            Estados: updatedStatuses,
            Puntuacion: this.selectedCollectionRating,
            Resena: review,
            ResenaOculta: false,
            PuedeAbrirNarrativa: this.selectedDetailItem.PuedeAbrirNarrativa,
            NarrativaPersonalDisponible: this.selectedDetailItem.NarrativaPersonalDisponible
        };

        if (this.selectedPublicDetail) {
            this.selectedPublicDetail = {
                ...this.selectedPublicDetail,
                Puntuacion: this.selectedCollectionRating,
                Resena: review,
                ResenaOculta: false,
                MiColeccion: {
                    EnBiblioteca: true,
                    EstadoActual: updatedStatuses[updatedStatuses.length - 1] ?? null,
                    Estados: updatedStatuses,
                    Puntuacion: this.selectedCollectionRating,
                    Resena: review,
                    ResenaOculta: false,
                    PuedeAbrirNarrativa: this.selectedDetailItem.PuedeAbrirNarrativa,
                    NarrativaPersonalDisponible: this.selectedDetailItem.NarrativaPersonalDisponible,
                    FechaAgregado: this.selectedPublicDetail.MiColeccion?.FechaAgregado ?? null,
                    FechaActualizacion: new Date().toISOString()
                }
            };
        }
    }

    private applyStatusToCatalogItem(item: CatalogItem, statusId: ReadingStatusId, collectionItem?: CatalogItem): void {
        const selectedStatus = this.statusOptions.find(status => status.Id === statusId);
        if (!selectedStatus)
            return;

        const updatedStatuses = [{ Id: selectedStatus.Id, EstadoId: selectedStatus.Id, Nombre: selectedStatus.Nombre, Fecha: new Date().toISOString() }];
        const updatedItem: CatalogItem = {
            ...item,
            ...collectionItem,
            Estados: collectionItem?.Estados?.length ? collectionItem.Estados : updatedStatuses,
            PuedeAbrirNarrativa: collectionItem?.PuedeAbrirNarrativa ?? item.PuedeAbrirNarrativa ?? false,
            NarrativaPersonalDisponible: collectionItem?.NarrativaPersonalDisponible ?? item.NarrativaPersonalDisponible ?? false
        };

        this.items = this.items.map(candidate =>
            candidate.Tipo === item.Tipo && candidate.Id === item.Id ? updatedItem : candidate
        );

        if (this.selectedDetailItem?.Tipo === item.Tipo && this.selectedDetailItem.Id === item.Id)
            this.selectedDetailItem = updatedItem;
        if (this.selectedPublicDetail?.Id === item.Id)
            this.selectedPublicDetail = {
                ...this.selectedPublicDetail,
                MiColeccion: {
                    EnBiblioteca: true,
                    EstadoActual: updatedStatuses[updatedStatuses.length - 1],
                    Estados: updatedStatuses,
                    Puntuacion: this.selectedPublicDetail.MiColeccion?.Puntuacion ?? this.selectedPublicDetail.Puntuacion ?? null,
                    Resena: this.selectedPublicDetail.MiColeccion?.Resena ?? this.selectedPublicDetail.Resena ?? null,
                    ResenaOculta: this.selectedPublicDetail.MiColeccion?.ResenaOculta ?? false,
                    PuedeAbrirNarrativa: updatedItem.PuedeAbrirNarrativa,
                    NarrativaPersonalDisponible: updatedItem.NarrativaPersonalDisponible,
                    FechaAgregado: this.selectedPublicDetail.MiColeccion?.FechaAgregado ?? new Date().toISOString(),
                    FechaActualizacion: new Date().toISOString()
                }
            };
    }

    private findCollectionCatalogItem(universes: Universe[], target: CatalogItem): CatalogItem | undefined {
        for (const universe of universes) {
            const directItem = this.findCatalogItemInLists(target, universe.Libros, universe.Antologias);
            if (directItem)
                return directItem;

            for (const saga of universe.Sagas ?? []) {
                const sagaItem = this.findCatalogItemInLists(target, saga.Libros, saga.Antologias);
                if (sagaItem)
                    return sagaItem;
            }
        }

        return undefined;
    }

    private findCatalogItemInLists(
        target: CatalogItem,
        books: unknown[] = [],
        anthologies: unknown[] = []
    ): CatalogItem | undefined {
        const candidates = target.Tipo === 'libro' ? books : anthologies;
        const candidate = candidates.find(row => this.hasCatalogId(row, target.Id)) as Partial<CatalogItem> | undefined;
        return candidate
            ? {
                ...target,
                ...candidate,
                Tipo: target.Tipo,
                Estados: candidate.Estados ?? target.Estados ?? [],
                Autores: candidate.Autores ?? target.Autores ?? []
            }
            : undefined;
    }

    private hasCatalogId(row: unknown, id: number): row is { Id: number } {
        return typeof row === 'object' && row !== null && (row as { Id?: unknown }).Id === id;
    }
}
