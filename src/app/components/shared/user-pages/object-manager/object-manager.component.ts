import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { Author } from '../../../../interfaces/author';
import { Antology } from '../../../../interfaces/antology';
import { BookSimple } from '../../../../interfaces/book';
import { NewBook } from '../../../../interfaces/creation/newBook';
import { NewSaga } from '../../../../interfaces/creation/newSaga';
import { ReadStatus } from '../../../../interfaces/read-status';
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

type ManagerKind = 'authors' | 'universes' | 'sagas' | 'anthologies' | 'books';
type SortKey = 'alphabetical' | 'author' | 'universe' | 'saga' | 'recent';
type SortDirection = 'asc' | 'desc';

interface ManagerConfig {
    kind: ManagerKind;
    title: string;
    subtitle: string;
    singular: string;
    plural: string;
    icon: string;
    addLabel: string;
    saveLabel: string;
}

interface ManagerRow {
    id: number;
    name: string;
    authors: Author[];
    universe?: Universe;
    saga?: Saga | null;
    status?: string;
    order?: number;
    cover?: string;
    booksCount: number;
    sagasCount: number;
    anthologiesCount: number;
    raw: Author | Universe | Saga | BookSimple | Antology;
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
        NgxDropzoneModule,
        SnackbarModule
    ],
    templateUrl: './object-manager.component.html',
    styleUrl: './object-manager.component.sass'
})
export class ObjectManagerComponent implements OnInit, OnDestroy {
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
        Autores: [],
        Libros: [],
        Antologias: []
    };

    readonly statuses: ReadStatus[] = [
        { Id: 0, Nombre: 'En espera', Fecha: '' },
        { Id: 1, Nombre: 'En marcha', Fecha: '' },
        { Id: 2, Nombre: 'Leído', Fecha: '' },
        { Id: 3, Nombre: 'Por comprar', Fecha: '' }
    ];

    kind: ManagerKind = 'authors';
    config = this.configs.authors;
    selectedRow: ManagerRow | null = null;
    search = '';
    activeSortKeys: SortKey[] = ['alphabetical'];
    sortDirection: SortDirection = 'asc';
    selectedStatusFilter = 'all';
    selectedAuthorFilter = 0;
    authorFilterText = '';
    statusFilterText = '';
    pageIndex = 0;
    pageSize = 6;
    pageSizeOptions = [6, 12, 24, 48];
    files: File[] = [];
    isSaving = false;
    imgUrl = environment.getImgUrl;

    authors: Author[] = [];
    universes: Universe[] = [];
    sagas: Saga[] = [];
    rows: ManagerRow[] = [];

    name = new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]);
    authorIds = new FormControl<number[]>([], [Validators.required]);
    universeId = new FormControl<number | null>(null, [Validators.required]);
    sagaId = new FormControl<number>(0, [Validators.required]);
    order = new FormControl<number>(-1, [Validators.required]);
    status = new FormControl<string>('Por comprar', [Validators.required]);

    form = this.formBuilder.group({
        name: this.name,
        authorIds: this.authorIds,
        universeId: this.universeId,
        sagaId: this.sagaId,
        order: this.order,
        status: this.status
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
        private loader: LoaderEmmitterService
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
            .subscribe(() => this.selectFromRoute());

        this.universeId.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.ensureSelectedSagaBelongsToUniverse());
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get filteredRows(): ManagerRow[] {
        const term = this.normalize(this.search);
        let rows = term
            ? this.rows.filter(row => [
                row.name,
                row.authors.map(author => author.Nombre).join(' '),
                row.universe?.Nombre ?? '',
                row.saga?.Nombre ?? '',
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
            ? this.statuses.filter(status => this.normalize(status.Nombre).includes(term))
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

    get formTitle(): string {
        return this.selectedRow
            ? `Modificar ${this.config.singular}`
            : this.config.addLabel;
    }

    get saveLabel(): string {
        return this.selectedRow
            ? `Actualizar ${this.config.singular}`
            : this.config.saveLabel;
    }

    get totalBooks(): number {
        return this.rows.reduce((total, row) => total + row.booksCount, 0);
    }

    get totalUniverses(): number {
        return this.kind === 'universes'
            ? this.rows.length
            : new Set(this.rows.map(row => row.universe?.Id).filter(Boolean)).size;
    }

    get totalAnthologies(): number {
        return this.rows.reduce((total, row) => total + row.anthologiesCount, 0);
    }

    get canSubmit(): boolean {
        if (this.isSaving || this.name.invalid)
            return false;
        if (this.needsAuthors() && (!this.authorIds.value || this.authorIds.value.length === 0))
            return false;
        if (this.needsUniverse() && !this.universeId.value)
            return false;
        if (this.needsCover() && !this.selectedRow && this.files.length === 0)
            return false;
        return true;
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

    needsCover(): boolean {
        return this.kind === 'books' || this.kind === 'anthologies';
    }

    selectRow(row: ManagerRow): void {
        if (this.isSystemRow(row))
            return;

        this.selectedRow = row;
        this.files = [];
        this.name.setValue(row.name);
        this.authorIds.setValue(row.authors.map(author => author.Id));
        this.universeId.setValue(row.universe?.Id ?? null);
        this.sagaId.setValue(row.saga?.Id ?? 0);
        this.order.setValue(row.order ?? -1);
        this.status.setValue(row.status ?? 'Por comprar');
    }

    clearForm(): void {
        this.selectedRow = null;
        this.files = [];
        this.form.reset({
            name: '',
            authorIds: [],
            universeId: this.availableUniverses()[0]?.Id ?? null,
            sagaId: 0,
            order: -1,
            status: 'Por comprar'
        });
    }

    save(): void {
        if (!this.canSubmit) {
            this.snackBar.openSnackBar('Revisa los campos obligatorios', 'errorBar');
            return;
        }

        this.isSaving = true;
        this.loader.activateLoader();

        this.persist().subscribe({
            next: () => {
                this.snackBar.openSnackBar(`${this.capitalize(this.config.singular)} guardado`, 'successBar');
                this.clearForm();
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
    }

    onRemove(): void {
        this.files = [];
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
        return this.getLatestStatus(row).replace(' ', '_');
    }

    locationSummary(row: ManagerRow): string {
        if (!row.universe)
            return 'Sin universo';
        if (row.saga && row.saga.Id > 0)
            return `${row.universe.Nombre} / ${row.saga.Nombre}`;
        return row.universe.Nombre;
    }

    authorSummary(row: ManagerRow): string {
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

    handleCoverImageError(event: Event): void {
        (event.target as HTMLImageElement).src = 'assets/media/img/error.png';
    }

    resetPage(): void {
        this.pageIndex = 0;
    }

    toggleSortKey(key: SortKey): void {
        if (this.activeSortKeys.includes(key)) {
            if (this.activeSortKeys.length === 1)
                return;
            this.activeSortKeys = this.activeSortKeys.filter(activeKey => activeKey !== key);
        } else {
            this.activeSortKeys = [...this.activeSortKeys, key];
        }
        this.resetPage();
    }

    sortPriority(key: SortKey): number | null {
        const index = this.activeSortKeys.indexOf(key);
        return index === -1 ? null : index + 1;
    }

    sortLabel(key: SortKey): string {
        const labels: Record<SortKey, string> = {
            alphabetical: 'Alfabético',
            author: 'Por autor',
            universe: 'Por universo',
            saga: 'Por saga',
            recent: 'Recientes'
        };
        return labels[key];
    }

    setSortDirection(direction: SortDirection): void {
        this.sortDirection = direction;
        this.resetPage();
    }

    onAuthorFilterInput(value: string): void {
        this.authorFilterText = value;
        const exactAuthor = this.authors.find(author => this.normalize(author.Nombre) === this.normalize(value));
        this.selectedAuthorFilter = exactAuthor?.Id ?? 0;
        this.resetPage();
    }

    selectAuthorFilter(value: string): void {
        this.authorFilterText = value;
        const author = this.authors.find(item => item.Nombre === value);
        this.selectedAuthorFilter = author?.Id ?? 0;
        this.resetPage();
    }

    onStatusFilterInput(value: string): void {
        this.statusFilterText = value;
        const exactStatus = this.statuses.find(status => this.normalize(status.Nombre) === this.normalize(value));
        this.selectedStatusFilter = exactStatus?.Nombre ?? 'all';
        this.resetPage();
    }

    selectStatusFilter(value: string): void {
        this.statusFilterText = value;
        this.selectedStatusFilter = this.statuses.some(status => status.Nombre === value) ? value : 'all';
        this.resetPage();
    }

    goToPage(pageIndex: number): void {
        this.pageIndex = Math.min(Math.max(pageIndex, 0), this.totalPages - 1);
    }

    updatePageSize(size: number): void {
        this.pageSize = size;
        this.resetPage();
    }

    private setKind(kind: ManagerKind): void {
        this.kind = kind;
        this.config = this.configs[kind];
        this.clearForm();
        this.resetPage();
        this.rebuildRows();
    }

    private selectFromRoute(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id)
            return;
        const row = this.rows.find(item => item.id === id);
        if (row)
            this.selectRow(row);
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
            this.rows = this.authors.map(author => this.authorRow(author));
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

    private authorRow(author: Author): ManagerRow {
        const books = this.universeStore.getAllBooks().filter(book => book.Autores?.some(a => a.Id === author.Id));
        const anthologies = this.universeStore.getAllAnthologies().filter(antology => antology.Autores?.some(a => a.Id === author.Id));
        const universes = this.editableUniverses().filter(universe => universe.Autores?.some(a => a.Id === author.Id));

        return {
            id: author.Id,
            name: author.Nombre,
            authors: [author],
            booksCount: books.length,
            sagasCount: this.sagas.filter(saga => saga.Autores?.some(a => a.Id === author.Id)).length,
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
            authors: saga.Autores ?? [],
            universe,
            booksCount: saga.Libros?.length ?? 0,
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

    private persistAuthor(): Observable<unknown> {
        const author: Author = {
            Id: this.selectedRow?.id ?? 0,
            Nombre: this.name.value ?? ''
        };
        const request = this.selectedRow
            ? this.authorService.updateAuthor(author)
            : this.authorService.addAuthor(author);

        return request.pipe(
            switchMap(() => forkJoin({
                authors: this.authorService.getAllAuthors(),
                universes: this.universeService.getUniverses()
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
        return this.refreshUniversesAfter(request);
    }

    private persistSaga(): Observable<unknown> {
        const universe = this.getSelectedUniverse();
        if (!universe)
            return this.throwFormError('Selecciona un universo');

        const saga: NewSaga = {
            Id: this.selectedRow?.id ?? 0,
            Nombre: this.name.value ?? '',
            Autores: this.getSelectedAuthors(),
            Universo: universe,
            UserId: 0
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
        const status = this.getSelectedStatus();
        if (!status)
            return this.throwFormError('Selecciona un estado');

        const payload: NewBook = {
            Id: this.selectedRow?.id ?? 0,
            Nombre: this.name.value ?? '',
            Autores: this.getSelectedAuthors(),
            Universo: universe,
            Saga: saga,
            Orden: this.order.value ?? -1,
            Estado: {
                Id: status.Id,
                Nombre: status.Nombre,
                Fecha: new Date().toISOString()
            },
            UserId: 0
        };

        return this.resolveCoverFile(type).pipe(
            switchMap(file => {
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
            })
        );
    }

    private refreshUniversesAfter(request: Observable<unknown>): Observable<unknown> {
        return request.pipe(
            switchMap(() => this.universeService.getUniverses()),
            switchMap(universes => {
                this.universeStore.setUniverses(universes);
                return of(null);
            })
        );
    }

    private resolveCoverFile(type: 'book' | 'antology'): Observable<File> {
        if (this.files[0])
            return of(this.files[0]);
        if (!this.selectedRow?.cover)
            return this.throwFormError('Selecciona una portada');
        return type === 'book'
            ? this.bookService.getCover(this.selectedRow.cover)
            : this.antologyService.getCover(this.selectedRow.cover);
    }

    private getSelectedAuthors(): Author[] {
        const ids = this.authorIds.value ?? [];
        return this.authors.filter(author => ids.includes(author.Id));
    }

    private getSelectedUniverse(): Universe | undefined {
        return this.universes.find(universe => universe.Id === this.universeId.value);
    }

    private getSelectedSaga(): Saga {
        if (!this.sagaId.value)
            return this.emptySaga;
        return this.sagas.find(saga => saga.Id === this.sagaId.value) ?? this.emptySaga;
    }

    private getSelectedStatus(): ReadStatus | undefined {
        return this.statuses.find(status => status.Nombre === this.status.value);
    }

    private compareRows(a: ManagerRow, b: ManagerRow): number {
        for (const key of this.activeSortKeys) {
            const comparison = this.compareRowsByKey(a, b, key);
            if (comparison !== 0)
                return this.sortDirection === 'asc' ? comparison : -comparison;
        }
        return a.name.localeCompare(b.name);
    }

    private compareRowsByKey(a: ManagerRow, b: ManagerRow, key: SortKey): number {
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
