import { Injectable } from '@angular/core';
import { LoginRequest } from '../../interfaces/askers/login-request';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, BehaviorSubject, tap, throwError, of, switchMap, filter, take, timeout } from 'rxjs';
import { ErrorHandlerService } from '../error-handler.service';
import { jwtDecode } from 'jwt-decode';
import { TokenJWT } from '../../interfaces/token-jwt';
import { environment } from '../../../environment/environment';
import { User } from '../../interfaces/user';

@Injectable({
    providedIn: 'root'
})
export class SessionService extends ErrorHandlerService {

    private userData: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
    private isUserLogged: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>(false);
    private isUserAdmin: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>(false);
    private sessToken: BehaviorSubject<string> = new BehaviorSubject<string>('');

    private sessionInitializedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    constructor(private http: HttpClient) {
        super();
        if (!this.sessionInitializedSubject.value) {
            const token = localStorage.getItem('sessToken');
            const userId = localStorage.getItem('sessId');
            if (!token || !userId) {
                this.isUserLogged.next(false);
                this.sessToken.next('');
                this.userData.next(null);
                this.sessionInitializedSubject.next(true);
            } else {
                this.sessToken.next(token);
                this.isUserLogged.next(true);
                this.isUserAdmin.next(token === 'ADMIN');
                this.retrieveUser().subscribe(userData => {
                    if (!userData) {
                        this.logout('sr: No se recuperó al usuario en el inicio');
                    } else {
                        this.userData.next(userData);
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
                        this.sessionInitializedSubject.next(true);
                    }
                    return of(userData);
                }),
                    catchError(error => {
                        this.logout('sr: Error al recuperar al usuario en el inicio');
                        return throwError(error);
                    })
            }
        }
    }

    login(credentials: LoginRequest): Observable<any> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this.http.post<any>(`${environment.apiUrl}auth/login`, credentials, { headers }).pipe(
            switchMap((response: any) => {
                if (response.jwt === '') {
                    return throwError(() => new Error('Inicio de sesión inválido'));
                }
                localStorage.setItem('sessToken', response.jwt);
                this.sessToken.next(response.jwt);
                const decodedToken: TokenJWT = jwtDecode(this.token);
                localStorage.setItem('sessId', decodedToken.sub);
                this.isUserLogged.next(true);
                try {
                    this.isUserAdmin.next(decodedToken.roles.some(rol => rol.name === 'ADMIN'));
                } catch (exception) {
                    this.isUserAdmin.next(false);
                }
                return this.retrieveUser().pipe(
                    tap(userData => {
                        if (!userData) {
                            this.logout('sr: No se recuperó el usuario en el login');
                        } else {
                            this.userData.next(userData);
                            this.sessionInitializedSubject.next(true);
                        }
                    }),
                    catchError(error => {
                        this.logout('sr: Error al recuperar el usuario en el login');
                        return throwError(error);
                    })
                );
            }),
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
    }


    logout(origen: string): void {
        if (localStorage.getItem('sessToken') != '') {
            localStorage.removeItem('sessToken');
            this.isUserLogged.next(false);
            this.isUserAdmin.next(false);
        }
    }

    private retrieveUser(): Observable<User> {
        try {
            const decodedToken = jwtDecode(this.token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            });
            return this.http.get<User>(`${environment.apiUrl}user/${userId}`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Usuario')),
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
        return this.sessionInitializedSubject.pipe(
            filter(initialized => initialized),
            take(1),
            switchMap(() => this.isUserLogged.asObservable())
        );
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

    get user(): Observable<User | null> {
        return this.sessionInitializedSubject.pipe(
            filter(initialized => initialized),
            take(1),
            switchMap(() => this.userData.asObservable())
        );
    }

    updateUserData(user: User) {
        this.userData.next(user);
    }
}