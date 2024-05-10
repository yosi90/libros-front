import { Injectable } from '@angular/core';
import { LoginRequest } from '../../interfaces/askers/login-request';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, BehaviorSubject, tap, throwError, of } from 'rxjs';
import { ErrorHandlerService } from '../error-handler.service';
import { jwtDecode } from 'jwt-decode';
import { TokenJWT } from '../../interfaces/token-jwt';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class LoginService extends ErrorHandlerService {

    private isUserLogged: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>(false);
    private isUserAdmin: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>(false);
    private sessToken: BehaviorSubject<string> = new BehaviorSubject<string>('');

    constructor(private http: HttpClient) {
        super();
        this.isUserLogged = new BehaviorSubject<Boolean>(localStorage.getItem('sessToken') != null);
        this.sessToken = new BehaviorSubject<string>(localStorage.getItem('sessToken') || '');
        const token = localStorage.getItem('sessToken');
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
        return this.http.post<any>(`${environment.apiUrl}auth/login`, credentials, { headers }).pipe(
            tap((response: any) => {
                if (response.jwt == '')
                    throwError(() => new Error('Inicio de sesión inválido'));
                localStorage.setItem('sessToken', response.jwt);
                this.sessToken.next(response.jwt);
                this.isUserLogged.next(true);
                try {
                    const decodedToken: TokenJWT = jwtDecode(this.token);
                    this.isUserAdmin.next(decodedToken.roles.some(rol => rol.name === 'ADMIN'));
                } catch (exception) {
                    this.isUserAdmin.next(false);
                }
            }),
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
    }

    logout(): void {
        if (localStorage.getItem('sessToken') != '') {
            localStorage.removeItem('sessToken');
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