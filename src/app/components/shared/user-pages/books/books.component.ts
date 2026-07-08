import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { forkJoin, Observable, switchMap } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { environment } from '../../../../../environment/environment';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { BookSimple } from '../../../../interfaces/book';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { Universe } from '../../../../interfaces/universe';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { Author } from '../../../../interfaces/author';
import { Saga } from '../../../../interfaces/saga';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { BookService } from '../../../../services/entities/book.service';
import {
    applyLibrarySearch,
    getLatestLibraryStatus,
    isPurchasedLibraryStatus,
    LibraryAvailabilityFilter,
    libraryTextScopeOptions,
    LibraryTextFilterChip,
    LibraryTextFilterScope,
    parseLibraryTextFilters,
    SearchableLibraryItem,
} from '../../../../shared/library-search';
import { Antology } from '../../../../interfaces/antology';
import { LibrarySearchStateService } from '../../../../shared/library-search-state.service';
import { CollectionService } from '../../../../services/entities/collection.service';
import {
    getLatestStatus,
    getLatestStatusName,
    getStatusClass,
    getStatusIcon,
    readingStatusOptions
} from '../../../../shared/reading-status';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import { CollectionStateModalComponent } from '../../common/collection-state-modal/collection-state-modal.component';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';

interface SearchableLibraryTreeItem extends SearchableLibraryItem {
    locationKey: string;
}

@Component({
    standalone: true,
    selector:  'app-books',
    imports: [NgxDropzoneModule, CommonModule, FormsModule, MatIcon, RouterLink, SnackbarModule, MatExpansionModule, MatButtonModule, CollectionStateModalComponent, CoverCachePipe],
    templateUrl: './books.component.html',
    styleUrl: './books.component.sass'
})
export class BooksComponent implements OnInit {
    imgUrl = environment.getImgUrl;
    universes: Universe[] = [];
    visibleUniverses: Universe[] = [];
    isLoadingUniverses = false;
    query = '';
    draftQuery = '';
    availabilityFilter: LibraryAvailabilityFilter = 'all';
    isSearchSuggestionOpen = false;
    readonly textScopeOptions = libraryTextScopeOptions;
    readonly availabilityOptions: { value: LibraryAvailabilityFilter, label: string }[] = [
        { value: 'all', label: 'Todos' },
        { value: 'purchased', label: 'Comprados' },
        { value: 'unpurchased', label: 'Por comprar' }
    ];
    readonly statusOptions = readingStatusOptions;
    readonly ratingOptions = [1, 2, 3, 4, 5];
    selectedCollectionItem: { kind: 'book' | 'antology', item: BookSimple | Antology } | null = null;
    selectedCollectionStatus: ReadingStatusId | null = null;
    selectedCollectionOriginalStatus: ReadingStatusId | null = null;
    selectedCollectionRating: number | null = null;
    selectedCollectionOriginalRating: number | null = null;
    selectedCollectionReview = '';
    private selectedCollectionOriginalReview = '';
    isSavingCollection = false;
    expandedUniverseIds = new Set<number>();
    expandedSagaIds = new Set<number>();
    private panelExpansionMode: 'running' | 'all' | 'closed' = 'running';
    private readonly bookLightingCache = new Map<string, Record<string, string>>();
    private controlsUniverseLoader = false;
    private readonly bookLightingPresets: Record<string, string>[] = [
        {
            '--book-glow-x': '12%',
            '--book-glow-y': '-18%',
            '--book-glow-size': '64%',
            '--book-glow-color': 'rgba(255, 213, 134, .18)',
            '--book-shade-x': '96%',
            '--book-shade-y': '88%',
            '--book-shade-color': 'rgba(93, 42, 24, .18)',
            '--book-wash-angle': '120deg',
            '--book-wash-start': 'rgba(80, 47, 25, .38)',
            '--book-wash-end': 'rgba(31, 22, 16, .2)'
        },
        {
            '--book-glow-x': '88%',
            '--book-glow-y': '-8%',
            '--book-glow-size': '70%',
            '--book-glow-color': 'rgba(224, 169, 95, .16)',
            '--book-shade-x': '8%',
            '--book-shade-y': '92%',
            '--book-shade-color': 'rgba(28, 43, 31, .2)',
            '--book-wash-angle': '220deg',
            '--book-wash-start': 'rgba(39, 61, 38, .28)',
            '--book-wash-end': 'rgba(39, 25, 17, .18)'
        },
        {
            '--book-glow-x': '50%',
            '--book-glow-y': '112%',
            '--book-glow-size': '76%',
            '--book-glow-color': 'rgba(200, 154, 84, .15)',
            '--book-shade-x': '100%',
            '--book-shade-y': '12%',
            '--book-shade-color': 'rgba(35, 50, 58, .2)',
            '--book-wash-angle': '180deg',
            '--book-wash-start': 'rgba(34, 48, 53, .3)',
            '--book-wash-end': 'rgba(58, 36, 22, .16)'
        },
        {
            '--book-glow-x': '-10%',
            '--book-glow-y': '56%',
            '--book-glow-size': '74%',
            '--book-glow-color': 'rgba(242, 221, 181, .13)',
            '--book-shade-x': '84%',
            '--book-shade-y': '12%',
            '--book-shade-color': 'rgba(72, 32, 37, .2)',
            '--book-wash-angle': '90deg',
            '--book-wash-start': 'rgba(84, 39, 37, .28)',
            '--book-wash-end': 'rgba(31, 23, 18, .2)'
        },
        {
            '--book-glow-x': '104%',
            '--book-glow-y': '78%',
            '--book-glow-size': '72%',
            '--book-glow-color': 'rgba(226, 184, 112, .15)',
            '--book-shade-x': '18%',
            '--book-shade-y': '-8%',
            '--book-shade-color': 'rgba(49, 58, 30, .18)',
            '--book-wash-angle': '300deg',
            '--book-wash-start': 'rgba(73, 68, 35, .26)',
            '--book-wash-end': 'rgba(45, 28, 18, .2)'
        },
        {
            '--book-glow-x': '36%',
            '--book-glow-y': '-4%',
            '--book-glow-size': '62%',
            '--book-glow-color': 'rgba(255, 238, 190, .14)',
            '--book-shade-x': '78%',
            '--book-shade-y': '106%',
            '--book-shade-color': 'rgba(44, 34, 62, .18)',
            '--book-wash-angle': '145deg',
            '--book-wash-start': 'rgba(58, 42, 72, .24)',
            '--book-wash-end': 'rgba(54, 34, 19, .2)'
        }
    ];

    viewportSize!: { width: number, height: number };

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(
        private universeStore: UniverseStoreService,
        private router: Router, 
        private snackBar: SnackbarModule, 
        private route: ActivatedRoute, 
        private loader: LoaderEmmitterService,
        private librarySearchState: LibrarySearchStateService,
        private collectionSrv: CollectionService,
        private host: ElementRef<HTMLElement>,
    ) {
        this.isLoadingUniverses = !this.universeStore.hasLoadedUniverses();
        if (this.isLoadingUniverses) {
            this.controlsUniverseLoader = true;
            loader.activateLoader();
        }

        this.universeStore.universes$.subscribe(unis => {
            this.universes = unis;
            this.refreshVisibleUniverses();
            if (this.universeStore.hasLoadedUniverses()) {
                this.isLoadingUniverses = false;
                if (this.controlsUniverseLoader) {
                    this.controlsUniverseLoader = false;
                    this.loader.deactivateLoader();
                }
            }
        });
        this.librarySearchState.state$.subscribe(state => {
            this.query = state.query;
            this.availabilityFilter = state.availabilityFilter;
            this.refreshVisibleUniverses();
        });
    }

    ngOnInit(): void {
        this.getViewportSize();
        this.route.queryParams.subscribe(params => {
            const authorAdded = params['authorAdded'];
            if (authorAdded && authorAdded === 'true')
                this.snackBar.openSnackBar('Autor añadido', 'successBar');
            const authorUpdated = params['authorUpdated'];
            if (authorUpdated && authorUpdated === 'true')
                this.snackBar.openSnackBar('Autor actualizado', 'successBar');
            const universeAdded = params['universeAdded'];
            if (universeAdded && universeAdded === 'true')
                this.snackBar.openSnackBar('Universo añadido', 'successBar');
            const universeUpdated = params['universeUpdated'];
            if (universeUpdated && universeUpdated === 'true')
                this.snackBar.openSnackBar('Universo actualizado', 'successBar');
            const sagaAdded = params['sagaAdded'];
            if (sagaAdded && sagaAdded === 'true')
                this.snackBar.openSnackBar('Saga añadida', 'successBar');
            const sagaUpdated = params['sagaUpdated'];
            if (sagaUpdated && sagaUpdated === 'true')
                this.snackBar.openSnackBar('Saga actualizada', 'successBar');
            const antologyAdded = params['antologyAdded'];
            if (antologyAdded && antologyAdded === 'true')
                this.snackBar.openSnackBar('Antología añadida', 'successBar');
            const antologyUpdated = params['antologyUpdated'];
            if (antologyUpdated && antologyUpdated === 'true')
                this.snackBar.openSnackBar('Antología actualizada', 'successBar');
            const bookAdded = params['bookAdded'];
            if (bookAdded && bookAdded === 'true')
                this.snackBar.openSnackBar('Libro añadido', 'successBar');
            const bookUpdated = params['bookUpdated'];
            if (bookUpdated && bookUpdated === 'true')
                this.snackBar.openSnackBar('Libro actualizado', 'successBar');
        });
    }

    handleCoverImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    openAntology(antologyId: number): void {
        this.router.navigate(['/antology', antologyId]);
    } 

    editAntology(antologyId: number, event: MouseEvent): void {
        event.stopPropagation();
        const antology = this.universeStore.getAllAnthologies().find(item => item.Id === antologyId);
        if (antology)
            this.openCollectionModal('antology', antology);
    }

    openBook(bookId: number): void {
        this.loader.activateLoader('book');
        window.setTimeout(() => {
            this.router.navigate(['/book', bookId]).then(navigated => {
                if (!navigated)
                    this.loader.deactivateLoader();
            });
        });
    } 

    editBook(bookId: number, event: MouseEvent): void {
        event.stopPropagation();
        const book = this.universeStore.getAllBooks().find(item => item.Id === bookId);
        if (book)
            this.openCollectionModal('book', book);
    }

    openCollectionModal(kind: 'book' | 'antology', item: BookSimple | Antology): void {
        this.selectedCollectionItem = { kind, item };
        this.selectedCollectionStatus = getLatestStatus(item.Estados)?.EstadoId ?? null;
        this.selectedCollectionOriginalStatus = this.selectedCollectionStatus;
        this.selectedCollectionRating = item.Puntuacion ?? null;
        this.selectedCollectionOriginalRating = this.selectedCollectionRating;
        this.selectedCollectionReview = item.Resena ?? '';
        this.selectedCollectionOriginalReview = this.selectedCollectionReview;
    }

    closeCollectionModal(): void {
        this.selectedCollectionItem = null;
        this.selectedCollectionStatus = null;
        this.selectedCollectionOriginalStatus = null;
        this.selectedCollectionRating = null;
        this.selectedCollectionOriginalRating = null;
        this.selectedCollectionReview = '';
        this.selectedCollectionOriginalReview = '';
    }

    saveCollectionState(): void {
        if (!this.selectedCollectionItem || this.selectedCollectionStatus === null) {
            this.snackBar.openSnackBar('Selecciona un estado de lectura', 'errorBar');
            return;
        }

        this.isSavingCollection = true;
        const { kind, item } = this.selectedCollectionItem;
        const requests: Observable<unknown>[] = [];

        if (this.selectedCollectionStatus !== this.selectedCollectionOriginalStatus) {
            const statusRequest = kind === 'book'
                ? this.collectionSrv.updateBookStatus(item.Id, { EstadoId: this.selectedCollectionStatus })
                : this.collectionSrv.updateAnthologyStatus(item.Id, { EstadoId: this.selectedCollectionStatus });
            requests.push(statusRequest);
        }

        if (this.selectedCollectionRating !== null) {
            if (this.selectedCollectionRating !== this.selectedCollectionOriginalRating || this.hasReviewChanged()) {
                const ratingRequest = kind === 'book'
                    ? this.collectionSrv.updateBookRating(item.Id, {
                        Puntuacion: this.selectedCollectionRating,
                        Resena: this.reviewPayloadValue()
                    })
                    : this.collectionSrv.updateAnthologyRating(item.Id, {
                        Puntuacion: this.selectedCollectionRating,
                        Resena: this.reviewPayloadValue()
                    });
                requests.push(ratingRequest);
            }
        } else if (this.selectedCollectionOriginalRating !== null) {
            this.snackBar.openSnackBar('La reseña necesita una puntuación', 'errorBar');
            this.isSavingCollection = false;
            return;
        }

        if (requests.length === 0) {
            this.closeCollectionModal();
            this.isSavingCollection = false;
            return;
        }

        forkJoin(requests).pipe(
            switchMap(() => this.collectionSrv.getUniverses())
        ).subscribe({
            next: universes => {
                this.universeStore.setUniverses(universes);
                this.snackBar.openSnackBar('Biblioteca personal actualizada', 'successBar');
                this.closeCollectionModal();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al actualizar tu biblioteca', 'errorBar');
                this.isSavingCollection = false;
            },
            complete: () => {
                this.isSavingCollection = false;
            }
        });
    }

    getCardLighting(id: number, type: 'book' | 'antology'): Record<string, string> {
        const cacheKey = `${type}-${id}`;
        const cached = this.bookLightingCache.get(cacheKey);
        if (cached)
            return cached;

        const preset = this.bookLightingPresets[Math.floor(Math.random() * this.bookLightingPresets.length)];
        const lighting = { ...preset };
        this.bookLightingCache.set(cacheKey, lighting);
        return lighting;
    }
    
    get universesToShow(): Universe[] {
        return this.visibleUniverses;
    }

    get collectionModalTitle(): string {
        return this.selectedCollectionItem
            ? `Actualizando ${this.selectedCollectionItem.item.Nombre}`
            : 'Actualizando lectura';
    }

    get canWriteCollectionReview(): boolean {
        return this.selectedCollectionRating !== null;
    }

    setCollectionStatus(statusId: ReadingStatusId): void {
        this.selectedCollectionStatus = statusId;
    }

    setCollectionRating(rating: number | null): void {
        this.selectedCollectionRating = rating;
        if (rating === null)
            this.selectedCollectionReview = '';
    }

    get hasLibraryItems(): boolean {
        return this.getBaseUniversesToShow().length > 0;
    }

    get hasActiveLibraryFilters(): boolean {
        return this.query.trim().length > 0 || this.draftQuery.trim().length > 0 || this.availabilityFilter !== 'all';
    }

    get textFilterChips(): LibraryTextFilterChip[] {
        return parseLibraryTextFilters(this.query);
    }

    get searchResultCount(): number {
        return this.visibleUniverses.reduce((total, universe) => total + this.getTotalBooksFromUniverse(universe), 0);
    }

    clearLibraryFilters(): void {
        this.draftQuery = '';
        this.isSearchSuggestionOpen = false;
        this.librarySearchState.clear();
    }

    onDraftQueryInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.draftQuery = target.value;
        this.isSearchSuggestionOpen = this.draftQuery.trim().length > 0;
    }

    commitDraftQuery(scope: LibraryTextFilterScope = 'contains'): void {
        const value = this.draftQuery.trim();
        if (!value)
            return;

        this.librarySearchState.addTextFilter(scope, value);
        this.draftQuery = '';
        this.isSearchSuggestionOpen = false;
    }

    addTextFilter(scope: LibraryTextFilterScope, value: string): void {
        const trimmedValue = value.trim();
        if (!trimmedValue)
            return;

        this.librarySearchState.addTextFilter(scope, trimmedValue);
        this.draftQuery = '';
        this.isSearchSuggestionOpen = false;
    }

    removeTextFilter(rawFilter: string): void {
        this.librarySearchState.removeTextFilter(rawFilter);
    }

    setAvailabilityFilter(filter: LibraryAvailabilityFilter): void {
        this.librarySearchState.setAvailabilityFilter(filter);
    }

    getScopeLabel(scope: LibraryTextFilterScope): string {
        return this.textScopeOptions.find(option => option.scope === scope)?.label ?? 'general';
    }

    getSuggestionLabel(scope: LibraryTextFilterScope): string {
        const scopeLabel = this.getScopeLabel(scope);
        return `${scopeLabel}: ${this.draftQuery.trim()}`;
    }

    latestStatusName(item: BookSimple | Antology): string {
        return getLatestStatusName(item.Estados);
    }

    latestStatusClass(item: BookSimple | Antology): string {
        return getStatusClass(getLatestStatus(item.Estados));
    }

    latestStatusIcon(item: BookSimple | Antology): string {
        return getStatusIcon(getLatestStatus(item.Estados));
    }

    completionPercent(book: BookSimple): number {
        const progress = book.PorcentajeCompletado ?? 1;
        return Math.min(100, Math.max(1, progress));
    }

    completionStatusClass(book: BookSimple): string {
        const statusClass = this.latestStatusClass(book);
        if (statusClass === 'leido')
            return 'is-complete';
        if (statusClass === 'en_marcha')
            return 'is-running';
        if (statusClass === 'en_espera')
            return 'is-waiting';
        return 'is-inactive';
    }

    sagaProgressPercent(saga: Saga): number {
        return this.readingProgressPercent(this.getReadableItemsFromSaga(saga));
    }

    universeProgressPercent(universe: Universe): number {
        return this.readingProgressPercent(this.getReadableItemsFromUniverse(universe));
    }

    onSearchInputBlur(): void {
        window.setTimeout(() => {
            this.commitDraftQuery();
            this.isSearchSuggestionOpen = false;
        }, 120);
    }

    openAllPanels(): void {
        this.panelExpansionMode = 'all';
        this.expandAllVisiblePanels();
    }

    closeAllPanels(): void {
        this.panelExpansionMode = 'closed';
        this.collapseAllPanels();
    }

    openRunningBooks(): void {
        this.panelExpansionMode = 'running';
        this.expandRunningBookPanels();
        this.scrollToFirstRunningBook();
    }

    isUniverseExpanded(universe: Universe): boolean {
        return this.expandedUniverseIds.has(universe.Id);
    }

    isSagaExpanded(saga: Saga): boolean {
        return this.expandedSagaIds.has(saga.Id);
    }

    markUniverseExpanded(universeId: number): void {
        this.expandedUniverseIds.add(universeId);
    }

    markUniverseCollapsed(universeId: number): void {
        this.expandedUniverseIds.delete(universeId);
    }

    markSagaExpanded(sagaId: number): void {
        this.expandedSagaIds.add(sagaId);
    }

    markSagaCollapsed(sagaId: number): void {
        this.expandedSagaIds.delete(sagaId);
    }

    getStandaloneItemCount(universe: Universe): number {
        return (universe.Libros?.length ?? 0) + (universe.Antologias?.length ?? 0);
    }

    isRunningBook(book: BookSimple): boolean {
        return book.Estados?.[book.Estados.length - 1]?.Nombre === "En marcha";
    }

    private refreshVisibleUniverses(): void {
        if (!this.query.trim() && this.availabilityFilter === 'all') {
            this.visibleUniverses = this.getBaseUniversesToShow();
            this.applyExpansionMode();
            return;
        }

        this.visibleUniverses = this.getFilteredUniverses();
        this.applyExpansionMode();
    }

    private getBaseUniversesToShow(): Universe[] {
        const universes = this.universes.filter(u =>
            (u.Libros && u.Libros.length > 0) ||
            (u.Sagas && u.Sagas.some(s => s.Libros && s.Libros.length > 0))
        );
        return this.sortUniversesForList(universes);
    }

    private getFilteredUniverses(): Universe[] {
        const searchableItems = this.getSearchableLibraryItems();
        const visibleItemKeys = new Set(
            applyLibrarySearch(searchableItems, this.query, this.availabilityFilter)
                .map(item => item.locationKey)
        );

        const universes = this.universes
            .map(universe => this.cloneUniverseWithVisibleItems(universe, visibleItemKeys))
            .filter((universe): universe is Universe => universe !== null);
        return this.sortUniversesForList(universes);
    }

    private sortUniversesForList(universes: Universe[]): Universe[] {
        return [...universes].sort((a, b) => {
            const aIsEmptyUniverse = this.isEmptyUniverse(a);
            const bIsEmptyUniverse = this.isEmptyUniverse(b);

            if (aIsEmptyUniverse !== bIsEmptyUniverse)
                return aIsEmptyUniverse ? -1 : 1;

            return a.Nombre.localeCompare(b.Nombre, 'es', { sensitivity: 'base' });
        });
    }

    private isEmptyUniverse(universe: Universe): boolean {
        return universe.Id === 1 || universe.Nombre === 'Sin universo';
    }

    private applyExpansionMode(): void {
        if (this.panelExpansionMode === 'all' || this.hasActiveLibraryFilters) {
            this.expandAllVisiblePanels();
            return;
        }

        if (this.panelExpansionMode === 'closed') {
            this.collapseAllPanels();
            return;
        }

        this.expandRunningBookPanels();
    }

    private expandAllVisiblePanels(): void {
        this.expandedUniverseIds = new Set(this.visibleUniverses.map(universe => universe.Id));
        this.expandedSagaIds = new Set(this.visibleUniverses.flatMap(universe => (universe.Sagas ?? []).map(saga => saga.Id)));
    }

    private collapseAllPanels(): void {
        this.expandedUniverseIds = new Set<number>();
        this.expandedSagaIds = new Set<number>();
    }

    private expandRunningBookPanels(): void {
        this.expandedUniverseIds = new Set(
            this.visibleUniverses
                .filter(universe => this.universeHasRunningBook(universe))
                .map(universe => universe.Id)
        );
        this.expandedSagaIds = new Set(
            this.visibleUniverses.flatMap(universe =>
                (universe.Sagas ?? [])
                    .filter(saga => this.sagaHasRunningBook(saga))
                    .map(saga => saga.Id)
            )
        );
    }

    private universeHasRunningBook(universe: Universe): boolean {
        return this.getAllBooksFromUniverse(universe).some(book => this.isRunningBook(book));
    }

    private sagaHasRunningBook(saga: Saga): boolean {
        return (saga.Libros ?? []).some(book => this.isRunningBook(book));
    }

    private scrollToFirstRunningBook(): void {
        window.setTimeout(() => {
            const firstRunningBook = this.host.nativeElement.querySelector<HTMLElement>('.book-card.is-running-book');
            firstRunningBook?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    private cloneUniverseWithVisibleItems(universe: Universe, visibleItemKeys: Set<string>): Universe | null {
        const visibleSagas = (universe.Sagas ?? [])
            .map(saga => this.cloneSagaWithVisibleItems(universe, saga, visibleItemKeys))
            .filter((saga): saga is Saga => saga !== null);
        const visibleBooks = (universe.Libros ?? []).filter(book =>
            visibleItemKeys.has(this.getItemKey('book', book.Id, universe.Id))
        );
        const visibleAntologies = (universe.Antologias ?? []).filter(antology =>
            visibleItemKeys.has(this.getItemKey('antology', antology.Id, universe.Id))
        );

        if (visibleSagas.length === 0 && visibleBooks.length === 0 && visibleAntologies.length === 0)
            return null;

        return {
            ...universe,
            Sagas: visibleSagas,
            Libros: visibleBooks,
            Antologias: visibleAntologies
        };
    }

    private cloneSagaWithVisibleItems(universe: Universe, saga: Saga, visibleItemKeys: Set<string>): Saga | null {
        const visibleBooks = (saga.Libros ?? []).filter(book =>
            visibleItemKeys.has(this.getItemKey('book', book.Id, universe.Id, saga.Id))
        );
        const visibleAntologies = (saga.Antologias ?? []).filter(antology =>
            visibleItemKeys.has(this.getItemKey('antology', antology.Id, universe.Id, saga.Id))
        );

        if (visibleBooks.length === 0 && visibleAntologies.length === 0)
            return null;

        return {
            ...saga,
            Libros: visibleBooks,
            Antologias: visibleAntologies
        };
    }

    private getSearchableLibraryItems(): SearchableLibraryTreeItem[] {
        return this.universes.flatMap(universe => [
            ...(universe.Libros ?? []).map(book => this.createSearchableItem('book', book, universe)),
            ...(universe.Antologias ?? []).map(antology => this.createSearchableItem('antology', antology, universe)),
            ...(universe.Sagas ?? []).flatMap(saga => [
                ...(saga.Libros ?? []).map(book => this.createSearchableItem('book', book, universe, saga)),
                ...(saga.Antologias ?? []).map(antology => this.createSearchableItem('antology', antology, universe, saga))
            ])
        ]);
    }

    private createSearchableItem(
        kind: 'book' | 'antology',
        item: BookSimple | Antology,
        universe: Universe,
        saga?: Saga
    ): SearchableLibraryTreeItem {
        const status = getLatestLibraryStatus(item.Estados);

        return {
            id: item.Id,
            kind,
            locationKey: this.getItemKey(kind, item.Id, universe.Id, saga?.Id),
            title: item.Nombre,
            authors: item.Autores?.map(author => author.Nombre) ?? [],
            universeName: universe.Nombre,
            sagaName: saga?.Nombre,
            status,
            isPurchased: isPurchasedLibraryStatus(status)
        };
    }

    private getItemKey(kind: 'book' | 'antology', id: number, universeId: number, sagaId?: number): string {
        return `${kind}-${universeId}-${sagaId ?? 'root'}-${id}`;
    }
    
    getAuthors(authors: Author[]): string[] {
        let names: string[] = [];
        authors.forEach(a => names.push(a.Nombre));
        return names;
    }

    getExpanded(libros: BookSimple[]): boolean {
        return libros?.some(
            libro => libro.Estados?.[libro.Estados.length - 1]?.Nombre === "En marcha"
        ) ?? false;
    }
    
    getTotalBooksFromUniverse(universe: Universe): number {
        const propios = universe.Libros || [];
        const deSagas = universe.Sagas?.flatMap(s => s.Libros || []) ?? [];
        const Apropios = universe.Antologias || [];
        const AdeSagas = universe.Sagas?.flatMap(s => s.Antologias || []) ?? [];
        return [...propios, ...deSagas, ...Apropios, ...AdeSagas].length;
    }
    
    getTotalBooksFromSaga(saga: Saga): number {
        const propios = saga.Libros || [];
        const Apropios = saga.Antologias || [];
        return [...propios, ...Apropios].length;
    }

    private getReadableItemsFromSaga(saga: Saga): (BookSimple | Antology)[] {
        return [
            ...(saga.Libros || []),
            ...(saga.Antologias || [])
        ];
    }

    private getReadableItemsFromUniverse(universe: Universe): (BookSimple | Antology)[] {
        return [
            ...(universe.Libros || []),
            ...(universe.Antologias || []),
            ...(universe.Sagas?.flatMap(saga => this.getReadableItemsFromSaga(saga)) ?? [])
        ];
    }

    private readingProgressPercent(items: (BookSimple | Antology)[]): number {
        if (!items.length)
            return 0;

        const readItems = items.filter(item => this.latestStatusClass(item) === 'leido').length;
        return Math.round((readItems / items.length) * 100);
    }
    
    getAllBooksFromUniverse(universe: Universe): BookSimple[] {
        const propios = universe.Libros || [];
        const deSagas = universe.Sagas?.flatMap(s => s.Libros || []) ?? [];
        return [...propios, ...deSagas];
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    private reviewPayloadValue(): string | null {
        const review = this.selectedCollectionReview.trim();
        return review ? review : null;
    }

    private hasReviewChanged(): boolean {
        return this.selectedCollectionReview.trim() !== this.selectedCollectionOriginalReview.trim();
    }
}
