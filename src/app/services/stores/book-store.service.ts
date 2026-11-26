import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Book } from '../../interfaces/book';
import { Chapter } from '../../interfaces/chapter';
import { Character } from '../../interfaces/character';

@Injectable({
    providedIn: 'root'
})
export class BookStoreService {

    libroVacio: Book = {
        Id: 0,
        Nombre: '',
        Orden: -1,
        Autores: [],
        Estados: [],
        Personajes: [],
        Localizaciones: [],
        Organizaciones: [],
        Eventos: [],
        Conceptos: [],
        Citas: [],
        Capitulos: [],
        Interludios: [],
        Partes: [],
        Universo: {
            Id: 0,
            Nombre: 'Sin universo',
        },
        Saga: {
            Id: 0,
            Nombre: 'Sin saga',
        },
        Portada: ''
    };
    capituloVacio: Chapter = {
        Id: 0,
        Nombre: '',
        Orden: -2,
        Pagina: 0,
        Escenas: []
    }

    private bookSubject = new BehaviorSubject<Book>(this.libroVacio);
    book$ = this.bookSubject.asObservable();

    constructor() { }

    setBook(book: Book) {
        this.bookSubject.next(book);
    }

    getBook(): Book {
        return this.bookSubject.getValue();
    }

    clear(): void {
        this.bookSubject.next(this.libroVacio);
    }

    /**
     * Añade o actualiza un personaje del libro abierto sin recargar el libro entero.
     * Un personaje nuevo se crea siempre en el libro actual; lo que ya había en la lista
     * (origen, grupo, métricas) se conserva si la respuesta no lo trae.
     */
    upsertCharacter(bookId: number, character: Character): void {
        this.upsertBookItem(bookId, 'Personajes', character,
            created => ({ EsLibroActual: true, OrigenContexto: 'actual', EsSagaPrevia: false, EsSeccionOrigen: false, ...created } as Character));
    }

    /** Añade o actualiza una localización del libro abierto (la creada desde una escena) sin recargar el libro. */
    upsertLocation(bookId: number, location: Book['Localizaciones'][number]): void {
        this.upsertBookItem(bookId, 'Localizaciones', location);
    }

    /** Lo común de los dos de arriba: solo en el libro abierto, y lo que ya tenía el elemento se conserva si no viene. */
    private upsertBookItem<K extends 'Personajes' | 'Localizaciones'>(
        bookId: number, key: K, item: Book[K][number], asNew: (item: Book[K][number]) => Book[K][number] = created => created
    ): void {
        const book = this.getBook();
        if (book.Id !== bookId || !item?.Id)
            return;

        const items = (book[key] ?? []) as Array<Book[K][number]>;
        const index = items.findIndex(current => Number(current.Id) === Number(item.Id));
        const next = index >= 0
            ? items.map((current, position) => position === index ? { ...current, ...item } : current)
            : [...items, asNew(item)];
        this.bookSubject.next({ ...book, [key]: next });
    }

    getChapter(chapterId: number): Chapter {
        return this.getBook().Capitulos.find(c => +c.Id === chapterId) ?? this.capituloVacio;
    }

    getInterludeChapter(chapterId: number): Chapter {
        const book = this.getBook();
        if(!book.Interludios || book.Interludios.length === 0)
            return this.capituloVacio;
        return this.getBook().Interludios
            .flatMap(interlude => (interlude.Capitulos ?? []).map(chapter => ({ ...chapter, Id_Interludio: chapter.Id_Interludio ?? interlude.Id, EsInterludio: true })))
            .find(c => +c.Id === chapterId) ?? this.capituloVacio;
    }

    getInterludeIdForChapter(chapterId: number): number | null {
        const book = this.getBook();
        for (const interlude of book.Interludios ?? []) {
            if ((interlude.Capitulos ?? []).some(chapter => +chapter.Id === chapterId))
                return interlude.Id;
        }
        return null;
    }

    getPersonajeById(id: number) {
        return this.getBook().Personajes.find(p => p.Id === id);
    }

    getLocalizacionById(id: number) {
        return this.getBook().Localizaciones.find(l => l.Id === id);
    }

    getEventoById(id: number) {
        return this.getBook().Eventos.find(e => e.Id === id);
    }

    getCapituloById(id: number) {
        return this.getBook().Capitulos.find(c => c.Id === id);
    }

    getInterludioById(id: number) {
        return this.getBook().Interludios.find(i => i.Id === id);
    }

    getParteById(id: number) {
        return this.getBook().Partes.find(p => p.Id === id);
    }

    getPersonaje(nombre: string) {
        return this.getBook().Personajes.find(p => p.Nombre === nombre);
    }

    getLocalizacion(nombre: string) {
        return this.getBook().Localizaciones.find(l => l.Nombre === nombre);
    }

    getEvento(nombre: string) {
        return this.getBook().Eventos.find(e => e.Nombre === nombre);
    }
}
