import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { Saga } from '../../interfaces/saga';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class SagaService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    getAllUserSagas(token: string): Observable<Saga[]> {
        try {
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

    addSaga(sagaNew: Saga, token: string): Observable<Response> {
        try {
            const decodedToken = jwtDecode(token);
            const userId: number = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            sagaNew.userId = userId;
            console.log(sagaNew);
            return this.http.post<Response>(`${environment.apiUrl}saga`, sagaNew, { headers }).pipe(
                tap((response: Response) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Saga'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }
}
