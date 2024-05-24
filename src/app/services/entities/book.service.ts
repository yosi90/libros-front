import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { Book } from '../../interfaces/book';
import { jwtDecode } from 'jwt-decode';
import { BookList } from '../../interfaces/askers/book-list';
import { environment } from '../../../environment/environment';
import { BookStatus } from '../../interfaces/book-status';
import { SessionService } from '../auth/session.service';

@Injectable({
    providedIn: 'root'
})
export class BookService extends ErrorHandlerService {

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
        super();
    }

    getAllBooks(token: string): Observable<Book[]> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.get<Book[]>(`${environment.apiUrl}book`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Libro'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    getAllBookStatuses(): Observable<BookStatus[]> {
        try {
            const token = this.sessionSrv.token;
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.get<BookStatus[]>(`${environment.apiUrl}bookstatus`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Libro'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    getAllUserBooks(token: string): Observable<BookList> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.get<BookList>(`${environment.apiUrl}user/${userId}/books`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Libro'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    getBook(bookId: number): Observable<Book> {
        const token = this.sessionSrv.token;
        const decodedToken = jwtDecode(token);
        const userId = Number.parseInt(decodedToken.sub || "-1");
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
        return this.http.get<Book>(`${environment.apiUrl}book/${bookId}/${userId}`, { headers }).pipe(
            catchError(error => this.errorHandle(error, 'Libro'))
        );
    }

    getCreatedBook(bookId: number): Observable<Book> {
        const token = this.sessionSrv.token;
        const decodedToken = jwtDecode(token);
        const userId = Number.parseInt(decodedToken.sub || "-1");
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
        return this.http.get<Book>(`${environment.apiUrl}book/created/${bookId}/${userId}`, { headers }).pipe(
            catchError(error => this.errorHandle(error, 'Libro'))
        );
    }

    getCover(imagePath: string): Observable<File> {
        const token = this.sessionSrv.token;
        const decodedToken = jwtDecode(token);
        const userId = Number.parseInt(decodedToken.sub || "-1");
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
        return this.http.get(`${environment.apiUrl}image/blob/${userId}/${imagePath}`, { headers, responseType: 'arraybuffer' }).pipe(
            map((imageBytes: ArrayBuffer) => {
                const blob = new Blob([imageBytes], { type: 'image/jpeg' });
                const file = new File([blob], imagePath, { type: 'image/jpeg' });
                return file;
            }),
            catchError(error => {
                this.errorHandle(error, 'Libro');
                throw error;
            })
        );
    }

    addBook(bookNew: Book, file: File): Observable<Book> {
        try {
            const token = this.sessionSrv.token;
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });
            bookNew.userId = userId;
            const formData = new FormData();
            formData.append('name', bookNew.name);
            formData.append('userId', userId.toString());
            formData.append('orderInSaga', bookNew.orderInSaga.toString());
            formData.append('authors', bookNew.authors.map(a => a.authorId).join(','));
            formData.append('status', bookNew.status[bookNew.status.length - 1].status.name);
            formData.append('universe', bookNew.universe?.universeId.toString() ?? '');
            formData.append('saga', bookNew.saga?.sagaId.toString() ?? '');
            formData.append('file', file);
            return this.http.post<Book>(`${environment.apiUrl}book`, formData, { headers }).pipe(
                tap((book: Book) => {
                    return book;
                }),
                catchError(error => this.errorHandle(error, 'Libro'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateBook(bookNew: Book, file: File): Observable<Book> {
        try {
            const token = this.sessionSrv.token;
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });
            bookNew.userId = userId;
            const formData = new FormData();
            formData.append('name', bookNew.name);
            formData.append('userId', userId.toString());
            formData.append('orderInSaga', bookNew.orderInSaga.toString());
            formData.append('authors', bookNew.authors.map(a => a.authorId).join(','));
            formData.append('status', bookNew.status[bookNew.status.length - 1].status.name);
            formData.append('universe', bookNew.universe?.universeId.toString() ?? '');
            formData.append('saga', bookNew.saga?.sagaId.toString() ?? '');
            formData.append('file', file);
            return this.http.put<Book>(`${environment.apiUrl}book/${bookNew.bookId}`, formData, { headers }).pipe(
                tap((book: Book) => {
                    return book;
                }),
                catchError(error => this.errorHandle(error, 'Libro'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateStatus(bookId: number, statusId: number): Observable<Book> {
        try {
            const token = this.sessionSrv.token;
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.patch<Book>(`${environment.apiUrl}book/${bookId}/status/${statusId}`, null, { headers }).pipe(
                tap((response: Book) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Libro'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT');
        }
    }
}
