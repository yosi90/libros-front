import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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
            // Buscar en libros sueltos del universo
            if (universe.Libros?.some(libro => libro.Id === bookId)) {
                return universe;
            }
    
            // Buscar en las sagas del universo
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
}
