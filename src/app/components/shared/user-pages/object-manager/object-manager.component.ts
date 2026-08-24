import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { Author } from '../../../../interfaces/author';
import { Antology } from '../../../../interfaces/antology';
import { BookSimple } from '../../../../interfaces/book';
import { NewBook } from '../../../../interfaces/creation/newBook';
import { NewSaga } from '../../../../interfaces/creation/newSaga';
import { ReadingStatusId, ReadStatus } from '../../../../interfaces/read-status';
import { Saga } from '../../../../interfaces/saga';
import { Universe, UniverseWrite } from '../../../../interfaces/universe';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { AntologyService } from '../../../../services/entities/antology.service';
import { AuthorService } from '../../../../services/entities/author.service';
import { BookService } from '../../../../services/entities/book.service';
import { SagaService } from '../../../../services/entities/saga.service';
import { UniverseService } from '../../../../services/entities/universe.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { environment } from '../../../../../environment/environment';
import { SessionService } from '../../../../services/auth/session.service';
import { getLatestStatusName, getStatusClass, readingStatusOptions } from '../../../../shared/reading-status';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { CatalogEntityType, CatalogItem, CatalogOption, CatalogOwnCollection, CatalogPublicDetail, CatalogPublicReview, CatalogPublicStats, CatalogRequestCreate, GoogleBooksIsbnMetadata } from '../../../../interfaces/catalog';
import { CollectionService } from '../../../../services/entities/collection.service';
import { CatalogRequestService } from '../../../../services/entities/catalog-request.service';
import { CollectionStateModalComponent } from '../../common/collection-state-modal/collection-state-modal.component';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { ManagerEntityCardComponent } from './manager-entity-card.component';
import { ManagerConfig, ManagerKind, ManagerRow, ManagerSortDirection, ManagerSortKey, ManagerViewState } from './object-manager.models';
import { ManagerViewStateService } from '../../../../shared/manager-view-state.service';

interface GoogleAuthorSuggestion {
    name: string;
    selected: boolean;
}

interface QuickAuthorRow {
    Nombre: string;
    IdiomaId: number | null;
    LugarOrigenNombre: string;
    error?: string;
}

@Component({
    standalone: true,
    selector: 'app-object-manager',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatMenuModule,
        MatSelectModule,
        MatTooltipModule,
        CollectionStateModalComponent,
        ManagerEntityCardComponent,
        CoverCachePipe,
        NgxDropzoneModule,
        SnackbarModule
    ],
    templateUrl: './object-manager.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./object-manager.component.sass', '../catalog/catalog.component.sass']
})
export class ObjectManagerComponent implements OnInit, OnDestroy, AfterViewChecked {
    readonly configs: Record<ManagerKind, ManagerConfig> = {
        authors: {
            kind: 'authors',
            title: 'Mis autores',
            subtitle: 'Gestiona tus autores y añade nuevos cuando lo necesites.',
            singular: 'autor',
            plural: 'autores',
            icon: 'groups',
            addLabel: 'Añadir autor',
            saveLabel: 'Guardar autor'
        },
        universes: {
            kind: 'universes',
            title: 'Mis universos',
            subtitle: 'Mantén los universos de tu biblioteca y sus autores asociados.',
            singular: 'universo',
            plural: 'universos',
            icon: 'public',
            addLabel: 'Añadir universo',
            saveLabel: 'Guardar universo'
        },
        sagas: {
            kind: 'sagas',
            title: 'Mis sagas',
            subtitle: 'Agrupa historias por saga y conserva su universo de referencia.',
            singular: 'saga',
            plural: 'sagas',
            icon: 'bookmark',
            addLabel: 'Añadir saga',
            saveLabel: 'Guardar saga'
        },
        anthologies: {
            kind: 'anthologies',
            title: 'Mis antologías',
            subtitle: 'Gestiona antologías, portadas, estado de lectura y ubicación narrativa.',
            singular: 'antología',
            plural: 'antologías',
            icon: 'collections_bookmark',
            addLabel: 'Añadir antología',
            saveLabel: 'Guardar antología'
        },
        books: {
            kind: 'books',
            title: 'Mis libros',
            subtitle: 'Añade o modifica libros sin salir del listado de mantenimiento.',
            singular: 'libro',
            plural: 'libros',
            icon: 'auto_stories',
            addLabel: 'Añadir libro',
            saveLabel: 'Guardar libro'
        }
    };

    readonly emptySaga: Saga = {
        Id: 0,
        Nombre: 'Sin saga',
        Subtitulo: null,
        Autores: [],
        Libros: [],
        Antologias: []
    };

    readonly statuses: ReadStatus[] = readingStatusOptions.map(status => ({
        Id: status.Id,
        EstadoId: status.Id,
        Nombre: status.Nombre,
        Fecha: ''
    }));
    readonly statusOptions = readingStatusOptions;

    kind: ManagerKind = 'authors';
    config = this.configs.authors;
    selectedRow: ManagerRow | null = null;
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
    files: File[] = [];
    coverPreviewUrl = '';
    isSaving = false;
    imgUrl = environment.getImgUrl;
    isLoadingPublicDetail = false;
    publicDetailLoadFailed = false;
    selectedDetailItem: CatalogItem | null = null;
    selectedPublicDetail: CatalogPublicDetail | null = null;
    publicReviewPage = 0;
    expandedOwnReview = false;
    expandedPublicReviews = new Set<string>();
    selectedCollectionItem: CatalogItem | null = null;
    selectedCollectionStatus: ReadingStatusId | null = null;
    selectedCollectionRating: number | null = null;
    selectedCollectionReview = '';
    excludeCollectionActivity = false;
    isSavingCollection = false;
    isLoadingGoogleBooks = false;
    googleAuthorSuggestions: GoogleAuthorSuggestion[] = [];
    isQuickAuthorModalOpen = false;
    isSavingQuickAuthors = false;
    quickAuthorRows: QuickAuthorRow[] = [];
    private selectedCollectionOriginalReview = '';
    private pendingScrollRestore: number | null = null;
    private indexScrollTop = 0;
    private navigatingEditor = false;

    @ViewChild('managerListScroll') managerListScroll?: ElementRef<HTMLElement>;
    @ViewChild('managerViewport') managerViewport?: ElementRef<HTMLElement>;

    authors: Author[] = [];
    universes: Universe[] = [];
    sagas: Saga[] = [];
    rows: ManagerRow[] = [];
    languageOptions: CatalogOption[] = [];
    originOptions: CatalogOption[] = [];
    styleOptions: CatalogOption[] = [];

    name = new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]);
    subtitle = new FormControl('', [Validators.maxLength(80)]);
    isbn = new FormControl('', [Validators.maxLength(20)]);
    pages = new FormControl<number | null>(null, [Validators.min(0)]);
    publicationYear = new FormControl('', [Validators.maxLength(4), Validators.pattern(/^\d{0,4}$/)]);
    synopsis = new FormControl('', [Validators.maxLength(2000)]);
    nativeLanguageId = new FormControl<number | null>(null);
    originPlace = new FormControl('', [Validators.maxLength(80)]);
    authorIds = new FormControl<number[]>([], [Validators.required]);
    universeId = new FormControl<number | null>(null, [Validators.required]);
    sagaId = new FormControl<number>(0, [Validators.required]);
    order = new FormControl<number>(-1, [Validators.required]);
    status = new FormControl<string>('Por comprar', [Validators.required]);
    styleIds = new FormControl<number[]>([]);

    form = this.formBuilder.group({
        name: this.name,
        subtitle: this.subtitle,
        isbn: this.isbn,
        pages: this.pages,
        publicationYear: this.publicationYear,
        synopsis: this.synopsis,
        nativeLanguageId: this.nativeLanguageId,
        originPlace: this.originPlace,
        authorIds: this.authorIds,
        universeId: this.universeId,
        sagaId: this.sagaId,
        order: this.order,
        status: this.status,
        styleIds: this.styleIds
    });

    private destroy$ = new Subject<void>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private formBuilder: FormBuilder,
        private authorService: AuthorService,
        private universeService: UniverseService,
        private sagaService: SagaService,
        private bookService: BookService,
        private antologyService: AntologyService,
        private authorStore: AuthorStoreService,
        private universeStore: UniverseStoreService,
        private snackBar: SnackbarModule,
        private loader: LoaderEmmitterService,
        private sessionSrv: SessionService,
        private catalogService: CatalogService,
        private collectionService: CollectionService,
        private catalogRequestService: CatalogRequestService,
        private managerViewState: ManagerViewStateService = new ManagerViewStateService()
    ) { }

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
                if (!this.selectedRow && this.needsUniverse() && !this.universeId.value)
                    this.universeId.setValue(this.defaultUniverseId());
                this.rebuildRows();
            });

        this.route.data
            .pipe(takeUntil(this.destroy$))
            .subscribe(data => {
                this.setKind((data['kind'] as ManagerKind) ?? 'authors');
                this.selectFromRoute();
            });

        this.route.params
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                if (this.route.snapshot.paramMap.has('id'))
                    this.selectFromRoute();
                else
                    this.resetForm();
            });

        this.universeId.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.ensureSelectedSagaBelongsToUniverse());

        forkJoin({
            languages: this.catalogService.getLanguages(),
            origins: this.catalogService.getOriginPlaces('', 1, 100),
            styles: this.catalogService.getStyles()
        }).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ languages, origins, styles }) => {
                    this.languageOptions = languages;
                    this.originOptions = origins.Items;
                    this.styleOptions = styles;
                },
                error: () => {
                    this.languageOptions = [];
                    this.originOptions = [];
                    this.styleOptions = [];
                }
            });
    }

    ngOnDestroy(): void {
        if (!this.isEditorRoute)
            this.persistViewState();
        this.resetCoverPreview();
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

    get isEditorRoute(): boolean {
        return this.route.snapshot.data['mode'] === 'create' || this.route.snapshot.paramMap.has('id');
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

    get filteredOriginOptions(): CatalogOption[] {
        const term = this.normalize(this.originPlace.value ?? '');
        return term
            ? this.originOptions.filter(origin => this.normalize(origin.Nombre).includes(term))
            : this.originOptions;
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

    get formTitle(): string {
        if (!this.canEditCatalog) {
            return this.selectedRow
                ? `Proponer cambios para ${this.config.singular}`
                : `Proponer nuevo ${this.config.singular}`;
        }

        return this.selectedRow
            ? `Modificar ${this.config.singular}`
            : this.config.addLabel;
    }

    get saveLabel(): string {
        if (!this.canEditCatalog)
            return 'Enviar petición';

        return this.selectedRow
            ? `Actualizar ${this.config.singular}`
            : this.config.saveLabel;
    }

    get saveIcon(): string {
        return this.canEditCatalog ? 'save' : 'send';
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

    get canSubmit(): boolean {
        if (this.isSaving || this.name.invalid)
            return false;
        if (this.kind === 'sagas' && this.subtitle.invalid)
            return false;
        if (this.isReadableKind() && (this.isbn.invalid || this.pages.invalid || this.publicationYear.invalid || this.synopsis.invalid))
            return false;
        if (this.kind === 'authors' && this.originPlace.invalid)
            return false;
        if (this.needsAuthors() && (!this.authorIds.value || this.authorIds.value.length === 0))
            return false;
        if (this.needsUniverse() && !this.universeId.value)
            return false;
        if (this.canEditCatalog && this.needsCover() && !this.selectedRow && this.files.length === 0)
            return false;
        return true;
    }

    get canSubmitCollection(): boolean {
        return !!this.selectedCollectionItem && this.selectedCollectionStatus !== null && !this.isSavingCollection;
    }

    get collectionModalTitle(): string {
        return this.selectedCollectionItem
            ? `Actualizando ${this.selectedCollectionItem.Nombre}`
            : 'Actualizando lectura';
    }

    get canEditCatalog(): boolean {
        return this.sessionSrv.canModerateCatalog;
    }

    showRowActions(row: ManagerRow): boolean {
        return this.isReadableKind() || !this.isSystemRow(row);
    }

    isReadableKind(): boolean {
        return this.kind === 'books' || this.kind === 'anthologies';
    }

    needsAuthors(): boolean {
        return this.kind !== 'authors';
    }

    needsUniverse(): boolean {
        return this.kind === 'sagas' || this.kind === 'books' || this.kind === 'anthologies';
    }

    needsSaga(): boolean {
        return this.kind === 'books' || this.kind === 'anthologies';
    }

    needsStatus(): boolean {
        return false;
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

    needsCover(): boolean {
        return this.kind === 'books' || this.kind === 'anthologies';
    }

    selectRow(row: ManagerRow, updateRoute = true): void {
        if (this.isSystemRow(row))
            return;

        if (updateRoute) {
            this.persistViewState();
            this.navigatingEditor = true;
        }

        this.selectedRow = row;
        this.files = [];
        this.resetCoverPreview();
        this.name.setValue(row.name);
        this.subtitle.setValue(row.subtitle ?? '');
        this.isbn.setValue(this.isReadableKind() ? ((row.raw as BookSimple | Antology).ISBN ?? '') : '');
        this.pages.setValue(this.isReadableKind() ? ((row.raw as BookSimple | Antology).Paginas ?? null) : null);
        this.publicationYear.setValue(this.isReadableKind() ? this.publicationYearValue((row.raw as BookSimple | Antology).FechaPublicacion) : '');
        this.synopsis.setValue(this.isReadableKind() ? ((row.raw as BookSimple | Antology).Sinopsis ?? '') : '');
        const author = row.raw as Author;
        this.nativeLanguageId.setValue(this.kind === 'authors' ? this.authorLanguageId(author) : null);
        this.originPlace.setValue(this.kind === 'authors' ? this.authorOriginLabel(author) : '');
        this.authorIds.setValue(row.authors.map(author => author.Id));
        this.universeId.setValue(row.universe?.Id ?? null);
        this.sagaId.setValue(row.saga?.Id ?? 0);
        this.order.setValue(row.order ?? -1);
        this.status.setValue(row.status ?? 'Por comprar');
        this.styleIds.setValue(this.isReadableKind() ? this.readableStyleIds(row.raw as BookSimple | Antology) : []);
        this.googleAuthorSuggestions = [];
        this.closeQuickAuthorModal();

        if (updateRoute)
            void this.router.navigate([...this.managerBaseRoute(), row.id]).then(() => {
                if (this.managerViewport)
                    this.managerViewport.nativeElement.scrollTop = 0;
                this.navigatingEditor = false;
            });
    }

    openPublicDetail(row: ManagerRow, event?: MouseEvent): void {
        event?.stopPropagation();
        if (!this.isReadableKind())
            return;

        const item = this.toCatalogItem(row);
        this.selectedDetailItem = item;
        this.selectedPublicDetail = null;
        this.resetReviewDisplayState();
        this.publicDetailLoadFailed = false;
        this.isLoadingPublicDetail = true;

        const request = item.Tipo === 'libro'
            ? this.catalogService.getBookPublicDetail(item.Id)
            : this.catalogService.getAnthologyPublicDetail(item.Id);

        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: detail => {
                this.selectedPublicDetail = detail;
                this.applyOwnCollectionFromDetail(detail);
                this.isLoadingPublicDetail = false;
            },
            error: () => {
                this.publicDetailLoadFailed = true;
                this.isLoadingPublicDetail = false;
            }
        });
    }

    closePublicDetailModal(): void {
        this.selectedDetailItem = null;
        this.selectedPublicDetail = null;
        this.closeCollectionModal();
        this.resetReviewDisplayState();
        this.publicDetailLoadFailed = false;
        this.isLoadingPublicDetail = false;
    }

    openCollectionModal(item: CatalogItem, event?: MouseEvent): void {
        event?.stopPropagation();
        this.selectedCollectionItem = item;
        this.selectedCollectionStatus = item.Estados?.[item.Estados.length - 1]?.EstadoId ?? null;
        this.selectedCollectionRating = item.Puntuacion ?? null;
        this.selectedCollectionReview = item.Resena ?? '';
        this.selectedCollectionOriginalReview = this.selectedCollectionReview;
        this.excludeCollectionActivity = false;
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

    setCollectionStatus(statusId: number): void {
        this.selectedCollectionStatus = statusId as ReadingStatusId;
    }

    collectionStatusIcon(statusId: number): string {
        return readingStatusOptions.find(status => status.Id === statusId)?.icon ?? 'flag';
    }

    saveToCollection(): void {
        if (!this.selectedCollectionItem || this.selectedCollectionStatus === null) {
            this.snackBar.openSnackBar('Selecciona un estado de lectura', 'errorBar');
            return;
        }

        this.isSavingCollection = true;
        const item = this.selectedCollectionItem;
        const statusRequest = item.Tipo === 'libro'
            ? this.collectionService.updateBookStatus(item.Id, { EstadoId: this.selectedCollectionStatus, ...(this.excludeCollectionActivity ? { PublicarActividad: false } : {}) })
            : this.collectionService.updateAnthologyStatus(item.Id, { EstadoId: this.selectedCollectionStatus, ...(this.excludeCollectionActivity ? { PublicarActividad: false } : {}) });

        const requests: Observable<unknown>[] = [statusRequest];
        if (this.selectedCollectionRating !== null) {
            const ratingRequest = item.Tipo === 'libro'
                ? this.collectionService.updateBookRating(item.Id, {
                    Puntuacion: this.selectedCollectionRating,
                    Resena: this.reviewPayloadValue(),
                    ...(this.excludeCollectionActivity ? { PublicarActividad: false } : {})
                })
                : this.collectionService.updateAnthologyRating(item.Id, {
                    Puntuacion: this.selectedCollectionRating,
                    Resena: this.reviewPayloadValue(),
                    ...(this.excludeCollectionActivity ? { PublicarActividad: false } : {})
                });
            requests.push(ratingRequest);
        }

        forkJoin(requests).pipe(
            switchMap(() => this.collectionService.getUniverses()),
            takeUntil(this.destroy$)
        ).subscribe({
            next: universes => {
                this.universeStore.setUniverses(universes);
                this.snackBar.openSnackBar('Biblioteca personal actualizada', 'successBar');
                this.syncSelectedDetailFromCollectionModal();
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

    openReadingFromDetail(): void {
        if (!this.selectedDetailItem || this.selectedDetailItem.Tipo !== 'libro' || !this.isDetailInCollection())
            return;

        const bookId = this.selectedDetailItem.Id;
        this.closePublicDetailModal();
        this.loader.activateLoader('book');
        requestAnimationFrame(() => void this.router.navigate(['/book', bookId]));
    }

    publicDetailTitle(): string {
        return this.selectedPublicDetail?.Nombre ?? this.selectedDetailItem?.Nombre ?? '';
    }

    publicDetailCoverName(): string | null {
        const cover = this.selectedPublicDetail?.Portada ?? this.selectedDetailItem?.Portada ?? null;
        return cover;
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

        return this.selectedDetailItem ? getLatestStatusName(this.selectedDetailItem.Estados) : '';
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
        return [1, 2, 3, 4, 5];
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

    clearForm(): void {
        if (!this.isEditorRoute)
            this.persistViewState();
        this.navigatingEditor = true;
        this.resetForm();
        void this.router.navigate([...this.managerBaseRoute(), 'new']).then(() => this.navigatingEditor = false);
    }

    private resetForm(): void {
        this.selectedRow = null;
        this.files = [];
        this.resetCoverPreview();
        this.googleAuthorSuggestions = [];
        this.closeQuickAuthorModal();
        this.form.reset({
            name: '',
            subtitle: '',
            isbn: '',
            pages: null,
            publicationYear: '',
            synopsis: '',
            nativeLanguageId: null,
            originPlace: '',
            authorIds: [],
            universeId: this.defaultUniverseId(),
            sagaId: 0,
            order: -1,
            status: 'Por comprar',
            styleIds: []
        });
    }

    save(): void {
        if (!this.canSubmit) {
            this.snackBar.openSnackBar('Revisa los campos obligatorios', 'errorBar');
            return;
        }

        this.isSaving = true;
        this.loader.activateLoader();

        const request = this.canEditCatalog
            ? this.persist()
            : this.persistCatalogRequest();

        request.subscribe({
            next: () => {
                const message = this.canEditCatalog
                    ? `${this.capitalize(this.config.singular)} guardado`
                    : 'Petición de catálogo enviada para revisión';
                this.snackBar.openSnackBar(message, 'successBar');
                this.resetForm();
                void this.router.navigate(this.managerBaseRoute(), { replaceUrl: true });
            },
            error: (errorData) => {
                const msg = getApiErrorMessage(errorData, `Error al guardar ${this.config.singular}`);
                this.snackBar.openSnackBar(msg, 'errorBar');
                this.finishSave();
            },
            complete: () => this.finishSave()
        });
    }

    onSelect(event: { addedFiles: File[] }): void {
        this.files = event.addedFiles.slice(0, 1);
        this.updateCoverPreview();
    }

    onRemove(): void {
        this.files = [];
        this.resetCoverPreview();
    }

    lookupGoogleBooksByIsbn(): void {
        const isbn = this.isbn.value?.trim();
        if (!this.isReadableKind() || !isbn) {
            this.snackBar.openSnackBar('Introduce un ISBN para buscar', 'errorBar');
            return;
        }

        this.isLoadingGoogleBooks = true;
        this.catalogService.getGoogleBooksByIsbn(isbn)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: metadata => {
                    this.applyGoogleBooksMetadata(metadata, isbn);
                    this.snackBar.openSnackBar('Datos de Google Books revisados', 'successBar');
                },
                error: errorData => {
                    const msg = errorData?.status === 404
                        ? 'No se encontraron datos para ese ISBN'
                        : getApiErrorMessage(errorData, 'Error al buscar el ISBN');
                    this.snackBar.openSnackBar(msg, 'errorBar');
                    this.isLoadingGoogleBooks = false;
                },
                complete: () => {
                    this.isLoadingGoogleBooks = false;
                }
            });
    }

    toggleGoogleAuthorSuggestion(suggestion: GoogleAuthorSuggestion, selected: boolean): void {
        suggestion.selected = selected;
    }

    selectedGoogleAuthorNames(): string[] {
        return this.googleAuthorSuggestions
            .filter(suggestion => suggestion.selected)
            .map(suggestion => suggestion.name);
    }

    openQuickAuthorModal(): void {
        if (!this.canEditCatalog)
            return;

        const names = this.selectedGoogleAuthorNames();
        if (!names.length)
            return;

        this.quickAuthorRows = names.map(name => ({
            Nombre: name,
            IdiomaId: null,
            LugarOrigenNombre: ''
        }));
        this.isQuickAuthorModalOpen = true;
    }

    closeQuickAuthorModal(): void {
        this.isQuickAuthorModalOpen = false;
        this.isSavingQuickAuthors = false;
        this.quickAuthorRows = [];
    }

    quickFilteredOriginOptions(value: string): CatalogOption[] {
        const term = this.normalize(value ?? '');
        return term
            ? this.originOptions.filter(origin => this.normalize(origin.Nombre).includes(term))
            : this.originOptions;
    }

    canSaveQuickAuthors(): boolean {
        return this.canEditCatalog && !this.isSavingQuickAuthors && this.quickAuthorRows.some(row => row.Nombre.trim().length >= 3);
    }

    saveQuickAuthors(): void {
        if (!this.canSaveQuickAuthors())
            return;

        this.isSavingQuickAuthors = true;
        this.quickAuthorRows.forEach(row => row.error = undefined);
        const rowsToSave = this.quickAuthorRows.filter(row => row.Nombre.trim().length >= 3);
        const requests = rowsToSave.map(row => this.authorService.addAuthor({
            Id: 0,
            Nombre: row.Nombre.trim(),
            IdiomaId: row.IdiomaId,
            LugarOrigenNombre: row.LugarOrigenNombre.trim() || null
        }).pipe(
            map(author => ({ row, author, error: null })),
            catchError(error => of({ row, author: null, error }))
        ));

        forkJoin(requests)
            .pipe(takeUntil(this.destroy$))
            .subscribe(results => {
                const createdAuthors = results
                    .map(result => result.author)
                    .filter((author): author is Author => !!author);

                results
                    .filter(result => result.error)
                    .forEach(result => {
                        result.row.error = getApiErrorMessage(result.error, 'No se pudo crear este autor');
                    });

                if (createdAuthors.length)
                    this.selectCreatedAuthors(createdAuthors);

                const hasErrors = results.some(result => !!result.error);
                if (createdAuthors.length) {
                    this.catalogService.getAuthors()
                        .pipe(takeUntil(this.destroy$))
                        .subscribe({
                            next: authors => {
                                this.authorStore.setAuthors(authors);
                                this.selectCreatedAuthorsFromCatalog(createdAuthors, authors);
                                this.removeCreatedGoogleSuggestions(createdAuthors);
                                if (!hasErrors) {
                                    this.snackBar.openSnackBar('Autores creados y seleccionados', 'successBar');
                                    this.closeQuickAuthorModal();
                                } else {
                                    this.snackBar.openSnackBar('Algunos autores no se pudieron crear', 'errorBar');
                                    this.isSavingQuickAuthors = false;
                                }
                            },
                            error: () => {
                                if (!hasErrors) {
                                    this.snackBar.openSnackBar('Autores creados, pero no se pudo refrescar el catálogo', 'errorBar');
                                    this.closeQuickAuthorModal();
                                } else {
                                    this.snackBar.openSnackBar('Algunos autores no se pudieron crear', 'errorBar');
                                    this.isSavingQuickAuthors = false;
                                }
                            }
                        });
                    return;
                }

                this.snackBar.openSnackBar('No se pudo crear ningún autor', 'errorBar');
                this.isSavingQuickAuthors = false;
            });
    }

    availableUniverses(): Universe[] {
        return this.universes;
    }

    editableUniverses(): Universe[] {
        return this.universes.filter(universe => universe.Nombre !== 'Sin universo');
    }

    availableSagas(): Saga[] {
        const selectedUniverseId = this.universeId.value;
        return [
            this.emptySaga,
            ...this.sagas.filter(saga => {
                if (saga.Nombre === 'Sin saga')
                    return false;
                if (!selectedUniverseId)
                    return true;
                return this.universeStore.getUniverseOfSaga(saga.Id)?.Id === selectedUniverseId;
            })
        ];
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

    handleCoverImageError(event: Event): void {
        (event.target as HTMLImageElement).src = 'assets/media/img/error.png';
    }

    onSearchChange(): void {
        this.resetPage();
        this.persistViewState();
    }

    onListScroll(event: Event): void {
        if (this.navigatingEditor || this.isExclusiveEditorRoute())
            return;
        this.indexScrollTop = (event.currentTarget as HTMLElement).scrollTop;
        this.managerViewState.update(this.kind, { scrollTop: this.indexScrollTop });
    }

    onViewportScroll(event: Event): void {
        if (this.navigatingEditor || this.isExclusiveEditorRoute())
            return;
        this.indexScrollTop = (event.currentTarget as HTMLElement).scrollTop;
        this.managerViewState.update(this.kind, { scrollTop: this.indexScrollTop });
    }

    returnToList(): void {
        const scrollTop = this.indexScrollTop || this.managerViewState.get(this.kind).scrollTop || 0;
        void this.router.navigate(this.managerBaseRoute()).then(() => {
            this.pendingScrollRestore = scrollTop;
            requestAnimationFrame(() => {
                if (this.managerViewport)
                    this.managerViewport.nativeElement.scrollTop = scrollTop;
                this.pendingScrollRestore = null;
                this.navigatingEditor = false;
            });
        });
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

    sortLabel(key: ManagerSortKey): string {
        const labels: Record<ManagerSortKey, string> = {
            alphabetical: 'Alfabético',
            author: 'Por autor',
            universe: 'Por universo',
            saga: 'Por saga',
            recent: 'Recientes'
        };
        return labels[key];
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

    private isInCollection(item: CatalogItem): boolean {
        return (item.Estados?.length ?? 0) > 0 ||
            item.Puntuacion !== null && item.Puntuacion !== undefined ||
            !!item.Resena;
    }

    private catalogOptionsLabel(options: CatalogOption[] | string[] | null | undefined): string {
        if (!options?.length)
            return '';

        return options
            .map(option => typeof option === 'string' ? option : option.Nombre)
            .filter(Boolean)
            .join(', ');
    }

    private toCatalogOptions(options: CatalogOption[] | string[] | null | undefined): CatalogOption[] | null {
        if (!options?.length)
            return null;

        return options.map((option, index) => typeof option === 'string'
            ? { Id: index, Nombre: option }
            : option);
    }

    private applyGoogleBooksMetadata(metadata: GoogleBooksIsbnMetadata, fallbackIsbn: string): void {
        if (!this.isbn.value?.trim())
            this.isbn.setValue(metadata.ISBN?.trim() || fallbackIsbn);
        if (!this.name.value?.trim() && metadata.Nombre?.trim())
            this.name.setValue(metadata.Nombre.trim().slice(0, 50));
        if (!this.publicationYear.value?.trim() && metadata.FechaPublicacion?.trim())
            this.publicationYear.setValue(this.publicationYearValue(metadata.FechaPublicacion));
        if (!this.synopsis.value?.trim() && metadata.Sinopsis?.trim())
            this.synopsis.setValue(metadata.Sinopsis.trim().slice(0, 2000));

        this.selectExistingAuthorsByName(metadata.Autores ?? []);
        this.selectExistingStylesByName(metadata.Estilos ?? []);
        this.googleAuthorSuggestions = this.missingAuthorSuggestions(metadata.Autores ?? []);
        this.applyGoogleBooksCover(metadata.Portada, metadata.ISBN ?? fallbackIsbn);
    }

    private selectExistingAuthorsByName(authorNames: string[]): void {
        const selected = new Set(this.authorIds.value ?? []);
        authorNames.forEach(name => {
            const match = this.authors.find(author => this.normalize(author.Nombre) === this.normalize(name));
            if (match)
                selected.add(match.Id);
        });
        this.authorIds.setValue([...selected]);
    }

    private selectExistingStylesByName(styleNames: string[]): void {
        const selected = new Set(this.styleIds.value ?? []);
        styleNames.forEach(name => {
            const match = this.styleOptions.find(style => this.normalize(style.Nombre) === this.normalize(name));
            if (match)
                selected.add(match.Id);
        });
        this.styleIds.setValue([...selected]);
    }

    private missingAuthorSuggestions(authorNames: string[]): GoogleAuthorSuggestion[] {
        const seen = new Set<string>();
        return authorNames
            .map(name => name.trim())
            .filter(Boolean)
            .filter(name => !this.authors.some(author => this.normalize(author.Nombre) === this.normalize(name)))
            .filter(name => {
                const key = this.normalize(name);
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            })
            .map(name => ({ name, selected: true }));
    }

    private selectCreatedAuthors(createdAuthors: Author[]): void {
        const selected = new Set(this.authorIds.value ?? []);
        createdAuthors.forEach(author => {
            if (author.Id)
                selected.add(author.Id);
        });
        this.authorIds.setValue([...selected]);
    }

    private selectCreatedAuthorsFromCatalog(createdAuthors: Author[], catalogAuthors: Author[]): void {
        const selected = new Set(this.authorIds.value ?? []);
        createdAuthors.forEach(createdAuthor => {
            const match = catalogAuthors.find(author => this.normalize(author.Nombre) === this.normalize(createdAuthor.Nombre));
            if (match)
                selected.add(match.Id);
        });
        this.authorIds.setValue([...selected]);
    }

    private removeCreatedGoogleSuggestions(createdAuthors: Author[]): void {
        const createdNames = new Set(createdAuthors.map(author => this.normalize(author.Nombre)));
        this.googleAuthorSuggestions = this.googleAuthorSuggestions
            .filter(suggestion => !createdNames.has(this.normalize(suggestion.name)));
    }

    private applyGoogleBooksCover(coverDataUrl: string | null | undefined, isbn: string): void {
        if (!coverDataUrl?.trim() || this.files.length > 0 || !!this.selectedRow?.cover)
            return;

        const file = this.dataUrlToFile(coverDataUrl, `google-books-${this.safeFileName(isbn)}.png`);
        if (!file)
            return;

        this.files = [file];
        this.updateCoverPreview();
    }

    private dataUrlToFile(dataUrl: string, fileName: string): File | null {
        const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
        if (!match)
            return null;

        const mime = match[1] || 'image/png';
        const binary = atob(match[2]);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++)
            bytes[index] = binary.charCodeAt(index);

        return new File([bytes], fileName, { type: mime });
    }

    private safeFileName(value: string): string {
        return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-') || 'cover';
    }

    private applyOwnCollectionFromDetail(detail: CatalogPublicDetail): void {
        if (!this.selectedDetailItem || !detail.MiColeccion)
            return;

        const ownStatuses = this.ownCollectionStatuses(detail.MiColeccion);
        this.selectedDetailItem = {
            ...this.selectedDetailItem,
            Estados: ownStatuses,
            Puntuacion: detail.MiColeccion.Puntuacion ?? detail.Puntuacion ?? this.selectedDetailItem.Puntuacion ?? null,
            Resena: detail.MiColeccion.Resena ?? detail.Resena ?? this.selectedDetailItem.Resena ?? null,
            ResenaOculta: detail.MiColeccion.ResenaOculta ?? false,
            PuedeAbrirNarrativa: detail.MiColeccion.PuedeAbrirNarrativa ?? detail.PuedeAbrirNarrativa ?? this.selectedDetailItem.PuedeAbrirNarrativa,
            NarrativaPersonalDisponible: detail.MiColeccion.NarrativaPersonalDisponible ?? detail.NarrativaPersonalDisponible ?? this.selectedDetailItem.NarrativaPersonalDisponible
        };
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

        const selectedStatus = readingStatusOptions.find(status => status.Id === this.selectedCollectionStatus);
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

    private setKind(kind: ManagerKind): void {
        this.kind = kind;
        this.config = this.configs[kind];
        this.resetForm();
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

    private isExclusiveEditorRoute(): boolean {
        return this.isEditorRoute && (typeof window === 'undefined' || window.matchMedia('(max-width: 1279px)').matches);
    }

    private selectFromRoute(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id)
            return;
        const row = this.rows.find(item => item.id === id);
        if (row)
            this.selectRow(row, false);
    }

    private managerBaseRoute(): string[] {
        return this.kind === 'books'
            ? ['/dashboard', 'books', 'manage']
            : ['/dashboard', this.kind];
    }

    private ensureSelectedSagaBelongsToUniverse(): void {
        if (!this.needsSaga() || !this.sagaId.value)
            return;
        const availableIds = this.availableSagas().map(saga => saga.Id);
        if (!availableIds.includes(this.sagaId.value))
            this.sagaId.setValue(0);
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
        this.selectFromRoute();
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

    private persist(): Observable<unknown> {
        if (this.kind === 'authors')
            return this.persistAuthor();
        if (this.kind === 'universes')
            return this.persistUniverse();
        if (this.kind === 'sagas')
            return this.persistSaga();
        if (this.kind === 'books')
            return this.persistBook();
        return this.persistAntology();
    }

    private persistCatalogRequest(): Observable<unknown> {
        const request: CatalogRequestCreate = {
            TipoEntidad: this.catalogEntityType(),
            Accion: this.selectedRow ? 'edicion' : 'alta',
            ...(this.selectedRow ? { EntidadId: this.selectedRow.id } : {}),
            Payload: this.catalogRequestPayload()
        };

        return this.catalogRequestService.create(request);
    }

    private catalogEntityType(): CatalogEntityType {
        const types: Record<ManagerKind, CatalogEntityType> = {
            authors: 'autor',
            universes: 'universo',
            sagas: 'saga',
            books: 'libro',
            anthologies: 'antologia'
        };
        return types[this.kind];
    }

    private catalogRequestPayload(): Record<string, unknown> {
        if (this.kind === 'authors') {
            return {
                Nombre: this.name.value ?? '',
                IdiomaId: this.nativeLanguageId.value ?? null,
                LugarOrigenNombre: this.originPlace.value?.trim() || null
            };
        }

        if (this.kind === 'universes') {
            return {
                Nombre: this.name.value ?? '',
                Autores: this.authorIds.value ?? []
            };
        }

        if (this.kind === 'sagas') {
            return {
                Nombre: this.name.value ?? '',
                Subtitulo: this.subtitle.value?.trim() || null,
                Autores: this.authorIds.value ?? [],
                UniversoId: this.universeId.value
            };
        }

        const sagaId = this.sagaId.value || null;
        return {
            Nombre: this.name.value ?? '',
            ISBN: this.isbn.value?.trim() || null,
            Paginas: this.pages.value ?? null,
            Sinopsis: this.synopsis.value?.trim() || null,
            FechaPublicacion: this.publicationYear.value?.trim() || null,
            Orden: this.order.value ?? -1,
            Autores: this.authorIds.value ?? [],
            Estilos: this.styleIds.value ?? [],
            ...(sagaId ? { SagaId: sagaId } : { UniversoId: this.universeId.value })
        };
    }

    private persistAuthor(): Observable<unknown> {
        const author: Author = {
            Id: this.selectedRow?.id ?? 0,
            Nombre: this.name.value ?? '',
            IdiomaId: this.nativeLanguageId.value ?? null,
            LugarOrigenNombre: this.originPlace.value?.trim() || null
        };
        const request = this.selectedRow
            ? this.authorService.updateAuthor(author)
            : this.authorService.addAuthor(author);

        return request.pipe(
            switchMap(() => forkJoin({
                authors: this.authorService.getAllAuthors(),
                universes: this.collectionService.getUniverses()
            })),
            switchMap(({ authors, universes }) => {
                this.authorStore.setAuthors(authors);
                this.universeStore.setUniverses(universes);
                return of(null);
            })
        );
    }

    private persistUniverse(): Observable<unknown> {
        const universe: UniverseWrite = {
            Id: this.selectedRow?.id,
            Nombre: this.name.value ?? '',
            Autores: (this.authorIds.value ?? []).map(Id => ({ Id }))
        };
        const request = this.selectedRow
            ? this.universeService.updateUniverse(universe)
            : this.universeService.addUniverse(universe);
        return request.pipe(
            switchMap(() => this.refreshCollectionUniverses())
        );
    }

    private persistSaga(): Observable<unknown> {
        const universe = this.getSelectedUniverse();
        if (!universe)
            return this.throwFormError('Selecciona un universo');

        const saga: NewSaga = {
            Id: this.selectedRow?.id ?? 0,
            Nombre: this.name.value ?? '',
            Subtitulo: this.subtitle.value?.trim() || null,
            Autores: this.getSelectedAuthors(),
            Universo: universe
        };
        const request = this.selectedRow
            ? this.sagaService.updateSaga(saga)
            : this.sagaService.addSaga(saga);
        return this.refreshUniversesAfter(request);
    }

    private persistBook(): Observable<unknown> {
        return this.persistReadableItem('book');
    }

    private persistAntology(): Observable<unknown> {
        return this.persistReadableItem('antology');
    }

    private persistReadableItem(type: 'book' | 'antology'): Observable<unknown> {
        const universe = this.getSelectedUniverse();
        if (!universe)
            return this.throwFormError('Selecciona un universo');

        const saga = this.getSelectedSaga();

        const payload: NewBook = {
            Id: this.selectedRow?.id ?? 0,
            Nombre: this.name.value ?? '',
            Autores: this.getSelectedAuthors(),
            Universo: universe,
            Saga: saga,
            Orden: this.order.value ?? -1,
            ISBN: this.isbn.value?.trim() || null,
            Sinopsis: this.synopsis.value?.trim() || null,
            Paginas: this.pages.value ?? null,
            FechaPublicacion: this.publicationYear.value?.trim() || null,
            Estilos: this.stylePayload()
        };

        const file = this.files[0];
        if (!this.selectedRow && !file)
            return this.throwFormError('Selecciona una portada');

        if (type === 'book') {
            const request = this.selectedRow
                ? this.bookService.updateBook(payload, file)
                : this.bookService.addBook(payload, file);
            return this.refreshUniversesAfter(request);
        }

        const request = this.selectedRow
            ? this.antologyService.updateAntology(payload, file)
            : this.antologyService.addAntology(payload, file);
        return this.refreshUniversesAfter(request);
    }

    private refreshUniversesAfter(request: Observable<unknown>): Observable<unknown> {
        return request.pipe(
            switchMap(() => this.refreshCollectionUniverses())
        );
    }

    private refreshCollectionUniverses(): Observable<unknown> {
        return this.collectionService.getUniverses().pipe(
            switchMap(collectionUniverses => {
                this.universeStore.setUniverses(collectionUniverses);
                return of(null);
            })
        );
    }

    private getSelectedAuthors(): Author[] {
        const ids = this.authorIds.value ?? [];
        return this.authors.filter(author => ids.includes(author.Id));
    }

    private getSelectedUniverse(): Universe | undefined {
        return this.universes.find(universe => universe.Id === this.universeId.value);
    }

    private defaultUniverseId(): number | null {
        return this.availableUniverses().find(universe => this.normalize(universe.Nombre) === 'sin universo')?.Id
            ?? this.availableUniverses()[0]?.Id
            ?? null;
    }

    private getSelectedSaga(): Saga {
        if (!this.sagaId.value)
            return this.emptySaga;
        return this.sagas.find(saga => saga.Id === this.sagaId.value) ?? this.emptySaga;
    }

    private getSelectedStatus(): ReadStatus | undefined {
        return this.statuses.find(status => status.Nombre === this.status.value);
    }

    private readableStyleIds(item: BookSimple | Antology): number[] {
        return (item.Estilos ?? []).map(style => style.Id).filter((id): id is number => typeof id === 'number');
    }

    private stylePayload(): Array<{ Id: number }> {
        return (this.styleIds.value ?? []).map(Id => ({ Id }));
    }

    private publicationYearValue(value: string | null | undefined): string {
        return value?.trim().slice(0, 4) ?? '';
    }

    private updateCoverPreview(): void {
        this.resetCoverPreview();
        if (this.files[0])
            this.coverPreviewUrl = URL.createObjectURL(this.files[0]);
    }

    private resetCoverPreview(): void {
        if (this.coverPreviewUrl)
            URL.revokeObjectURL(this.coverPreviewUrl);
        this.coverPreviewUrl = '';
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

    private authorLanguageId(author: Author): number | null {
        if (author.Idioma && typeof author.Idioma === 'object')
            return author.Idioma.Id;
        const languageName = this.authorLanguageLabel(author);
        return this.languageOptions.find(language => this.normalize(language.Nombre) === this.normalize(languageName))?.Id ?? null;
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

    private throwFormError(message: string): Observable<never> {
        return new Observable(observer => observer.error({ error: { message } }));
    }

    private finishSave(): void {
        this.isSaving = false;
        this.loader.deactivateLoader();
    }

    private normalize(value: string): string {
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    private capitalize(value: string): string {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
}
