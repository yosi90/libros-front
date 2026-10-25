import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Inject, Injectable, InjectionToken, PLATFORM_ID, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { AppToastService } from '../../shared/toast/app-toast.service';

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

@Injectable({ providedIn: 'root' })
export class PwaLifecycleService {
    private readonly installEventSignal = signal<BeforeInstallPromptEvent | null>(null);
    private readonly canInstallSignal = signal(false);
    readonly canInstall = this.canInstallSignal.asReadonly();

    constructor(
        private updates: SwUpdate,
        private toasts: AppToastService,
        @Inject(PLATFORM_ID) platformId: object,
        @Inject(PWA_RELOAD) private reload: () => void
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

    private async checkForUpdate(): Promise<void> {
        try {
            await this.updates.checkForUpdate();
        } catch {
            // La red puede no estar disponible al arrancar; el worker volverá a comprobar más adelante.
        }
    }
}
