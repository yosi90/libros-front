import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { PlatformSessionService } from '../auth/platform-session.service';
import { NATIVE_MOBILE_PLATFORM, PresentationModeService, WEB_PRESENTATION_ENABLED, WebThemeChoice } from './presentation-mode.service';

export type { WebThemeChoice } from './presentation-mode.service';

const LAST_DEVICE_KEY = 'libros:web-theme:last';

export function isWebThemeChoice(value: unknown): value is WebThemeChoice {
    return value === 'light' || value === 'dark' || value === 'wood';
}

/**
 * Tema del navegador, recordado por dispositivo (CONTRATO_PRESENTACIONES_WEB.md). Con la cuenta de Yosiftware el tema
 * no se guarda en la cuenta (ecosistema-kit/ACCESO.md, «Los ajustes de la web»): se queda en cada navegador y no se
 * borra al cambiar de cuenta. La APK no usa este servicio.
 */
@Injectable({ providedIn: 'root' })
export class WebThemeService {
    private readonly choiceSignal = signal<WebThemeChoice>('light');
    private readonly choiceUnsetSignal = signal<boolean | null>(null);
    readonly choice = this.choiceSignal.asReadonly();
    /** true si este dispositivo aún no ha elegido estilo; null mientras no hay cuenta lista. */
    readonly choiceUnset = this.choiceUnsetSignal.asReadonly();
    readonly choice$ = toObservable(this.choiceSignal);
    readonly enabled: boolean;

    constructor(
        private session: PlatformSessionService,
        @Inject(DOCUMENT) private document: Document,
        presentation: PresentationModeService,
        @Inject(WEB_PRESENTATION_ENABLED) webPresentationEnabled: boolean,
        @Inject(NATIVE_MOBILE_PLATFORM) nativeMobile: boolean
    ) {
        this.enabled = webPresentationEnabled && !nativeMobile;
        if (!this.enabled) return;
        this.apply(this.readLocal() ?? 'light');
        presentation.attachWebTheme(this.choice$);
        this.session.userIsLogged$.subscribe(logged => this.choiceUnsetSignal.set(logged ? this.readLocal() === null : null));
    }

    select(choice: WebThemeChoice): void {
        if (!this.enabled) return;
        if (this.choiceSignal() !== choice) this.apply(choice);
        this.writeLocal(choice);
        this.choiceUnsetSignal.update(unset => unset === null ? null : false);
    }

    private apply(choice: WebThemeChoice): void {
        this.choiceSignal.set(choice);
        const root = this.document.documentElement;
        root.dataset['webTheme'] = choice === 'dark' ? 'dark' : 'light';
        // Las ventanas del SDK de Yosiftware (entrar, perfil…) siguen el tema de `<html>` (`dataset.theme`, ACCESO.md,
        // «El tema de la ventana»). Wood es oscuro.
        root.dataset['theme'] = choice === 'light' ? 'light' : 'dark';
    }

    private readLocal(): WebThemeChoice | null {
        try {
            const value = localStorage.getItem(LAST_DEVICE_KEY);
            return isWebThemeChoice(value) ? value : null;
        } catch { return null; }
    }

    private writeLocal(choice: WebThemeChoice): void {
        try { localStorage.setItem(LAST_DEVICE_KEY, choice); }
        catch { /* Navegación privada: la elección dura lo que la pestaña. */ }
    }
}
