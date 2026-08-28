import { Inject, Injectable } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import { environment } from '../../../environment/environment';
import { Observable, Subject, catchError, from, map, of, switchMap, tap, timeout } from 'rxjs';
import { Messaging, deleteToken, getToken as getMessagingToken, onMessage } from 'firebase/messaging';
import { NotificationService } from '../entities/notification.service';
import { FirebaseSessionService } from './firebase-session.service';
import { RuntimeConfigService } from './runtime-config.service';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';
import { getApiErrorCode } from '../../shared/api-error-message';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
    private readonly storagePrefix = 'push-device:';
    private readonly foregroundNotificationSubject = new Subject<number>();
    private foregroundMessaging: Messaging | null = null;
    private nativeListenersBound = false;

    readonly foregroundNotificationIds$ = this.foregroundNotificationSubject.asObservable();

    constructor(
        private notifications: NotificationService,
        private firebase: FirebaseSessionService,
        private runtimeConfig: RuntimeConfigService,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean
    ) { }

    get supported(): boolean {
        const firebase = this.runtimeConfig.firebase;
        if (this.nativeMobile)
            return firebase.enabled;
        return firebase.enabled && !!firebase.vapidKey && typeof Notification !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
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

    isEnabled(userId: number): boolean {
        return this.deviceId(userId) !== null;
    }

    restore(userId: number): Observable<void> {
        if (!this.supported || (!this.nativeMobile && Notification.permission !== 'granted') || !this.deviceId(userId))
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

        if (this.nativeMobile)
            return this.obtainNativeToken(requestPermission);

        const permission = requestPermission ? await Notification.requestPermission() : Notification.permission;
        if (permission !== 'granted')
            throw new Error('No has concedido permiso para recibir notificaciones push.');

        const messaging = this.firebase.messaging;
        if (!messaging)
            throw new Error('La sesión Firebase no está preparada para recibir push.');

        this.bindForegroundMessages(messaging);
        // Firebase Push usa un registro independiente. Mantenerlo fuera del scope
        // raíz evita que sustituya al Angular Service Worker de la PWA.
        const registration = await navigator.serviceWorker.register(this.workerUrl(), {
            scope: '/firebase-cloud-messaging-push-scope/'
        });
        const token = await getMessagingToken(messaging, { vapidKey: this.runtimeConfig.firebase.vapidKey, serviceWorkerRegistration: registration });
        if (!token)
            throw new Error('No se ha podido obtener un token push para este dispositivo.');
        return token;
    }

    private workerUrl(): string {
        const firebase = this.runtimeConfig.firebase;
        const config = btoa(encodeURIComponent(JSON.stringify({
            apiKey: firebase.apiKey,
            authDomain: firebase.authDomain,
            projectId: firebase.projectId,
            appId: firebase.appId,
            messagingSenderId: firebase.messagingSenderId
        })));
        return `/firebase-messaging-sw.js?config=${encodeURIComponent(config)}`;
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

    private bindForegroundMessages(messaging: Messaging): void {
        if (this.foregroundMessaging === messaging)
            return;

        this.foregroundMessaging = messaging;
        onMessage(messaging, payload => {
            const value = payload.data?.['notificationId'];
            const notificationId = typeof value === 'string' ? Number(value) : NaN;
            if (Number.isInteger(notificationId) && notificationId > 0)
                this.foregroundNotificationSubject.next(notificationId);
        });
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
        this.nativeListenersBound = true;
        await PushNotifications.addListener('pushNotificationReceived', notification => {
            this.emitNotificationId(notification.data?.['notificationId']);
            this.observeQa('received');
        });
        await PushNotifications.addListener('pushNotificationActionPerformed', action => {
            this.emitNotificationId(action.notification.data?.['notificationId']);
            this.observeQa('opened');
        });
    }

    private emitNotificationId(value: unknown): void {
        const notificationId = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
        if (Number.isInteger(notificationId) && notificationId > 0)
            this.foregroundNotificationSubject.next(notificationId);
    }

    private deleteLocalToken(): void {
        if (this.nativeMobile) {
            void PushNotifications.unregister();
            return;
        }
        const messaging = this.firebase.messaging;
        if (messaging)
            void deleteToken(messaging);
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
