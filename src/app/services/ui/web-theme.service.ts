import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { InterfaceTheme } from '../../interfaces/auth';
import { AuthApiService } from '../auth/auth-api.service';
import { SessionService } from '../auth/session.service';
import { NATIVE_MOBILE_PLATFORM, PresentationModeService, WEB_PRESENTATION_ENABLED, WebThemeChoice } from './presentation-mode.service';

export type { WebThemeChoice } from './presentation-mode.service';

const STORAGE_PREFIX = 'libros:web-theme:';
const LAST_DEVICE_KEY = `${STORAGE_PREFIX}last`;

export function isWebThemeChoice(value: unknown): value is WebThemeChoice {
    return value === 'light' || value === 'dark' || value === 'wood';
}

/**
 * Tema del navegador, recordado por dispositivo (CONTRATO_PRESENTACIONES_WEB.md).
 * La preferencia de cuenta solo aporta el valor inicial de un dispositivo sin
 * elección propia; la APK no usa este servicio.
 */
@Injectable({ providedIn: 'root' })
export class WebThemeService {
    private readonly choiceSignal = signal<WebThemeChoice>('light');
    private readonly savingSignal = signal(false);
    private initializedUserId: number | null = null;
    private accountVersion: number | null = null;

    private readonly accountUnsetSignal = signal<boolean | null>(null);
    readonly choice = this.choiceSignal.asReadonly();
    /** true si la cuenta nunca ha elegido tema (usuario nuevo); null mientras no se sabe. */
    readonly accountUnset = this.accountUnsetSignal.asReadonly();
    readonly choice$ = toObservable(this.choiceSignal);
    readonly saving = this.savingSignal.asReadonly();
    readonly enabled: boolean;

    constructor(
        private api: AuthApiService,
        private session: SessionService,
        @Inject(DOCUMENT) private document: Document,
        presentation: PresentationModeService,
        @Inject(WEB_PRESENTATION_ENABLED) webPresentationEnabled: boolean,
        @Inject(NATIVE_MOBILE_PLATFORM) nativeMobile: boolean
    ) {
        this.enabled = webPresentationEnabled && !nativeMobile;
        if (!this.enabled) return;
        this.apply(this.readLocal(LAST_DEVICE_KEY) ?? 'light');
        presentation.attachWebTheme(this.choice$);
        this.session.userIsLogged$.subscribe(logged => {
            if (logged) this.initializeForUser(this.session.userId);
            else { this.initializedUserId = null; this.accountUnsetSignal.set(null); }
        });
    }

    select(choice: WebThemeChoice): void {
        if (!this.enabled || this.choiceSignal() === choice) return;
        this.apply(choice);
        this.persistLocal(choice);
        this.syncAccountDefault(choice);
    }

    private initializeForUser(userId: number): void {
        if (userId < 1 || this.initializedUserId === userId) return;
        this.initializedUserId = userId;
        const local = this.readLocal(this.userKey(userId));
        if (local) this.apply(local);

        this.api.getInterfacePreferences().subscribe({
            next: response => {
                if (this.initializedUserId !== userId) return;
                this.accountVersion = response.Preferencias.Version;
                this.accountUnsetSignal.set(response.Preferencias.FechaActualizacion === null);
                // Solo un dispositivo sin elección propia adopta el tema de la cuenta.
                if (local) return;
                const initial = this.fromAccountTheme(response.Preferencias.Tema);
                this.apply(initial);
                this.persistLocal(initial);
            },
            error: () => { /* Sin conexión se conserva la elección local o la del dispositivo. */ }
        });
    }

    private syncAccountDefault(choice: WebThemeChoice): void {
        if (this.session.userId < 1 || this.accountVersion === null) return;
        this.savingSignal.set(true);
        this.api.patchInterfacePreferences(this.accountVersion, choice).subscribe({
            next: response => {
                this.accountVersion = response.Preferencias.Version;
                this.savingSignal.set(false);
            },
            // Un conflicto de versión o un fallo de red no afecta a la elección local:
            // la cuenta solo es el valor inicial de otros dispositivos.
            error: () => {
                this.accountVersion = null;
                this.savingSignal.set(false);
                this.api.getInterfacePreferences().subscribe({
                    next: response => this.accountVersion = response.Preferencias.Version,
                    error: () => undefined
                });
            }
        });
    }

    private apply(choice: WebThemeChoice): void {
        this.choiceSignal.set(choice);
        this.document.documentElement.dataset['webTheme'] = choice === 'dark' ? 'dark' : 'light';
    }

    private persistLocal(choice: WebThemeChoice): void {
        this.writeLocal(LAST_DEVICE_KEY, choice);
        if (this.session.userId >= 1) this.writeLocal(this.userKey(this.session.userId), choice);
    }

    private fromAccountTheme(theme: InterfaceTheme): WebThemeChoice {
        return isWebThemeChoice(theme) ? theme : 'light';
    }

    private userKey(userId: number): string {
        return `${STORAGE_PREFIX}${userId}`;
    }

    private readLocal(key: string): WebThemeChoice | null {
        try {
            const value = localStorage.getItem(key);
            return isWebThemeChoice(value) ? value : null;
        } catch { return null; }
    }

    private writeLocal(key: string, choice: WebThemeChoice): void {
        try { localStorage.setItem(key, choice); }
        catch { /* Navegación privada: la elección dura lo que la pestaña. */ }
    }
}
