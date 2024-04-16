import { Injectable } from '@angular/core';
import { LoginRequest } from '../../interfaces/templates/login-request';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, BehaviorSubject, tap, throwError } from 'rxjs';
import { ErrorHandlerService } from '../error-handler.service';

@Injectable({
    providedIn: 'root'
})
export class LoginService extends ErrorHandlerService {

    private isUserLogged: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>(false);
    private sessToken: BehaviorSubject<string> = new BehaviorSubject<string>('');

    constructor(private http: HttpClient) {
        super();
        this.isUserLogged = new BehaviorSubject<Boolean>(sessionStorage.getItem('sessToken') != null);
        this.sessToken = new BehaviorSubject<string>(sessionStorage.getItem('sessToken') || '');
    }

    login(credentials: LoginRequest): Observable<any> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this.http.post<any>(`http://localhost:8080/api/v1/auth/login`, credentials, { headers } ).pipe(
            tap((response: any) => {
                if (response.jwt == '')
                    throwError(() => new Error('Inicio de sesión inválido'));
                sessionStorage.setItem('sessToken', response.jwt);
                this.sessToken.next(response.jwt);
                this.isUserLogged.next(true);
            }),
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
    }

    logout(): void {
        if (sessionStorage.getItem('sessToken') != '') {
            sessionStorage.removeItem('sessToken');
            this.isUserLogged.next(false);
        }
    }

    get sessionToken(): Observable<string> {
        return this.sessToken.asObservable();
    }

    get token(): string {
        return this.sessToken.getValue();
    }

    get userLogged(): Observable<Boolean> {
        return this.isUserLogged.asObservable();
    }

    get userLoggedBoolean(): boolean {
        return !!this.isUserLogged.getValue();
    }
}
