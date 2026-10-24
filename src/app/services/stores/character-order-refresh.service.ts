import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, catchError, finalize, forkJoin, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { Book } from '../../interfaces/book';
import { Character, CharacterOrderSummary } from '../../interfaces/character';
import { BookService } from '../entities/book.service';
import { CharacterService } from '../entities/character.service';
import { BookStoreService } from './book-store.service';

@Injectable({
    providedIn: 'root'
})
export class CharacterOrderRefreshService {
    private static readonly MAX_UNKNOWN_DETAILS = 5;
    private readonly refreshingByBook = new Map<number, BehaviorSubject<boolean>>();
    private readonly requestsByBook = new Map<number, Observable<CharacterOrderSummary[]>>();

    constructor(
        private bookSrv: BookService,
        private bookStore: BookStoreService,
        private characterSrv: CharacterService
    ) { }

    isRefreshing$(bookId: number): Observable<boolean> {
        return this.getRefreshingSubject(bookId).asObservable();
    }

    refresh(bookId: number): Observable<CharacterOrderSummary[]> {
        const currentRequest = this.requestsByBook.get(bookId);
        if (currentRequest)
            return currentRequest;

        const subject = this.getRefreshingSubject(bookId);
        subject.next(true);

        const request = this.bookSrv.getCharacterOrder(bookId).pipe(
            switchMap(order => this.loadUnknownCharacters(bookId, order).pipe(
                tap(details => this.applyOrder(bookId, order, details)),
                map(() => order)
            )),
            catchError(() => EMPTY),
            finalize(() => {
                this.requestsByBook.delete(bookId);
                subject.next(false);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        this.requestsByBook.set(bookId, request);
        request.subscribe();
        return request;
    }

    private getRefreshingSubject(bookId: number): BehaviorSubject<boolean> {
        let subject = this.refreshingByBook.get(bookId);
        if (!subject) {
            subject = new BehaviorSubject<boolean>(false);
            this.refreshingByBook.set(bookId, subject);
        }
        return subject;
    }

    /**
     * Personajes que la API ya tiene y la lista local no (por ejemplo, un alta cuya respuesta
     * no llegó): se piden con su ficha para no dejar en la lista un personaje sin datos.
     */
    private loadUnknownCharacters(bookId: number, order: CharacterOrderSummary[]): Observable<Character[]> {
        const book = this.bookStore.getBook();
        if (book.Id !== bookId)
            return of([]);

        const knownIds = new Set((book.Personajes ?? []).map(character => Number(character.Id)));
        const unknownIds = order.map(character => Number(character.Id)).filter(id => !knownIds.has(id));
        // Lo normal es uno (el alta perdida). Muchos indican otra lista de origen: no se
        // piden uno a uno para no cargar la API; quedan con los datos mínimos del orden.
        if (!unknownIds.length || unknownIds.length > CharacterOrderRefreshService.MAX_UNKNOWN_DETAILS)
            return of([]);

        return forkJoin(unknownIds.map(id => this.characterSrv.get(id, bookId).pipe(
            catchError(() => of(null))
        ))).pipe(map(characters => characters.filter((character): character is Character => !!character)));
    }

    private applyOrder(bookId: number, order: CharacterOrderSummary[], details: Character[] = []): void {
        const currentBook = this.bookStore.getBook();
        if (currentBook.Id !== bookId)
            return;

        const nextBook: Book = {
            ...currentBook,
            Personajes: this.mergeOrderedCharacters(currentBook.Personajes, order, details)
        };
        this.bookStore.setBook(nextBook);
    }

    private mergeOrderedCharacters(currentCharacters: Character[], order: CharacterOrderSummary[], details: Character[]): Character[] {
        const currentCharactersById = new Map(currentCharacters.map(character => [Number(character.Id), character]));
        const detailsById = new Map(details.map(character => [Number(character.Id), character]));
        const orderedIds = new Set(order.map(character => Number(character.Id)));
        const orderedFullCharacters = order.map(character => {
            const summary = this.summaryFields(character);
            const current = currentCharactersById.get(Number(character.Id));
            if (current)
                return { ...current, ...summary };
            const detail = detailsById.get(Number(character.Id));
            if (detail)
                return { EsLibroActual: true, OrigenContexto: 'actual', ...detail, ...summary } as Character;
            return {
                Id: character.Id,
                Sexo: null,
                Entradas: [],
                Apodos: [],
                Estados: [],
                Relaciones: [],
                ...summary
            } as Character;
        });
        const missingCurrentCharacters = currentCharacters.filter(character => !orderedIds.has(Number(character.Id)));
        return [...orderedFullCharacters, ...missingCurrentCharacters];
    }

    /** Nombre y, si la API lo envía, el grupo con el que se ordena la lista. */
    private summaryFields(character: CharacterOrderSummary): Partial<Character> {
        const fields: Partial<Character> = { Nombre: character.Nombre };
        if (character.Grupo)
            fields.Grupo = character.Grupo;
        if (character.OrdenGrupo !== undefined && character.OrdenGrupo !== null)
            fields.OrdenGrupo = character.OrdenGrupo;
        return fields;
    }
}
