import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, tap, of } from 'rxjs';
import { Book } from '../interfaces/book';
import { SessionService } from './auth/session.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environment/environment';
import { ErrorHandlerService } from './error-handler.service';
import { jwtDecode } from 'jwt-decode';

@Injectable({
    providedIn: 'root'
})
export class EmmittersService extends ErrorHandlerService {
    public bookInitializedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    private bookSubject = new BehaviorSubject<Book | null>(null);
    book$ = this.bookSubject.asObservable();
    private bookId: number | null = null;

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
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
        const token = this.sessionSrv.token;
        const decodedToken: any = jwtDecode(token);
        const userId = Number.parseInt(decodedToken.sub || "-1");
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });

        this.http.get<Book>(`${environment.apiUrl}book/${bookId}/${userId}`, { headers }).pipe(
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
