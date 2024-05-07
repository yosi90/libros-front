import { Injectable } from '@angular/core';
import { RegisterRequest } from '../../interfaces/templates/register-request';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ErrorHandlerService } from '../error-handler.service';
import { RegisterResponse } from '../../interfaces/templates/register-response';
import { catchError, Observable, tap, throwError } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class RegisterService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    register(credentials: RegisterRequest): Observable<RegisterResponse> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        var response = this.http.post<RegisterResponse>(`http://localhost:8080/api/v1/auth/register`, credentials, { headers }).pipe(
            tap((response: RegisterResponse) => {
                if (response && response.numberOfErrors > 0)
                    throwError(() => new Error(response.messages.join('\n')));
                return response;
            }),
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
        return response;
    }

    registerAdmin(credentials: RegisterRequest, token: string): Observable<RegisterResponse> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
        return this.http.post<RegisterResponse>(`http://localhost:8080/api/v1/auth/registeradmin`, credentials, { headers }).pipe(
            tap((response: RegisterResponse) => {
                if (response && response.numberOfErrors > 0)
                    throwError(() => new Error(response.messages.join('\n')));
                return response;
            }),
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
    }
}
