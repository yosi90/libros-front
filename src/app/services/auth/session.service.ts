import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, finalize, firstValueFrom, from, map, of, shareReplay, switchMap, tap, timeout } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthenticatedSession, FirebaseSessionResult, VerificationRequired } from '../../interfaces/auth';
import { LoginRequest } from '../../interfaces/askers/login-request';
import { ApiUserProfile, User, UserProfileUpdate } from '../../interfaces/user';
import { canModerateCatalogRole, isAdminRole } from '../../shared/permissions';
import { LoaderEmmitterService } from '../emmitters/loader.service';
import { DecisionNoticeService } from '../navigation/decision-notice.service';
import { FirebasePresenceService } from '../realtime/firebase-presence.service';
import { FirebaseSessionService } from '../realtime/firebase-session.service';
import { PushNotificationService } from '../realtime/push-notification.service';
import { RealtimeSocketService } from '../realtime/realtime-socket.service';
import { AuthorStoreService } from '../stores/author-store.service';
import { BookStoreService } from '../stores/book-store.service';
import { CommunityCapabilitiesService } from '../stores/community-capabilities.service';
import { ModerationAccessService } from '../stores/moderation-access.service';
import { NotificationStoreService } from '../stores/notification-store.service';
import { SessionNotificationStoreService } from '../stores/session-notification-store.service';
import { UniverseStoreService } from '../stores/universe-store.service';
import { AuthApiService } from './auth-api.service';
import { FirebaseProviderAuthService } from './firebase-provider-auth.service';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

export function shouldUseCrossTabRefreshLock(nativeMobile: boolean, locksAvailable: boolean): boolean {
    return !nativeMobile && locksAvailable;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
    userName = '';
    userEmail = '';
    userId = -1;
    userRole = { Id: 1, Nombre: 'usuario' };
    userImg = '';
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
    estadoCuenta: { Id: number; Nombre: string } | null = null;

    readonly userIsLogged$ = new BehaviorSubject<boolean>(false);
    readonly sessionInitializedSubject = new BehaviorSubject<boolean>(false);

    private accessToken: string | null = null;
    private csrfToken: string | null = null;
    private refreshInFlight: Observable<void> | null = null;
    private readonly sessionChannel = typeof BroadcastChannel === 'undefined'
        ? null
        : new BroadcastChannel('libros-auth-session-v1');

    constructor(
        private authApi: AuthApiService,
        private providerAuth: FirebaseProviderAuthService,
        private universes: UniverseStoreService,
        private authors: AuthorStoreService,
        private books: BookStoreService,
        private router: Router,
        private firebaseSession: FirebaseSessionService,
        private realtimeSockets: RealtimeSocketService,
        private firebasePresence: FirebasePresenceService,
        private notifications: NotificationStoreService,
        private moderationAccess: ModerationAccessService,
        private pushNotifications: PushNotificationService,
        private communityCapabilities: CommunityCapabilitiesService,
        private loader: LoaderEmmitterService,
        private sessionNotifications: SessionNotificationStoreService,
        private decisions: DecisionNoticeService,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean
    ) {
        this.sessionChannel?.addEventListener('message', event => {
            if (event.data?.type === 'logout') {
                this.observeQaLogout('broadcast');
                this.closeLocalSession(false);
            }
        });
        this.realtimeSockets.events$.subscribe(event => {
            if (event.type === 'realtime.session_revoked' || event.type === 'realtime.access_revoked')
                this.logout(true, event.type);
        });
    }

    async initialize(): Promise<void> {
        this.clearLegacyStorage();
        try {
            const csrf = await firstValueFrom(this.authApi.restoreCsrf());
            this.csrfToken = csrf.CsrfToken;
            await firstValueFrom(this.requestNewToken());
        } catch {
            this.clearSessionState();
        } finally {
            this.sessionInitializedSubject.next(true);
        }
    }

    login(credentials: LoginRequest): Observable<FirebaseSessionResult> {
        return from(this.providerAuth.signInPassword(credentials.email, credentials.password)).pipe(
            switchMap(firebaseIdToken => this.completeFirebaseSession(firebaseIdToken))
        );
    }

    completeFirebaseSession(firebaseIdToken: string, phoneAttemptId?: string | null): Observable<FirebaseSessionResult> {
        return this.authApi.exchange({
            FirebaseIdToken: firebaseIdToken,
            PhoneAttemptId: phoneAttemptId ?? null,
            Device: this.deviceDescription()
        }).pipe(tap(result => this.applySessionResult(result)));
    }

    applyAuthenticatedSession(session: AuthenticatedSession): void {
        if (environment.environmentName === 'qa' && typeof sessionStorage !== 'undefined')
            sessionStorage.removeItem('qa:last-logout-reason');
        this.accessToken = session.AccessToken;
        this.csrfToken = session.CsrfToken;
        this.applyProfile(session.Usuario);
        this.userIsLogged$.next(true);
        this.sessionInitializedSubject.next(true);
        this.startAuthenticatedServices();
    }

    logout(redirectToHome: boolean = true, reason: string = 'user'): void {
        this.observeQaLogout(reason);
        const csrf = this.csrfToken;
        if (csrf)
            this.authApi.logout(csrf).pipe(timeout(3000), catchError(() => of(void 0))).subscribe();
        this.sessionChannel?.postMessage({ type: 'logout' });
        this.closeLocalSession(redirectToHome);
    }

    getToken(): string | null { return this.accessToken; }
    get token(): string { return this.accessToken ?? ''; }
    get currentCsrfToken(): string | null { return this.csrfToken; }
    get userIsLogged(): boolean { return this.userIsLogged$.value; }

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
        };
    }

    get canAccessLibrary(): boolean { return this.userIsLogged && !this.verificationPending && this.emailVerificado; }
    get isAdmin(): boolean { return isAdminRole(this.userRole); }
    get canModerateCatalog(): boolean { return canModerateCatalogRole(this.userRole); }

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

    refreshProfile(): Observable<void> {
        return this.authApi.getUser().pipe(tap(response => this.applyProfile(response.user)), map(() => void 0));
    }

    requestNewToken(): Observable<void> {
        if (this.refreshInFlight)
            return this.refreshInFlight;

        const refresh$ = from(this.refreshWithCrossTabLock()).pipe(
            finalize(() => this.refreshInFlight = null),
            shareReplay({ bufferSize: 1, refCount: false })
        );
        this.refreshInFlight = refresh$;
        return refresh$;
    }

    private applySessionResult(result: FirebaseSessionResult): void {
        if (result.Estado === 'authenticated') {
            this.applyAuthenticatedSession(result);
            return;
        }
        if (result.Estado === 'verification_required')
            this.applyVerificationPending(result);
    }

    private applyVerificationPending(result: VerificationRequired): void {
        this.applyProfile(result.Usuario);
        this.accessToken = null;
        this.csrfToken = null;
        this.userIsLogged$.next(false);
        this.verificationPending = true;
        this.emailVerificado = false;
    }

    private applyProfile(profile: ApiUserProfile): void {
        const previousUserId = this.userId;
        this.userId = profile.Id;
        if (previousUserId !== -1 && previousUserId !== this.userId)
            this.clearLibraryStores();
        this.userName = profile.Nombre ?? '';
        this.userEmail = profile.Email ?? '';
        this.userRole = profile.Role ?? { Id: 1, Nombre: 'usuario' };
        this.userImg = profile.Imagen ?? 'default.png';
        this.username = profile.Username ?? null;
        this.displayName = profile.DisplayName ?? null;
        this.bio = profile.Bio ?? null;
        this.paisCodigo = profile.PaisCodigo ?? null;
        this.paisNombre = profile.PaisNombre ?? null;
        this.perfilPublico = profile.PerfilPublico ?? false;
        this.mostrarEstadisticas = profile.MostrarEstadisticas ?? false;
        this.mostrarBiblioteca = profile.MostrarBiblioteca ?? false;
        this.permitirMensajes = profile.PermitirMensajes ?? false;
        this.emailVerificado = profile.EmailVerificado ?? true;
        this.verificationPending = profile.VerificationPending ?? !this.emailVerificado;
        this.estadoCuenta = profile.EstadoCuenta ?? null;
    }

    private startAuthenticatedServices(): void {
        const sessionUserId = this.userId;
        queueMicrotask(() => {
            if (!this.isSessionActiveFor(sessionUserId)) return;
            this.firebaseSession.startForUser(sessionUserId).subscribe({
                next: () => {
                    if (!this.isSessionActiveFor(sessionUserId)) return;
                    void this.firebasePresence.start(sessionUserId);
                    this.pushNotifications.restore(sessionUserId).subscribe();
                },
                error: error => console.warn('No se pudo iniciar la sesión Firebase', error)
            });
        });
        queueMicrotask(() => {
            if (!this.isSessionActiveFor(sessionUserId)) return;
            this.communityCapabilities.initialize(sessionUserId).subscribe(() => {
                if (this.isSessionActiveFor(sessionUserId)) this.notifications.initialize();
            });
        });
        queueMicrotask(() => {
            if (this.isSessionActiveFor(sessionUserId)) this.moderationAccess.refresh().subscribe();
        });
    }

    private clearSessionState(): void {
        this.accessToken = null;
        this.csrfToken = null;
        this.userId = -1;
        this.userName = '';
        this.userEmail = '';
        this.userRole = { Id: 1, Nombre: 'usuario' };
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
    }

    private async refreshWithCrossTabLock(): Promise<void> {
        const refresh = async (): Promise<void> => {
            // El refresh cookie rota. Restaurar CSRF dentro del bloqueo evita que
            // otra pestana reutilice el par anterior.
            const csrf = await firstValueFrom(this.authApi.restoreCsrf());
            this.csrfToken = csrf.CsrfToken;
            const session = await firstValueFrom(this.authApi.refresh(csrf.CsrfToken));
            this.applyAuthenticatedSession(session);
        };
        const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
        // Capacitor solo mantiene una instancia de la aplicación. Coordinarla con
        // Web Locks puede dejar un arranque nuevo esperando a un renderer antiguo
        // que Android todavía no ha terminado de retirar.
        if (!shouldUseCrossTabRefreshLock(this.nativeMobile, !!locks))
            return refresh();
        await locks!.request('libros-session-refresh', { mode: 'exclusive' }, refresh);
    }

    private closeLocalSession(redirectToHome: boolean): void {
        const sessionUserId = this.userId;
        if (sessionUserId >= 1)
            this.pushNotifications.logout(sessionUserId).pipe(timeout(2000), catchError(() => of(void 0))).subscribe();
        this.loader.deactivateLoader();
        this.realtimeSockets.closeAll();
        this.notifications.clear();
        this.sessionNotifications.resetSession();
        this.decisions.reset();
        this.moderationAccess.clear();
        this.communityCapabilities.clear();
        void this.firebasePresence.clear().finally(() => this.firebaseSession.clear());
        void this.providerAuth.clear();
        this.clearSessionState();
        this.clearLegacyStorage();
        this.clearLibraryStores();
        if (redirectToHome)
            void this.router.navigateByUrl('/home', { replaceUrl: true });
    }

    private clearLegacyStorage(): void {
        try {
            localStorage.removeItem('jwt');
            localStorage.removeItem('refresh');
            localStorage.setItem('sessionVersion', environment.sessionVersion);
        } catch { /* La sesión moderna no depende de storage. */ }
    }

    private observeQaLogout(reason: string): void {
        if (environment.environmentName !== 'qa' || typeof window === 'undefined')
            return;
        sessionStorage.setItem('qa:last-logout-reason', reason);
        window.dispatchEvent(new CustomEvent('libros:qa-session-logout', { detail: { reason } }));
    }

    private clearLibraryStores(): void {
        this.universes.clear();
        this.authors.clear();
        this.books.clear();
    }

    private isSessionActiveFor(userId: number): boolean {
        return this.userIsLogged && this.userId === userId && !!this.accessToken;
    }

    private deviceDescription(): { Name: string; Platform: string } {
        if (this.nativeMobile)
            return { Name: 'Mem.Bib. en Android', Platform: 'android' };
        if (typeof navigator === 'undefined')
            return { Name: 'Navegador web', Platform: 'web' };
        const platform = navigator.platform || 'web';
        return { Name: `${this.browserName()} en ${platform}`.slice(0, 120), Platform: 'web' };
    }

    private browserName(): string {
        const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
        if (/Firefox\//.test(agent)) return 'Firefox';
        if (/Edg\//.test(agent)) return 'Edge';
        if (/Chrome\//.test(agent)) return 'Chrome';
        if (/Safari\//.test(agent)) return 'Safari';
        return 'Navegador';
    }
}
