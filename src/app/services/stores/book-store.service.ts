import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Book } from '../../interfaces/book';

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

    private bookSubject = new BehaviorSubject<Book>(this.libroVacio);
    book$ = this.bookSubject.asObservable();

    constructor() { }

    setBook(book: Book) {
        this.bookSubject.next(book);
    }

    getLibro(): Book {
        return this.bookSubject.getValue();
    }

    clear(): void {
        this.bookSubject.next(this.libroVacio);
    }

    getPersonajeById(id: number) {
        return this.getLibro().Personajes.find(p => p.Id === id);
    }

    getLocalizacionById(id: number) {
        return this.getLibro().Localizaciones.find(l => l.Id === id);
    }

    getEventoById(id: number) {
        return this.getLibro().Eventos.find(e => e.Id === id);
    }

    getCapituloById(id: number) {
        return this.getLibro().Capitulos.find(c => c.Id === id);
    }

    getInterludioById(id: number) {
        return this.getLibro().Interludios.find(i => i.Id === id);
    }

    getParteById(id: number) {
        return this.getLibro().Partes.find(p => p.Id === id);
    }

    getPersonaje(nombre: string) {
        return this.getLibro().Personajes.find(p => p.Nombre === nombre);
    }

    getLocalizacion(nombre: string) {
        return this.getLibro().Localizaciones.find(l => l.Nombre === nombre);
    }

    getEvento(nombre: string) {
        return this.getLibro().Eventos.find(e => e.Nombre === nombre);
    }
}