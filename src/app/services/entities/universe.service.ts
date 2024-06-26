import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Universe } from '../../interfaces/universe';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';

@Injectable({
    providedIn: 'root'
})
export class UniverseService extends ErrorHandlerService {

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
        super();
    }

    getAllUniverses(): Observable<Universe[]> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.sessionSrv.token}`
            });
            return this.http.get<Universe[]>(`${environment.apiUrl}universe`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Universo'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    getAllUserUniverses(): Observable<Universe[]> {
        try {
            const token = this.sessionSrv.token;
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

    getCreatedUniverse(universeId: number): Observable<Universe> {
        const token = this.sessionSrv.token;
        const decodedToken = jwtDecode(token);
        const userId = Number.parseInt(decodedToken.sub || "-1");
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
        return this.http.get<Universe>(`${environment.apiUrl}universe/created/${universeId}/${userId}`, { headers }).pipe(
            catchError(error => this.errorHandle(error, 'Universo'))
        );
    }

    addUniverse(universeNew: Universe): Observable<Universe> {
        try {
            const token = this.sessionSrv.token;
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            universeNew.userId = userId;
            return this.http.post<Universe>(`${environment.apiUrl}universe`, universeNew, { headers }).pipe(
                tap((response: Universe) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Universo'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateUniverse(universeNew: Universe): Observable<Universe> {
        try {
            const token = this.sessionSrv.token;
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.put<Universe>(`${environment.apiUrl}universe/${universeNew.universeId}`, universeNew, { headers }).pipe(
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
