import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Universe } from '../../interfaces/universe';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class UniverseService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    getAllUniverses(token: string): Observable<Universe[]> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.get<Universe[]>(`${environment.apiUrl}universe`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Universo'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    getAllUserUniverses(token: string): Observable<Universe[]> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.get<Universe[]>(`${environment.apiUrl}user/${userId}/universes`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Universo'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    addUniverse(universeNew: Universe, token: string): Observable<Response> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            universeNew.userId = userId;
            console.log(universeNew);
            return this.http.post<Response>(`${environment.apiUrl}universe`, universeNew, { headers }).pipe(
                tap((response: Response) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Universo'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }
}
