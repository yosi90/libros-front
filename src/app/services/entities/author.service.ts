import { Injectable } from '@angular/core';
import { Author } from '../../interfaces/author';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';

@Injectable({
    providedIn: 'root'
})
export class AuthorService extends ErrorHandlerService {

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
        super();
    }

    getAllAuthors(): Observable<Author[]> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
            });
            return this.http.get<Author[]>(`${environment.apiUrl}autores`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Autor'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    addAuthor(authorNew: Author): Observable<Author> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
            });
            return this.http.post<Author>(`${environment.apiUrl}autores`, authorNew, { headers }).pipe(
                tap((response: Author) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Libro'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateAuthor(authorNew: Author): Observable<Author> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
            });
            return this.http.patch<Author>(`${environment.apiUrl}autores/${authorNew.Id}/name`, authorNew.Nombre, { headers }).pipe(
                tap((response: Author) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Libro'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }
}
