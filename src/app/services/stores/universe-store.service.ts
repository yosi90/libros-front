import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { Universe } from '../../interfaces/universe';
import { Saga } from '../../interfaces/saga';
import { BookSimple } from '../../interfaces/book';
import { Antology } from '../../interfaces/antology';

@Injectable({
    providedIn: 'root'
})
export class UniverseStoreService {
    private universesSubject = new BehaviorSubject<Universe[]>([]);
    universes$ = this.universesSubject.asObservable();
    sagas$ = this.universes$.pipe(
        map(universes => universes.flatMap(u => u.Sagas || []))
    );
    
    setUniverses(universes: Universe[]) {
        this.universesSubject.next(universes);
    }

    getUniverses(): Universe[] {
        return this.universesSubject.getValue();
    }

    getAllSagas(): Saga[] {
        const allSagas = this.getUniverses()
            .flatMap(u => u.Sagas || []);
        return allSagas;
    }

    getAllBooks(): BookSimple[] {
        const booksFromUniverses = this.getUniverses()
            .flatMap(u => u.Libros || []);
        const booksFromSagas = this.getUniverses()
            .flatMap(u => u.Sagas || [])
            .flatMap(s => s.Libros || []);
        return [...booksFromUniverses, ...booksFromSagas];
    }

    getAllAnthologies(): Antology[] {
        const antologiesFromUniverses = this.getUniverses()
            .flatMap(u => u.Antologias || []);
        const antologiesFromSagas = this.getUniverses()
            .flatMap(u => u.Sagas || [])
            .flatMap(s => s.Antologias || []);
        return [...antologiesFromUniverses, ...antologiesFromSagas];
    }

    getUniverse(nombre: string): Universe | undefined {
        const universoEncontrado = this.getUniverses().find(u => u.Nombre === nombre);
        if (universoEncontrado) {
            return universoEncontrado;
        }
        return;
    }

    getSaga(nombre: string): Saga | undefined {
        const sagaEncontrada = this.getAllSagas().find(u => u.Nombre === nombre);
        if (sagaEncontrada) {
            return sagaEncontrada;
        }
        return;
    }

    getUniverseOfSaga(sagaId: number): Universe | null {
        for (const universe of this.getUniverses()) {
            if (universe.Sagas?.some(saga => saga.Id === sagaId)) {
                return universe;
            }
        }
        return null;
    }

    getUniverseOfBook(bookId: number): Universe | null {
        for (const universe of this.getUniverses()) {
            if (universe.Libros?.some(libro => libro.Id === bookId)) {
                return universe;
            }

            for (const saga of universe.Sagas || []) {
                if (saga.Libros?.some(libro => libro.Id === bookId)) {
                    return universe;
                }
            }
        }
        return null;
    }

    getSagaOfBook(bookId: number): Saga | null {
        for (const universe of this.getUniverses()) {
            for (const saga of universe.Sagas || []) {
                if (saga.Libros?.some(libro => libro.Id === bookId)) {
                    return saga;
                }
            }
        }
        return null;
    }

    clear() {
        this.universesSubject.next([]);
    }

    addUniverse(newUniverse: Universe): void {
        const current = this.getUniverses();
        const exists = current.some(u => u.Id === newUniverse.Id);

        if (!exists) {
            this.universesSubject.next([...current, newUniverse]);
        }
    }

    addSaga(newSaga: Saga, universe: Universe): void {
        const universosActuales = this.getUniverses();
        const current = this.getAllSagas();
        const exists = current.some(s => s.Id === newSaga.Id);

        if (!exists) {
            universe.Sagas = [...universe.Sagas, newSaga];
            this.universesSubject.next([...universosActuales]);
        }
    }

    addBook(newBook: BookSimple, universe: Universe, saga: Saga): void {
        const universosActuales = this.getUniverses();
        const current = this.getAllBooks();
        const exists = current.some(b => b.Id === newBook.Id);

        if(exists)
            return;

        if(newBook.Orden > -1){
            saga.Libros = [...saga.Libros, newBook];
        } else
            universe.Libros = [...universe.Libros, newBook];
        this.universesSubject.next([...universosActuales]);
    }
}
