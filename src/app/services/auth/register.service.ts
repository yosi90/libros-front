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

    register(credentials: RegisterRequest, endPoint: string): Observable<RegisterResponse> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this.http.post<RegisterResponse>(`http://localhost:8080/api/v1/auth/${endPoint}`, credentials, { headers }).pipe(
            tap((response: RegisterResponse) => {
                if (response && response.numberOfErrors > 0)
                    throwError(() => new Error(response.messages.join('\n')));
                return response;
            }),
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
    }
}
