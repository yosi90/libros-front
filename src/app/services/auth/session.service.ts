import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, tap, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environment/environment';
import { LoginRequest } from '../../interfaces/askers/login-request';
import { UniverseStoreService } from '../stores/universe-store.service';
import { ApiUserProfile, AuthResponse, User } from '../../interfaces/user';
import { UserProfileUpdate } from '../../interfaces/user';
import { TokenJWT } from '../../interfaces/token-jwt';
import { Router } from '@angular/router';
import { AuthorStoreService } from '../stores/author-store.service';
import { getApiErrorMessage } from '../../shared/api-error-message';
import { BookStoreService } from '../stores/book-store.service';
import { canModerateCatalogRole, isAdminRole } from '../../shared/permissions';
import { FirebaseSessionService } from '../realtime/firebase-session.service';
import { RealtimeSocketService } from '../realtime/realtime-socket.service';
import { FirebasePresenceService } from '../realtime/firebase-presence.service';
import { NotificationStoreService } from '../stores/notification-store.service';
import { ModerationAccessService } from '../stores/moderation-access.service';
import { PushNotificationService } from '../realtime/push-notification.service';
import { CommunityCapabilitiesService } from '../stores/community-capabilities.service';

@Injectable({
    providedIn: 'root'
})
export class SessionService {

    userName: string = '';
    userEmail: string = '';
    userId: number = -1;
    userRole = {
        Id: 1,
        Nombre: 'usuario'
    };
    userImg: string = '';
    username: string | null = null;
    displayName: string | null = null;
    bio: string | null = null;
    paisCodigo: string | null = null;
    paisNombre: string | null = null;
    perfilPublico = false;
    mostrarEstadisticas = false;
    mostrarBiblioteca = false;
    permitirMensajes = false;
    emailVerificado = true;
    verificationPending = false;
    estadoCuenta: { Id: number, Nombre: string } | null = null;

    userIsLogged$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    sessionInitializedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    constructor(private http: HttpClient, private universes: UniverseStoreService, private authors: AuthorStoreService, private books: BookStoreService, private router: Router, private firebaseSession: FirebaseSessionService, private realtimeSockets: RealtimeSocketService, private firebasePresence: FirebasePresenceService, private notifications: NotificationStoreService, private moderationAccess: ModerationAccessService, private pushNotifications: PushNotificationService, private communityCapabilities: CommunityCapabilitiesService) {
        const token = localStorage.getItem('jwt');
        const refresh = localStorage.getItem('refresh');
        const storedSessionVersion = localStorage.getItem('sessionVersion');

        if (storedSessionVersion !== environment.sessionVersion) {
            localStorage.removeItem('jwt');
            localStorage.removeItem('refresh');
            localStorage.setItem('sessionVersion', environment.sessionVersion);
        } else if (token && refresh) this.parseToken(token, refresh);

        this.sessionInitializedSubject.next(true);
    }

    login(credentials: LoginRequest): Observable<AuthResponse> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        return this.http.post<AuthResponse>(`${environment.apiUrl}auth`, credentials, { headers }).pipe(
            tap((res) => {
                if (res?.token) {
                    this.parseToken(res.token, res.refresh ?? '', res.user);
                    this.sessionInitializedSubject.next(true);
                }
            }),
            catchError((error) => {
                let message = getApiErrorMessage(error, 'Error al iniciar sesión');
                if (error.status === 401 || error.status === 403) {
                    message = getApiErrorMessage(error, 'Correo o contraseña inválidos');
                } else if (error.status === 0) {
                    message = 'No se pudo conectar con el servidor';
                }
                return throwError(() => new Error(message));
            })
        );
    }

    startSession(token: string, refresh: string): void {
        this.parseToken(token, refresh);
        this.sessionInitializedSubject.next(true);
    }

    logout(redirectToHome: boolean = true): void {
        this.realtimeSockets.closeAll();
        this.notifications.clear();
        this.moderationAccess.clear();
        this.communityCapabilities.clear();
        this.pushNotifications.revoke(this.userId).subscribe();
        void this.firebasePresence.clear().finally(() => this.firebaseSession.clear());
        localStorage.removeItem('jwt');
        localStorage.removeItem('refresh');
        localStorage.setItem('sessionVersion', environment.sessionVersion);

        this.userId = -1;
        this.userName = '';
        this.userEmail = '';
        this.userRole = {
            Id: 1,
            Nombre: 'usuario'
        };
        this.userImg = '';
        this.username = null;
        this.displayName = null;
        this.bio = null;
        this.paisCodigo = null;
        this.paisNombre = null;
        this.perfilPublico = false;
        this.mostrarEstadisticas = false;
        this.mostrarBiblioteca = false;
        this.permitirMensajes = false;
        this.emailVerificado = true;
        this.verificationPending = false;
        this.estadoCuenta = null;

        this.userIsLogged$.next(false);
        this.sessionInitializedSubject.next(true); // mantenemos esto como true para que los guards se activen

        this.clearLibraryStores();

        if (redirectToHome)
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
            image: this.userImg,
            username: this.username,
            displayName: this.displayName,
            bio: this.bio,
            paisCodigo: this.paisCodigo,
            paisNombre: this.paisNombre,
            perfilPublico: this.perfilPublico,
            mostrarEstadisticas: this.mostrarEstadisticas,
            mostrarBiblioteca: this.mostrarBiblioteca,
            permitirMensajes: this.permitirMensajes,
            emailVerificado: this.emailVerificado,
            verificationPending: this.verificationPending,
            estadoCuenta: this.estadoCuenta
        }
    }

    get canAccessLibrary(): boolean {
        return this.userIsLogged && !this.verificationPending && this.emailVerificado;
    }

    get isAdmin(): boolean {
        return isAdminRole(this.userRole);
    }

    get canModerateCatalog(): boolean {
        return canModerateCatalogRole(this.userRole);
    }

    applyLocalProfileUpdate(profile: UserProfileUpdate): void {
        this.userName = profile.name ?? this.userName;
        this.username = profile.username ?? this.username;
        this.displayName = profile.displayName ?? this.displayName;
        this.bio = profile.bio ?? this.bio;
        this.paisCodigo = profile.paisCodigo ?? this.paisCodigo;
        this.paisNombre = profile.paisNombre ?? this.paisNombre;
        this.perfilPublico = profile.perfilPublico ?? this.perfilPublico;
        this.mostrarEstadisticas = profile.mostrarEstadisticas ?? this.mostrarEstadisticas;
        this.mostrarBiblioteca = profile.mostrarBiblioteca ?? this.mostrarBiblioteca;
        this.permitirMensajes = profile.permitirMensajes ?? this.permitirMensajes;
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

    private parseToken(token: string, refresh: string, responseUser?: Partial<ApiUserProfile>): void {
        try {
            localStorage.setItem('jwt', token);
            localStorage.setItem('sessionVersion', environment.sessionVersion);
            if (refresh)
                localStorage.setItem('refresh', refresh);
            const decoded: TokenJWT = jwtDecode(token);
            const nextUserId = parseInt(decoded.sub || '-1');

            if (this.userId !== nextUserId)
                this.clearLibraryStores();

            this.userId = nextUserId;
            this.userName = responseUser?.Nombre ?? decoded.name ?? '';
            this.userEmail = responseUser?.Email ?? decoded.email ?? '';
            this.userRole = {
                Id: responseUser?.Role?.Id ?? decoded.role?.Id ?? 1,
                Nombre: responseUser?.Role?.Nombre ?? decoded.role?.Nombre ?? 'usuario'
            };
            this.userImg = responseUser?.Imagen ?? decoded.image ?? 'default.png';
            this.username = responseUser?.Username ?? decoded.Username ?? null;
            this.displayName = responseUser?.DisplayName ?? decoded.DisplayName ?? null;
            this.bio = responseUser?.Bio ?? decoded.Bio ?? null;
            this.paisCodigo = responseUser?.PaisCodigo ?? decoded.PaisCodigo ?? null;
            this.paisNombre = responseUser?.PaisNombre ?? decoded.PaisNombre ?? null;
            this.perfilPublico = responseUser?.PerfilPublico ?? decoded.PerfilPublico ?? false;
            this.mostrarEstadisticas = responseUser?.MostrarEstadisticas ?? decoded.MostrarEstadisticas ?? false;
            this.mostrarBiblioteca = responseUser?.MostrarBiblioteca ?? decoded.MostrarBiblioteca ?? false;
            this.permitirMensajes = responseUser?.PermitirMensajes ?? decoded.PermitirMensajes ?? false;
            this.emailVerificado = responseUser?.EmailVerificado ?? decoded.EmailVerificado ?? true;
            this.verificationPending = responseUser?.VerificationPending ?? decoded.VerificationPending ?? !this.emailVerificado;
            this.estadoCuenta = responseUser?.EstadoCuenta ?? decoded.EstadoCuenta ?? null;
            this.userIsLogged$.next(true);
            queueMicrotask(() => this.firebaseSession.startForUser(this.userId).subscribe({
                next: () => {
                    void this.firebasePresence.start(this.userId);
                    this.pushNotifications.restore(this.userId).subscribe();
                },
                error: error => console.warn('No se pudo iniciar la sesión Firebase', error)
            }));
            queueMicrotask(() => this.communityCapabilities.initialize(this.userId).subscribe(() => this.notifications.initialize()));
            queueMicrotask(() => this.moderationAccess.refresh().subscribe());

        } catch (err) {
            console.warn('Error al decodificar el token', err);
            this.userIsLogged$.next(false);
            this.logout();
        }
    }

    private clearLibraryStores(): void {
        this.universes.clear();
        this.authors.clear();
        this.books.clear();
    }
}
