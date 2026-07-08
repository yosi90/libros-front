import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, catchError, finalize, shareReplay, tap } from 'rxjs';
import { Book } from '../../interfaces/book';
import { Character, CharacterOrderSummary } from '../../interfaces/character';
import { BookService } from '../entities/book.service';
import { BookEmmitterService } from '../emmitters/bookEmmitter.service';
import { BookStoreService } from './book-store.service';

@Injectable({
    providedIn: 'root'
})
export class CharacterOrderRefreshService {
    private readonly refreshingByBook = new Map<number, BehaviorSubject<boolean>>();
    private readonly requestsByBook = new Map<number, Observable<CharacterOrderSummary[]>>();

    constructor(
        private bookSrv: BookService,
        private bookStore: BookStoreService,
        private bookEmitterSrv: BookEmmitterService
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
            tap(order => this.applyOrder(bookId, order)),
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

    private applyOrder(bookId: number, order: CharacterOrderSummary[]): void {
        const currentBook = this.bookStore.getBook();
        if (currentBook.Id !== bookId)
            return;

        const nextBook: Book = {
            ...currentBook,
            Personajes: this.mergeOrderedCharacters(currentBook.Personajes, order)
        };
        this.bookStore.setBook(nextBook);
        this.bookEmitterSrv.updateBook(nextBook);
    }

    private mergeOrderedCharacters(currentCharacters: Character[], order: CharacterOrderSummary[]): Character[] {
        const currentCharactersById = new Map(currentCharacters.map(character => [character.Id, character]));
        const orderedIds = new Set(order.map(character => character.Id));
        const orderedFullCharacters = order.map(character => {
            const current = currentCharactersById.get(character.Id);
            if (current)
                return { ...current, Nombre: character.Nombre };
            return {
                Id: character.Id,
                Nombre: character.Nombre,
                Sexo: null,
                Entradas: [],
                Apodos: [],
                Estados: [],
                Relaciones: []
            } as Character;
        });
        const missingCurrentCharacters = currentCharacters.filter(character => !orderedIds.has(character.Id));
        return [...orderedFullCharacters, ...missingCurrentCharacters];
    }
}
