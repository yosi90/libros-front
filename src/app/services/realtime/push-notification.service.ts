import { Injectable } from '@angular/core';
import { Observable, Subject, catchError, from, map, of, switchMap, tap } from 'rxjs';
import { Messaging, deleteToken, getToken as getMessagingToken, onMessage } from 'firebase/messaging';
import { NotificationService } from '../entities/notification.service';
import { FirebaseSessionService } from './firebase-session.service';
import { RuntimeConfigService } from './runtime-config.service';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
    private readonly storagePrefix = 'push-device:';
    private readonly foregroundNotificationSubject = new Subject<number>();
    private foregroundMessaging: Messaging | null = null;

    readonly foregroundNotificationIds$ = this.foregroundNotificationSubject.asObservable();

    constructor(private notifications: NotificationService, private firebase: FirebaseSessionService, private runtimeConfig: RuntimeConfigService) { }

    get supported(): boolean {
        const firebase = this.runtimeConfig.firebase;
        return firebase.enabled && !!firebase.vapidKey && typeof Notification !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    }

    enable(userId: number): Observable<void> {
        return from(this.obtainToken(true)).pipe(
            switchMap(token => this.notifications.registerDevice(token)),
            tap(deviceId => localStorage.setItem(this.storageKey(userId), String(deviceId))),
            map(() => void 0)
        );
    }

    restore(userId: number): Observable<void> {
        if (!this.supported || Notification.permission !== 'granted' || !this.deviceId(userId))
            return of(void 0);

        return from(this.obtainToken(false)).pipe(
            switchMap(token => this.notifications.registerDevice(token)),
            tap(deviceId => localStorage.setItem(this.storageKey(userId), String(deviceId))),
            map(() => void 0),
            catchError(() => of(void 0))
        );
    }

    revoke(userId: number): Observable<void> {
        const deviceId = this.deviceId(userId);
        if (!deviceId)
            return of(void 0);

        return this.notifications.revokeDevice(deviceId).pipe(
            tap(() => {
                localStorage.removeItem(this.storageKey(userId));
                const messaging = this.firebase.messaging;
                if (messaging) void deleteToken(messaging);
            }),
            map(() => void 0),
            catchError(() => {
                localStorage.removeItem(this.storageKey(userId));
                return of(void 0);
            })
        );
    }

    private async obtainToken(requestPermission: boolean): Promise<string> {
        if (!this.supported)
            throw new Error('Push no está disponible en este navegador o entorno.');

        const permission = requestPermission ? await Notification.requestPermission() : Notification.permission;
        if (permission !== 'granted')
            throw new Error('No has concedido permiso para recibir notificaciones push.');

        const messaging = this.firebase.messaging;
        if (!messaging)
            throw new Error('La sesión Firebase no está preparada para recibir push.');

        this.bindForegroundMessages(messaging);
        const registration = await navigator.serviceWorker.register(this.workerUrl());
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
}
