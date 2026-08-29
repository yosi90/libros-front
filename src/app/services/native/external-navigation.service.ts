import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, InjectionToken, inject } from '@angular/core';
import { Browser } from '@capacitor/browser';
import type { BrowserPlugin } from '@capacitor/browser';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

export const NATIVE_BROWSER_PLUGIN = new InjectionToken<BrowserPlugin>('NATIVE_BROWSER_PLUGIN', {
    providedIn: 'root',
    factory: () => inject(NATIVE_MOBILE_PLATFORM) ? Browser : {} as BrowserPlugin
});

@Injectable({ providedIn: 'root' })
export class ExternalNavigationService {
    constructor(
        @Inject(DOCUMENT) private document: Document,
        @Inject(NATIVE_BROWSER_PLUGIN) private browser: BrowserPlugin,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean
    ) { }

    async open(value: string): Promise<boolean> {
        const url = this.safeUrl(value);
        if (!url)
            return false;

        if (this.nativeMobile) {
            await this.browser.open({ url, presentationStyle: 'popover' });
            return true;
        }
        return !!this.document.defaultView?.open(url, '_blank', 'noopener,noreferrer');
    }

    private safeUrl(value: string): string | null {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
        } catch {
            return null;
        }
    }
}
