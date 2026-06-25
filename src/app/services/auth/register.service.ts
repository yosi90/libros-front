import { Injectable } from '@angular/core';
import { RegisterRequest } from '../../interfaces/askers/register-request';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ErrorHandlerService } from '../error-handler.service';
import { response } from '../../interfaces/response';
import { catchError, Observable, switchMap, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';
import { getApiErrorMessage } from '../../shared/api-error-message';

@Injectable({
    providedIn: 'root'
})
export class RegisterService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    register(credentials: RegisterRequest): Observable<response> {
        return this.getUserExists(credentials.email).pipe(
            switchMap((existe: boolean) => {
                if (existe) {
                    return throwError(() => new Error('El email ya está registrado.'));
                }

                return this.http.post<response>(`${environment.apiUrl}auth/register`, credentials, { withCredentials: false }).pipe(
                    tap((res: response) => {
                        if (res && (res.numberOfErrors ?? 0) > 0) {
                            throw new Error(res.messages?.join('\n') || res.message || 'No se pudo crear el usuario');
                        }
                    }),
                    catchError(error => this.errorHandle(error, 'Usuario'))
                );
            }),
            catchError(error => error instanceof Error
                ? throwError(() => error)
                : this.errorHandle(error, 'Usuario'))
        );
    }

    registerAdmin(credentials: RegisterRequest): Observable<response> {
        return this.http.post<response>(`${environment.apiUrl}auth/registeradmin`, credentials, { withCredentials: false } ).pipe(
            tap((res: response) => {
                if (res && (res.numberOfErrors ?? 0) > 0) {
                    throw new Error(res.messages?.join('\n') || res.message || 'No se pudo crear el usuario');
                }
            }),
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
    }

    getUserExists(email: string): Observable<boolean> {
        return this.http.get<{ existe: boolean }>(`${environment.apiUrl}auth/email?email=${email}`, { withCredentials: false } ).pipe(
            switchMap(res => of(res.existe)),
            catchError(error => {
                console.warn(getApiErrorMessage(error, 'No se pudo verificar el email'));
                return of(false);
            })
        );
    }
}
