import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Author } from '../../interfaces/author';
import { Universe } from '../../interfaces/universe';

@Injectable({
    providedIn: 'root'
})
export class UniverseService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    addUniverse(universeNew: Universe, token: string): Observable<Universe> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            universeNew.userId = userId;
            return this.http.post<Universe>('http://localhost:8080/api/v1/universe', universeNew, { headers }).pipe(
                tap((response: Universe) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Universo'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }
}
