import { Injectable } from '@angular/core';
import { LoginRequest } from '../../interfaces/templates/login-request';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, BehaviorSubject, tap, throwError, of } from 'rxjs';
import { ErrorHandlerService } from '../error-handler.service';
import { jwtDecode } from 'jwt-decode';
import { TokenJWT } from '../../interfaces/token-jwt';

@Injectable({
    providedIn: 'root'
})
export class LoginService extends ErrorHandlerService {

    private isUserLogged: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>(false);
    private isUserAdmin: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>(false);
    private sessToken: BehaviorSubject<string> = new BehaviorSubject<string>('');

    constructor(private http: HttpClient) {
        super();
        this.isUserLogged = new BehaviorSubject<Boolean>(sessionStorage.getItem('sessToken') != null);
        this.sessToken = new BehaviorSubject<string>(sessionStorage.getItem('sessToken') || '');
        const token = sessionStorage.getItem('sessToken');
        if (token) {
            try {
                const decodedToken: TokenJWT = jwtDecode(token);
                this.isUserAdmin = new BehaviorSubject<Boolean>(decodedToken.roles.some(rol => rol.name === 'ADMIN'));
            } catch (exception) {
                this.isUserAdmin = new BehaviorSubject<Boolean>(false);
            }
        } else
            this.isUserAdmin = new BehaviorSubject<Boolean>(false);
    }

    login(credentials: LoginRequest): Observable<any> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this.http.post<any>(`http://localhost:8080/api/v1/auth/login`, credentials, { headers }).pipe(
            tap((response: any) => {
                if (response.jwt == '')
                    throwError(() => new Error('Inicio de sesión inválido'));
                sessionStorage.setItem('sessToken', response.jwt);
                this.sessToken.next(response.jwt);
                this.isUserLogged.next(true);
                try {
                    const decodedToken: TokenJWT = jwtDecode(this.token);
                    this.isUserAdmin.next(decodedToken.roles.some(rol => rol.name === 'ADMIN'));
                } catch (exception) {
                    console.log('pasa por aqui');
                    this.isUserAdmin.next(false);
                }
            }),
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
    }

    logout(): void {
        if (sessionStorage.getItem('sessToken') != '') {
            sessionStorage.removeItem('sessToken');
            this.isUserLogged.next(false);
            this.isUserAdmin.next(false);
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

    get isAdmin(): Observable<boolean> {
        const decodedToken: TokenJWT = jwtDecode(this.token);
        const isAdmin = decodedToken.roles.some(rol => rol.name === 'ADMIN');
        return of(isAdmin);
    }

    get userId(): number {
        const decodedToken = jwtDecode(this.token);
        return Number.parseInt(decodedToken.sub || "-1");
    }

    get userLoggedBoolean(): boolean {
        return !!this.isUserLogged.getValue();
    }

    get userAdminBoolean(): boolean {
        return !!this.isUserAdmin.getValue();
    }
}