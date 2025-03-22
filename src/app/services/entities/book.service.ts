import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { Book, BookSimple } from '../../interfaces/book';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';

@Injectable({
    providedIn: 'root'
})
export class BookService extends ErrorHandlerService {

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
        super();
    }

    getCover(imagePath: string): Observable<File> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });
        return this.http.get(`${environment.apiUrl}image/blob/${this.sessionSrv.userId}/${imagePath}`, { headers, responseType: 'arraybuffer' }).pipe(
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

    addBook(bookNew: BookSimple, file: File): Observable<BookSimple> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json'
            });
            const formData = new FormData();
            formData.append('name', bookNew.Nombre);
            formData.append('orderInSaga', (bookNew.Orden ? bookNew.Orden.toString() : '-1'));
            formData.append('authors', bookNew.Autores.map(a => a.Nombre).join(','));
            formData.append('status', bookNew.Estados[bookNew.Estados.length - 1].Estado);
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

    updateBook(bookNew: BookSimple, file: File): Observable<BookSimple> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
            });
            const formData = new FormData();
            formData.append('name', bookNew.Nombre);
            formData.append('orderInSaga', (bookNew.Orden ? bookNew.Orden.toString() : '-1'));
            formData.append('authors', bookNew.Autores.map(a => a.Nombre).join(','));
            formData.append('status', bookNew.Estados[bookNew.Estados.length - 1].Estado);
            formData.append('file', file);
            return this.http.put<BookSimple>(`${environment.apiUrl}book/${bookNew.Id}`, formData, { headers }).pipe(
                tap((book: BookSimple) => {
                    return book;
                }),
                catchError(error => this.errorHandle(error, 'Libro'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateStatus(bookId: number, status: string): Observable<Book> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
            });
            return this.http.patch<Book>(`${environment.apiUrl}book/${bookId}/status/${status}`, null, { headers }).pipe(
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
