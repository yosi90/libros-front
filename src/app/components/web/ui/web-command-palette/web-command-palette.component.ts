import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, ViewChild, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { CatalogItem } from '../../../../interfaces/catalog';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { CatalogViewStateService } from '../../../../shared/catalog-view-state.service';
import { normalizeLibraryText } from '../../../../shared/library-search';

export interface CommandPaletteItem {
    id: string;
    group: string;
    icon: string;
    label: string;
    detail?: string;
    run: () => void;
}

/** Solo escritorio: pantalla ancha y ratón. En táctil y en la APK no existe. */
const DESKTOP_QUERY = '(min-width: 1051px) and (pointer: fine)';
const CATALOG_MIN_QUERY = 2;
const GROUP_LIMIT = 8;

/**
 * Paleta de órdenes (Ctrl+K / ⌘K) de escritorio en Web y Wood: salta a secciones,
 * a capítulos y personajes del libro abierto, a libros de la biblioteca y busca
 * en el catálogo.
 */
@Component({
    selector: 'app-web-command-palette',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './web-command-palette.component.html',
    styleUrl: './web-command-palette.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebCommandPaletteComponent {
    @ViewChild('input') private input?: ElementRef<HTMLInputElement>;

    readonly open = signal(false);
    readonly query = signal('');
    readonly activeIndex = signal(0);
    readonly catalogResults = signal<CatalogItem[]>([]);
    readonly catalogLoading = signal(false);

    readonly items = computed<CommandPaletteItem[]>(() => {
        if (!this.open()) return [];
        const terms = normalizeLibraryText(this.query().trim()).split(/\s+/).filter(Boolean);
        const matches = (text: string) => terms.every(term => normalizeLibraryText(text).includes(term));
        const pick = (list: CommandPaletteItem[], limit = GROUP_LIMIT) =>
            (terms.length ? list.filter(item => matches(`${item.label} ${item.detail ?? ''}`)) : list).slice(0, limit);

        const bookItems = this.bookItems();
        const results = [
            ...pick(this.destinations()),
            ...pick(bookItems.filter(item => item.group === 'Libro abierto')),
            ...(terms.length ? pick(bookItems.filter(item => item.group !== 'Libro abierto')) : []),
            ...(terms.length ? pick(this.libraryItems()) : [])
        ];
        const ownIds = new Set(this.universes.getAllBooks().map(book => book.Id));
        const catalog = terms.length ? this.catalogResults()
            .filter(item => !(item.Tipo === 'libro' && ownIds.has(item.Id)))
            .slice(0, 6)
            .map(item => this.catalogItem(item)) : [];
        return [...results, ...catalog];
    });

    private readonly catalogQuery$ = new Subject<string>();
    private returnFocus: HTMLElement | null = null;

    constructor(
        private router: Router,
        private presentation: PresentationModeService,
        private books: BookStoreService,
        private universes: UniverseStoreService,
        private catalog: CatalogService,
        private catalogState: CatalogViewStateService,
        destroyRef: DestroyRef
    ) {
        this.catalogQuery$.pipe(
            debounceTime(250),
            distinctUntilChanged(),
            switchMap(query => {
                if (query.length < CATALOG_MIN_QUERY) {
                    this.catalogLoading.set(false);
                    return of([]);
                }
                this.catalogLoading.set(true);
                return this.catalog.getBooks({ q: query }).pipe(catchError(() => of([] as CatalogItem[])));
            }),
            takeUntilDestroyed(destroyRef)
        ).subscribe(results => {
            this.catalogLoading.set(false);
            this.catalogResults.set(results);
        });
    }

    get available(): boolean {
        const mode = this.presentation.snapshot.activeMode;
        const inApp = /^\/(dashboard|book)(\/|$)/.test(this.router.url);
        return (mode === 'web' || mode === 'wood') && inApp && typeof matchMedia === 'function' && matchMedia(DESKTOP_QUERY).matches;
    }

    @HostListener('document:keydown', ['$event'])
    onDocumentKeydown(event: KeyboardEvent): void {
        const shortcut = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';
        if (!shortcut) return;
        if (this.open()) {
            event.preventDefault();
            this.close();
            return;
        }
        if (!this.available) return;
        event.preventDefault();
        this.show();
    }

    show(): void {
        this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.query.set('');
        this.catalogResults.set([]);
        this.activeIndex.set(0);
        this.open.set(true);
        setTimeout(() => this.input?.nativeElement.focus());
    }

    close(): void {
        if (!this.open()) return;
        this.open.set(false);
        this.catalogQuery$.next('');
        const target = this.returnFocus;
        this.returnFocus = null;
        if (target?.isConnected) setTimeout(() => target.focus());
    }

    onQuery(value: string): void {
        this.query.set(value);
        this.activeIndex.set(0);
        this.catalogQuery$.next(value.trim());
    }

    onKeydown(event: KeyboardEvent): void {
        const count = this.items().length;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.close();
        } else if (event.key === 'ArrowDown' && count) {
            event.preventDefault();
            this.moveTo((this.activeIndex() + 1) % count);
        } else if (event.key === 'ArrowUp' && count) {
            event.preventDefault();
            this.moveTo((this.activeIndex() - 1 + count) % count);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const item = this.items()[this.activeIndex()];
            if (item) this.select(item);
        }
    }

    select(item: CommandPaletteItem): void {
        this.close();
        item.run();
    }

    moveTo(index: number): void {
        this.activeIndex.set(index);
        setTimeout(() => document.getElementById(this.optionId(index))?.scrollIntoView({ block: 'nearest' }));
    }

    optionId(index: number): string {
        return `command-palette-option-${index}`;
    }

    /** Muestra la cabecera del grupo en su primer resultado. */
    startsGroup(index: number): boolean {
        const items = this.items();
        return index === 0 || items[index - 1].group !== items[index].group;
    }

    private go(commands: unknown[], extras: { queryParams?: Record<string, unknown> } = {}): void {
        void this.router.navigate(commands, extras);
    }

    private destinations(): CommandPaletteItem[] {
        const group = 'Ir a';
        return [
            { id: 'nav-library', group, icon: 'auto_stories', label: 'Biblioteca', run: () => this.go(['/dashboard/books']) },
            { id: 'nav-catalog', group, icon: 'travel_explore', label: 'Catálogo', run: () => this.go(['/dashboard/catalog']) },
            { id: 'nav-statistics', group, icon: 'insights', label: 'Estadísticas', run: () => this.go(['/dashboard/statistics']) },
            { id: 'nav-profile', group, icon: 'person', label: 'Perfil', run: () => this.go(['/dashboard/profile']) }
        ];
    }

    private bookItems(): CommandPaletteItem[] {
        const book = this.books.getBook();
        if (!book.Id || !this.router.url.startsWith(`/book/${book.Id}`)) return [];
        const base = ['/book', book.Id];
        const sections: CommandPaletteItem[] = [
            { id: 'book-summary', group: 'Libro abierto', icon: 'insights', label: 'Resumen', run: () => this.go([...base, 'statistics']) },
            { id: 'book-notes', group: 'Libro abierto', icon: 'sticky_note_2', label: 'Notas', run: () => this.go([...base, 'notes']) },
            { id: 'book-search', group: 'Libro abierto', icon: 'manage_search', label: 'Buscar en el libro', run: () => this.go([...base, 'search']) },
            { id: 'book-characters', group: 'Libro abierto', icon: 'theater_comedy', label: 'Personajes', run: () => this.go([...base, 'characters']) }
        ];
        const chapters: CommandPaletteItem[] = [...(book.Capitulos ?? [])]
            .sort((a, b) => a.Orden - b.Orden)
            .map(chapter => ({
                id: `chapter-${chapter.Id}`, group: 'Capítulos', icon: 'article', label: chapter.Nombre || `Capítulo ${chapter.Orden}`,
                detail: chapter.Pagina ? `Página ${chapter.Pagina}` : undefined,
                run: () => this.go([...base, 'chapter', chapter.Id])
            }));
        const interludes: CommandPaletteItem[] = (book.Interludios ?? []).flatMap(interlude => (interlude.Capitulos ?? []).map(chapter => ({
            id: `interlude-${chapter.Id}`, group: 'Capítulos', icon: 'article', label: chapter.Nombre || interlude.Nombre,
            detail: interlude.Nombre, run: () => this.go([...base, 'interlude_chapter', chapter.Id])
        })));
        const characters: CommandPaletteItem[] = (book.Personajes ?? []).map(character => ({
            id: `character-${character.Id}`, group: 'Personajes', icon: 'person', label: character.Nombre,
            detail: character.Apodos?.map(alias => alias.Apodo).filter(Boolean).join(', ') || undefined,
            run: () => this.go([...base, 'characters'], { queryParams: { selected: character.Id } })
        }));
        return [...sections, ...chapters, ...interludes, ...characters];
    }

    private libraryItems(): CommandPaletteItem[] {
        const group = 'Biblioteca';
        const books: CommandPaletteItem[] = this.universes.getAllBooks().map(book => ({
            id: `library-book-${book.Id}`, group, icon: 'menu_book', label: book.Nombre,
            detail: book.Autores?.map(author => author.Nombre).join(', ') || undefined,
            run: () => this.go(['/book', book.Id])
        }));
        const anthologies: CommandPaletteItem[] = this.universes.getAllAnthologies().map(anthology => ({
            id: `library-anthology-${anthology.Id}`, group, icon: 'library_books', label: anthology.Nombre, detail: 'Antología',
            run: () => {
                this.catalogState.setPendingLibraryReveal({ type: 'antology', id: anthology.Id });
                this.go(['/dashboard/books']);
            }
        }));
        return [...books, ...anthologies];
    }

    private catalogItem(item: CatalogItem): CommandPaletteItem {
        return {
            id: `catalog-${item.Tipo}-${item.Id}`, group: 'Catálogo', icon: 'travel_explore', label: item.Nombre,
            detail: item.Autores?.map(author => author.Nombre).join(', ') || undefined,
            run: () => {
                this.catalogState.setPendingDetail(item);
                this.go(['/dashboard/catalog']);
            }
        };
    }
}
