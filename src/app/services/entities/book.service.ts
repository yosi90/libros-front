import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, switchMap, tap } from 'rxjs';
import { Book, BookSimple } from '../../interfaces/book';
import { CharacterOrderSummary } from '../../interfaces/character';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';
import { NewBook } from '../../interfaces/creation/newBook';
import { UpdateResponse } from '../../interfaces/user-update-response';
import { BookLanguagesUpdated, BookLanguagesWrite } from '../../interfaces/catalog';
import { CoverCacheService } from '../cover-cache.service';

@Injectable({
    providedIn: 'root'
})
export class BookService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'libros';

    constructor(private http: HttpClient, private sessionSrv: SessionService, private coverCache: CoverCacheService) {
        super();
    }

    getCover(imagePath: string): Observable<File> {
        return this.coverCache.getCoverFile(imagePath)
            .pipe(
                catchError(error => {
                    this.errorHandle(error, 'Libro');
                    throw error;
                })
            );
    }

    getBook(bookId: number): Observable<Book> {
        return this.http.get<Book>(`${this.apiUrl}/${bookId}`);
    }

    getCharacterOrder(bookId: number): Observable<CharacterOrderSummary[]> {
        return this.http.get<CharacterOrderSummary[]>(`${this.apiUrl}/${bookId}/personajes/orden`);
    }

    addBook(book: NewBook, imageFile: File): Observable<BookSimple> {
        return this.http.post<BookSimple>(this.apiUrl, book).pipe(
            switchMap((createdBook: BookSimple) => {
                const image = `b_${this.sessionSrv.userId}_${createdBook.Id}.png`;
                const formData = new FormData();
                formData.append('image', imageFile);
                return this.http.post<UpdateResponse>(`${environment.apiUrl}image/set/cover/${image}`, formData)
                    .pipe(tap(() => this.coverCache.invalidateCover(image)))
                    .pipe(map(() => createdBook));
            })
        );
    }

    updateBook(book: NewBook, imageFile: File): Observable<BookSimple> {
        const image = `b_${this.sessionSrv.userId}_${book.Id}.png`;
        const formData = new FormData();
        formData.append('image', imageFile);

        const updateBook$ = this.http.patch<BookSimple>(this.apiUrl, book);
        const updateImage$ = this.http.post<UpdateResponse>(`${environment.apiUrl}image/set/cover/${image}`, formData)
            .pipe(tap(() => this.coverCache.invalidateCover(image)));

        return forkJoin([updateImage$, updateBook$]).pipe(
            map(([, updatedBook]) => updatedBook)
        );
    }

    addBookLanguages(bookId: number, payload: BookLanguagesWrite): Observable<BookLanguagesUpdated> {
        return this.http.post<BookLanguagesUpdated>(`${this.apiUrl}/${bookId}/idiomas`, payload);
    }

    updateBookLanguages(bookId: number, payload: BookLanguagesWrite): Observable<BookLanguagesUpdated> {
        return this.http.patch<BookLanguagesUpdated>(`${this.apiUrl}/${bookId}/idiomas`, payload);
    }

}
