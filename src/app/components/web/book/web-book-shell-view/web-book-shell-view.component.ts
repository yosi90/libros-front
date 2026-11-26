import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BookRouterComponent } from '../../../book-router/book-router.component';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import type { BookComponent } from '../../../shared/book-pages/book/book.component';
import { BookSaveIndicatorService } from '../../../../services/ui/book-save-indicator.service';
import { BookElementTypePreferenceService } from '../../../../services/preferences/book-element-type-preference.service';
import { BOOK_ELEMENT_TYPES, BookElementType, bookElementCount, bookElementTypeOf } from '../../../../shared/book-element-types';
import type { Chapter } from '../../../../interfaces/chapter';
import { SwipeToCloseDirective } from '../../ui/swipe-to-close.directive';
import { OpenPopoverDirective } from '../../ui/open-popover.directive';
import { YosiftwareAccountComponent } from '../../../shared/common/yosiftware-account/yosiftware-account.component';
import { YosiftwareNotificationsComponent } from '../../../shared/common/yosiftware-notifications/yosiftware-notifications.component';
import { YosiftwareWebsComponent } from '../../../shared/common/yosiftware-webs/yosiftware-webs.component';

export type BookDestination = 'capitulos' | 'elementos' | 'notas' | 'resumen';

/** Un capítulo del índice en orden de lectura, con o sin interludio. */
interface ChapterStop {
    chapter: Chapter;
    interlude: boolean;
}

const CHAPTER_ROUTES = ['chapter', 'interlude_chapter', 'interlude'];

/**
 * Marco Web del libro («Cuaderno», F1): cabecera con los cuatro destinos (Capítulos, Elementos, Notas y Resumen),
 * que por debajo de 600 px bajan a una barra inferior. El índice solo existe en Capítulos: columna en escritorio y
 * panel superpuesto, desde la barra «1 de 5», en el resto. Elementos reúne los seis tipos y vuelve al último usado.
 */
@Component({
    selector: 'app-web-book-shell-view',
    standalone: true,
    imports: [YosiftwareAccountComponent, YosiftwareNotificationsComponent, YosiftwareWebsComponent, SwipeToCloseDirective, OpenPopoverDirective,
        CommonModule, ReactiveFormsModule, MatIconModule, MatMenuModule, MatTooltipModule, BookRouterComponent, CoverCachePipe],
    templateUrl: './web-book-shell-view.component.html',
    styleUrl: './web-book-shell-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebBookShellViewComponent {
    @Input({ required: true }) controller!: BookComponent;

    readonly destinations: ReadonlyArray<{ key: BookDestination; label: string; icon: string }> = [
        { key: 'capitulos', label: 'Capítulos', icon: 'menu_book' },
        { key: 'elementos', label: 'Elementos', icon: 'category' },
        { key: 'notas', label: 'Notas', icon: 'sticky_note_2' },
        { key: 'resumen', label: 'Resumen', icon: 'query_stats' },
    ];
    readonly elementTypes = BOOK_ELEMENT_TYPES;
    /** El botón que abrió el editor de parte o interludio: el desplegable se ancla a él. */
    structureAnchor: HTMLElement | null = null;

    /** El último capítulo abierto en este libro: «Capítulos» vuelve a él. */
    private lastChapter: { bookId: number; url: string } | null = null;
    private sequenceSource: unknown = null;
    private sequenceCache: ChapterStop[] = [];

    constructor(public saveIndicator: BookSaveIndicatorService, private router: Router, private elementType: BookElementTypePreferenceService) {
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            takeUntilDestroyed(inject(DestroyRef))
        ).subscribe(() => this.rememberPlace());
    }

    ngOnInit(): void {
        this.rememberPlace();
    }

    get c(): BookComponent { return this.controller; }

    get authorNames(): string {
        return (this.c.book.Autores ?? []).map(author => author.Nombre).filter(Boolean).join(', ');
    }

    /** Primer segmento tras `/book/:id`: `characters`, `character`, `chapter`… */
    get activeSection(): string {
        const segments = this.router.url.split('?')[0].split('/');
        return segments[3] ?? '';
    }

    /** El destino de la ruta actual; la búsqueda no es ninguno. */
    get activeDestination(): BookDestination | null {
        const section = this.activeSection;
        if (CHAPTER_ROUTES.includes(section)) return 'capitulos';
        if (bookElementTypeOf(section)) return 'elementos';
        if (section === 'notes') return 'notas';
        if (section === 'statistics') return 'resumen';
        return null;
    }

    get activeElementType(): BookElementType | undefined {
        return bookElementTypeOf(this.activeSection);
    }

    get isSearchActive(): boolean { return this.activeSection === 'search'; }

    /** El índice solo vive en Capítulos; en escritorio es una columna (o su carril, plegado). */
    get showsIndex(): boolean { return this.activeDestination === 'capitulos'; }

    get isOverlayIndex(): boolean { return !this.c.isDesktopLayout; }

    get showsSavedInHeader(): boolean {
        return this.saveIndicator.isVisibleFor(this.c.book.Id) && (this.c.isDesktopLayout || !this.showsIndex);
    }

    elementCount(type: BookElementType): number {
        return bookElementCount(this.c.book, type);
    }

    openDestination(destination: BookDestination): void {
        if (destination === 'capitulos') {
            this.openChapters();
            return;
        }
        if (destination === 'elementos') {
            this.c.navigateBookChild(this.elementType.listRoute);
            return;
        }
        this.c.navigateBookChild(destination === 'notas' ? 'notes' : 'statistics');
    }

    openElementType(type: BookElementType): void {
        this.c.navigateBookChild(type.listRoute);
    }

    // ---------- Capítulos ----------

    /** Los capítulos en orden de lectura (el índice los enseña del último al primero). */
    get chapterSequence(): ChapterStop[] {
        if (this.sequenceSource !== this.c.displayList) {
            this.sequenceSource = this.c.displayList;
            const stops: ChapterStop[] = [];
            const walk = (items: ReadonlyArray<any>, interlude: boolean) => {
                for (const item of items) {
                    if (item.type === 'chapter') stops.push({ chapter: item.data, interlude });
                    else walk(item.data ?? [], interlude || item.type === 'interlude');
                }
            };
            walk(this.c.displayList, false);
            this.sequenceCache = stops.reverse();
        }
        return this.sequenceCache;
    }

    get currentChapterIndex(): number {
        return this.chapterSequence.findIndex(stop => this.isStopActive(stop));
    }

    /** «Capítulo 3 de 12», «Capítulo nuevo» o «Índice» si aún no hay capítulos. */
    get chapterPosition(): { lead: string; text: string } {
        const total = this.chapterSequence.length;
        const index = this.currentChapterIndex;
        if (index >= 0) return { lead: 'Capítulo ', text: `${index + 1} de ${total}` };
        if (this.activeSection === 'chapter' || this.activeSection === 'interlude') return { lead: 'Capítulo ', text: 'nuevo' };
        return { lead: '', text: 'Índice' };
    }

    get previousChapter(): ChapterStop | null {
        const index = this.currentChapterIndex;
        return index > 0 ? this.chapterSequence[index - 1] : null;
    }

    get nextChapter(): ChapterStop | null {
        const index = this.currentChapterIndex;
        return index >= 0 && index < this.chapterSequence.length - 1 ? this.chapterSequence[index + 1] : null;
    }

    openStop(stop: ChapterStop | null): void {
        if (!stop) return;
        if (stop.interlude) this.c.openInterludeChapter(stop.chapter.Id);
        else this.c.openChapter(stop.chapter.Id);
    }

    isStopActive(stop: ChapterStop): boolean {
        return stop.interlude ? this.c.isInterludeChapterActive(stop.chapter.Id) : this.c.isChapterActive(stop.chapter.Id);
    }

    /** Capítulos: el último abierto en este libro, si no el último del índice y, sin capítulos, uno nuevo. */
    private openChapters(): void {
        if (this.showsIndex) {
            if (this.isOverlayIndex) this.c.toggleBookIndex();
            return;
        }
        if (this.lastChapter?.bookId === this.c.book.Id) {
            void this.router.navigateByUrl(this.lastChapter.url);
            return;
        }
        const sequence = this.chapterSequence;
        if (sequence.length) this.openStop(sequence[sequence.length - 1]);
        else this.c.navigateBookChild('chapter');
    }

    private rememberPlace(): void {
        if (!this.controller) return;
        const section = this.activeSection;
        const type = bookElementTypeOf(section);
        if (type) this.elementType.remember(type.listRoute);
        const url = this.router.url.split('?')[0];
        if ((section === 'chapter' || section === 'interlude_chapter') && /\/\d+$/.test(url))
            this.lastChapter = { bookId: this.c.book.Id, url };
    }

    // ---------- Partes e interludios ----------

    openStructure(kind: 'part' | 'interlude', anchor: HTMLElement, id?: number): void {
        this.structureAnchor = anchor;
        this.c.openStructureEditor(kind, id);
    }

    /** Los capítulos principales por orden, para «Desde el capítulo», «Hasta» y «Tras el capítulo». */
    get mainChapters(): Chapter[] {
        return [...(this.c.book.Capitulos ?? [])]
            .filter(chapter => Number(chapter.Orden) > 0)
            .sort((a, b) => Number(a.Orden) - Number(b.Orden));
    }

    chapterOptions(from = 0, current?: unknown): Array<{ value: number; label: string }> {
        const options = this.mainChapters
            .filter(chapter => Number(chapter.Orden) >= from)
            .map(chapter => ({ value: Number(chapter.Orden), label: `${chapter.Orden} · ${this.c.getChapterTitle(chapter)}` }));
        const value = Number(current);
        if (value > 0 && !options.some(option => option.value === value))
            options.push({ value, label: String(value) });
        return options.sort((a, b) => a.value - b.value);
    }

    get structureTitle(): string {
        const editing = !!this.c.editingStructureId;
        return this.c.structureEditorKind === 'part'
            ? (editing ? 'Editar parte' : 'Nueva parte')
            : (editing ? 'Editar interludio' : 'Nuevo interludio');
    }

    saveStructure(form: HTMLFormElement): void {
        if (this.c.structureForm.invalid) {
            this.c.structureForm.markAllAsTouched();
            form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
            return;
        }
        this.c.saveStructure();
    }

    @HostListener('document:keydown.escape')
    closeOverlays(): void {
        if (this.c.structureEditorKind) {
            this.c.closeStructureEditor();
            return;
        }
        if (this.isOverlayIndex && this.c.bookIndexOpen) this.c.bookIndexOpen = false;
    }
}
