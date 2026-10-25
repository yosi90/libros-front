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
    CatalogNewWorksWindow,
    CatalogQuery,
    CatalogRequestAction,
    CATALOG_NEW_WORKS_OPTIONS,
    isCatalogNewWorksWindow
} from '../../../../interfaces/catalog';
import { ownedEditionIds } from '../../../../shared/edition-selection';
import { Universe } from '../../../../interfaces/universe';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { CatalogRequestService } from '../../../../services/entities/catalog-request.service';
import { isValidIsbn } from '../../../../shared/isbn';
import { isIsoPublicationDate } from '../../../../shared/publication-date';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { ReportService } from '../../../../services/entities/report.service';
import { CollectionService } from '../../../../services/entities/collection.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import {
    getLatestStatus,
    getLatestStatusName,
    getStatusClass,
    getStatusIcon
} from '../../../../shared/reading-status';
import { CollectionStateModalComponent } from '../../common/collection-state-modal/collection-state-modal.component';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { CatalogViewStateService } from '../../../../shared/catalog-view-state.service';
import { WebCatalogViewComponent } from '../../../web/user/web-catalog-view/web-catalog-view.component';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileFullscreenReturnService } from '../../../../services/navigation/mobile-fullscreen-return.service';
import { MobileCatalogViewComponent } from '../../../mobile/user/mobile-catalog-view/mobile-catalog-view.component';
import { PublicDetailHost } from '../../common/public-detail/public-detail-host';
import { WoodPublicDetailModalComponent } from '../../common/public-detail/wood-public-detail-modal.component';
import { foldText } from '../../../../shared/text';
import {
    applyLibrarySearch,
    libraryTextScopeOptions,
    LibraryTextFilterChip,
    LibraryTextFilterScope,
    parseLibraryTextFilters,
    serializeLibraryTextFilter
} from '../../../../shared/library-search';

type CatalogTypeFilter = 'todos' | 'libro' | 'antologia';

/** Con el filtro «Nuevos», libros y antologías juntos, de la más reciente a la más antigua. */
function newestFirst(a: CatalogItem, b: CatalogItem): number {
    return (b.FechaAlta ?? '').localeCompare(a.FechaAlta ?? '') || a.Nombre.localeCompare(b.Nombre);
}

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
        MobileCatalogViewComponent,
        WoodPublicDetailModalComponent
    ],
    templateUrl: './catalog.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './catalog.component.sass'
})
export class CatalogComponent extends PublicDetailHost implements OnInit, OnDestroy {
    private detailRequests?: Subscription;
    private addBookRequests?: Subscription;
    readonly imgUrl = environment.getImgUrl;
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
    isSendingRequest = false;

    filterType: CatalogTypeFilter = 'todos';
    query = '';
    selectedStatusFilter: ReadingStatusId | '' = '';
    selectedRatingFilter: number | '' = '';
    selectedLanguageFilter: number | '' = '';
    selectedStyleFilter: number | '' = '';
    /** «Nuevos»: solo las obras dadas de alta en el catálogo en ese plazo, de la más reciente a la más antigua. */
    selectedNewFilter: CatalogNewWorksWindow | '' = '';
    readonly newWorksOptions = CATALOG_NEW_WORKS_OPTIONS;
    draftQuery = '';
    searchTerms: string[] = [];
    isSearchSuggestionOpen = false;
    filtersOpen = false;

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
        catalogSrv: CatalogService,
        collectionSrv: CollectionService,
        private catalogRequestSrv: CatalogRequestService,
        universeStore: UniverseStoreService,
        sessionSrv: PlatformSessionService,
        snackBar: SnackbarModule,
        private router: Router,
        private viewState: CatalogViewStateService,
        private host: ElementRef<HTMLElement>,
        private presentation: PresentationModeService,
        private fullscreenReturn: MobileFullscreenReturnService,
        private route: ActivatedRoute,
        reportSrv?: ReportService
    ) {
        super(catalogSrv, collectionSrv, universeStore, sessionSrv, snackBar, reportSrv);
        const state = this.viewState.snapshot;
        this.filterType = state.filterType;
        this.searchTerms = state.searchTerms;
        this.query = state.searchTerms.join('\n');
        this.selectedStatusFilter = state.selectedStatusFilter;
        this.selectedRatingFilter = state.selectedRatingFilter;
        this.selectedLanguageFilter = state.selectedLanguageFilter;
        this.selectedStyleFilter = state.selectedStyleFilter;
        this.selectedNewFilter = state.selectedNewFilter ?? '';
    }

    ngOnInit(): void {
        this.loadMetadata();
        // La novedad diaria de Yosiftware enlaza aquí con `?nuevos=24h`: el filtro se aplica y sale de la URL.
        const requestedNew = this.router.url ? this.router.parseUrl(this.router.url).queryParams['nuevos'] : null;
        if (isCatalogNewWorksWindow(requestedNew)) {
            this.selectedNewFilter = requestedNew;
            void this.router.navigate([], { relativeTo: this.route, queryParams: { nuevos: null }, queryParamsHandling: 'merge', replaceUrl: true });
        }
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
        this.cancelPublicDetailRequest();
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
                    .sort(this.selectedNewFilter ? newestFirst : (a, b) => a.Nombre.localeCompare(b.Nombre));
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
        this.selectedNewFilter = '';
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
            selectedStyleFilter: this.selectedStyleFilter,
            selectedNewFilter: this.selectedNewFilter
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
        if (!this.searchTerms.some(term => foldText(term) === foldText(serialized)))
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

    /** Filtro elegido en un <select> de Mobile o Web: vacío es «todos». */
    applySelectFilter(field: 'status' | 'rating' | 'language' | 'style', event: Event): void {
        const raw = (event.target as HTMLSelectElement).value;
        const value = raw === '' ? '' : Number(raw);
        if (field === 'status') this.selectedStatusFilter = value as ReadingStatusId | '';
        if (field === 'rating') this.selectedRatingFilter = value;
        if (field === 'language') this.selectedLanguageFilter = value;
        if (field === 'style') this.selectedStyleFilter = value;
        this.applySelectFilters();
    }

    /** El filtro «Nuevos» elegido en un <select> de Mobile o Web: vacío es «todas las fechas». */
    applyNewFilter(event: Event): void {
        const raw = (event.target as HTMLSelectElement).value;
        this.selectedNewFilter = isCatalogNewWorksWindow(raw) ? raw : '';
        this.applySelectFilters();
    }

    /** «Proponer corrección» desde la ficha abierta, en cualquier presentación. */
    openDetailCorrection(event: Event): void {
        if (this.selectedDetailItem)
            this.openCorrectionRequest(this.selectedDetailItem, event as MouseEvent);
    }

    get hasActiveFilters(): boolean {
        return this.searchTerms.length > 0 ||
            this.draftQuery.trim().length > 0 ||
            this.filterType !== 'todos' ||
            this.selectedStatusFilter !== '' ||
            this.selectedRatingFilter !== '' ||
            this.selectedLanguageFilter !== '' ||
            this.selectedStyleFilter !== '' ||
            this.selectedNewFilter !== '';
    }

    /** En Catálogo, el editor de estado sustituye a la ficha de la misma obra. */
    override openCollectionModal(item: CatalogItem, event?: MouseEvent): void {
        event?.stopPropagation();
        if (this.selectedDetailItem?.Tipo === item.Tipo && this.selectedDetailItem.Id === item.Id)
            this.closePublicDetailModal();
        super.openCollectionModal(item);
    }

    override closePublicDetailModal(): void {
        if (this.fullscreenReturn.restoreForwardedOverlay())
            return;
        super.closePublicDetailModal();
    }

    protected override announceCollectionSaved(item: CatalogItem, wasInCollection: boolean): void {
        if (wasInCollection) {
            this.snackBar.openSnackBar('Biblioteca personal actualizada', 'successBar');
            return;
        }
        this.snackBar.openSnackBar('Añadido a tu biblioteca', 'successBar', 5200, {
            title: item.Nombre,
            dedupeKey: `catalog:added:${item.Tipo}:${item.Id}`,
            action: {
                label: 'Ver en biblioteca',
                execute: () => this.revealAddedCollectionItem(item)
            }
        });
    }

    protected override afterCollectionSaved(): void {
        this.loadCatalog();
    }

    protected override onDetailItemUpdated(updatedItem: CatalogItem): void {
        this.items = this.items.map(item =>
            item.Tipo === updatedItem.Tipo && item.Id === updatedItem.Id ? updatedItem : item
        );
    }

    protected override onEditionOwnershipUpdated(editions: Edition[]): void {
        this.items = this.items.map(candidate => ({
            ...candidate,
            Ediciones: candidate.Ediciones?.map(existing => {
                const updated = editions.find(value => value.Id === existing.Id);
                return updated ? { ...existing, EnMiBiblioteca: updated.EnMiBiblioteca } : existing;
            })
        }));
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

    override addToCollectionWithStatus(item: CatalogItem, statusId: ReadingStatusId, event?: MouseEvent): void {
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
        const suggestedDate = this.requestSuggestedPublicationDate.trim();
        if (this.isBookLikeRequest() && suggestedDate && !isIsoPublicationDate(suggestedDate)) {
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

    private getCatalogQuery(): CatalogQuery {
        return {
            estadoId: this.selectedStatusFilter === '' ? undefined : this.selectedStatusFilter,
            puntuacionMin: this.selectedRatingFilter === '' ? undefined : this.selectedRatingFilter,
            idiomaId: this.selectedLanguageFilter === '' ? undefined : this.selectedLanguageFilter,
            estiloId: this.selectedStyleFilter === '' ? undefined : this.selectedStyleFilter,
            nuevos: this.selectedNewFilter === '' ? undefined : this.selectedNewFilter
        };
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
