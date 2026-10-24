import { WebManagerListViewComponent } from '../../../web/user/web-manager-list-view/web-manager-list-view.component';
import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Author } from '../../../../interfaces/author';
import { Antology } from '../../../../interfaces/antology';
import { BookSimple } from '../../../../interfaces/book';
import { ReadingStatusId, ReadStatus } from '../../../../interfaces/read-status';
import { Saga } from '../../../../interfaces/saga';
import { Universe } from '../../../../interfaces/universe';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { SessionService } from '../../../../services/auth/session.service';
import { getStatusClass, readingStatusOptions } from '../../../../shared/reading-status';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { CatalogItem, CatalogOption } from '../../../../interfaces/catalog';
import { CollectionService } from '../../../../services/entities/collection.service';
import { CollectionStateModalComponent } from '../../common/collection-state-modal/collection-state-modal.component';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { ManagerConfig, ManagerKind, ManagerMetric, ManagerRow, ManagerSortDirection, ManagerSortKey, ManagerViewState } from './object-manager.models';
import { ManagerViewStateService } from '../../../../shared/manager-view-state.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { LibrarySearchStateService } from '../../../../shared/library-search-state.service';
import { PublicDetailHost } from '../../common/public-detail/public-detail-host';
import { WoodPublicDetailModalComponent } from '../../common/public-detail/wood-public-detail-modal.component';

@Component({
    standalone: true,
    selector: 'app-object-manager',
    imports: [
        CommonModule,
        WebManagerListViewComponent,
        FormsModule,
        MatAutocompleteModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatMenuModule,
        MatTooltipModule,
        CollectionStateModalComponent,
        WoodPublicDetailModalComponent,
        CoverCachePipe,
        SnackbarModule
    ],
    templateUrl: './object-manager.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './object-manager.component.sass'
})
export class ObjectManagerComponent extends PublicDetailHost implements OnInit, OnDestroy, AfterViewChecked {
    /**
     * Tipo fijado por el Perfil, el único que monta el gestor: es un listado de
     * consulta y cada fila abre su ficha o la Biblioteca filtrada. Las altas y
     * ediciones viven en Administración.
     */
    @Input({ required: true }) embeddedKind!: ManagerKind;

    readonly configs: Record<ManagerKind, ManagerConfig> = {
        authors: {
            kind: 'authors',
            title: 'Mis autores',
            subtitle: 'Gestiona tus autores y añade nuevos cuando lo necesites.',
            singular: 'autor',
            plural: 'autores',
            icon: 'groups'
        },
        universes: {
            kind: 'universes',
            title: 'Mis universos',
            subtitle: 'Mantén los universos de tu biblioteca y sus autores asociados.',
            singular: 'universo',
            plural: 'universos',
            icon: 'public'
        },
        sagas: {
            kind: 'sagas',
            title: 'Mis sagas',
            subtitle: 'Agrupa historias por saga y conserva su universo de referencia.',
            singular: 'saga',
            plural: 'sagas',
            icon: 'bookmark'
        },
        anthologies: {
            kind: 'anthologies',
            title: 'Mis antologías',
            subtitle: 'Gestiona antologías, portadas, estado de lectura y ubicación narrativa.',
            singular: 'antología',
            plural: 'antologías',
            icon: 'collections_bookmark'
        },
        books: {
            kind: 'books',
            title: 'Mis libros',
            subtitle: 'Añade o modifica libros sin salir del listado de mantenimiento.',
            singular: 'libro',
            plural: 'libros',
            icon: 'auto_stories'
        }
    };

    readonly statuses: ReadStatus[] = readingStatusOptions.map(status => ({
        Id: status.Id,
        EstadoId: status.Id,
        Nombre: status.Nombre,
        Fecha: ''
    }));

    kind: ManagerKind = 'authors';
    config = this.configs.authors;
    search = '';
    activeSortKeys: ManagerSortKey[] = ['alphabetical'];
    sortDirection: ManagerSortDirection = 'asc';
    selectedStatusFilter = 'all';
    selectedAuthorFilter = 0;
    authorFilterText = '';
    statusFilterText = '';
    pageIndex = 0;
    pageSize = 6;
    pageSizeOptions = [6, 12, 24, 48];
    private pendingScrollRestore: number | null = null;
    private indexScrollTop = 0;

    @ViewChild('managerListScroll') managerListScroll?: ElementRef<HTMLElement>;
    @ViewChild('managerViewport') managerViewport?: ElementRef<HTMLElement>;

    authors: Author[] = [];
    universes: Universe[] = [];
    sagas: Saga[] = [];
    rows: ManagerRow[] = [];

    private destroy$ = new Subject<void>();

    constructor(
        private router: Router,
        private authorStore: AuthorStoreService,
        universeStore: UniverseStoreService,
        snackBar: SnackbarModule,
        private loader: LoaderEmmitterService,
        sessionSrv: SessionService,
        catalogSrv: CatalogService,
        collectionSrv: CollectionService,
        private managerViewState: ManagerViewStateService = new ManagerViewStateService(),
        private presentation: PresentationModeService = { snapshot: { isMobilePresentationActive: false } } as PresentationModeService,
        private librarySearchState: LibrarySearchStateService = new LibrarySearchStateService()
    ) {
        super(catalogSrv, collectionSrv, universeStore, sessionSrv, snackBar);
    }

    get isWebPresentation(): boolean { return this.presentation.snapshot.activeMode === 'web'; }

    ngOnInit(): void {
        this.authorStore.authors$
            .pipe(takeUntil(this.destroy$))
            .subscribe(authors => {
                this.authors = authors
                    .filter(author => author.Nombre !== 'Anónimo')
                    .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
                this.rebuildRows();
            });

        this.universeStore.universes$
            .pipe(takeUntil(this.destroy$))
            .subscribe(universes => {
                this.universes = universes;
                this.sagas = this.universeStore.getAllSagas();
                this.rebuildRows();
            });

        this.setKind(this.embeddedKind);
    }

    ngOnDestroy(): void {
        this.persistViewState();
        this.cancelPublicDetailRequest();
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngAfterViewChecked(): void {
        if (this.pendingScrollRestore === null || !this.managerListScroll)
            return;

        this.managerListScroll.nativeElement.scrollTop = this.pendingScrollRestore;
        if (this.managerViewport)
            this.managerViewport.nativeElement.scrollTop = this.pendingScrollRestore;
        this.pendingScrollRestore = null;
    }

    get filteredRows(): ManagerRow[] {
        const term = this.normalize(this.search);
        let rows = term
            ? this.rows.filter(row => [
                row.name,
                row.subtitle ?? '',
                row.authors.map(author => author.Nombre).join(' '),
                row.universe?.Nombre ?? '',
                row.saga?.Nombre ?? '',
                this.locationSummary(row),
                row.status ?? ''
            ].some(value => this.normalize(value).includes(term)))
            : [...this.rows];

        if (this.showStatusFilter() && this.selectedStatusFilter !== 'all')
            rows = rows.filter(row => row.status === this.selectedStatusFilter);

        if (this.showAuthorFilter() && this.selectedAuthorFilter > 0)
            rows = rows.filter(row => row.authors.some(author => author.Id === this.selectedAuthorFilter));

        return rows.sort((a, b) => this.compareRows(a, b));
    }

    get filteredAuthorOptions(): Author[] {
        const term = this.normalize(this.authorFilterText);
        return term
            ? this.authors.filter(author => this.normalize(author.Nombre).includes(term))
            : this.authors;
    }

    get filteredStatusOptions(): ReadStatus[] {
        const term = this.normalize(this.statusFilterText);
        return term
            ? this.statuses.filter(status => this.normalize(status.Nombre ?? '').includes(term))
            : this.statuses;
    }

    get paginatedRows(): ManagerRow[] {
        const start = this.pageIndex * this.pageSize;
        return this.filteredRows.slice(start, start + this.pageSize);
    }

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
    }

    get pageNumbers(): number[] {
        const visiblePages = 7;
        if (this.totalPages <= visiblePages)
            return Array.from({ length: this.totalPages }, (_, index) => index);
        const half = Math.floor(visiblePages / 2);
        const start = Math.min(Math.max(this.pageIndex - half, 0), this.totalPages - visiblePages);
        return Array.from({ length: visiblePages }, (_, index) => start + index);
    }

    get firstVisibleItem(): number {
        if (this.filteredRows.length === 0)
            return 0;
        return this.pageIndex * this.pageSize + 1;
    }

    get lastVisibleItem(): number {
        return Math.min((this.pageIndex + 1) * this.pageSize, this.filteredRows.length);
    }

    get authorColumnLabel(): string {
        return this.kind === 'authors' ? 'Idioma nativo' : 'Autores';
    }

    get locationColumnLabel(): string {
        if (this.kind === 'authors')
            return 'Origen';
        if (this.kind === 'universes')
            return 'Sagas';
        return 'Ubicación';
    }

    // Cada gestor solo resume magnitudes distintas de la que ya lista.
    get metrics(): ManagerMetric[] {
        const primary: ManagerMetric = { icon: this.config.icon, value: this.rows.length, label: this.config.plural };
        const books: ManagerMetric = { icon: 'auto_stories', value: this.totalBooks, label: 'libros asociados' };
        const universes: ManagerMetric = { icon: 'public', value: this.totalUniverses, label: 'universos' };
        const anthologies: ManagerMetric = { icon: 'collections_bookmark', value: this.totalAnthologies, label: 'antologías' };
        switch (this.kind) {
            case 'universes':
                return [primary, books, { icon: 'bookmark', value: this.totalSagas, label: 'sagas' }, anthologies];
            case 'anthologies':
                return [primary, { icon: 'auto_stories', value: this.totalBooks, label: 'secciones' }, universes];
            case 'books':
                return [primary, universes];
            default:
                return [primary, books, universes, anthologies];
        }
    }

    get totalSagas(): number {
        return this.rows.reduce((total, row) => total + row.sagasCount, 0);
    }

    get totalBooks(): number {
        if (this.kind === 'authors')
            return this.universeStore.getAllBooks().filter(book => this.hasAnyRowAuthor(book.Autores)).length;
        return this.rows.reduce((total, row) => total + row.booksCount, 0);
    }

    get totalUniverses(): number {
        if (this.kind === 'authors')
            return this.getAuthorAssociatedUniverseIds().size;
        return this.kind === 'universes'
            ? this.rows.length
            : new Set(this.rows.map(row => row.universe?.Id).filter(Boolean)).size;
    }

    get totalAnthologies(): number {
        if (this.kind === 'authors')
            return this.universeStore.getAllAnthologies().filter(antology => this.hasAnyRowAuthor(antology.Autores)).length;
        return this.rows.reduce((total, row) => total + row.anthologiesCount, 0);
    }

    isReadableKind(): boolean {
        return this.kind === 'books' || this.kind === 'anthologies';
    }

    showStatusColumn(): boolean {
        return this.kind === 'books' || this.kind === 'anthologies';
    }

    showObjectsColumn(): boolean {
        return this.kind === 'authors' || this.kind === 'universes' || this.kind === 'sagas';
    }

    showStatusFilter(): boolean {
        return this.kind === 'books' || this.kind === 'anthologies';
    }

    showAuthorFilter(): boolean {
        return this.kind === 'universes' || this.kind === 'sagas' || this.kind === 'books' || this.kind === 'anthologies';
    }

    /** Acción principal de una fila incrustada en el Perfil. */
    openEmbeddedRow(row: ManagerRow): void {
        if (this.isReadableKind()) {
            this.openItem(this.toCatalogItem(row));
            return;
        }
        const scope = this.kind === 'authors' ? 'author' : this.kind === 'universes' ? 'universe' : 'saga';
        this.librarySearchState.clear();
        this.librarySearchState.addTextFilter(scope, row.name);
        void this.router.navigate(['/dashboard', 'books']);
    }

    /** En el gestor, la ficha se cierra también con el editor de estado abierto encima. */
    override closePublicDetailModal(): void {
        super.closePublicDetailModal();
        this.closeCollectionModal();
    }

    openReadingFromDetail(): void {
        if (!this.selectedDetailItem || this.selectedDetailItem.Tipo !== 'libro' || !this.isDetailInCollection())
            return;

        const bookId = this.selectedDetailItem.Id;
        this.closePublicDetailModal();
        this.loader.activateLoader('book');
        requestAnimationFrame(() => void this.router.navigate(['/book', bookId]));
    }

    editableUniverses(): Universe[] {
        return this.universes.filter(universe => universe.Nombre !== 'Sin universo');
    }

    getLatestStatus(row: ManagerRow): string {
        return row.status ?? 'Sin estado';
    }

    statusClass(row: ManagerRow): string {
        return getStatusClass(this.getLatestStatus(row));
    }

    locationSummary(row: ManagerRow): string {
        if (this.kind === 'authors')
            return this.authorOriginLabel(row.raw as Author) || 'Sin origen';
        if (this.kind === 'universes')
            return this.universeSagaSummary(row.raw as Universe);
        if (!row.universe)
            return 'Sin universo';
        if (row.saga && row.saga.Id > 0)
            return `${row.universe.Nombre} / ${this.sagaDisplayName(row.saga)}`;
        return row.universe.Nombre;
    }

    orderSummary(row: ManagerRow): string | null {
        if (!this.isReadableKind() || row.order === undefined || row.order < 0 || !row.saga || row.saga.Id <= 0)
            return null;

        return `${row.order}º en ${row.saga.Nombre}`;
    }

    sagaDisplayName(saga: Saga): string {
        return saga.Subtitulo ? `${saga.Nombre} - ${saga.Subtitulo}` : saga.Nombre;
    }

    authorSummary(row: ManagerRow): string {
        if (this.kind === 'authors')
            return this.authorLanguageSummary(row.raw as Author);
        if (!row.authors.length)
            return 'Sin autor';
        const visibleAuthors = row.authors.slice(0, 2).map(author => author.Nombre).join(', ');
        return row.authors.length > 2
            ? `${visibleAuthors} +${row.authors.length - 2}`
            : visibleAuthors;
    }

    isSystemRow(row: ManagerRow): boolean {
        return row.name === 'Anónimo' || row.name === 'Sin universo' || row.name === 'Sin saga';
    }

    objectsSummary(row: ManagerRow): string {
        if (this.kind === 'universes') {
            return this.joinObjectCounts([
                { count: row.booksCount, singular: 'libro', plural: 'libros' },
                { count: row.sagasCount, singular: 'saga', plural: 'sagas' },
                { count: row.anthologiesCount, singular: 'antología', plural: 'antologías' }
            ]);
        }

        return this.joinObjectCounts([
            { count: row.booksCount, singular: 'libro', plural: 'libros' },
            { count: row.universesCount, singular: 'universo', plural: 'universos' },
            { count: row.sagasCount, singular: 'saga', plural: 'sagas' },
            { count: row.anthologiesCount, singular: 'antología', plural: 'antologías' }
        ]);
    }

    authorLanguageSummary(author: Author): string {
        const languageName = this.authorLanguageLabel(author);
        if (!languageName)
            return 'Sin idioma';
        return `${this.languageFlag(author)} ${languageName}`;
    }

    onSearchChange(): void {
        this.resetPage();
        this.persistViewState();
    }

    onListScroll(event: Event): void {
        this.indexScrollTop = (event.currentTarget as HTMLElement).scrollTop;
        this.managerViewState.update(this.kind, { scrollTop: this.indexScrollTop });
    }

    onViewportScroll(event: Event): void {
        this.indexScrollTop = (event.currentTarget as HTMLElement).scrollTop;
        this.managerViewState.update(this.kind, { scrollTop: this.indexScrollTop });
    }

    resetPage(): void {
        this.pageIndex = 0;
    }

    toggleSortKey(key: ManagerSortKey): void {
        if (this.activeSortKeys.includes(key)) {
            if (this.activeSortKeys.length === 1)
                return;
            this.activeSortKeys = this.activeSortKeys.filter(activeKey => activeKey !== key);
        } else {
            this.activeSortKeys = [...this.activeSortKeys, key];
        }
        this.resetPage();
        this.persistViewState();
    }

    sortPriority(key: ManagerSortKey): number | null {
        const index = this.activeSortKeys.indexOf(key);
        return index === -1 ? null : index + 1;
    }

    setSortDirection(direction: ManagerSortDirection): void {
        this.sortDirection = direction;
        this.resetPage();
        this.persistViewState();
    }

    onAuthorFilterInput(value: string): void {
        this.authorFilterText = value;
        const exactAuthor = this.authors.find(author => this.normalize(author.Nombre) === this.normalize(value));
        this.selectedAuthorFilter = exactAuthor?.Id ?? 0;
        this.resetPage();
        this.persistViewState();
    }

    selectAuthorFilter(value: string): void {
        this.authorFilterText = value;
        const author = this.authors.find(item => item.Nombre === value);
        this.selectedAuthorFilter = author?.Id ?? 0;
        this.resetPage();
        this.persistViewState();
    }

    onStatusFilterInput(value: string): void {
        this.statusFilterText = value;
        const exactStatus = this.statuses.find(status => this.normalize(status.Nombre ?? '') === this.normalize(value));
        this.selectedStatusFilter = exactStatus?.Nombre ?? 'all';
        this.resetPage();
        this.persistViewState();
    }

    selectStatusFilter(value: string): void {
        this.statusFilterText = value;
        this.selectedStatusFilter = this.statuses.some(status => status.Nombre === value) ? value : 'all';
        this.resetPage();
        this.persistViewState();
    }

    goToPage(pageIndex: number): void {
        this.pageIndex = Math.min(Math.max(pageIndex, 0), this.totalPages - 1);
        this.persistViewState();
    }

    updatePageSize(size: number): void {
        this.pageSize = size;
        this.resetPage();
        this.persistViewState();
    }

    private toCatalogItem(row: ManagerRow): CatalogItem {
        const raw = row.raw as BookSimple | Antology;
        return {
            Tipo: this.kind === 'books' ? 'libro' : 'antologia',
            Id: row.id,
            Nombre: row.name,
            Portada: row.cover ?? null,
            ISBN: raw.ISBN ?? null,
            Ediciones: raw.Ediciones ?? [],
            Sinopsis: raw.Sinopsis ?? null,
            Paginas: raw.Paginas ?? null,
            FechaPublicacion: raw.FechaPublicacion ?? null,
            Autores: row.authors,
            Estados: (raw.Estados ?? []).map(status => ({
                Id: status.Id,
                EstadoId: this.statusId(status),
                Estado: status.Estado ?? status.Nombre,
                Nombre: status.Nombre,
                Fecha: status.Fecha
            })),
            Puntuacion: raw.Puntuacion ?? null,
            Resena: raw.Resena ?? null,
            ResenaOculta: raw.ResenaOculta ?? false,
            IdiomasDisponibles: this.toCatalogOptions(raw.IdiomasDisponibles),
            Estilos: this.toCatalogOptions(raw.Estilos),
            Estilo: raw.Estilo ?? null,
            PuedeAbrirNarrativa: raw.PuedeAbrirNarrativa,
            NarrativaPersonalDisponible: raw.NarrativaPersonalDisponible
        };
    }

    private statusId(status: ReadStatus): ReadingStatusId {
        if (typeof status.EstadoId === 'number')
            return status.EstadoId;
        if (status.Id >= 0 && status.Id <= 5)
            return status.Id as ReadingStatusId;
        return readingStatusOptions.find(option => this.normalize(option.Nombre) === this.normalize(status.Nombre ?? ''))?.Id ?? 0;
    }

    private toCatalogOptions(options: CatalogOption[] | string[] | null | undefined): CatalogOption[] | null {
        if (!options?.length)
            return null;

        return options.map((option, index) => typeof option === 'string'
            ? { Id: index, Nombre: option }
            : option);
    }

    private setKind(kind: ManagerKind): void {
        this.kind = kind;
        this.config = this.configs[kind];
        this.restoreViewState();
        this.rebuildRows();
    }

    private restoreViewState(): void {
        const state = this.managerViewState.get(this.kind);
        this.search = state.search ?? '';
        this.activeSortKeys = state.activeSortKeys?.length ? state.activeSortKeys : ['alphabetical'];
        this.sortDirection = state.sortDirection ?? 'asc';
        this.selectedStatusFilter = state.selectedStatusFilter ?? 'all';
        this.selectedAuthorFilter = state.selectedAuthorFilter ?? 0;
        this.authorFilterText = state.authorFilterText ?? '';
        this.statusFilterText = state.statusFilterText ?? '';
        this.pageIndex = state.pageIndex ?? 0;
        this.pageSize = this.pageSizeOptions.includes(state.pageSize ?? 0) ? state.pageSize! : 6;
        this.pendingScrollRestore = state.scrollTop ?? 0;
        this.indexScrollTop = state.scrollTop ?? 0;
    }

    private persistViewState(): void {
        const state: ManagerViewState = {
            search: this.search,
            activeSortKeys: this.activeSortKeys,
            sortDirection: this.sortDirection,
            selectedStatusFilter: this.selectedStatusFilter,
            selectedAuthorFilter: this.selectedAuthorFilter,
            authorFilterText: this.authorFilterText,
            statusFilterText: this.statusFilterText,
            pageIndex: this.pageIndex,
            pageSize: this.pageSize,
            scrollTop: Math.max(
                this.indexScrollTop,
                this.managerListScroll?.nativeElement.scrollTop ?? 0,
                this.managerViewport?.nativeElement.scrollTop ?? 0,
                this.pendingScrollRestore ?? 0
            )
        };
        this.managerViewState.update(this.kind, state);
    }

    private rebuildRows(): void {
        if (!this.config)
            return;

        if (this.kind === 'authors') {
            this.rows = this.getCollectionAuthors().map(author => this.authorRow(author));
        } else if (this.kind === 'universes') {
            this.rows = this.editableUniverses().map(universe => this.universeRow(universe));
        } else if (this.kind === 'sagas') {
            this.rows = this.sagas
                .filter(saga => saga.Nombre !== 'Sin saga')
                .map(saga => this.sagaRow(saga));
        } else if (this.kind === 'books') {
            this.rows = this.universeStore.getAllBooks().map(book => this.bookRow(book));
        } else {
            this.rows = this.universeStore.getAllAnthologies().map(antology => this.antologyRow(antology));
        }
    }

    private getCollectionAuthors(): Author[] {
        const authorsById = new Map<number, Author>();
        const authorsWithoutId = new Map<string, Author>();
        const collectionItems = [
            ...this.universeStore.getAllBooks(),
            ...this.universeStore.getAllAnthologies()
        ];

        collectionItems
            .flatMap(item => item.Autores ?? [])
            .filter(author => author.Nombre !== 'Anónimo')
            .forEach(author => {
                const catalogAuthor = this.authors.find(item => this.isSameAuthor(item, author));
                const mergedAuthor = catalogAuthor ? { ...catalogAuthor, ...author } : author;
                if (mergedAuthor.Id) {
                    authorsById.set(mergedAuthor.Id, mergedAuthor);
                    return;
                }

                authorsWithoutId.set(this.normalize(mergedAuthor.Nombre), mergedAuthor);
            });

        return [
            ...Array.from(authorsById.values()),
            ...Array.from(authorsWithoutId.values())
        ].sort((a, b) => a.Nombre.localeCompare(b.Nombre, 'es', { sensitivity: 'base' }));
    }

    private authorRow(author: Author): ManagerRow {
        const books = this.universeStore.getAllBooks().filter(book => book.Autores?.some(itemAuthor => this.isSameAuthor(itemAuthor, author)));
        const anthologies = this.universeStore.getAllAnthologies().filter(antology => antology.Autores?.some(itemAuthor => this.isSameAuthor(itemAuthor, author)));
        const universes = this.getUniversesForAuthor(author.Id);

        return {
            id: author.Id,
            name: author.Nombre,
            authors: [author],
            booksCount: books.length,
            universesCount: universes.length,
            sagasCount: this.sagas.filter(saga => saga.Autores?.some(itemAuthor => this.isSameAuthor(itemAuthor, author))).length,
            anthologiesCount: anthologies.length,
            universe: universes[0],
            raw: author
        };
    }

    private universeRow(universe: Universe): ManagerRow {
        const sagaBooks = universe.Sagas?.flatMap(saga => saga.Libros ?? []) ?? [];
        const sagaAnthologies = universe.Sagas?.flatMap(saga => saga.Antologias ?? []) ?? [];
        return {
            id: universe.Id,
            name: universe.Nombre,
            authors: universe.Autores ?? [],
            universe,
            booksCount: (universe.Libros?.length ?? 0) + sagaBooks.length,
            universesCount: 1,
            sagasCount: universe.Sagas?.length ?? 0,
            anthologiesCount: (universe.Antologias?.length ?? 0) + sagaAnthologies.length,
            raw: universe
        };
    }

    private sagaRow(saga: Saga): ManagerRow {
        const universe = this.universeStore.getUniverseOfSaga(saga.Id) ?? undefined;
        return {
            id: saga.Id,
            name: saga.Nombre,
            subtitle: saga.Subtitulo ?? null,
            authors: saga.Autores ?? [],
            universe,
            booksCount: saga.Libros?.length ?? 0,
            universesCount: universe ? 1 : 0,
            sagasCount: 0,
            anthologiesCount: saga.Antologias?.length ?? 0,
            raw: saga
        };
    }

    private bookRow(book: BookSimple): ManagerRow {
        return {
            id: book.Id,
            name: book.Nombre,
            authors: book.Autores ?? [],
            universe: this.universeStore.getUniverseOfBook(book.Id) ?? undefined,
            saga: this.universeStore.getSagaOfBook(book.Id),
            status: book.Estados?.[book.Estados.length - 1]?.Nombre,
            order: book.Orden,
            cover: book.Portada,
            booksCount: 1,
            universesCount: this.universeStore.getUniverseOfBook(book.Id) ? 1 : 0,
            sagasCount: 0,
            anthologiesCount: 0,
            raw: book
        };
    }

    private antologyRow(antology: Antology): ManagerRow {
        return {
            id: antology.Id,
            name: antology.Nombre,
            authors: antology.Autores ?? [],
            universe: this.universeStore.getUniverseOfAntology(antology.Id) ?? undefined,
            saga: this.universeStore.getSagaOfAntology(antology.Id),
            status: antology.Estados?.[antology.Estados.length - 1]?.Nombre,
            order: antology.Orden,
            cover: antology.Portada,
            booksCount: antology.Secciones?.length ?? 0,
            universesCount: this.universeStore.getUniverseOfAntology(antology.Id) ? 1 : 0,
            sagasCount: 0,
            anthologiesCount: 1,
            raw: antology
        };
    }

    private compareRows(a: ManagerRow, b: ManagerRow): number {
        for (const key of this.activeSortKeys) {
            const comparison = this.compareRowsByKey(a, b, key);
            if (comparison !== 0)
                return this.sortDirection === 'asc' ? comparison : -comparison;
        }
        return a.name.localeCompare(b.name);
    }

    private compareRowsByKey(a: ManagerRow, b: ManagerRow, key: ManagerSortKey): number {
        if (key === 'alphabetical')
            return a.name.localeCompare(b.name);
        if (key === 'author')
            return this.firstAuthorName(a).localeCompare(this.firstAuthorName(b));
        if (key === 'universe')
            return (a.universe?.Nombre ?? '').localeCompare(b.universe?.Nombre ?? '');
        if (key === 'saga')
            return (a.saga?.Nombre ?? '').localeCompare(b.saga?.Nombre ?? '');
        return a.id - b.id;
    }

    private firstAuthorName(row: ManagerRow): string {
        return row.authors[0]?.Nombre ?? '';
    }

    private joinObjectCounts(items: Array<{ count: number; singular: string; plural: string }>): string {
        const parts = items
            .filter(item => item.count > 0)
            .map(item => `${item.count} ${item.count === 1 ? item.singular : item.plural}`);
        return parts.length ? parts.join(' · ') : 'Sin objetos';
    }

    private universeSagaSummary(universe: Universe): string {
        const sagas = (universe.Sagas ?? []).filter(saga => saga.Nombre !== 'Sin saga');
        if (!sagas.length)
            return 'Sin sagas';

        const visibleSagas = sagas.slice(0, 2).map(saga => this.sagaDisplayName(saga)).join(', ');
        return sagas.length > 2
            ? `${visibleSagas} +${sagas.length - 2}`
            : visibleSagas;
    }

    private authorLanguageLabel(author: Author): string {
        if (!author.Idioma)
            return '';
        return typeof author.Idioma === 'string' ? author.Idioma : author.Idioma.Nombre;
    }

    private authorOriginLabel(author: Author): string {
        if (!author.LugarOrigen)
            return '';
        return typeof author.LugarOrigen === 'string' ? author.LugarOrigen : author.LugarOrigen.Nombre;
    }

    private languageFlag(author: Author): string {
        const language = author.Idioma;
        const code = typeof language === 'object' ? language?.Codigo : null;
        const name = this.normalize(this.authorLanguageLabel(author));
        const countryCode = code === 'es' || name === 'espanol'
            ? 'ES'
            : code === 'en' || name === 'ingles'
                ? 'GB'
                : code?.length === 2
                    ? code.toUpperCase()
                    : '';
        return countryCode ? this.countryFlag(countryCode) : '🏳';
    }

    private countryFlag(countryCode: string): string {
        return countryCode
            .toUpperCase()
            .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
    }

    private hasAnyRowAuthor(authors: Author[] = []): boolean {
        const rowAuthors = this.rows.map(row => row.raw as Author);
        return authors.some(author => rowAuthors.some(rowAuthor => this.isSameAuthor(author, rowAuthor)));
    }

    private getAuthorAssociatedUniverseIds(): Set<number> {
        const rowAuthors = this.rows.map(row => row.raw as Author);
        const universeIds = new Set<number>();

        this.editableUniverses().forEach(universe => {
            const hasAssociatedAuthor =
                universe.Autores?.some(author => rowAuthors.some(rowAuthor => this.isSameAuthor(author, rowAuthor))) ||
                universe.Libros?.some(book => book.Autores?.some(author => rowAuthors.some(rowAuthor => this.isSameAuthor(author, rowAuthor)))) ||
                universe.Antologias?.some(antology => antology.Autores?.some(author => rowAuthors.some(rowAuthor => this.isSameAuthor(author, rowAuthor)))) ||
                universe.Sagas?.some(saga =>
                    saga.Autores?.some(author => rowAuthors.some(rowAuthor => this.isSameAuthor(author, rowAuthor))) ||
                    saga.Libros?.some(book => book.Autores?.some(author => rowAuthors.some(rowAuthor => this.isSameAuthor(author, rowAuthor)))) ||
                    saga.Antologias?.some(antology => antology.Autores?.some(author => rowAuthors.some(rowAuthor => this.isSameAuthor(author, rowAuthor))))
                );

            if (hasAssociatedAuthor)
                universeIds.add(universe.Id);
        });

        return universeIds;
    }

    private getUniversesForAuthor(authorId: number): Universe[] {
        const rowAuthor = this.authors.find(author => author.Id === authorId);
        if (!rowAuthor)
            return [];

        return this.editableUniverses().filter(universe =>
            universe.Autores?.some(author => this.isSameAuthor(author, rowAuthor)) ||
            universe.Libros?.some(book => book.Autores?.some(author => this.isSameAuthor(author, rowAuthor))) ||
            universe.Antologias?.some(antology => antology.Autores?.some(author => this.isSameAuthor(author, rowAuthor))) ||
            universe.Sagas?.some(saga =>
                saga.Autores?.some(author => this.isSameAuthor(author, rowAuthor)) ||
                saga.Libros?.some(book => book.Autores?.some(author => this.isSameAuthor(author, rowAuthor))) ||
                saga.Antologias?.some(antology => antology.Autores?.some(author => this.isSameAuthor(author, rowAuthor)))
            )
        );
    }

    private isSameAuthor(left: Author, right: Author): boolean {
        if (left.Id && right.Id && left.Id === right.Id)
            return true;
        return this.normalize(left.Nombre) === this.normalize(right.Nombre);
    }

    private normalize(value: string): string {
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

}
