import { DOCUMENT, Location } from '@angular/common';
import { Inject, Injectable, InjectionToken, Optional, inject } from '@angular/core';
import { Network } from '@capacitor/network';
import type { NetworkPlugin } from '@capacitor/network';
import type { PluginListenerHandle } from '@capacitor/core';
import type { AppPlugin } from '@capacitor/app';
import { ConnectivityService } from '../ui/connectivity.service';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';
import { NATIVE_APP_PLUGIN } from './native-app-links.service';
import { NativeReaderSessionService } from '../navigation/native-reader-session.service';

export const NATIVE_NETWORK_PLUGIN = new InjectionToken<NetworkPlugin>('NATIVE_NETWORK_PLUGIN', {
    providedIn: 'root',
    factory: () => inject(NATIVE_MOBILE_PLATFORM) ? Network : {} as NetworkPlugin
});

@Injectable({ providedIn: 'root' })
export class NativeRuntimeService {
    private handles: PluginListenerHandle[] = [];
    private initialized = false;

    constructor(
        private location: Location,
        private connectivity: ConnectivityService,
        @Inject(DOCUMENT) private document: Document,
        @Inject(NATIVE_APP_PLUGIN) private app: AppPlugin,
        @Inject(NATIVE_NETWORK_PLUGIN) private network: NetworkPlugin,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean,
        @Optional() private nativeReader?: NativeReaderSessionService
    ) { }

    async initialize(): Promise<void> {
        if (!this.nativeMobile || this.initialized)
            return;

        this.initialized = true;
        try {
            this.connectivity.setNativeOnline((await this.network.getStatus()).connected);
            this.handles.push(await this.network.addListener('networkStatusChange', status =>
                this.connectivity.setNativeOnline(status.connected)));
            this.handles.push(await this.app.addListener('appStateChange', state => {
                if (state.isActive)
                    void this.resume();
            }));
            this.handles.push(await this.app.addListener('backButton', event => this.back(event.canGoBack)));
        } catch (error) {
            await this.clear();
            throw error;
        }
    }

    async clear(): Promise<void> {
        await Promise.all(this.handles.map(handle => handle.remove()));
        this.handles = [];
        this.initialized = false;
    }

    private async resume(): Promise<void> {
        this.connectivity.setNativeOnline((await this.network.getStatus()).connected);
        this.document.defaultView?.dispatchEvent(new CustomEvent('libros:native-resume'));
    }

    private back(canGoBack: boolean): void {
        const overlays = this.document.querySelectorAll<HTMLElement>(
            '.cdk-overlay-container [role="dialog"], .cdk-overlay-container [aria-modal="true"], ' +
            '[data-native-back-overlay], .m-book-index-backdrop, .m-book-actions, .m-book-structure-dialog, .m-chapter-characters'
        );
        const overlay = overlays.item(overlays.length - 1);
        if (overlay) {
            const close = overlay.matches('button')
                ? overlay
                : overlay.querySelector<HTMLElement>('button[aria-label="Cerrar"]');
            if (close) {
                close.click();
                return;
            }
            this.document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            return;
        }
        if (this.nativeReader?.handleNativeBack())
            return;
        if (canGoBack) {
            this.location.back();
            return;
        }
        void this.app.exitApp();
    }
}
