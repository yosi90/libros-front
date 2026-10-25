import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Inject, Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, distinctUntilChanged, map } from 'rxjs';
import { environment } from '../../../environment/environment';
import { Role, User } from '../../interfaces/user';
import {
    CARGADOR_SDK,
    CargadorSdk,
    CuentaPlataforma,
    EstadoPlataforma,
    NormasPendientesPlataforma,
    ObjetoDenunciaPlataforma,
    RestriccionesPlataforma,
    YosiftwareSdk,
    esCambioDeIdentidad
} from './yosiftware-sdk';

/**
 * La sesión de Libros es la de la cuenta de Yosiftware (ecosistema-kit/ACCESO.md). Este servicio es el único que habla
 * con el SDK de la plataforma: no hay inicio de sesión, refresh, CSRF ni tokens propios, y los tokens no se guardan
 * nunca (el SDK los tiene en memoria y los renueva solo).
 *
 * Cambio de cuenta (ecosistema-kit/CAMBIO_DE_CUENTA.md): cada identidad tiene su **generación**. Con otro `cuenta.id`,
 * al pasar por `sin_sesion` o con el aviso `yosiftware:identidad` del SDK (que cubre A → B → A), la generación sube,
 * `identityChange$` avisa para vaciar los datos en memoria y las respuestas de la generación anterior se descartan.
 */

const SIN_ROL: Role = { Id: 1, Nombre: 'usuario' };
const REINTENTO_SDK_MS = 60_000;
const VERSION_KEY = 'sessionVersion';

/** Claves de versiones anteriores que ya no sirven (sesión propia, Firebase, push propio). Nunca la de Yosiftadísticas. */
const LEGACY_KEYS = ['jwt', 'refresh', 'nativeRefreshSession'];
const LEGACY_PREFIXES = ['push-device:', 'runtimeConfig:', 'book-front:floating-window:v1:'];
/** Preferencias que antes se guardaban por el id numérico de Libros; ahora van por entorno y cuenta. */
const LEGACY_NUMERIC_PREFIXES = ['libros:web-theme:', 'libros:mobile-theme:', 'libros:theme-onboarded:', 'library-collection-view:', 'narrative-editor-fonts:v1:'];

/** Generación a la que pertenece una petición a la API de Libros (la pone el servicio en sus propias llamadas). */
export const GENERACION_PETICION = new HttpContextToken<number | null>(() => null);

export interface IdentityChange {
    generation: number;
    /** La cuenta nueva, o `null` si se ha salido o aún no se sabe cuál será. */
    accountId: string | null;
}

export type LibraryAccessState = 'comprobando' | 'sin_sesion' | 'cargando' | 'lista' | 'error' | 'cuenta_borrada' | 'no_disponible';

interface LocalUserResponse {
    success: boolean;
    user: { Id: number; Nombre: string | null; Role: Role | null; CompartirEstadisticas?: boolean };
}

@Injectable({ providedIn: 'root' })
export class PlatformSessionService implements OnDestroy {
    private readonly estadoSubject = new BehaviorSubject<EstadoPlataforma>({ tipo: 'comprobando' });
    private readonly accessSubject = new BehaviorSubject<LibraryAccessState>('comprobando');
    private readonly identityChangeSubject = new Subject<IdentityChange>();

    readonly estado$ = this.estadoSubject.asObservable();
    readonly access$ = this.accessSubject.asObservable();
    /** Avisa antes de presentar otra identidad: quien guarde datos de la persona los vacía. */
    readonly identityChange$ = this.identityChangeSubject.asObservable();
    /** Hay cuenta y Libros ya sabe quién es en su API (`GET /usuarios/me`). */
    readonly userIsLogged$ = new BehaviorSubject<boolean>(false);
    /** La primera comprobación de la sesión ha terminado (con o sin cuenta). */
    readonly sessionInitializedSubject = new BehaviorSubject<boolean>(false);

    userId = -1;
    userName = '';
    userRole: Role = SIN_ROL;
    avatarUrl: string | null = null;
    /** Si las lecturas de la persona cuentan, anónimas, en las estadísticas de la comunidad (ajuste de Libros). */
    shareStatistics = false;

    private generationValue = 0;
    private sdk: YosiftwareSdk | null = null;
    private sdkLoad: Promise<YosiftwareSdk> | null = null;
    private started = false;
    /** La última cuenta presentada en esta carga de la página. */
    private confirmedAccountId: string | null = null;
    /**
     * El SDK avisó (`yosiftware:identidad`) de que la cuenta presentada cambia. El aviso ya vacía la identidad, así que
     * el estado que llega después tiene que saber que viene de otra cuenta para sacar a la persona de lo privado.
     */
    private identityNoticed = false;
    private stopListening: (() => void) | null = null;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly identityNoticeListener = () => this.zone.run(() => this.onIdentityNotice());

    constructor(
        @Inject(CARGADOR_SDK) private cargarSdk: CargadorSdk,
        private http: HttpClient,
        private router: Router,
        private zone: NgZone
    ) { }

    /** Se llama una vez al arrancar la aplicación. */
    start(): void {
        if (this.started) return;
        this.started = true;
        this.clearLegacyStorage();
        if (typeof window !== 'undefined')
            window.addEventListener('yosiftware:identidad', this.identityNoticeListener);
        void this.connect();
    }

    ngOnDestroy(): void {
        this.stopListening?.();
        this.stopListening = null;
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = null;
        if (typeof window !== 'undefined')
            window.removeEventListener('yosiftware:identidad', this.identityNoticeListener);
    }

    get estado(): EstadoPlataforma { return this.estadoSubject.value; }
    get access(): LibraryAccessState { return this.accessSubject.value; }
    get generation(): number { return this.generationValue; }
    get cuenta(): CuentaPlataforma | null {
        const estado = this.estadoSubject.value;
        return estado.tipo === 'con_sesion' ? estado.cuenta : null;
    }
    get restricciones(): RestriccionesPlataforma | null {
        const estado = this.estadoSubject.value;
        return estado.tipo === 'con_sesion' ? estado.restricciones ?? null : null;
    }
    get normasPendientes(): NormasPendientesPlataforma | null {
        const estado = this.estadoSubject.value;
        return estado.tipo === 'con_sesion' ? estado.normasPendientes ?? null : null;
    }
    readonly restricciones$: Observable<RestriccionesPlataforma | null> = this.estado$.pipe(
        map(estado => estado.tipo === 'con_sesion' ? estado.restricciones ?? null : null),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );

    get userIsLogged(): boolean { return this.userIsLogged$.value; }
    get canAccessLibrary(): boolean { return this.userIsLogged; }

    /** Compatibilidad con las pantallas: lo que Libros sabe de la persona. El perfil es de la plataforma. */
    get userObject(): User {
        return {
            userId: this.userId,
            name: this.userName,
            email: this.cuenta?.correo ?? '',
            role: this.userRole,
            image: '',
            displayName: this.userName || null
        };
    }

    isCurrentGeneration(generation: number): boolean {
        return generation === this.generationValue;
    }

    /**
     * Sufijo para lo que se guarda por persona en el dispositivo: entorno y cuenta de Yosiftware
     * (CAMBIO_DE_CUENTA.md, obligación 4). `null` sin cuenta: entonces no se guarda nada por persona.
     */
    get storageScope(): string | null {
        const cuenta = this.cuenta;
        return cuenta && this.userIsLogged ? `${environment.environmentName}:${cuenta.id}` : null;
    }

    accountStorageKey(prefix: string): string | null {
        const scope = this.storageScope;
        return scope ? `${prefix}${scope}` : null;
    }

    /** Token para la API de Libros (audiencia `libros-api`). `null` sin sesión o si la cuenta cambia entre medias. */
    async token(): Promise<string | null> {
        try {
            return await (await this.loadSdk()).token();
        } catch (error) {
            if (esCambioDeIdentidad(error)) return null;
            throw error;
        }
    }

    /**
     * Un token nuevo tras un 401. El SDK renueva solo un minuto antes de caducar; si aún devuelve el mismo, se le
     * pide con `fetch()` (que, ante un 401, comprueba la sesión y renueva) y se vuelve a preguntar.
     */
    async renewToken(previous: string | null): Promise<string | null> {
        const current = await this.token();
        if (current && current !== previous) return current;
        try {
            const sdk = await this.loadSdk();
            await sdk.fetch(`${environment.apiUrl}usuarios/me`, { cache: 'no-store' });
        } catch (error) {
            if (esCambioDeIdentidad(error)) return null;
        }
        return this.token();
    }

    /** Token para la API de la plataforma (`aud: cuentas`). `null` sin sesión o si la cuenta cambia entre medias. */
    async platformToken(): Promise<string | null> {
        try {
            return await (await this.loadSdk()).tokenPlataforma();
        } catch (error) {
            if (esCambioDeIdentidad(error)) return null;
            throw error;
        }
    }

    /** El SDK ya cargado, para lo que Libros usa de la plataforma (chat, ajustes, tiempo real, ventanas). */
    platformSdk(): Promise<YosiftwareSdk> {
        return this.loadSdk();
    }

    async entrar(vista: 'entrar' | 'registro' = 'entrar'): Promise<boolean> {
        return (await this.loadSdk()).entrar({ vista });
    }

    /** Cierra la sesión de la cuenta activa en todas las webs (la limpieza llega con el nuevo estado). */
    async salir(): Promise<void> {
        await (await this.loadSdk()).salir();
    }

    async cambiarCuenta(): Promise<boolean> {
        return (await this.loadSdk()).cambiarCuenta();
    }

    async editarPerfil(): Promise<boolean> {
        const guardado = await (await this.loadSdk()).editarPerfil();
        if (guardado) void this.loadProfile(this.generationValue);
        return guardado;
    }

    /** Errores y propuestas de Yosiftware (`<yosi-reportar>` hace lo mismo). */
    async reportar(tipo?: 'error' | 'propuesta'): Promise<boolean> {
        return (await this.loadSdk()).reportar(tipo ? { tipo } : undefined);
    }

    /** Denunciar algo de la plataforma: una persona o un mensaje del chat (MODERACION.md). */
    async denunciar(objeto: ObjetoDenunciaPlataforma): Promise<boolean> {
        return (await this.loadSdk()).denunciar(objeto);
    }

    /** La privacidad de Yosiftware para Libros, en un diálogo (`<yosi-privacidad>` hace lo mismo). */
    async privacidad(): Promise<void> {
        await (await this.loadSdk()).privacidad();
    }

    /** La web social, con una vista si se pide (`cuenta`, `privacidad`…). */
    socialUrl(vista?: string): string {
        const base = environment.plataforma.socialUrl;
        return vista ? `${base}/?vista=${encodeURIComponent(vista)}` : base;
    }

    /** El perfil público de otra persona en la web social (nunca el de una cuenta borrada). */
    socialProfileUrl(accountId: string): string {
        return `${environment.plataforma.socialUrl}/?perfil=${encodeURIComponent(accountId)}`;
    }

    /** Vuelve a pedir el usuario local tras un fallo. */
    retry(): void {
        const cuenta = this.cuenta;
        if (cuenta && (this.access === 'error' || this.access === 'cargando'))
            this.loadLocalUser(this.generationValue);
    }

    /** La API dice que la cuenta se ha borrado (`403 account_deleted`): se olvida lo de la persona. */
    forgetDeletedAccount(): void {
        if (this.access === 'cuenta_borrada') return;
        this.changeIdentity(null);
        this.confirmedAccountId = null;
        this.accessSubject.next('cuenta_borrada');
        this.leaveProtectedRoute('/home');
    }

    private async connect(): Promise<void> {
        try {
            const sdk = await this.loadSdk();
            this.stopListening = sdk.alCambiar(estado => this.zone.run(() => this.applyState(estado)));
        } catch {
            this.estadoSubject.next({ tipo: 'no_disponible' });
            this.accessSubject.next('no_disponible');
            this.sessionInitializedSubject.next(true);
            this.retryTimer = setTimeout(() => {
                this.retryTimer = null;
                void this.connect();
            }, REINTENTO_SDK_MS);
        }
    }

    private loadSdk(): Promise<YosiftwareSdk> {
        if (this.sdk) return Promise.resolve(this.sdk);
        this.sdkLoad ??= this.cargarSdk().then(sdk => {
            this.sdk = sdk;
            return sdk;
        }).catch((error: unknown) => {
            this.sdkLoad = null;
            throw error;
        });
        return this.sdkLoad;
    }

    private applyState(estado: EstadoPlataforma): void {
        const previous = this.confirmedAccountId;
        if (estado.tipo === 'comprobando') return;
        if (estado.tipo === 'no_disponible') {
            // El SDK lo reintenta solo. Una sesión ya presentada se conserva mientras tanto.
            if (!previous) {
                this.estadoSubject.next(estado);
                this.accessSubject.next('no_disponible');
                this.sessionInitializedSubject.next(true);
            }
            return;
        }
        if (estado.tipo === 'sin_sesion') {
            const hadIdentity = previous !== null || this.userIsLogged || this.identityNoticed;
            this.identityNoticed = false;
            this.confirmedAccountId = null;
            this.estadoSubject.next(estado);
            if (hadIdentity) this.changeIdentity(null);
            this.accessSubject.next('sin_sesion');
            this.sessionInitializedSubject.next(true);
            if (hadIdentity) this.leaveProtectedRoute('/home');
            return;
        }
        this.estadoSubject.next(estado);
        if (estado.cuenta.id === previous) return;
        const switched = previous !== null || this.userIsLogged || this.identityNoticed;
        this.identityNoticed = false;
        this.confirmedAccountId = estado.cuenta.id;
        const generation = this.changeIdentity(estado.cuenta.id);
        if (switched) this.leaveProtectedRoute('/dashboard/books');
        this.loadLocalUser(generation);
    }

    /** El SDK avisa de un cambio antes de confirmarlo: se invalida todo, aunque luego vuelva la misma cuenta. */
    private onIdentityNotice(): void {
        if (this.confirmedAccountId === null && !this.userIsLogged) return;
        this.identityNoticed = true;
        this.confirmedAccountId = null;
        this.changeIdentity(null);
        this.accessSubject.next('cargando');
    }

    private changeIdentity(accountId: string | null): number {
        const generation = ++this.generationValue;
        this.userId = -1;
        this.userName = '';
        this.userRole = SIN_ROL;
        this.avatarUrl = null;
        this.shareStatistics = false;
        if (this.userIsLogged$.value) this.userIsLogged$.next(false);
        this.identityChangeSubject.next({ generation, accountId });
        return generation;
    }

    private loadLocalUser(generation: number): void {
        this.accessSubject.next('cargando');
        this.http.get<LocalUserResponse>(`${environment.apiUrl}usuarios/me`, {
            context: new HttpContext().set(GENERACION_PETICION, generation)
        }).subscribe({
            next: response => {
                if (!this.isCurrentGeneration(generation)) return;
                const user = response?.user;
                if (!user || !Number.isInteger(user.Id) || user.Id < 1) {
                    this.failLocalUser(generation);
                    return;
                }
                this.userId = user.Id;
                this.userName = user.Nombre || this.cuenta?.alias || '';
                this.userRole = user.Role ?? SIN_ROL;
                this.shareStatistics = user.CompartirEstadisticas === true;
                // Antes que `lista`: las guardas reaccionan a `access$` en el acto y leen `userIsLogged`. Al revés, una
                // recarga o un enlace a una página con sesión acababa en la portada y de ahí en la biblioteca.
                this.userIsLogged$.next(true);
                this.accessSubject.next('lista');
                this.sessionInitializedSubject.next(true);
                void this.loadProfile(generation);
            },
            error: (error: { status?: number; error?: { code?: string } }) => {
                if (!this.isCurrentGeneration(generation)) return;
                if (error?.status === 403 && error.error?.code === 'account_deleted') {
                    this.forgetDeletedAccount();
                    this.sessionInitializedSubject.next(true);
                    return;
                }
                this.failLocalUser(generation);
            }
        });
    }

    private failLocalUser(generation: number): void {
        if (!this.isCurrentGeneration(generation)) return;
        this.accessSubject.next('error');
        this.sessionInitializedSubject.next(true);
    }

    /** Nombre y avatar para la cabecera: los da la plataforma; Libros no los guarda. */
    private async loadProfile(generation: number): Promise<void> {
        try {
            const perfil = await (await this.loadSdk()).perfil();
            if (!this.isCurrentGeneration(generation) || !perfil) return;
            this.zone.run(() => {
                this.userName = perfil.nombre || perfil.alias || this.userName;
                this.avatarUrl = perfil.avatar?.miniatura ?? null;
            });
        } catch { /* Sin perfil se enseña la inicial del alias. */ }
    }

    private leaveProtectedRoute(target: string): void {
        const url = this.router.url ?? '';
        if (url.startsWith('/dashboard') || url.startsWith('/book/'))
            void this.router.navigateByUrl(target, { replaceUrl: true });
    }

    /**
     * Con una versión nueva (`environment.sessionVersion`) se retira lo que dejaron las anteriores: la sesión propia,
     * el push propio y las preferencias guardadas por el id numérico. Nunca `yosiftadisticas:excluir`.
     */
    private clearLegacyStorage(): void {
        try {
            if (localStorage.getItem(VERSION_KEY) === environment.sessionVersion) return;
            for (const key of LEGACY_KEYS) localStorage.removeItem(key);
            for (const key of Object.keys(localStorage)) {
                if (LEGACY_PREFIXES.some(prefix => key.startsWith(prefix)))
                    localStorage.removeItem(key);
                else if (LEGACY_NUMERIC_PREFIXES.some(prefix => key.startsWith(prefix) && /^\d+$/.test(key.slice(prefix.length))))
                    localStorage.removeItem(key);
            }
            localStorage.setItem(VERSION_KEY, environment.sessionVersion);
        } catch { /* Sin almacenamiento no hay nada que retirar. */ }
    }
}
