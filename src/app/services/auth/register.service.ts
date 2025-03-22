import { Injectable } from '@angular/core';
import { RegisterRequest } from '../../interfaces/askers/register-request';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ErrorHandlerService } from '../error-handler.service';
import { response } from '../../interfaces/response';
import { catchError, Observable, switchMap, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class RegisterService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    register(credentials: RegisterRequest): Observable<response> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        return this.getUserExists(credentials.email).pipe(
            switchMap((existe: boolean) => {
                if (existe) {
                    return throwError(() => new Error('El email ya está registrado.'));
                }

                return this.http.post<response>(
                    `${environment.apiUrl}auth/register`,
                    credentials,
                    { 
                        headers,
                        withCredentials: false 
                    }
                ).pipe(
                    tap((res: response) => {
                        if (res && res.numberOfErrors > 0) {
                            throw new Error(res.messages.join('\n'));
                        }
                    }),
                    catchError(error => this.errorHandle(error, 'Usuario'))
                );
            }),
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
    }

    registerAdmin(credentials: RegisterRequest): Observable<response> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });
    
        return this.http.post<response>(
            `${environment.apiUrl}auth/registeradmin`,
            credentials,
            { headers }
        ).pipe(
            tap((res: response) => {
                if (res && res.numberOfErrors > 0) {
                    throw new Error(res.messages.join('\n'));
                }
            }),
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
    }    

    getUserExists(email: string): Observable<boolean> {
        return this.http.get<{ existe: boolean }>(
            `${environment.apiUrl}auth/email?email=${email}`,
            { withCredentials: false } // también aquí
        ).pipe(
            switchMap(res => of(res.existe)),
            catchError(error => {
                this.errorHandle(error, 'Verificación de email');
                return of(false);
            })
        );
    }
}
