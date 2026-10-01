import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { AbstractControl, FormControl, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { forkJoin, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Author } from '../../../../interfaces/author';
import { Book } from '../../../../interfaces/book';
import { CatalogAnthologyPublicDetail, CatalogItem, CatalogItemsPage, CatalogOption, Edition } from '../../../../interfaces/catalog';
import { NewBook } from '../../../../interfaces/creation/newBook';
import { Saga } from '../../../../interfaces/saga';
import { Universe } from '../../../../interfaces/universe';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { BookService } from '../../../../services/entities/book.service';
import { AntologyService } from '../../../../services/entities/antology.service';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { CatalogEditionAdminService } from '../../../../services/entities/catalog-edition-admin.service';
import { LibrarySyncService } from '../../../../services/stores/library-sync.service';
import { SessionService } from '../../../../services/auth/session.service';
import { markBackendFieldError } from '../../../../shared/backend-field-error';
import { optionalIsbnValidator } from '../../../../shared/isbn';

@Component({
    standalone: true,
    selector: 'app-all-books',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule,
        CoverCachePipe,
        SnackbarModule
    ],
    templateUrl: './all-books.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './all-books.component.sass'
})
export class AllBooksComponent implements OnInit, OnDestroy {
    private readonly librarySync = inject(LibrarySyncService);
    private readonly editionAdmin = inject(CatalogEditionAdminService);
    private readonly session = inject(SessionService);
    /** Libros y antologías comparten ficha y formulario; cambian listado, detalle y servicio de escritura. */
    @Input() kind: 'libro' | 'antologia' = 'libro';

    get isAnthology(): boolean { return this.kind === 'antologia'; }
    get noun(): string { return this.isAnthology ? 'antología' : 'libro'; }
    get canLinkEditions(): boolean { return this.session.isAdmin; }
    get nounPlural(): string { return this.isAnthology ? 'antologías' : 'libros'; }
    get newTitle(): string { return this.isAnthology ? 'Nueva antología' : 'Nuevo libro'; }

    readonly emptySaga: Saga = {
        Id: 0,
        Nombre: 'Sin saga',
        Subtitulo: null,
        Autores: [],
        Libros: [],
        Antologias: []
    };

    books: CatalogItem[] = [];
    total = 0;
    pageIndex = 0;
    pageSize = 10;
    pageSizeOptions = [10, 25, 50, 100];
    search = '';
    isLoading = false;
    isSaving = false;
    selectedBook: Book | null = null;
    selectedCatalogItem: CatalogItem | null = null;
    coverFile: File | null = null;
    coverPreviewUrl = '';
    editions: Edition[] = [];
    isLoadingEditions = false;
    isSavingEdition = false;
    selectedEditionId: number | null = null;
    editionCoverFile: File | null = null;
    editionCoverPreviewUrl = '';
    linkSearch = '';
    linkCandidates: Array<{ kind: 'libro' | 'antologia'; item: CatalogItem }> = [];
    linkSource: { kind: 'libro' | 'antologia'; item: CatalogItem } | null = null;
    linkEditions: Edition[] = [];
    linkEdition: Edition | null = null;
    isSearchingLink = false;
    isLoadingLinkEditions = false;
    isLinkConfirming = false;
    isLinkingEdition = false;
    private linkRequestVersion = 0;

    authors: Author[] = [];
    universes: Universe[] = [];
    sagas: Saga[] = [];
    styleOptions: CatalogOption[] = [];

    name = new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]);
    isbn = new FormControl('', [Validators.maxLength(20), optionalIsbnValidator]);
    pages = new FormControl<number | null>(null, [Validators.min(0)]);
    // Año, mes y año o fecha completa (docs/backend/api/ERRORES.md): «2016», «11/2016» o «22/11/2016».
    publicationDate = new FormControl('', [publicationDateValidator]);
    editionIsbn = new FormControl('', [Validators.maxLength(20), optionalIsbnValidator]);
    editionPublicationDate = new FormControl('', [publicationDateValidator]);
    authorIds = new FormControl<number[]>([], [Validators.required]);
    styleIds = new FormControl<number[]>([]);
    universeId = new FormControl<number | null>(null, [Validators.required]);
    sagaId = new FormControl<number>(0, [Validators.required]);
    order = new FormControl<number>(-1, [Validators.required]);
    synopsis = new FormControl('', [Validators.maxLength(2000)]);

    private destroy$ = new Subject<void>();

    constructor(
        private catalogService: CatalogService,
        private bookService: BookService,
        private snackBar: SnackbarModule,
        private antologyService?: AntologyService
    ) { }

    ngOnInit(): void {
        this.loadCatalogOptions();
        this.loadBooks();
    }

    ngOnDestroy(): void {
        this.resetCoverPreview();
        this.resetEditionCoverPreview();
        this.destroy$.next();
        this.destroy$.complete();
    }

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
    }

    get firstVisibleItem(): number {
        if (!this.total)
            return 0;
        return this.pageIndex * this.pageSize + 1;
    }

    get lastVisibleItem(): number {
        return Math.min((this.pageIndex + 1) * this.pageSize, this.total);
    }

    /** El panel lateral crea libros salvo que se haya elegido uno para editar. */
    get isEditing(): boolean {
        return !!this.selectedBook;
    }

    get canSave(): boolean {
        return !this.isSaving && !this.isSavingEdition && !this.isLinkingEdition &&
            this.name.valid &&
            (!this.isEditing ? this.isbn.valid : true) &&
            this.pages.valid &&
            (!this.isEditing ? this.publicationDate.valid : true) &&
            this.synopsis.valid &&
            !!this.authorIds.value?.length &&
            !!this.universeId.value;
    }

    get canSaveEdition(): boolean {
        const isbnRequired = this.selectedEditionId === null || !!this.editionBeingEdited?.ISBN;
        return this.isEditing && !this.isSaving && !this.isSavingEdition && this.editionIsbn.valid && this.editionPublicationDate.valid &&
            (!isbnRequired || !!this.editionIsbn.value?.trim());
    }

    get editionBeingEdited(): Edition | null {
        return this.editions.find(edition => edition.Id === this.selectedEditionId) ?? null;
    }

    authorNames(authors: Author[] | CatalogOption[] | null | undefined): string {
        return authors?.map(author => author.Nombre).join(', ') || 'Sin autor';
    }

    loadBooks(): void {
        this.isLoading = true;
        if (this.isAnthology) {
            this.loadAnthologies();
            return;
        }
        const normalizedSearch = this.normalize(this.search);
        if (normalizedSearch) {
            this.loadFilteredBooks(normalizedSearch);
            return;
        }

        this.catalogService.getBooksPage({
            page: this.pageIndex + 1,
            pageSize: this.pageSize
        }).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: response => {
                    this.books = response.Items;
                    this.total = response.Total;
                    this.pageIndex = Math.max(0, response.Page - 1);
                    this.pageSize = response.PageSize;
                    this.isLoading = false;
                },
                error: errorData => {
                    this.snackBar.openApiError(errorData, 'Error al cargar libros');
                    this.books = [];
                    this.total = 0;
                    this.isLoading = false;
                }
            });
    }

    applySearch(): void {
        this.pageIndex = 0;
        this.loadBooks();
    }

    updatePageSize(value: number): void {
        this.pageSize = Number(value);
        this.pageIndex = 0;
        this.loadBooks();
    }

    previousPage(): void {
        if (this.pageIndex === 0)
            return;
        this.pageIndex--;
        this.loadBooks();
    }

    nextPage(): void {
        if (this.pageIndex >= this.totalPages - 1)
            return;
        this.pageIndex++;
        this.loadBooks();
    }

    openEditModal(item: CatalogItem): void {
        this.selectedCatalogItem = item;
        this.isLoading = true;
        const detail$: Observable<Book> = this.isAnthology
            ? this.catalogService.getAnthologyPublicDetail(item.Id).pipe(map(detail => this.anthologyAsBook(detail)))
            : this.bookService.getBook(item.Id);
        detail$
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: book => {
                    this.selectedBook = book;
                    this.editions = [];
                    this.startEditionCreate();
                    this.loadEditions(book.Id);
                    this.coverFile = null;
                    this.resetCoverPreview();
                    this.mergeBookOptions(book);
                    this.name.setValue(book.Nombre ?? '');
                    this.isbn.setValue(book.ISBN ?? '');
                    this.pages.setValue(book.Paginas ?? null);
                    this.publicationDate.setValue(publicationDateInput(book.FechaPublicacion));
                    this.authorIds.setValue((book.Autores ?? []).map(author => this.toNumericId(author.Id)));
                    this.styleIds.setValue((book.Estilos ?? []).map(style => this.toNumericId(style.Id)));
                    this.universeId.setValue(book.Universo?.Id ? this.toNumericId(book.Universo.Id) : this.defaultUniverseId());
                    this.sagaId.setValue(book.Saga?.Id ? this.toNumericId(book.Saga.Id) : 0);
                    this.order.setValue(book.Orden ?? -1);
                    this.synopsis.setValue(book.Sinopsis ?? '');
                    this.isLoading = false;
                    // Con el panel bajo el listado, lleva la vista al formulario.
                    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1399px)').matches)
                        requestAnimationFrame(() => document.querySelector('.admin-books-editor')?.scrollIntoView({ block: 'start' }));
                },
                error: errorData => {
                    this.snackBar.openApiError(errorData, `Error al cargar ${this.isAnthology ? 'la antología' : 'el libro'}`);
                    this.closeEditModal();
                    this.isLoading = false;
                }
            });
    }

    closeEditModal(): void {
        this.startCreate();
    }

    startCreate(): void {
        this.selectedBook = null;
        this.selectedCatalogItem = null;
        this.editions = [];
        this.isLoadingEditions = false;
        this.startEditionCreate();
        this.resetLinkSelection();
        this.linkSearch = '';
        this.linkCandidates = [];
        this.coverFile = null;
        this.resetCoverPreview();
        this.name.reset('');
        this.isbn.reset('');
        this.pages.reset(null);
        this.publicationDate.reset('');
        this.authorIds.reset([]);
        this.styleIds.reset([]);
        this.universeId.reset(this.defaultUniverseId());
        this.sagaId.reset(0);
        this.order.reset(-1);
        this.synopsis.reset('');
    }

    onCoverSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        input.value = '';
        if (!file)
            return;
        if (!this.isValidCover(file))
            return;
        this.coverFile = file;
        this.updateCoverPreview();
    }

    clearSelectedCover(): void {
        this.coverFile = null;
        this.resetCoverPreview();
    }

    loadEditions(workId: number): void {
        this.isLoadingEditions = true;
        const request = this.isAnthology
            ? this.catalogService.getAnthologyEditions(workId)
            : this.catalogService.getBookEditions(workId);
        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: response => {
                if (this.selectedBook?.Id !== workId)
                    return;
                this.editions = response.Ediciones;
                if (this.selectedEditionId !== null) {
                    const selected = this.editions.find(edition => edition.Id === this.selectedEditionId);
                    if (selected) this.selectEditionForEdit(selected);
                    else this.startEditionCreate();
                }
                this.isLoadingEditions = false;
            },
            error: error => {
                if (this.selectedBook?.Id !== workId)
                    return;
                this.snackBar.openApiError(error, 'Error al cargar las ediciones');
                this.editions = [];
                this.isLoadingEditions = false;
            }
        });
    }

    startEditionCreate(): void {
        this.selectedEditionId = null;
        this.editionIsbn.reset('');
        this.editionPublicationDate.reset('');
        this.editionCoverFile = null;
        this.resetEditionCoverPreview();
    }

    selectEditionForEdit(edition: Edition): void {
        this.selectedEditionId = edition.Id;
        this.editionIsbn.setValue(edition.ISBN ?? '');
        this.editionPublicationDate.setValue(publicationDateInput(edition.FechaPublicacion));
        this.editionCoverFile = null;
        this.resetEditionCoverPreview();
    }

    onEditionCoverSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        input.value = '';
        if (!file)
            return;
        if (!this.isValidCover(file)) {
            return;
        }
        this.editionCoverFile = file;
        this.resetEditionCoverPreview();
        this.editionCoverPreviewUrl = URL.createObjectURL(file);
    }

    clearEditionCover(): void {
        this.editionCoverFile = null;
        this.resetEditionCoverPreview();
    }

    searchLinkCandidates(): void {
        const query = this.linkSearch.trim();
        if (!this.canLinkEditions || !this.selectedBook || query.length < 2)
            return;
        this.resetLinkSelection();
        this.isSearchingLink = true;
        const requestVersion = this.linkRequestVersion;
        const workId = this.selectedBook.Id;
        forkJoin({
            books: this.catalogService.getBooksPage({ q: query, page: 1, pageSize: 10 }),
            anthologies: this.catalogService.getAnthologies({ q: query })
        }).pipe(takeUntil(this.destroy$)).subscribe({
            next: ({ books, anthologies }) => {
                if (this.linkRequestVersion !== requestVersion || this.selectedBook?.Id !== workId)
                    return;
                this.linkCandidates = [
                    ...books.Items.map(item => ({ kind: 'libro' as const, item })),
                    ...anthologies.slice(0, 10).map(item => ({ kind: 'antologia' as const, item }))
                ].filter(candidate => candidate.kind !== this.kind || candidate.item.Id !== workId);
                this.isSearchingLink = false;
            },
            error: error => {
                if (this.linkRequestVersion !== requestVersion || this.selectedBook?.Id !== workId)
                    return;
                this.snackBar.openApiError(error, 'Error al buscar obras para vincular');
                this.isSearchingLink = false;
            }
        });
    }

    selectLinkSource(source: { kind: 'libro' | 'antologia'; item: CatalogItem }): void {
        const requestVersion = ++this.linkRequestVersion;
        this.linkSource = source;
        this.linkEdition = null;
        this.isLinkConfirming = false;
        this.linkEditions = [];
        this.isLoadingLinkEditions = true;
        const request = source.kind === 'libro'
            ? this.catalogService.getBookEditions(source.item.Id)
            : this.catalogService.getAnthologyEditions(source.item.Id);
        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: response => {
                if (this.linkRequestVersion !== requestVersion || this.linkSource?.kind !== source.kind || this.linkSource.item.Id !== source.item.Id)
                    return;
                this.linkEditions = response.Ediciones.filter(edition => !this.editions.some(existing => existing.Id === edition.Id));
                this.isLoadingLinkEditions = false;
            },
            error: error => {
                if (this.linkRequestVersion !== requestVersion)
                    return;
                this.snackBar.openApiError(error, 'Error al cargar las ediciones de la otra obra');
                this.isLoadingLinkEditions = false;
            }
        });
    }

    selectLinkEdition(edition: Edition): void {
        this.linkEdition = edition;
        this.isLinkConfirming = false;
    }

    linkSelectedEdition(): void {
        if (!this.canLinkEditions || !this.selectedBook || !this.linkEdition || !this.isLinkConfirming || this.isLinkingEdition || this.isSaving || this.isSavingEdition)
            return;
        const workId = this.selectedBook.Id;
        const editionId = this.linkEdition.Id;
        const request = this.isAnthology
            ? this.editionAdmin.addAnthologyEdition(workId, { VincularEdicionId: editionId })
            : this.editionAdmin.addBookEdition(workId, { VincularEdicionId: editionId });
        this.isLinkingEdition = true;
        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Edición vinculada a esta obra', 'successBar');
                this.librarySync.refreshAfterCatalogChange();
                this.resetLinkSelection();
                this.linkCandidates = [];
                this.linkSearch = '';
                this.loadEditions(workId);
                this.loadBooks();
            },
            error: error => {
                this.snackBar.openApiError(error, 'Error al vincular la edición');
                this.isLinkingEdition = false;
            },
            complete: () => { this.isLinkingEdition = false; }
        });
    }

    private resetLinkSelection(): void {
        this.linkRequestVersion++;
        this.linkSource = null;
        this.linkEditions = [];
        this.linkEdition = null;
        this.isLinkConfirming = false;
        this.isLoadingLinkEditions = false;
        this.isSearchingLink = false;
    }

    saveEdition(): void {
        if (!this.selectedBook || !this.canSaveEdition)
            return;
        const isbn = this.editionIsbn.value?.trim() ?? '';
        const publication = publicationDatePayload(this.editionPublicationDate.value);
        const payload = {
            ...(isbn ? { ISBN: isbn } : {}),
            ...(this.selectedEditionId !== null || publication ? { FechaPublicacion: publication ?? null } : {})
        };
        const workId = this.selectedBook.Id;
        const editing = this.selectedEditionId !== null;
        const request = editing
            ? this.editionAdmin.updateEdition(this.selectedEditionId!, payload, this.editionCoverFile)
            : this.isAnthology
                ? this.editionAdmin.addAnthologyEdition(workId, payload, this.editionCoverFile)
                : this.editionAdmin.addBookEdition(workId, payload, this.editionCoverFile);
        this.isSavingEdition = true;
        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: saved => {
                this.selectedEditionId = saved.Id;
                this.editionCoverFile = null;
                this.resetEditionCoverPreview();
                this.snackBar.openSnackBar(editing ? 'Edición actualizada' : 'Edición creada', 'successBar');
                this.librarySync.refreshAfterCatalogChange();
                this.loadEditions(workId);
                this.loadBooks();
            },
            error: error => {
                markBackendFieldError({ ISBN: this.editionIsbn, FechaPublicacion: this.editionPublicationDate }, error);
                this.snackBar.openApiError(error, `Error al ${editing ? 'actualizar' : 'crear'} la edición`);
                this.isSavingEdition = false;
            },
            complete: () => { this.isSavingEdition = false; }
        });
    }

    saveBook(): void {
        if (!this.canSave)
            return;

        const universe = this.universes.find(item => item.Id === this.universeId.value);
        if (!universe) {
            this.snackBar.openSnackBar('Selecciona un universo', 'errorBar');
            return;
        }

        const payload: NewBook = {
            Id: this.selectedBook?.Id ?? 0,
            Nombre: this.name.value ?? '',
            Autores: this.selectedAuthors(),
            Universo: universe,
            Saga: this.selectedSaga(),
            Orden: this.order.value ?? -1,
            ...(!this.isEditing ? { ISBN: this.isbn.value?.trim() || null } : {}),
            Sinopsis: this.synopsis.value?.trim() || null,
            Paginas: this.pages.value ?? null,
            ...(!this.isEditing ? { FechaPublicacion: publicationDatePayload(this.publicationDate.value) } : {}),
            Estilos: this.stylePayload()
        };

        this.isSaving = true;
        const editing = this.isEditing;
        const request: Observable<unknown> = this.isAnthology && this.antologyService
            ? (editing ? this.antologyService.updateAntology(payload) : this.antologyService.addAntology(payload, this.coverFile!))
            : (editing ? this.bookService.updateBook(payload) : this.bookService.addBook(payload, this.coverFile!));
        request
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    const noun = this.isAnthology ? 'Antología' : 'Libro';
                    const ending = this.isAnthology ? 'a' : 'o';
                    this.snackBar.openSnackBar(`${noun} ${editing ? 'actualizad' : 'cread'}${ending}`, 'successBar');
                    // La Biblioteca y el libro abierto tienen en memoria los datos anteriores.
                    this.librarySync.refreshAfterCatalogChange();
                    this.startCreate();
                    this.loadBooks();
                },
                error: errorData => {
                    // Marca en rojo el campo que rechaza el backend (Nombre, ISBN, Paginas…).
                    markBackendFieldError({
                        Nombre: this.name, ISBN: this.isbn, Paginas: this.pages, FechaPublicacion: this.publicationDate,
                        Sinopsis: this.synopsis, Autores: this.authorIds, Estilos: this.styleIds,
                        UniversoId: this.universeId, SagaId: this.sagaId, Orden: this.order
                    }, errorData);
                    this.snackBar.openApiError(errorData, `Error al ${editing ? 'actualizar' : 'crear'} ${this.isAnthology ? 'la antología' : 'el libro'}`, 8000);
                    this.isSaving = false;
                },
                complete: () => {
                    this.isSaving = false;
                }
            });
    }

    private loadCatalogOptions(): void {
        forkJoin({
            authors: this.catalogService.getAllAuthors(),
            universes: this.catalogService.getUniverses(),
            sagas: this.catalogService.getSagas(),
            styles: this.catalogService.getStyles()
        }).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ authors, universes, sagas, styles }) => {
                    this.authors = authors
                        .filter(author => author.Nombre !== 'Anónimo')
                        .map(author => ({ ...author, Id: this.toNumericId(author.Id) }));
                    this.universes = universes.map(universe => ({ ...universe, Id: this.toNumericId(universe.Id) }));
                    this.sagas = sagas.map(saga => ({ ...saga, Id: this.toNumericId(saga.Id) }));
                    this.styleOptions = styles.map(style => ({ ...style, Id: this.toNumericId(style.Id) }));
                    if (this.selectedBook)
                        this.mergeBookOptions(this.selectedBook);
                    else if (!this.universeId.value)
                        this.universeId.setValue(this.defaultUniverseId());
                },
                error: () => {
                    this.authors = [];
                    this.universes = [];
                    this.sagas = [];
                    this.styleOptions = [];
                }
            });
    }

    private loadAnthologies(): void {
        const normalizedSearch = this.normalize(this.search);
        this.catalogService.getAnthologies()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: items => {
                    const filtered = items
                        .filter(item => !normalizedSearch || this.bookMatchesSearch(item, normalizedSearch))
                        .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
                    this.total = filtered.length;
                    this.pageIndex = Math.min(this.pageIndex, this.totalPages - 1);
                    this.books = filtered.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize);
                    this.isLoading = false;
                },
                error: errorData => {
                    this.snackBar.openApiError(errorData, 'Error al cargar antologías');
                    this.books = [];
                    this.total = 0;
                    this.isLoading = false;
                }
            });
    }

    /** Adapta el detalle canónico de antología a la forma de libro que usa el formulario. */
    private anthologyAsBook(detail: CatalogAnthologyPublicDetail): Book {
        return {
            ...detail,
            Orden: -1,
            Universo: detail.Universo ? { ...detail.Universo, Autores: [], Sagas: [], Libros: [], Antologias: [] } : null,
            Saga: detail.Saga ?? null
        } as unknown as Book;
    }

    private loadFilteredBooks(normalizedSearch: string): void {
        this.loadAllBooks()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: books => {
                    const filteredBooks = books.filter(book => this.bookMatchesSearch(book, normalizedSearch));
                    this.total = filteredBooks.length;
                    this.books = filteredBooks.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize);
                    this.isLoading = false;
                },
                error: errorData => {
                    this.snackBar.openApiError(errorData, 'Error al buscar libros');
                    this.books = [];
                    this.total = 0;
                    this.isLoading = false;
                }
            });
    }

    private loadAllBooks(): Observable<CatalogItem[]> {
        const pageSize = 100;
        return this.catalogService.getBooksPage({ page: 1, pageSize }).pipe(
            switchMap(firstPage => {
                const totalPages = Math.ceil(firstPage.Total / firstPage.PageSize);
                if (totalPages <= 1)
                    return of(firstPage.Items);

                const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
                    this.catalogService.getBooksPage({ page: index + 2, pageSize })
                );
                return forkJoin(requests).pipe(
                    map((pages: CatalogItemsPage[]) => [
                        ...firstPage.Items,
                        ...pages.flatMap(page => page.Items)
                    ])
                );
            })
        );
    }

    private bookMatchesSearch(book: CatalogItem, normalizedSearch: string): boolean {
        return [
            book.Nombre,
            book.ISBN ?? '',
            this.authorNames(book.Autores)
        ].some(value => this.normalize(value).includes(normalizedSearch));
    }

    private selectedAuthors(): Author[] {
        const ids = this.authorIds.value ?? [];
        return this.authors.filter(author => ids.includes(author.Id));
    }

    private selectedSaga(): Saga {
        if (!this.sagaId.value)
            return this.emptySaga;
        return this.sagas.find(saga => saga.Id === this.sagaId.value) ?? this.emptySaga;
    }

    private stylePayload(): Array<{ Id: number }> {
        return (this.styleIds.value ?? []).map(Id => ({ Id }));
    }

    private mergeBookOptions(book: Book): void {
        (book.Autores ?? []).forEach(author => {
            const normalizedAuthor = { ...author, Id: this.toNumericId(author.Id) };
            if (!this.authors.some(option => option.Id === normalizedAuthor.Id))
                this.authors = [...this.authors, normalizedAuthor].sort((a, b) => a.Nombre.localeCompare(b.Nombre));
        });

        if (book.Universo?.Id) {
            const universeId = this.toNumericId(book.Universo.Id);
            if (!this.universes.some(universe => universe.Id === universeId)) {
                this.universes = [
                    ...this.universes,
                    {
                        Id: universeId,
                        Nombre: book.Universo.Nombre,
                        Autores: [],
                        Sagas: [],
                        Libros: [],
                        Antologias: []
                    }
                ].sort((a, b) => a.Nombre.localeCompare(b.Nombre));
            }
        }

        if (book.Saga?.Id) {
            const sagaId = this.toNumericId(book.Saga.Id);
            if (!this.sagas.some(saga => saga.Id === sagaId)) {
                this.sagas = [
                    ...this.sagas,
                    {
                        Id: sagaId,
                        Nombre: book.Saga.Nombre,
                        Subtitulo: book.Saga.Subtitulo ?? null,
                        Autores: [],
                        Libros: [],
                        Antologias: []
                    }
                ].sort((a, b) => a.Nombre.localeCompare(b.Nombre));
            }
        }
    }

    private toNumericId(value: number | string): number {
        return Number(value);
    }

    private defaultUniverseId(): number | null {
        return this.universes.find(universe => this.normalize(universe.Nombre) === 'sin universo')?.Id
            ?? this.universes[0]?.Id
            ?? null;
    }

    private updateCoverPreview(): void {
        this.resetCoverPreview();
        if (this.coverFile)
            this.coverPreviewUrl = URL.createObjectURL(this.coverFile);
    }

    private resetCoverPreview(): void {
        if (this.coverPreviewUrl)
            URL.revokeObjectURL(this.coverPreviewUrl);
        this.coverPreviewUrl = '';
    }

    private resetEditionCoverPreview(): void {
        if (this.editionCoverPreviewUrl)
            URL.revokeObjectURL(this.editionCoverPreviewUrl);
        this.editionCoverPreviewUrl = '';
    }

    private isValidCover(file: File): boolean {
        if (['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && file.size <= 10 * 1024 * 1024)
            return true;
        this.snackBar.openSnackBar('La portada debe ser PNG, JPEG o WebP y ocupar como máximo 10 MB', 'errorBar');
        return false;
    }

    private normalize(value: string): string {
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }
}

/**
 * Convierte lo escrito en el campo («2016», «11/2016», «22/11/2016» o su forma ISO)
 * al formato que acepta el backend: «2016», «2016-11» o «2016-11-22».
 * Devuelve null si está vacío y undefined si no es una fecha válida.
 */
export function publicationDatePayload(value: string | null | undefined): string | null | undefined {
    const text = value?.trim() ?? '';
    if (!text)
        return null;
    const local = text.match(/^(?:(\d{1,2})\/)?(?:(\d{1,2})\/)?(\d{4})$/);
    const iso = text.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
    let year: string, month: string | undefined, day: string | undefined;
    if (iso) {
        [, year, month, day] = iso;
    } else if (local) {
        const [, first, second, localYear] = local;
        year = localYear;
        // «11/2016» es mes y año; «22/11/2016», día, mes y año.
        [day, month] = second ? [first, second] : [undefined, first];
    } else {
        return undefined;
    }
    const monthNumber = month ? Number(month) : 1;
    const dayNumber = day ? Number(day) : 1;
    if (monthNumber < 1 || monthNumber > 12)
        return undefined;
    const date = new Date(Date.UTC(Number(year), monthNumber - 1, dayNumber));
    if (date.getUTCDate() !== dayNumber)
        return undefined;
    const pad = (part: string) => part.padStart(2, '0');
    return [year, month && pad(month), day && pad(day)].filter(Boolean).join('-');
}

/** Muestra una fecha del backend como la escribiría una persona: «22/11/2016», «11/2016» o «2016». */
export function publicationDateInput(value: string | null | undefined): string {
    const match = value?.trim().match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
    if (!match)
        return '';
    const [, year, month, day] = match;
    return [day, month, year].filter(Boolean).join('/');
}

export function publicationDateValidator(control: AbstractControl<string | null>): ValidationErrors | null {
    return publicationDatePayload(control.value) === undefined ? { publicationDate: true } : null;
}
