import { Injectable } from '@angular/core';
import { Author } from '../../interfaces/author';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthorService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    getAllAuthors(token: string): Observable<Author[]> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.get<Author[]>(`${environment.apiUrl}author`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Autor'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    getAllUserAuthors(token: string): Observable<Author[]> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.get<Author[]>(`${environment.apiUrl}user/${userId}/authors`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Autor'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
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
            return this.http.post<Author>(`${environment.apiUrl}author`, authorNew, { headers }).pipe(
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
