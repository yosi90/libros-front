import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environment/environment';
import { LoginRequest } from '../../interfaces/askers/login-request';
import { UniverseStoreService } from '../stores/universe-store.service';
import { User } from '../../interfaces/user';
import { TokenJWT } from '../../interfaces/token-jwt';

@Injectable({
    providedIn: 'root'
})
export class SessionService {

    userIsLogged: boolean = false;
    userName: string = '';
    userEmail: string = '';
    userId: number = -1;
    userRole: string = 'usuario';
    userImg: string = '';

    sessionInitializedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    constructor(private http: HttpClient, private universes: UniverseStoreService) {
        const token = localStorage.getItem('jwt');
        if (token) this.parseToken(token);

        this.sessionInitializedSubject.next(true);
    }

    login(credentials: LoginRequest): Observable<any> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        return this.http.post<{ token: string }>(`${environment.apiUrl}auth`, credentials, { headers }).pipe(
            tap((res) => {
                if (res?.token) {
                    localStorage.setItem('jwt', res.token);
                    this.parseToken(res.token);
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
        this.userIsLogged = false;
        this.sessionInitializedSubject.next(false);
        this.universes.clear();
    }

    getToken(): string | null {
        return localStorage.getItem('jwt');
    }
    
    get token(): string {
        return this.getToken() ?? '';
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

    getUserInfo(): TokenJWT | null {
        const token = this.getToken();
        if (!token) return null;

        try {
            return jwtDecode(token);
        } catch {
            return null;
        }
    }

    private parseToken(token: string): void {
        try {
            const decoded: TokenJWT = jwtDecode(token);
    
            this.userId = parseInt(decoded.sub || '-1');
            this.userName = decoded.name;
            this.userEmail = decoded.email;
            this.userRole = decoded.role;
            this.userImg = decoded.image;
            this.userIsLogged = true;
        } catch (err) {
            console.warn('Error al decodificar el token', err);
            this.userIsLogged = false;
        }
    }
}
