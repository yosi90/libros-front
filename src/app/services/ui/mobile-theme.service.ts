import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, Injector, signal } from '@angular/core';
import { WEB_PRESENTATION_ENABLED } from './presentation-mode.service';
import { WebThemeService } from './web-theme.service';

export type MobileTheme = 'light' | 'dark';

/** Tema guardado de una versión anterior: Wood histórico pasa a claro en Mobile. */
export function toMobileTheme(theme: string | null | undefined): MobileTheme {
    return theme === 'dark' ? 'dark' : 'light';
}

/**
 * Tema claro u oscuro de Mobile, recordado en el dispositivo. Con la cuenta de Yosiftware el tema no se guarda en la
 * cuenta (ecosistema-kit/ACCESO.md, «Los ajustes de la web») y no cambia al cambiar de cuenta.
 */
@Injectable({ providedIn: 'root' })
export class MobileThemeService {
    private readonly storageKey = 'libros:mobile-theme:last';
    private readonly themeSignal = signal<MobileTheme>('light');
    private readonly savingSignal = signal(false);
    private initialized = false;
    private readonly webTheme: WebThemeService | null;

    readonly theme = this.themeSignal.asReadonly();
    readonly saving = this.savingSignal.asReadonly();

    constructor(
        @Inject(DOCUMENT) private document: Document,
        @Inject(WEB_PRESENTATION_ENABLED) webPresentationEnabled: boolean,
        injector: Injector
    ) {
        // En el navegador con la presentación Web activa, las vistas Mobile de transición
        // reflejan el tema del dispositivo en lugar de mantener uno propio.
        this.webTheme = webPresentationEnabled ? injector.get(WebThemeService) : null;
        this.webTheme?.choice$.subscribe(choice => this.apply(toMobileTheme(choice)));
    }

    initialize(): void {
        if (this.webTheme || this.initialized) return;
        this.initialized = true;
        this.apply(this.readLocal() ?? 'light');
    }

    toggle(): void {
        if (this.webTheme) {
            this.webTheme.select(this.themeSignal() === 'light' ? 'dark' : 'light');
            return;
        }
        const theme: MobileTheme = this.themeSignal() === 'light' ? 'dark' : 'light';
        this.apply(theme);
        this.writeLocal(theme);
    }

    get actionIcon(): 'light_mode' | 'dark_mode' {
        return this.themeSignal() === 'dark' ? 'light_mode' : 'dark_mode';
    }

    get actionLabel(): string {
        return this.themeSignal() === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro';
    }

    private apply(theme: MobileTheme): void {
        this.themeSignal.set(theme);
        this.document.documentElement.dataset['mobileTheme'] = theme;
    }

    private readLocal(): MobileTheme | null {
        try {
            const value = localStorage.getItem(this.storageKey);
            return value === null ? null : toMobileTheme(value);
        } catch { return null; }
    }

    private writeLocal(theme: MobileTheme): void {
        try { localStorage.setItem(this.storageKey, theme); }
        catch { /* Sin almacenamiento, el tema dura lo que la pestaña. */ }
    }
}
