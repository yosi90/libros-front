import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { Saga } from '../../interfaces/saga';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class SagaService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    addSaga(sagaNew: Saga): Observable<Saga> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
            });
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
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
            });
            return this.http.put<Saga>(`${environment.apiUrl}saga/${sagaNew.Id}`, sagaNew, { headers }).pipe(
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
