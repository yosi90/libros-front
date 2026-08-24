import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { InterfacePreferences, InterfaceTheme } from '../../interfaces/auth';
import { AppToastService } from '../../shared/toast/app-toast.service';
import { AuthApiService } from '../auth/auth-api.service';
import { SessionService } from '../auth/session.service';
import { RealtimeSocketService } from '../realtime/realtime-socket.service';
import { AppTheme, ThemeService } from './theme.service';

interface PendingThemeIntent { theme: InterfaceTheme; baseVersion: number; }

@Injectable({ providedIn: 'root' })
export class InterfacePreferencesService {
    private readonly pendingKey = 'book-front:pending-theme:v1';
    private current: InterfacePreferences | null = null;
    private applyingRemote = false;
    private saving = false;
    private hadLoggedSession = false;

    constructor(
        private api: AuthApiService,
        private session: SessionService,
        private themes: ThemeService,
        private realtime: RealtimeSocketService,
        private toasts: AppToastService
    ) {
        this.session.userIsLogged$.subscribe(logged => {
            if (logged) {
                this.hadLoggedSession = true;
                this.reconcile();
            } else {
                this.current = null;
                if (this.hadLoggedSession) this.clearPending();
            }
        });
        this.themes.requestedThemeChanges$.subscribe(theme => {
            if (!this.applyingRemote && this.session.userIsLogged) this.save(theme);
        });
        this.realtime.events$.subscribe(event => {
            if (event.type !== 'user.interface_preferences_updated') return;
            const preferences = event.payload['Preferencias'] as InterfacePreferences | undefined;
            if (!preferences || !this.current || preferences.Version <= this.current.Version) return;
            if (preferences.Version !== this.current.Version + 1) {
                this.reconcile();
                return;
            }
            this.adopt(preferences);
        });
        this.realtime.connections$.subscribe(event => {
            if (event.channel === 'community' && event.reconnected && this.session.userIsLogged)
                this.reconcile();
        });
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => { if (this.session.userIsLogged) this.reconcile(); });
            window.addEventListener('focus', () => { if (this.session.userIsLogged) this.reconcile(); });
        }
    }

    reconcile(): void {
        this.api.getInterfacePreferences().subscribe({
            next: response => {
                const remote = response.Preferencias;
                const pending = this.readPending();
                if (remote.FechaActualizacion === null) {
                    const localTheme = this.themes.requestedTheme();
                    this.current = remote;
                    if (this.themes.hasExplicitLocalPreference()) {
                        this.save(pending?.theme ?? localTheme);
                        return;
                    }
                    this.adopt({ ...remote, Tema: 'light' });
                    return;
                }
                this.adopt(remote);
                if (pending && pending.baseVersion === remote.Version)
                    this.save(pending.theme);
                else if (pending)
                    this.clearPending();
            }
        });
    }

    private save(theme: AppTheme): void {
        if (!this.current || this.saving) {
            this.writePending({ theme, baseVersion: this.current?.Version ?? 1 });
            return;
        }
        this.saving = true;
        const baseVersion = this.current.Version;
        this.api.patchInterfacePreferences(baseVersion, theme).subscribe({
            next: response => {
                this.saving = false;
                const pending = this.readPending();
                this.clearPending();
                this.adopt(response.Preferencias);
                if (pending && pending.theme !== response.Preferencias.Tema)
                    this.save(pending.theme);
            },
            error: (error: HttpErrorResponse) => {
                this.saving = false;
                const conflict = error.status === 409 ? error.error?.details?.Preferencias as InterfacePreferences | undefined : undefined;
                if (conflict) {
                    this.clearPending();
                    this.adopt(conflict);
                    this.toasts.showSystem('El tema cambió en otro dispositivo. Se ha aplicado la versión más reciente.', { title: 'Preferencia actualizada' });
                    return;
                }
                this.writePending({ theme, baseVersion });
            }
        });
    }

    private adopt(preferences: InterfacePreferences): void {
        this.current = preferences;
        this.applyingRemote = true;
        this.themes.applyRemoteTheme(preferences.Tema);
        this.applyingRemote = false;
    }

    private readPending(): PendingThemeIntent | null {
        try {
            const value = JSON.parse(localStorage.getItem(this.pendingKey) ?? 'null');
            return value && ['wood', 'light', 'dark'].includes(value.theme) && Number.isInteger(value.baseVersion) ? value : null;
        } catch { return null; }
    }

    private writePending(intent: PendingThemeIntent): void { try { localStorage.setItem(this.pendingKey, JSON.stringify(intent)); } catch { } }
    private clearPending(): void { try { localStorage.removeItem(this.pendingKey); } catch { } }
}
