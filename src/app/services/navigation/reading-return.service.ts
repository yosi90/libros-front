import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Book } from '../../interfaces/book';
import { BookStoreService } from '../stores/book-store.service';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

/** Libro que se estaba leyendo al salir al panel principal. */
export interface ParkedReading {
    bookId: number;
    url: string;
    bookName: string;
    cover: string;
    /** Dónde estaba: «Capítulo 11 · Indiscreciones», «Personajes»… */
    place: string;
}

const STORAGE_KEY = 'libros:parked-reading';

/** Ventana flotante del libro aparcado en escritorio (gestor de ventanas flotantes). */
export const READING_WINDOW_ID = 'reading';

const SECTION_LABELS: Record<string, string> = {
    statistics: 'Resumen', notes: 'Notas', search: 'Búsqueda',
    characters: 'Personajes', character: 'Personajes', organizations: 'Organizaciones', organization: 'Organizaciones',
    events: 'Eventos', event: 'Eventos', locations: 'Localizaciones', location: 'Localizaciones',
    concepts: 'Conceptos', concept: 'Conceptos', quotes: 'Citas', quote: 'Citas'
};

/**
 * Versión navegador de la píldora del lector de la APK: al salir de un libro
 * hacia el panel se recuerda dónde estaba para volver con un clic. En la APK lo
 * hace `NativeReaderSessionService`.
 */
@Injectable({ providedIn: 'root' })
export class ReadingReturnService {
    private readonly parkedSignal = signal<ParkedReading | null>(null);
    readonly parked = this.parkedSignal.asReadonly();
    private lastBookUrl: string | null = null;

    constructor(
        private router: Router,
        private books: BookStoreService,
        @Inject(DOCUMENT) private document: Document,
        @Inject(NATIVE_MOBILE_PLATFORM) nativeMobile: boolean
    ) {
        if (nativeMobile) return;
        this.parkedSignal.set(this.readStored());
        this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe(event => this.observe(event.urlAfterRedirects));
    }

    resume(): void {
        const parked = this.parkedSignal();
        if (parked) void this.router.navigateByUrl(parked.url);
    }

    dismiss(): void {
        this.store(null);
    }

    private observe(url: string): void {
        if (url.startsWith('/book/')) {
            this.lastBookUrl = url;
            // Dentro del libro no se muestra la ventana.
            if (this.parkedSignal()) this.store(null);
            return;
        }
        const left = this.lastBookUrl;
        this.lastBookUrl = null;
        if (!left || !url.startsWith('/dashboard')) {
            if (!url.startsWith('/dashboard')) this.store(null);
            return;
        }
        const book = this.books.getBook();
        const bookId = Number(left.split('/')[2]);
        if (!bookId || book.Id !== bookId) return;
        this.store({ bookId, url: left, bookName: book.Nombre, cover: book.Portada ?? '', place: this.placeLabel(left, book) });
    }

    private placeLabel(url: string, book: Book): string {
        const [section, id] = url.split('?')[0].split('/').slice(3);
        if (section === 'chapter' || section === 'interlude_chapter') {
            const chapters = [...book.Capitulos, ...book.Interludios.flatMap(interlude => interlude.Capitulos)];
            const chapter = chapters.find(item => item.Id === Number(id));
            return chapter ? `Capítulo ${chapter.Orden} · ${chapter.Nombre}` : 'Capítulo';
        }
        return SECTION_LABELS[section] ?? 'Resumen';
    }

    private store(value: ParkedReading | null): void {
        this.parkedSignal.set(value);
        try {
            const storage = this.document.defaultView?.sessionStorage;
            if (value) storage?.setItem(STORAGE_KEY, JSON.stringify(value));
            else storage?.removeItem(STORAGE_KEY);
        } catch { /* Sin almacenamiento: dura lo que la pestaña. */ }
    }

    private readStored(): ParkedReading | null {
        try {
            const raw = this.document.defaultView?.sessionStorage.getItem(STORAGE_KEY);
            const value = raw ? JSON.parse(raw) as ParkedReading : null;
            return value && Number.isInteger(value.bookId) && typeof value.url === 'string' ? value : null;
        } catch {
            return null;
        }
    }
}
