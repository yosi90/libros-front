import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, Subject, takeUntil } from 'rxjs';
import { Author } from '../../../../interfaces/author';
import { CatalogOption } from '../../../../interfaces/catalog';
import { NewSaga } from '../../../../interfaces/creation/newSaga';
import { Saga } from '../../../../interfaces/saga';
import { Universe } from '../../../../interfaces/universe';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { AuthorService } from '../../../../services/entities/author.service';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { SagaService } from '../../../../services/entities/saga.service';
import { UniverseService } from '../../../../services/entities/universe.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { LibrarySyncService } from '../../../../services/stores/library-sync.service';

export type AdminCatalogEntityKind = 'authors' | 'universes' | 'sagas';

interface EntityRow {
    Id: number;
    Nombre: string;
    detail: string;
    raw: Author | Universe | Saga;
}

interface KindConfig {
    singular: string;
    plural: string;
    icon: string;
    feminine: boolean;
    detailColumn: string;
}

const CONFIG: Record<AdminCatalogEntityKind, KindConfig> = {
    authors: { singular: 'autor', plural: 'autores', icon: 'groups', feminine: false, detailColumn: 'Idioma y origen' },
    universes: { singular: 'universo', plural: 'universos', icon: 'public', feminine: false, detailColumn: '' },
    sagas: { singular: 'saga', plural: 'sagas', icon: 'bookmark', feminine: true, detailColumn: 'Subtítulo' }
};

/**
 * Gestión canónica de autores, universos y sagas en Administración: listado del
 * catálogo completo y formulario lateral para crear o editar sobre catalogo/admin/*.
 */
@Component({
    selector: 'app-admin-catalog-entities',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatTooltipModule],
    templateUrl: './admin-catalog-entities.component.html',
    styleUrl: './admin-catalog-entities.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCatalogEntitiesComponent implements OnInit, OnDestroy {
    private readonly librarySync = inject(LibrarySyncService);
    @Input({ required: true }) kind!: AdminCatalogEntityKind;

    rows: EntityRow[] = [];
    total = 0;
    pageIndex = 0;
    pageSize = 10;
    readonly pageSizeOptions = [10, 25, 50, 100];
    search = '';
    isLoading = false;
    isSaving = false;
    selectedId: number | null = null;
    selectedName = '';

    authorOptions: Author[] = [];
    universeOptions: Universe[] = [];
    languageOptions: CatalogOption[] = [];
    originOptions: CatalogOption[] = [];

    readonly name = new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]);
    readonly subtitle = new FormControl('', [Validators.maxLength(50)]);
    readonly languageId = new FormControl<number | null>(null);
    readonly originPlace = new FormControl('', [Validators.maxLength(80)]);
    readonly authorIds = new FormControl<number[]>([]);
    readonly universeId = new FormControl<number | null>(null);

    private allRows: EntityRow[] = [];
    private originTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private catalogService: CatalogService,
        private authorService: AuthorService,
        private universeService: UniverseService,
        private sagaService: SagaService,
        private snackBar: SnackbarModule,
        private changeDetector: ChangeDetectorRef
    ) { }

    get config(): KindConfig { return CONFIG[this.kind]; }
    get isEditing(): boolean { return this.selectedId !== null; }
    get needsAuthors(): boolean { return this.kind !== 'authors'; }
    get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
    get firstVisibleItem(): number { return this.total ? this.pageIndex * this.pageSize + 1 : 0; }
    get lastVisibleItem(): number { return Math.min((this.pageIndex + 1) * this.pageSize, this.total); }

    get editorTitle(): string {
        if (this.isEditing)
            return `Editar ${this.config.singular}`;
        return `${this.config.feminine ? 'Nueva' : 'Nuevo'} ${this.config.singular}`;
    }

    get canSave(): boolean {
        if (this.isSaving || this.name.invalid || this.subtitle.invalid || this.originPlace.invalid)
            return false;
        if (this.needsAuthors && !this.authorIds.value?.length)
            return false;
        return this.kind !== 'sagas' || !!this.universeId.value;
    }

    ngOnInit(): void {
        this.loadOptions();
        this.loadRows();
    }

    ngOnDestroy(): void {
        if (this.originTimer)
            clearTimeout(this.originTimer);
        this.destroy$.next();
        this.destroy$.complete();
    }

    applySearch(): void {
        this.pageIndex = 0;
        this.loadRows();
    }

    updatePageSize(value: number): void {
        this.pageSize = Number(value);
        this.pageIndex = 0;
        this.loadRows();
    }

    previousPage(): void {
        if (this.pageIndex === 0) return;
        this.pageIndex--;
        this.loadRows();
    }

    nextPage(): void {
        if (this.pageIndex >= this.totalPages - 1) return;
        this.pageIndex++;
        this.loadRows();
    }

    startCreate(): void {
        this.selectedId = null;
        this.selectedName = '';
        this.name.reset('');
        this.subtitle.reset('');
        this.languageId.reset(null);
        this.originPlace.reset('');
        this.authorIds.reset([]);
        this.universeId.reset(null);
    }

    edit(row: EntityRow): void {
        this.startCreate();
        this.selectedId = row.Id;
        this.selectedName = row.Nombre;
        this.name.setValue(row.Nombre);
        if (this.kind === 'authors') {
            this.fillAuthor(row.raw as Author);
            this.revealEditor();
            return;
        }
        // Universos y sagas solo traen el nombre en el listado: el resto se lee del detalle.
        const detail$: Observable<Universe | Saga> = this.kind === 'universes'
            ? this.universeService.getUniverse(row.Id)
            : this.sagaService.getSaga(row.Id);
        detail$.pipe(takeUntil(this.destroy$)).subscribe({
            next: detail => {
                if (this.selectedId !== row.Id) return;
                this.authorIds.setValue((detail.Autores ?? []).map(author => Number(author.Id)));
                if (this.kind === 'sagas') {
                    const saga = detail as Saga & { Universo?: { Id: number | string } | null };
                    this.subtitle.setValue(saga.Subtitulo ?? '');
                    this.universeId.setValue(saga.Universo?.Id ? Number(saga.Universo.Id) : null);
                }
                this.changeDetector.markForCheck();
                this.revealEditor();
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData, `Error al cargar ${this.config.singular === 'saga' ? 'la' : 'el'} ${this.config.singular}`), 'errorBar');
                this.startCreate();
                this.changeDetector.markForCheck();
            }
        });
    }

    searchOrigins(query: string): void {
        if (this.originTimer)
            clearTimeout(this.originTimer);
        this.originTimer = setTimeout(() => {
            this.catalogService.getOriginPlaces(query.trim(), 1, 20).pipe(takeUntil(this.destroy$)).subscribe({
                next: page => { this.originOptions = page.Items; this.changeDetector.markForCheck(); },
                error: () => { this.originOptions = []; this.changeDetector.markForCheck(); }
            });
        }, 250);
    }

    save(): void {
        if (!this.canSave) return;
        this.isSaving = true;
        const editing = this.isEditing;
        this.saveRequest().pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                const noun = this.config.singular.charAt(0).toUpperCase() + this.config.singular.slice(1);
                const verb = editing ? 'actualizad' : 'cread';
                this.snackBar.openSnackBar(`${noun} ${verb}${this.config.feminine ? 'a' : 'o'}`, 'successBar');
                // La Biblioteca y el libro abierto tienen en memoria los datos anteriores.
                this.librarySync.refreshAfterCatalogChange();
                this.isSaving = false;
                this.startCreate();
                this.loadRows();
                if (this.kind !== 'sagas')
                    this.loadOptions();
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData, `Error al guardar ${this.config.feminine ? 'la' : 'el'} ${this.config.singular}`), 'errorBar');
                this.isSaving = false;
                this.changeDetector.markForCheck();
            }
        });
    }

    private saveRequest(): Observable<unknown> {
        const name = this.name.value?.trim() ?? '';
        const id = this.selectedId ?? 0;
        if (this.kind === 'authors') {
            const author: Author = { Id: id, Nombre: name, IdiomaId: this.languageId.value, LugarOrigenNombre: this.originPlace.value?.trim() || null };
            return this.isEditing ? this.authorService.updateAuthor(author) : this.authorService.addAuthor(author);
        }
        const authors = this.authorOptions.filter(author => (this.authorIds.value ?? []).includes(author.Id));
        if (this.kind === 'universes') {
            const universe = { Id: id, Nombre: name, Autores: authors.map(author => ({ Id: author.Id })) };
            return this.isEditing ? this.universeService.updateUniverse(universe) : this.universeService.addUniverse(universe);
        }
        const universe = this.universeOptions.find(option => option.Id === this.universeId.value)!;
        const saga: NewSaga = { Id: id, Nombre: name, Subtitulo: this.subtitle.value?.trim() || null, Autores: authors, Universo: universe };
        return this.isEditing ? this.sagaService.updateSaga(saga) : this.sagaService.addSaga(saga);
    }

    private loadRows(): void {
        this.isLoading = true;
        const query = this.search.trim();
        if (this.kind === 'authors') {
            this.catalogService.getAuthorsPage({ q: query, page: this.pageIndex + 1, pageSize: this.pageSize })
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: page => {
                        this.rows = page.Items.map(author => this.toRow(author));
                        this.total = page.Total;
                        this.finishLoading();
                    },
                    error: errorData => this.failLoading(errorData)
                });
            return;
        }
        const source: Observable<Array<Universe | Saga>> = this.kind === 'universes'
            ? this.catalogService.getUniverses(query)
            : this.catalogService.getSagas(query);
        source.pipe(takeUntil(this.destroy$)).subscribe({
            next: items => {
                this.allRows = items.map(item => this.toRow(item)).sort((a, b) => a.Nombre.localeCompare(b.Nombre));
                this.total = this.allRows.length;
                this.pageIndex = Math.min(this.pageIndex, this.totalPages - 1);
                this.rows = this.allRows.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize);
                this.finishLoading();
            },
            error: errorData => this.failLoading(errorData)
        });
    }

    private loadOptions(): void {
        if (this.kind === 'authors') {
            this.catalogService.getLanguages().pipe(takeUntil(this.destroy$)).subscribe({
                next: languages => { this.languageOptions = languages; this.changeDetector.markForCheck(); },
                error: () => this.languageOptions = []
            });
            return;
        }
        this.catalogService.getAllAuthors().pipe(takeUntil(this.destroy$)).subscribe({
            next: authors => {
                this.authorOptions = authors
                    .map(author => ({ ...author, Id: Number(author.Id) }))
                    .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
                this.changeDetector.markForCheck();
            },
            error: () => this.authorOptions = []
        });
        if (this.kind === 'sagas') {
            this.catalogService.getUniverses().pipe(takeUntil(this.destroy$)).subscribe({
                next: universes => {
                    this.universeOptions = universes
                        .map(universe => ({ ...universe, Id: Number(universe.Id) }))
                        .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
                    this.changeDetector.markForCheck();
                },
                error: () => this.universeOptions = []
            });
        }
    }

    private fillAuthor(author: Author): void {
        const language = typeof author.Idioma === 'object' ? author.Idioma?.Id : null;
        this.languageId.setValue(author.IdiomaId ?? (language ? Number(language) : null));
        const origin = typeof author.LugarOrigen === 'object' ? author.LugarOrigen?.Nombre : author.LugarOrigen;
        this.originPlace.setValue(author.LugarOrigenNombre ?? origin ?? '');
    }

    private toRow(item: Author | Universe | Saga): EntityRow {
        let detail = '';
        if (this.kind === 'authors') {
            const author = item as Author;
            const language = typeof author.Idioma === 'object' ? author.Idioma?.Nombre : author.Idioma;
            const origin = typeof author.LugarOrigen === 'object' ? author.LugarOrigen?.Nombre : author.LugarOrigen;
            detail = [language, origin].filter(Boolean).join(' · ');
        } else if (this.kind === 'sagas') {
            detail = (item as Saga).Subtitulo ?? '';
        }
        return { Id: Number(item.Id), Nombre: item.Nombre, detail, raw: item };
    }

    private finishLoading(): void {
        this.isLoading = false;
        this.changeDetector.markForCheck();
    }

    private failLoading(errorData: unknown): void {
        this.snackBar.openSnackBar(getApiErrorMessage(errorData, `Error al cargar ${this.config.plural}`), 'errorBar');
        this.rows = [];
        this.total = 0;
        this.finishLoading();
    }

    private revealEditor(): void {
        // Con el panel bajo el listado, lleva la vista al formulario.
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1399px)').matches)
            requestAnimationFrame(() => document.querySelector('.catalog-entities__editor')?.scrollIntoView({ block: 'start' }));
    }
}
