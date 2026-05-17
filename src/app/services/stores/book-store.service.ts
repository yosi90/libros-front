import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Book } from '../../interfaces/book';
import { Chapter } from '../../interfaces/chapter';

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

    getChapter(chapterId: number): Chapter {
        return this.getBook().Capitulos.find(c => +c.Id === chapterId) ?? this.capituloVacio;
    }

    getInterludeChapter(chapterId: number): Chapter {
        const book = this.getBook();
        if(!book.Interludios || book.Interludios.length === 0)
            return this.capituloVacio;
        return this.getBook().Interludios.flatMap(i => i.Capitulos).find(c => +c.Id === chapterId) ?? this.capituloVacio;
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