import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Inject, Injectable, InjectionToken, PLATFORM_ID, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { AppToastService } from '../../shared/toast/app-toast.service';
import { NATIVE_MOBILE_PLATFORM } from './presentation-mode.service';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWA_RELOAD = new InjectionToken<() => void>('PWA_RELOAD', {
    providedIn: 'root',
    factory: () => {
        const window = inject(DOCUMENT).defaultView;
        return () => window?.location.reload();
    }
});

export const PWA_UPDATE_RENDER_DELAY = new InjectionToken<() => Promise<void>>('PWA_UPDATE_RENDER_DELAY', {
    providedIn: 'root',
    factory: () => {
        const window = inject(DOCUMENT).defaultView;
        return () => new Promise(resolve => {
            if (!window) {
                resolve();
                return;
            }
            window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
                window.setTimeout(resolve, 600);
            }));
        });
    }
});

@Injectable({ providedIn: 'root' })
export class PwaLifecycleService {
    private readonly installEventSignal = signal<BeforeInstallPromptEvent | null>(null);
    private readonly canInstallSignal = signal(false);
    private readonly applyingUpdateSignal = signal(false);
    readonly canInstall = this.canInstallSignal.asReadonly();
    readonly applyingUpdate = this.applyingUpdateSignal.asReadonly();

    constructor(
        private updates: SwUpdate,
        private toasts: AppToastService,
        @Inject(PLATFORM_ID) platformId: object,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean,
        @Inject(PWA_RELOAD) private reload: () => void,
        @Inject(PWA_UPDATE_RENDER_DELAY) private waitForUpdateNoticeRender: () => Promise<void>
    ) {
        if (!isPlatformBrowser(platformId))
            return;

        window.addEventListener('beforeinstallprompt', event => {
            event.preventDefault();
            this.installEventSignal.set(event as BeforeInstallPromptEvent);
            this.canInstallSignal.set(true);
        });
        window.addEventListener('appinstalled', () => {
            this.installEventSignal.set(null);
            this.canInstallSignal.set(false);
            this.toasts.showSuccess('La aplicación se ha instalado en este dispositivo.', {
                title: 'Aplicación instalada',
                dedupeKey: 'pwa:installed'
            });
        });

        if (this.updates.isEnabled) {
            this.updates.versionUpdates.pipe(
                filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY')
            ).subscribe(() => {
                if (this.nativeMobile) {
                    void this.activateNativeUpdate();
                    return;
                }
                this.toasts.showSystem(
                    'Hay una versión nueva preparada. Puedes aplicarla cuando no tengas cambios pendientes.',
                    {
                        title: 'Actualización disponible',
                        dedupeKey: 'pwa:update-ready',
                        durationMs: 30000,
                        action: { label: 'Actualizar', execute: () => this.activateWebUpdate() }
                    }
                );
            });
            void this.checkForUpdate();
        }
    }

    async install(): Promise<void> {
        const event = this.installEventSignal();
        if (!event)
            return;
        await event.prompt();
        await event.userChoice;
        this.installEventSignal.set(null);
        this.canInstallSignal.set(false);
    }

    private async activateWebUpdate(): Promise<void> {
        await this.updates.activateUpdate();
        this.reload();
    }

    private async activateNativeUpdate(): Promise<void> {
        if (this.applyingUpdateSignal())
            return;

        this.applyingUpdateSignal.set(true);
        try {
            // Deja dos frames y un breve tiempo de lectura antes de que la
            // WebView cambie al worker nuevo y destruya el documento actual.
            await this.waitForUpdateNoticeRender();
            await this.updates.activateUpdate();
            this.reload();
        } catch {
            this.applyingUpdateSignal.set(false);
            this.toasts.showError('No hemos podido poner la app al día. Puedes seguir usándola y volveremos a intentarlo más adelante.', {
                title: 'No se pudo actualizar',
                dedupeKey: 'pwa:native-update:error',
                durationMs: 8000
            });
        }
    }

    private async checkForUpdate(): Promise<void> {
        try {
            await this.updates.checkForUpdate();
        } catch {
            // La red puede no estar disponible al arrancar; el worker volverá a comprobar más adelante.
        }
    }
}
