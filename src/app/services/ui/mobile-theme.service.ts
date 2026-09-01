import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { InterfaceTheme } from '../../interfaces/auth';
import { AuthApiService } from '../auth/auth-api.service';
import { SessionService } from '../auth/session.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NATIVE_MOBILE_PLATFORM } from './presentation-mode.service';

export type MobileTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class MobileThemeService {
    private readonly storagePrefix = 'libros:mobile-theme:';
    private readonly themeSignal = signal<MobileTheme>('light');
    private readonly savingSignal = signal(false);
    private initializedUserId: number | null = null;
    private version = 1;

    readonly theme = this.themeSignal.asReadonly();
    readonly saving = this.savingSignal.asReadonly();

    constructor(
        private api: AuthApiService,
        private session: SessionService,
        @Inject(DOCUMENT) private document: Document,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean
    ) { }

    initialize(): void {
        const userId = this.session.userId;
        if (userId < 1 || this.initializedUserId === userId) return;
        this.initializedUserId = userId;
        this.apply(this.readLocal(userId) ?? 'light');
        this.api.getInterfacePreferences().subscribe({
            next: response => {
                if (this.initializedUserId !== userId) return;
                this.version = response.Preferencias.Version;
                const theme = this.toMobileTheme(response.Preferencias.Tema);
                this.apply(theme);
                this.writeLocal(userId, theme);
            },
            error: () => { /* Se conserva la preferencia local si no hay conexión. */ }
        });
    }

    toggle(): void {
        if (this.savingSignal()) return;
        const userId = this.session.userId;
        const theme: MobileTheme = this.themeSignal() === 'light' ? 'dark' : 'light';
        this.apply(theme);
        if (userId >= 1) this.writeLocal(userId, theme);
        this.savingSignal.set(true);
        this.api.patchInterfacePreferences(this.version, theme).pipe(
            finalize(() => this.savingSignal.set(false))
        ).subscribe({
            next: response => {
                this.version = response.Preferencias.Version;
                const canonicalTheme = this.toMobileTheme(response.Preferencias.Tema);
                this.apply(canonicalTheme);
                if (userId >= 1) this.writeLocal(userId, canonicalTheme);
            },
            error: () => { /* Se conserva la elección local si falla la sincronización. */ }
        });
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
        if (this.nativeMobile) {
            void Promise.all([
                StatusBar.setStyle({ style: theme === 'light' ? Style.Dark : Style.Light }),
                StatusBar.setBackgroundColor({ color: theme === 'light' ? '#f5f2ea' : '#111916' })
            ]).catch(() => { /* Android conserva el tema nativo si el plugin no está disponible. */ });
        }
    }

    private toMobileTheme(theme: InterfaceTheme): MobileTheme {
        return theme === 'dark' ? 'dark' : 'light';
    }

    private readLocal(userId: number): MobileTheme | null {
        try {
            const value = localStorage.getItem(`${this.storagePrefix}${userId}`);
            return value === 'light' || value === 'dark' ? value : null;
        } catch { return null; }
    }

    private writeLocal(userId: number, theme: MobileTheme): void {
        try { localStorage.setItem(`${this.storagePrefix}${userId}`, theme); }
        catch { /* La API sigue siendo la fuente canónica. */ }
    }
}
