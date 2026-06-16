import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, tap, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { Book } from '../../interfaces/book';
import { ErrorHandlerService } from '../error-handler.service';

@Injectable({
    providedIn: 'root'
})
export class BookEmmitterService extends ErrorHandlerService {
    public bookInitializedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    private bookSubject = new BehaviorSubject<Book | null>(null);
    book$ = this.bookSubject.asObservable();
    private bookId: number | null = null;

    constructor(private http: HttpClient) {
        super();
    }

    updateBook(book: Book) {
        this.bookSubject.next(book);
    }

    initializeBook(bookId: number): void {
        if (this.bookId !== null && bookId === this.bookId) {
            return;
        }

        this.bookId = bookId;
        this.http.get<Book>(`${environment.apiUrl}libros/${bookId}`).pipe(
            tap(book => {
                this.bookSubject.next(book);
                this.bookInitializedSubject.next(true);
            }),
            catchError(error => {
                this.errorHandle(error, 'Libro');
                return of(null);
            })
        ).subscribe();
    }
}
