import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { Saga } from '../../interfaces/saga';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';

@Injectable({
    providedIn: 'root'
})
export class SagaService extends ErrorHandlerService {

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
        super();
    }

    getAllUserSagas(): Observable<Saga[]> {
        try {
            const token = this.sessionSrv.token;
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.get<Saga[]>(`${environment.apiUrl}user/${userId}/sagas`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Saga'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    getCreatedSaga(sagaId: number): Observable<Saga> {
        const token = this.sessionSrv.token;
        const decodedToken = jwtDecode(token);
        const userId = Number.parseInt(decodedToken.sub || "-1");
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
        return this.http.get<Saga>(`${environment.apiUrl}saga/created/${sagaId}/${userId}`, { headers }).pipe(
            catchError(error => this.errorHandle(error, 'Saga'))
        );
    }

    addSaga(sagaNew: Saga): Observable<Saga> {
        try {
            const token = this.sessionSrv.token;
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            sagaNew.userId = userId;
            return this.http.post<Saga>(`${environment.apiUrl}saga`, sagaNew, { headers }).pipe(
                tap((response: Saga) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Saga'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateSaga(sagaNew: Saga): Observable<Saga> {
        try {
            const token = this.sessionSrv.token;
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.put<Saga>(`${environment.apiUrl}saga/${sagaNew.sagaId}`, sagaNew, { headers }).pipe(
                tap((response: Saga) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Saga'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }
}
