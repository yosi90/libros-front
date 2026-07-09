import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap } from 'rxjs';
import { Book, BookSimple } from '../../interfaces/book';
import { CharacterOrderSummary } from '../../interfaces/character';
import { environment } from '../../../environment/environment';
import { NewBook } from '../../interfaces/creation/newBook';
import { BookLanguagesUpdated, BookLanguagesWrite } from '../../interfaces/catalog';
import { CoverCacheService } from '../cover-cache.service';

@Injectable({
    providedIn: 'root'
})
export class BookService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'libros';

    constructor(private http: HttpClient, private coverCache: CoverCacheService) {
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
        return this.http.post<BookSimple>(this.apiUrl, this.toBookFormData(book, imageFile))
            .pipe(tap(createdBook => this.invalidateCreatedCover(createdBook.Portada)));
    }

    updateBook(book: NewBook, imageFile?: File): Observable<BookSimple> {
        const payload = imageFile ? this.toBookFormData(book, imageFile) : book;
        return this.http.patch<BookSimple>(this.apiUrl, payload)
            .pipe(tap(updatedBook => this.invalidateCreatedCover(updatedBook.Portada)));
    }

    addBookLanguages(bookId: number, payload: BookLanguagesWrite): Observable<BookLanguagesUpdated> {
        return this.http.post<BookLanguagesUpdated>(`${this.apiUrl}/${bookId}/idiomas`, payload);
    }

    updateBookLanguages(bookId: number, payload: BookLanguagesWrite): Observable<BookLanguagesUpdated> {
        return this.http.patch<BookLanguagesUpdated>(`${this.apiUrl}/${bookId}/idiomas`, payload);
    }

    private toBookFormData(book: NewBook, imageFile: File): FormData {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('data', JSON.stringify(book));
        return formData;
    }

    private invalidateCreatedCover(coverName: string | null | undefined): void {
        if (coverName)
            this.coverCache.invalidateCover(coverName);
    }

}
