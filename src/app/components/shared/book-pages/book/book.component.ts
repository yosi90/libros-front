import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { SessionService } from '../../../../services/auth/session.service';
import { Book, DisplayGroup, DisplayItem } from '../../../../interfaces/book';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BookRouterComponent } from '../../../book-router/book-router.component';
import { environment } from '../../../../../environment/environment';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { filter, Observable, Subject, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BookService } from '../../../../services/entities/book.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { Chapter } from '../../../../interfaces/chapter';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { PartService } from '../../../../services/entities/part.service';
import { InterludeService } from '../../../../services/entities/interlude.service';
import { Part } from '../../../../interfaces/part';
import { Interlude } from '../../../../interfaces/interlude';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { CollectionService } from '../../../../services/entities/collection.service';
import { getLatestStatusId, toReadStatus } from '../../../../shared/reading-status';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileBookShellComponent } from '../../../mobile/book/mobile-book-shell/mobile-book-shell.component';
import { ExternalNavigationService } from '../../../../services/native/external-navigation.service';

type StructureEditorKind = 'part' | 'interlude';

interface EntityToolbarAction {
    label: string;
    icon: string;
    listRoute: string;
    createRoute: string;
}

@Component({
    standalone: true,
    selector: 'app-book',
    imports: [MatIconModule, MatButtonModule, BookRouterComponent, CommonModule, MatSidenavModule, SnackbarModule,
        MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule, FormsModule, MatTooltipModule, CoverCachePipe,
        MobileBookShellComponent
    ],
    templateUrl: './book.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './book.component.sass'
})
export class BookComponent implements OnInit, OnDestroy {
    imgUrl = environment.getImgUrl;
    maxOrder: number = 0;

    book: Book = {
        Id: 0,
        Nombre: '',
        Estados: [],
        Portada: '',
        Wiki: '',
        Autores: [],
        Capitulos: [],
        Partes: [],
        Interludios: [],
        Personajes: [],
        Localizaciones: [],
        Conceptos: [],
        Organizaciones: [],
        Eventos: [],
        Citas: [],
        Orden: 0,
        Universo: {
            Id: 0,
            Nombre: '',
        },
        Saga: {
            Id: 0,
            Nombre: '',
        }
    };
    actualStatus = '';
    entityToolbarActions: EntityToolbarAction[] = [
        { label: 'Personajes', icon: 'co_present', listRoute: 'characters', createRoute: 'character' },
        { label: 'Organizaciones', icon: 'groups', listRoute: 'organizations', createRoute: 'organization' },
        { label: 'Eventos', icon: 'event', listRoute: 'events', createRoute: 'event' },
        { label: 'Localizaciones', icon: 'my_location', listRoute: 'locations', createRoute: 'location' },
        { label: 'Conceptos', icon: 'auto_awesome', listRoute: 'concepts', createRoute: 'concept' },
        { label: 'Citas', icon: 'format_quote', listRoute: 'quotes', createRoute: 'quote' },
    ];

    displayList: DisplayItem[] = [];
    structureEditorKind: StructureEditorKind | null = null;
    editingStructureId: number | null = null;
    bookActionsOpen = false;
    bookIndexOpen = false;
    isSavingRunningStatus = false;
    structureForm: FormGroup = this.fBuild.group({
        nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        pagina: [1, [Validators.required, Validators.min(1)]],
        ordenInicio: [0, [Validators.min(0)]],
        ordenFinal: [0, [Validators.min(0)]],
        ordenCapituloPredecesor: [null],
        idPartePredecesor: [null],
    });

    private destroy$ = new Subject<void>();

    errorStatusMessage = '';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        public sessionSrv: SessionService,
        private bookSrv: BookService,
        private bookStore: BookStoreService,
        private loader: LoaderEmmitterService,
        private snackBar: SnackbarModule,
        private fBuild: FormBuilder,
        private partSrv: PartService,
        private interludeSrv: InterludeService,
        private collectionSrv: CollectionService,
        private adaptiveLayout: AdaptiveLayoutService,
        private presentation: PresentationModeService,
        private externalNavigation: ExternalNavigationService,
    ) {

    }

    ngOnInit(): void {
        this.adaptiveLayout.state$
            .pipe(takeUntil(this.destroy$))
            .subscribe(state => {
                this.bookActionsOpen = false;
                this.bookIndexOpen = state.isDesktop;
            });
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.bookActionsOpen = false;
            if (this.isCompactLayout) this.bookIndexOpen = false;
        });
        this.bookStore.book$
            .pipe(takeUntil(this.destroy$))
            .subscribe(book => {
                if (!book.Id || (this.book.Id && book.Id !== this.book.Id))
                    return;
                this.book = book;
                this.generateDisplayList();
            });
        this.route.paramMap.subscribe(params => {
            const bookId = Number(params.get('id'));
            if (bookId) {
                this.loadBook(bookId);
            } else {
                this.snackBar.openSnackBar('ID del libro inválido', 'errorBar');
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    handleCoverImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    generateDisplayList(): void {
        let capitulos = [...this.book.Capitulos].map(ch => ({ ...ch, Orden: Number(ch.Orden) }));

        const partes = [...this.book.Partes].map(p => ({
            ...p,
            Orden_inicio: Number(p.Orden_inicio),
            Orden_final: Number(p.Orden_final),
        }));
        const interludios = this.book.Interludios.map(i => ({
            ...i,
            Orden_cap: i.Orden_cap !== null ? Number(i.Orden_cap) : null,
            Orden_part: i.Orden_part !== null ? Number(i.Orden_part) : null,
            Capitulos: i.Capitulos.map(ch => ({ ...ch, Orden: Number(ch.Orden) })),
        }));

        this.displayList = [];

        this.maxOrder = capitulos.length > 0 ? Math.max(...capitulos.map(c => c.Orden)) : 0;

        for (let i = this.maxOrder; i >= -1; i--) {
            const idx = capitulos.findIndex(c => c.Orden === i);
            const capitulo = capitulos.splice(idx, 1)[0];
            const parte = partes.find(p =>
                (p.Orden_final === 0 && i >= p.Orden_inicio) ||
                (i >= p.Orden_inicio && i <= p.Orden_final)
            );

            if (parte) {
                let existingPart = this.displayList.find(p => p.type === 'part' && p.id === parte.Id) as DisplayGroup;

                if (parte.Orden_final === i) {
                    const interludioParte = interludios.find(i => i.Orden_part === parte.Id);
                    if (interludioParte) {
                        this.displayList.push({
                            type: 'interlude',
                            name: interludioParte.Nombre,
                            id: interludioParte.Id,
                            data: interludioParte.Capitulos.sort((a, b) => b.Orden - a.Orden).map(ch => ({ type: 'chapter', data: ch }))
                        });
                    }
                }

                if (!existingPart) {
                    existingPart = {
                        type: 'part',
                        name: parte.Nombre,
                        id: parte.Id,
                        data: []
                    };
                    this.displayList.push(existingPart);
                }

                if (capitulo) {
                    const interludioCap = interludios.find(i => i.Orden_cap === capitulo.Orden);
                    if (interludioCap) {
                        existingPart.data.push({
                            type: 'interlude',
                            name: interludioCap.Nombre,
                            id: interludioCap.Id,
                            data: interludioCap.Capitulos.sort((a, b) => b.Orden - a.Orden).map(ch => ({ type: 'chapter', data: ch }))
                        });
                    }

                    existingPart.data.push({ type: 'chapter', data: capitulo });
                }
            } else if (capitulo) {
                this.displayList.push({ type: 'chapter', data: capitulo });

                const interludioCap = interludios.find(i => i.Orden_cap === capitulo.Orden);
                if (interludioCap) {
                    this.displayList.push({
                        type: 'interlude',
                        name: interludioCap.Nombre,
                        id: interludioCap.Id,
                        data: interludioCap.Capitulos.sort((a, b) => b.Orden - a.Orden).map(ch => ({ type: 'chapter', data: ch }))
                    });
                }
            }
        }

        interludios
            .filter(interlude => interlude.Orden_cap === null && interlude.Orden_part === null)
            .forEach(interlude => this.displayList.push({
                type: 'interlude',
                name: interlude.Nombre,
                id: interlude.Id,
                data: interlude.Capitulos.sort((a, b) => b.Orden - a.Orden).map(ch => ({ type: 'chapter', data: ch }))
            }));
    }

    getChapterOrderLabel(chapter: Chapter): number | null {
        return chapter.Orden > 0 && !(chapter.Orden === this.maxOrder && chapter.Nombre === 'Epílogo')
            ? chapter.Orden
            : null;
    }

    getChapterTitle(chapter: Chapter): string {
        return chapter.Nombre === `Capítulo ${chapter.Orden}` ? 'Capítulo' : chapter.Nombre;
    }

    getChapterNavigationLabel(chapter: Chapter): string {
        const order = this.getChapterOrderLabel(chapter);
        return order ? `${order}. ${this.getChapterTitle(chapter)}` : this.getChapterTitle(chapter);
    }










    addChapter(): void {
        this.router.navigate(['chapter'], { relativeTo: this.route });
    }

    addPart(): void {
        this.openStructureEditor('part');
    }

    addInterlude(): void {
        this.openStructureEditor('interlude');
    }

    addInterludeChapter(interludeId: number): void {
        this.router.navigate(['interlude', interludeId, 'chapter'], { relativeTo: this.route });
    }

    openStructureEditor(kind: StructureEditorKind, id?: number): void {
        this.structureEditorKind = kind;
        this.editingStructureId = id ?? null;

        if (kind === 'part') {
            const part = id ? this.bookStore.getParteById(id) : undefined;
            this.structureForm.patchValue({
                nombre: part?.Nombre ?? `Parte ${this.book.Partes.length + 1}`,
                pagina: part?.Pagina ?? 1,
                ordenInicio: part?.Orden_inicio ?? 1,
                ordenFinal: part?.Orden_final ?? 0,
                ordenCapituloPredecesor: null,
                idPartePredecesor: null
            });
            return;
        }

        const interlude = id ? this.bookStore.getInterludioById(id) : undefined;
        this.structureForm.patchValue({
            nombre: interlude?.Nombre ?? `Interludio ${this.book.Interludios.length + 1}`,
            pagina: interlude?.Pagina ?? 1,
            ordenInicio: 0,
            ordenFinal: 0,
            ordenCapituloPredecesor: interlude?.Orden_cap ?? null,
            idPartePredecesor: interlude?.Orden_part ?? null
        });
    }

    closeStructureEditor(): void {
        this.structureEditorKind = null;
        this.editingStructureId = null;
    }

    selectDefaultStructureName(event: FocusEvent): void {
        if (this.editingStructureId)
            return;
        const input = event.target as HTMLInputElement | null;
        const expected = this.structureEditorKind === 'part'
            ? `Parte ${this.book.Partes.length + 1}`
            : `Interludio ${this.book.Interludios.length + 1}`;
        if (input?.value === expected)
            input.select();
    }

    saveStructure(): void {
        if (!this.structureEditorKind || this.structureForm.invalid) {
            this.snackBar.openSnackBar('Revisa los datos del formulario', 'errorBar');
            return;
        }

        this.loader.activateLoader();
        const value = this.structureForm.getRawValue();
        const request: Observable<unknown> = this.structureEditorKind === 'part'
            ? this.savePart(value)
            : this.saveInterlude(value);

        request.subscribe({
            next: () => this.refreshBookAfterStructureSave(),
            error: () => {
                this.snackBar.openSnackBar('Error al guardar la estructura del libro', 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    private savePart(value: any) {
        const payload = {
            Nombre: value.nombre,
            OrdenInicio: Number(value.ordenInicio),
            OrdenFinal: Number(value.ordenFinal),
            Pagina: Number(value.pagina)
        };

        return this.editingStructureId
            ? this.partSrv.update(this.editingStructureId, payload)
            : this.partSrv.createForBook(this.book.Id, payload);
    }

    private saveInterlude(value: any) {
        const payload = {
            Nombre: value.nombre,
            Pagina: Number(value.pagina),
            OrdenCapituloPredecesor: value.ordenCapituloPredecesor === null || value.ordenCapituloPredecesor === '' ? null : Number(value.ordenCapituloPredecesor),
            IdPartePredecesor: value.idPartePredecesor === null || value.idPartePredecesor === '' ? null : Number(value.idPartePredecesor)
        };

        return this.editingStructureId
            ? this.interludeSrv.update(this.editingStructureId, payload)
            : this.interludeSrv.createForBook(this.book.Id, payload);
    }

    private refreshBookAfterStructureSave(): void {
        this.bookSrv.getBook(this.book.Id).subscribe({
            next: book => {
                this.book = book;
                this.bookStore.setBook(book);
                this.generateDisplayList();
                this.closeStructureEditor();
                this.snackBar.openSnackBar('Estructura del libro actualizada', 'successBar');
                this.loader.deactivateLoader();
            },
            error: () => {
                this.snackBar.openSnackBar('Guardado, pero no se pudo refrescar el libro', 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    private loadBook(bookId: number): void {
        this.book = this.bookStore.getBook();
        if (this.book.Id >= 1 && bookId === this.book.Id) {
            this.generateDisplayList();
            this.loader.deactivateLoader();
            return;
        }

        this.loader.activateLoader('book');
        this.bookSrv.getBook(bookId).subscribe({
            next: (book) => {
                this.book = book;
                this.generateDisplayList();
                this.bookStore.setBook(book);
                this.loader.deactivateLoader();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al cargar los datos del libro', 'errorBar');
                this.loader.deactivateLoader();
                void this.router.navigate(['/dashboard', 'books']);
            }
        });
    }

    addCharacter(): void {
        this.router.navigate(['character'], { relativeTo: this.route });
    }

    navigateBookChild(route: string): void {
        this.bookActionsOpen = false;
        const currentChildRoute = this.router.url.split('?')[0].split('/').pop();
        if (currentChildRoute === route) {
            this.router.navigate([route], {
                relativeTo: this.route,
                queryParams: { view: Date.now() }
            });
            return;
        }

        this.router.navigate([route], { relativeTo: this.route });
    }

    isBookChildActive(route: string): boolean {
        return this.router.url.split('?')[0].split('/').pop() === route;
    }

    hasBookWikiLink(): boolean {
        const wiki = this.getBookWikiUrl();
        return !!wiki && !this.isDefaultWikiUrl(wiki);
    }

    openBookWiki(): void {
        if (!this.hasBookWikiLink())
            return;

        void this.externalNavigation.open(this.toExternalUrl(this.getBookWikiUrl()));
    }

    toggleBookIndex(): void {
        this.bookIndexOpen = !this.bookIndexOpen;
    }

    get isDesktopLayout(): boolean { return this.adaptiveLayout.snapshot.isDesktop; }
    get isCompactLayout(): boolean { return this.adaptiveLayout.snapshot.isCompact; }
    get bookIndexMode(): 'side' | 'over' { return this.isCompactLayout ? 'over' : 'side'; }
    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }

    toggleBookActions(): void { this.bookActionsOpen = !this.bookActionsOpen; }

    backToLibrary(): void { void this.router.navigate(['/dashboard/books']); }

    getBookIndexToggleIcon(): string {
        return this.bookIndexOpen ? 'menu_open' : 'read_more';
    }

    isChapterActive(chapterId: number): boolean {
        return this.router.url === `/book/${this.book?.Id}/chapter/${chapterId}`;
    }

    isInterludeChapterActive(chapterId: number): boolean {
        return this.router.url === `/book/${this.book?.Id}/interlude_chapter/${chapterId}`;
    }

    openChapter(chapterId: number): void {
        if (this.isCompactLayout) this.bookIndexOpen = false;
        this.router.navigateByUrl(`/book/${this.book?.Id}/chapter/${chapterId}`);
    }

    openInterludeChapter(chapterId: number): void {
        if (this.isCompactLayout) this.bookIndexOpen = false;
        this.router.navigateByUrl(`/book/${this.book?.Id}/interlude_chapter/${chapterId}`);
    }

    openCharacter(characterId: number): void {
        this.router.navigate(['/book', this.book?.Id, 'characters'], { queryParams: { selected: characterId } });
    }

    isBookRunning(): boolean {
        return getLatestStatusId(this.book.Estados) === 1;
    }

    startBookReading(): void {
        if (!this.book.Id || this.isSavingRunningStatus || this.isBookRunning())
            return;

        this.isSavingRunningStatus = true;
        this.collectionSrv.updateBookStatus(this.book.Id, { EstadoId: 1 }).subscribe({
            next: response => {
                this.book = {
                    ...this.book,
                    Estados: [...(this.book.Estados ?? []), toReadStatus({
                        ...response.Estado,
                        Fecha: response.Estado.Fecha ?? new Date().toISOString()
                    })]
                };
                this.bookStore.setBook(this.book);
                this.snackBar.openSnackBar('Libro puesto en marcha', 'successBar');
            },
            error: () => {
                this.snackBar.openSnackBar('Error al poner el libro en marcha', 'errorBar');
            },
            complete: () => {
                this.isSavingRunningStatus = false;
            }
        });
    }

    private getBookWikiUrl(): string {
        return (this.book.Wiki ?? '').trim();
    }

    private isDefaultWikiUrl(value: string): boolean {
        try {
            const url = new URL(this.toExternalUrl(value));
            return url.hostname.replace(/^www\./, '').toLocaleLowerCase() === 'google.es';
        } catch {
            return this.normalizeLooseUrl(value) === 'google.es';
        }
    }

    private toExternalUrl(value: string): string {
        const trimmedValue = value.trim();
        return /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
    }

    private normalizeLooseUrl(value: string): string {
        return value
            .trim()
            .replace(/^https?:\/\//i, '')
            .replace(/^www\./i, '')
            .replace(/\/+$/, '')
            .toLocaleLowerCase();
    }
}
