import { Injectable } from '@angular/core';
import { Author } from '../../interfaces/author';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { ErrorHandlerService } from '../error-handler.service';

@Injectable({
    providedIn: 'root'
})
export class AuthorService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
     }

    addAuthor(authorNew: Author, token: string): Observable<Author> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            authorNew.userId = userId;
            return this.http.post<Author>('http://localhost:8080/api/v1/author', authorNew, { headers }).pipe(
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
