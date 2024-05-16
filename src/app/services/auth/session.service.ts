import { Injectable } from '@angular/core';
import { LoginRequest } from '../../interfaces/askers/login-request';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, BehaviorSubject, tap, throwError, of } from 'rxjs';
import { ErrorHandlerService } from '../error-handler.service';
import { jwtDecode } from 'jwt-decode';
import { TokenJWT } from '../../interfaces/token-jwt';
import { environment } from '../../../environment/environment';
import { User } from '../../interfaces/user';
import { UserService } from '../entities/user.service';

@Injectable({
    providedIn: 'root'
})
export class SessionService extends ErrorHandlerService {

    private user: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
    private isUserLogged: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>(false);
    private isUserAdmin: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>(false);
    private sessToken: BehaviorSubject<string> = new BehaviorSubject<string>('');

    private sessionInitializedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    constructor(private http: HttpClient) {
        super();
        this.initSession();
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

    private initSession(): void {
        const token = localStorage.getItem('sessToken');
        const userId = localStorage.getItem('sessId');
        if (!token || !userId) {
            this.isUserLogged.next(false);
            this.sessToken.next('');
            this.user.next(null);
            this.sessionInitializedSubject.next(true);
            return;
        }
        this.isUserLogged.next(true);
        this.isUserAdmin.next(token === 'ADMIN');
        this.getUser(token).subscribe(
            userData => {
                if (!userData) {
                    this.logout();
                } else {
                    this.user.next(userData);
                    this.sessionInitializedSubject.next(true);
                }
            },
            error => {
                this.logout();
            }
        );
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
                this.getUser(response.jwt).subscribe(
                    userData => {
                        if (!userData) {
                            this.logout();
                        } else {
                            this.user.next(userData);
                            this.sessionInitializedSubject.next(true);
                        }
                    },
                    error => {
                        this.logout();
                    }
                );
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

    getUser(token: string): Observable<User> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.get<User>(`${environment.apiUrl}user/${userId}`, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Usuario'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
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