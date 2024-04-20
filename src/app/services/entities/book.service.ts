import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BookT } from '../../interfaces/templates/book-t';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Book } from '../../interfaces/book';
import { jwtDecode } from 'jwt-decode';
import { BookList } from '../../interfaces/templates/book-list';

@Injectable({
    providedIn: 'root'
})
export class BookService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    getAllBooks(token: string): Observable<Book[]> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.get<Book[]>(`http://localhost:8080/api/v1/book`, { headers }).pipe(
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
            return this.http.get<BookList>(`http://localhost:8080/api/v1/user/${userId}/books`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Libro'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    getBook(bookId: number, token: string): Observable<Book> {
        const decodedToken = jwtDecode(token);
        const userId = Number.parseInt(decodedToken.sub || "-1");
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
        return this.http.get<Book>(`http://localhost:8080/api/v1/book/${bookId}/${userId}`, { headers }).pipe(
            catchError(error => this.errorHandle(error, 'Libro'))
        );
    }

    addBook(bookNew: BookT, token: string): Observable<Book> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            bookNew.ownerId = userId;
            return this.http.post<Book>('http://localhost:8080/api/v1/book', bookNew, { headers }).pipe(
                tap((response: Book) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Libro'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    setCover(bookId: number, img: FormData, token: string): Observable<Book> {
        try {
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });
            const options = { headers, reportProgress: true };
            return this.http.patch<Book>(`http://localhost:8080/api/v1/book/${bookId}/cover`, img, options).pipe(
                tap((response: Book) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Libro'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    // updateTitle(token: string) {
    //     try {
    //         const decodedToken = jwtDecode(token);
    //         const userId = Number.parseInt(decodedToken.sub || "-1");
    //         const headers = new HttpHeaders({
    //             'Content-Type': 'application/json',
    //             'Authorization': `Bearer ${token}`
    //         });
    //     } catch {
    //         return throwError('Error al decodificar el token JWT.');
    //     }
    // }

    // updateAuthor(token: string) {
    //     try {
    //         const decodedToken = jwtDecode(token);
    //         const userId = Number.parseInt(decodedToken.sub || "-1");
    //         const headers = new HttpHeaders({
    //             'Content-Type': 'application/json',
    //             'Authorization': `Bearer ${token}`
    //         });
    //     } catch {
    //         return throwError('Error al decodificar el token JWT.');
    //     }
    // }
}
