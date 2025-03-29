import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, switchMap } from 'rxjs';
import { Book, BookSimple } from '../../interfaces/book';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';
import { NewBook } from '../../interfaces/creation/newBook';
import { UpdateResponse } from '../../interfaces/user-update-response';

@Injectable({
    providedIn: 'root'
})
export class BookService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'libros';

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
        super();
    }

    getCover(imagePath: string): Observable<File> {
        return this.http.get(`${environment.apiUrl}image/get/cover/${imagePath}`, { responseType: 'arraybuffer' })
            .pipe(
                map((imageBytes: ArrayBuffer) => {
                    const blob = new Blob([imageBytes], { type: 'image/jpeg' });
                    return new File([blob], imagePath, { type: 'image/jpeg' });
                }),
                catchError(error => {
                    this.errorHandle(error, 'Libro');
                    throw error;
                })
            );
    }

    getBook(bookId: number): Observable<Book> {
        return this.http.get<Book>(`${this.apiUrl}/${bookId}`);
    }

    addBook(book: NewBook, imageFile: File): Observable<BookSimple> {
        book.UserId = this.sessionSrv.userId;
        return this.http.post<BookSimple>(this.apiUrl, book).pipe(
            switchMap((createdBook: BookSimple) => {
                const image = `b_${this.sessionSrv.userId}_${createdBook.Id}.png`;
                const formData = new FormData();
                formData.append('image', imageFile);
                return this.http.post<UpdateResponse>(`${environment.apiUrl}image/set/cover/${image}`, formData)
                    .pipe(map(() => createdBook));
            })
        );
    }

    updateBook(book: NewBook, imageFile: File): Observable<BookSimple> {
        book.UserId = this.sessionSrv.userId;
        const image = `b_${this.sessionSrv.userId}_${book.Id}.png`;
        const formData = new FormData();
        formData.append('image', imageFile);

        const updateBook$ = this.http.patch<BookSimple>(this.apiUrl, book);
        const updateImage$ = this.http.post<UpdateResponse>(`${environment.apiUrl}image/set/cover/${image}`, formData);

        return forkJoin([updateImage$, updateBook$]).pipe(
            map(([, updatedBook]) => updatedBook)
        );
    }

    newStatus(bookId: number, status: string): Observable<BookSimple> {
        return this.http.patch<BookSimple>(`${this.apiUrl}/${bookId}/newstatus`, status);
    }
}
