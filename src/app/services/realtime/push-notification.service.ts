import { Inject, Injectable } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import { environment } from '../../../environment/environment';
import { Observable, Subject, catchError, from, map, of, switchMap, tap, timeout } from 'rxjs';
import { NotificationService } from '../entities/notification.service';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';
import { getApiErrorCode } from '../../shared/api-error-message';

/**
 * El push propio de Libros solo queda en la APK de Capacitor. En el navegador se retira con Firebase (adhesión a
 * Yosiftware): el push lo envía la plataforma, y su registro por cuenta llega con las notificaciones de la plataforma
 * (hito 3 del roadmap del ecosistema).
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
    private readonly storagePrefix = 'push-device:';
    private readonly foregroundNotificationSubject = new Subject<number>();
    private readonly openedNotificationSubject = new Subject<number>();
    private nativeListenersBound = false;
    private nativeListenersBinding: Promise<void> | null = null;
    private pendingOpenedNotificationId: number | null = null;

    readonly foregroundNotificationIds$ = this.foregroundNotificationSubject.asObservable();
    readonly openedNotificationIds$ = this.openedNotificationSubject.asObservable();

    constructor(
        private notifications: NotificationService,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean
    ) { }

    get supported(): boolean {
        return this.nativeMobile;
    }

    enable(userId: number): Observable<void> {
        return from(this.obtainToken(true)).pipe(
            tap(() => this.observeQa('backend-registering')),
            switchMap(token => this.notifications.registerDevice(token, this.nativeMobile ? 'android' : 'web')),
            timeout(15_000),
            tap(deviceId => {
                localStorage.setItem(this.storageKey(userId), String(deviceId));
                this.observeQa('backend-registered');
            }),
            tap({ error: error => this.observeQa('registration-error', this.errorMarker(error)) }),
            map(() => void 0)
        );
    }

    initializeNativeListeners(): Promise<void> {
        return this.nativeMobile ? this.bindNativeMessages() : Promise.resolve();
    }

    takePendingOpenedNotificationId(): number | null {
        const notificationId = this.pendingOpenedNotificationId;
        this.pendingOpenedNotificationId = null;
        return notificationId;
    }

    isEnabled(userId: number): boolean {
        return this.deviceId(userId) !== null;
    }

    restore(userId: number): Observable<void> {
        if (!this.supported || !this.deviceId(userId))
            return of(void 0);

        return from(this.obtainToken(false)).pipe(
            tap(() => this.observeQa('backend-registering')),
            switchMap(token => this.notifications.registerDevice(token, this.nativeMobile ? 'android' : 'web')),
            timeout(15_000),
            tap(deviceId => {
                localStorage.setItem(this.storageKey(userId), String(deviceId));
                this.observeQa('backend-registered');
            }),
            map(() => void 0),
            catchError(error => {
                this.observeQa('registration-error', this.errorMarker(error));
                return of(void 0);
            })
        );
    }

    revoke(userId: number): Observable<void> {
        const deviceId = this.deviceId(userId);
        if (!deviceId)
            return of(void 0);

        return this.notifications.revokeDevice(deviceId).pipe(
            tap(() => {
                localStorage.removeItem(this.storageKey(userId));
                this.deleteLocalToken();
            }),
            map(() => void 0),
            catchError(() => {
                localStorage.removeItem(this.storageKey(userId));
                return of(void 0);
            })
        );
    }

    logout(userId: number): Observable<void> {
        this.pendingOpenedNotificationId = null;
        const deviceId = this.deviceId(userId);
        this.clearAllLocalDevices();
        if (!deviceId)
            return of(void 0);

        return this.notifications.logoutDevice(deviceId).pipe(
            map(() => void 0)
        );
    }

    private async obtainToken(requestPermission: boolean): Promise<string> {
        if (!this.supported)
            throw new Error('Push no está disponible en este navegador o entorno.');

        return this.obtainNativeToken(requestPermission);
    }

    private deviceId(userId: number): number | null {
        const value = Number(localStorage.getItem(this.storageKey(userId)));
        return Number.isInteger(value) && value > 0 ? value : null;
    }

    private storageKey(userId: number): string { return `${this.storagePrefix}${userId}`; }

    private clearLocalDevice(userId: number): void {
        localStorage.removeItem(this.storageKey(userId));
        this.deleteLocalToken();
    }

    private clearAllLocalDevices(): void {
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.storagePrefix))
            .forEach(key => localStorage.removeItem(key));
        this.deleteLocalToken();
    }

    private async obtainNativeToken(requestPermission: boolean): Promise<string> {
        let permission = await PushNotifications.checkPermissions();
        if (requestPermission && (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale'))
            permission = await PushNotifications.requestPermissions();
        if (permission.receive !== 'granted')
            throw new Error('No has concedido permiso para recibir notificaciones push.');

        await this.bindNativeMessages();
        const handles: PluginListenerHandle[] = [];
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        try {
            let resolveToken!: (value: string) => void;
            let rejectToken!: (reason: Error) => void;
            const token = new Promise<string>((resolve, reject) => {
                resolveToken = resolve;
                rejectToken = reject;
                timeoutId = setTimeout(() => reject(new Error('Android no completó el registro push.')), 30_000);
            });
            handles.push(await PushNotifications.addListener('registration', result => resolveToken(result.value)));
            handles.push(await PushNotifications.addListener('registrationError', error => rejectToken(new Error(error.error))));
            await PushNotifications.register();
            const value = await token;
            if (!value)
                throw new Error('Android no devolvió un token push.');
            this.observeQa('registered');
            return value;
        } finally {
            if (timeoutId)
                clearTimeout(timeoutId);
            await Promise.all(handles.map(handle => handle.remove()));
        }
    }

    private async bindNativeMessages(): Promise<void> {
        if (this.nativeListenersBound)
            return;
        if (!this.nativeListenersBinding) {
            this.nativeListenersBinding = Promise.all([
                PushNotifications.addListener('pushNotificationReceived', notification => {
                    if (notification.data?.['nativeBackground'] !== 'true')
                        this.emitNotificationId(notification.data?.['notificationId']);
                    this.observeQa('received');
                }),
                PushNotifications.addListener('pushNotificationActionPerformed', action => {
                    const notificationId = this.notificationId(action.notification.data?.['notificationId']);
                    if (notificationId) {
                        this.pendingOpenedNotificationId = notificationId;
                        this.openedNotificationSubject.next(notificationId);
                    }
                    this.observeQa('opened');
                })
            ]).then(() => { this.nativeListenersBound = true; }).catch(error => {
                this.nativeListenersBinding = null;
                throw error;
            });
        }
        await this.nativeListenersBinding;
    }

    private emitNotificationId(value: unknown): void {
        const notificationId = this.notificationId(value);
        if (notificationId)
            this.foregroundNotificationSubject.next(notificationId);
    }

    private notificationId(value: unknown): number | null {
        const notificationId = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
        return Number.isInteger(notificationId) && notificationId > 0 ? notificationId : null;
    }

    private deleteLocalToken(): void {
        if (!this.nativeMobile) return;
        void PushNotifications.removeAllDeliveredNotifications().catch(() => undefined);
        void PushNotifications.unregister();
    }

    private observeQa(stage: 'registered' | 'backend-registering' | 'backend-registered' | 'registration-error' | 'received' | 'opened', errorCode?: string): void {
        if (environment.environmentName !== 'qa' || typeof window === 'undefined')
            return;
        sessionStorage.setItem('qa:last-native-push-stage', stage);
        if (errorCode)
            sessionStorage.setItem('qa:last-native-push-error', errorCode);
        else if (stage === 'backend-registered')
            sessionStorage.removeItem('qa:last-native-push-error');
        window.dispatchEvent(new CustomEvent('libros:qa-native-push-observation', { detail: { stage, errorCode } }));
    }

    private errorMarker(error: unknown): string {
        if ((error as { name?: unknown })?.name === 'TimeoutError')
            return 'push_registration_timeout';
        return getApiErrorCode(error) ?? String((error as { status?: unknown })?.status ?? 'unknown');
    }
}
