import { Inject, Injectable, InjectionToken, inject } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import type { AppPlugin } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { environment } from '../../../environment/environment';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

export const NATIVE_APP_PLUGIN = new InjectionToken<AppPlugin>('NATIVE_APP_PLUGIN', {
    providedIn: 'root',
    factory: () => inject(NATIVE_MOBILE_PLATFORM) ? App : {} as AppPlugin
});

@Injectable({ providedIn: 'root' })
export class NativeAppLinksService {
    private listener: PluginListenerHandle | null = null;
    private initialized = false;

    constructor(
        private router: Router,
        @Inject(NATIVE_APP_PLUGIN) private app: AppPlugin,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean
    ) { }

    async initialize(): Promise<void> {
        if (!this.nativeMobile || this.initialized)
            return;
        this.initialized = true;
        this.listener = await this.app.addListener('appUrlOpen', event => this.open(event.url));
        const launch = await this.app.getLaunchUrl();
        if (launch?.url)
            this.open(launch.url);
    }

    async clear(): Promise<void> {
        await this.listener?.remove();
        this.listener = null;
        this.initialized = false;
    }

    private open(value: string): void {
        try {
            const url = new URL(value);
            if (url.protocol !== 'https:' || !this.allowedHosts().has(url.hostname) || !this.allowedPaths().has(url.pathname)) {
                this.observeQa('rejected');
                return;
            }
            this.observeQa('accepted', url.pathname);
            void this.router.navigateByUrl(`${url.pathname}${url.search}${url.hash}`);
        } catch {
            this.observeQa('rejected');
        }
    }

    private allowedHosts(): Set<string> {
        return new Set(environment.environmentName === 'qa'
            ? ['qa-libros.yosiftware.es']
            : ['libros.yosiftware.es']);
    }

    private allowedPaths(): Set<string> {
        return new Set(['/verify-email', '/reset-password']);
    }

    private observeQa(stage: 'accepted' | 'rejected', route?: string): void {
        if (environment.environmentName !== 'qa' || typeof window === 'undefined')
            return;
        window.dispatchEvent(new CustomEvent('libros:qa-native-app-link-observation', {
            detail: { stage, route }
        }));
    }
}
