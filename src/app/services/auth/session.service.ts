import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, tap, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environment/environment';
import { LoginRequest } from '../../interfaces/askers/login-request';
import { UniverseStoreService } from '../stores/universe-store.service';
import { User } from '../../interfaces/user';
import { TokenJWT } from '../../interfaces/token-jwt';
import { Router } from '@angular/router';
import { UpdateResponse } from '../../interfaces/user-update-response';

@Injectable({
    providedIn: 'root'
})
export class SessionService {

    userName: string = '';
    userEmail: string = '';
    userId: number = -1;
    userRole: string = 'usuario';
    userImg: string = '';

    userIsLogged$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    sessionInitializedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    constructor(private http: HttpClient, private universes: UniverseStoreService, private router: Router) {
        const token = localStorage.getItem('jwt');
        const refresh = localStorage.getItem('refresh');
        if (token && refresh) this.parseToken(token, refresh);

        this.sessionInitializedSubject.next(true);
    }

    login(credentials: LoginRequest): Observable<any> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        return this.http.post<{ token: string, refresh: string }>(`${environment.apiUrl}auth`, credentials, { headers }).pipe(
            tap((res) => {
                if (res?.token) {
                    this.parseToken(res.token, res.refresh);
                    this.sessionInitializedSubject.next(true);
                }
            }),
            catchError((error) => {
                let message = 'Error al iniciar sesión';
                if (error.status === 401 || error.status === 403) {
                    message = 'Correo o contraseña inválidos';
                } else if (error.status === 0) {
                    message = 'No se pudo conectar con el servidor';
                }
                return throwError(() => new Error(message));
            })
        );
    }

    logout(): void {
        localStorage.removeItem('jwt');

        this.userId = -1;
        this.userName = '';
        this.userEmail = '';
        this.userRole = 'usuario';
        this.userImg = '';

        this.userIsLogged$.next(false);
        this.sessionInitializedSubject.next(true); // mantenemos esto como true para que los guards se activen

        this.universes.clear();

        this.router.navigateByUrl('/home', { replaceUrl: true });
    }


    getToken(): string | null {
        return localStorage.getItem('jwt');
    }

    get token(): string {
        return this.getToken() ?? '';
    }

    get userIsLogged(): boolean {
        return this.userIsLogged$.value;
    }

    get userObject(): User {
        return {
            userId: this.userId,
            name: this.userName,
            email: this.userEmail,
            role: this.userRole,
            image: this.userImg
        }
    }

    requestNewToken(): Observable<void> {
        return this.http.get<{ success: boolean, token: string, refresh: string }>(`${environment.apiUrl}auth/refresh-token`)
            .pipe(
                tap(response => {
                    if (response.success) {
                        this.parseToken(response.token, response.refresh);
                    }
                }),
                map(() => void 0)
            );
    }

    private parseToken(token: string, refresh: string): void {
        try {
            localStorage.setItem('jwt', token);
            localStorage.setItem('refresh', refresh);
            const decoded: TokenJWT = jwtDecode(token);

            this.userId = parseInt(decoded.sub || '-1');
            this.userName = decoded.name;
            this.userEmail = decoded.email;
            this.userRole = decoded.role;
            this.userImg = decoded.image;
            this.userIsLogged$.next(true);

        } catch (err) {
            console.warn('Error al decodificar el token', err);
            this.userIsLogged$.next(false);
            this.logout();
        }
    }
}
