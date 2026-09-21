import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Capacitor, CapacitorHttp, PluginListenerHandle } from '@capacitor/core';

export interface Ipv6FallbackEvent {
    requestId: string;
    active: boolean;
}

interface NativeNetworkEvents {
    addListener(name: 'ipv6Fallback', listener: (event: Ipv6FallbackEvent) => void): Promise<PluginListenerHandle>;
}

export const NATIVE_NETWORK_EVENTS = new InjectionToken<NativeNetworkEvents | null>('NATIVE_NETWORK_EVENTS', {
    providedIn: 'root',
    factory: () => Capacitor.getPlatform() === 'android' ? CapacitorHttp as unknown as NativeNetworkEvents : null
});

export const DRAGON_NETWORK_MESSAGES = [
    'El dragón está siendo atacado por un héroe. Dale unos segundos…',
    'Un caballero bloquea el puente. El dragón está buscando otro camino…',
    'El dragón se ha enredado con una torre. Enseguida vuelve con tus libros…',
    'Hay un mago haciendo travesuras en el camino. El dragón está dando un rodeo…',
    'El dragón está esquivando unas flechas. Dale un momento para llegar…'
] as const;

@Injectable({ providedIn: 'root' })
export class NativeNetworkFeedbackService {
    private readonly events = inject(NATIVE_NETWORK_EVENTS);
    private readonly activeRequests = new Set<string>();
    private readonly currentMessage = signal<string | null>(null);
    readonly message = this.currentMessage.asReadonly();
    private started = false;

    initialize(): void {
        if (this.started || !this.events) return;
        this.started = true;
        // The native plugin retains events until this listener is attached, so
        // observing the connection never delays startup or session restoration.
        void this.events.addListener('ipv6Fallback', event => {
            if (event.active) {
                const wasIdle = this.activeRequests.size === 0;
                this.activeRequests.add(event.requestId);
                if (wasIdle) {
                    this.currentMessage.set(DRAGON_NETWORK_MESSAGES[Math.floor(Math.random() * DRAGON_NETWORK_MESSAGES.length)]);
                }
            } else {
                this.activeRequests.delete(event.requestId);
                if (!this.activeRequests.size) this.currentMessage.set(null);
            }
        }).catch(() => { this.started = false; });
    }
}
