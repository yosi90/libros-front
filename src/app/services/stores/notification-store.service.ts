import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, Subscription, expand, filter, map, take } from 'rxjs';
import { AppNotification, NotificationList } from '../../interfaces/notification';
import { NotificationService } from '../entities/notification.service';
import { RealtimeSocketService } from '../realtime/realtime-socket.service';
import { AppToastService } from '../../shared/toast/app-toast.service';
import { PushNotificationService } from '../realtime/push-notification.service';
import { ChatAttentionService } from './chat-attention.service';
import { NotificationNavigationService } from '../navigation/notification-navigation.service';

@Injectable({ providedIn: 'root' })
export class NotificationStoreService {
    private readonly stateSubject = new BehaviorSubject<NotificationList>({ Notificaciones: [], NoLeidas: 0, SiguienteCursor: null });
    private realtimeSubscription: Subscription | null = null;
    private connectionSubscription: Subscription | null = null;
    private pushSubscription: Subscription | null = null;
    private pushOpenSubscription: Subscription | null = null;
    private loading = false;
    private generation = 0;
    private readonly announcedNotificationIds = new Set<number>();

    readonly state$ = this.stateSubject.asObservable();

    constructor(private notifications: NotificationService, private realtime: RealtimeSocketService, private toasts: AppToastService, private push: PushNotificationService, private chatAttention: ChatAttentionService, private navigation: NotificationNavigationService) { }

    get state(): NotificationList { return this.stateSubject.value; }

    initialize(): void {
        if (this.realtimeSubscription)
            return;

        this.load();
        this.realtime.open('community');
        this.realtimeSubscription = this.realtime.events$.subscribe(event => {
            if (event.type === 'notification.created') {
                const notification = this.toNotification(event.payload);
                if (notification)
                    this.ingest(notification, true);
                this.load();
            } else if (event.type === 'notification.read') {
                this.load();
            }
        });
        this.connectionSubscription = this.realtime.connections$.subscribe(event => {
            if (event.channel === 'community' && event.reconnected)
                this.load();
        });
        this.pushSubscription = this.push.foregroundNotificationIds$.subscribe(notificationId => {
            const generation = this.generation;
            this.findPushNotification(notificationId).subscribe({
                next: notification => {
                    if (notification && generation === this.generation) this.ingest(notification, true);
                },
                error: () => this.load()
            });
        });
        this.pushOpenSubscription = this.push.openedNotificationIds$.subscribe(notificationId => {
            this.push.takePendingOpenedNotificationId();
            this.openFromPush(notificationId);
        });
        const pendingOpenedNotificationId = this.push.takePendingOpenedNotificationId();
        if (pendingOpenedNotificationId)
            this.openFromPush(pendingOpenedNotificationId);
    }

    load(): void {
        if (this.loading)
            return;

        this.loading = true;
        this.notifications.list({ limit: 50 }).subscribe({
            next: state => this.stateSubject.next({ ...state, Notificaciones: this.mergeNotifications([], state.Notificaciones) }),
            complete: () => this.loading = false,
            error: () => this.loading = false
        });
    }

    loadMore(): void {
        const cursor = this.state.SiguienteCursor;
        if (!cursor || this.loading)
            return;

        this.loading = true;
        this.notifications.list({ limit: 50, cursor }).subscribe({
            next: page => this.stateSubject.next({
                Notificaciones: this.mergeNotifications(this.state.Notificaciones, page.Notificaciones),
                NoLeidas: page.NoLeidas,
                SiguienteCursor: page.SiguienteCursor
            }),
            complete: () => this.loading = false,
            error: () => this.loading = false
        });
    }

    markRead(notification: AppNotification): void {
        if (notification.FechaLectura)
            return;

        this.notifications.markRead(notification.Id).subscribe({
            next: () => this.patchRead([notification.Id])
        });
    }

    markAllRead(): void {
        this.notifications.markAllRead().subscribe({ next: () => this.patchRead(this.state.Notificaciones.map(item => item.Id)) });
    }

    ingest(notification: AppNotification, immediate = false): void {
        const alreadyPresent = this.state.Notificaciones.some(item => item.Id === notification.Id);
        if (!alreadyPresent) {
            const notifications = this.mergeNotifications([notification], this.state.Notificaciones);
            this.stateSubject.next({
                ...this.state,
                Notificaciones: notifications,
                NoLeidas: notifications.filter(item => !item.FechaLectura).length
            });
        }

        if (immediate && this.isDocumentVisible() && !this.announcedNotificationIds.has(notification.Id)) {
            this.announcedNotificationIds.add(notification.Id);
            const conversationId = notification.ConversationId ?? notification.Contexto['ConversacionId'];
            const suppressFocusedChat = notification.Categoria === 'chat' && typeof conversationId === 'number' && this.chatAttention.isFocused(conversationId);
            if (!suppressFocusedChat && (notification.Categoria === 'chat' || notification.Categoria === 'moderacion' || notification.Categoria === 'sistema')) {
                const message = notification.Cuerpo ?? notification.Titulo;
                const toastOptions = { dedupeKey: `notification:${notification.Id}`, title: notification.Titulo };
                if (notification.Categoria === 'moderacion' || notification.Categoria === 'sistema')
                    this.toasts.showSystem(message, toastOptions);
                else
                    this.toasts.showInfo(message, toastOptions);
            }
        }
    }

    clear(): void {
        this.generation++;
        this.realtimeSubscription?.unsubscribe();
        this.realtimeSubscription = null;
        this.connectionSubscription?.unsubscribe();
        this.connectionSubscription = null;
        this.pushSubscription?.unsubscribe();
        this.pushSubscription = null;
        this.pushOpenSubscription?.unsubscribe();
        this.pushOpenSubscription = null;
        this.announcedNotificationIds.clear();
        this.stateSubject.next({ Notificaciones: [], NoLeidas: 0, SiguienteCursor: null });
    }

    private patchRead(ids: number[]): void {
        const idSet = new Set(ids);
        const notifications = this.state.Notificaciones.map(item => idSet.has(item.Id) ? { ...item, FechaLectura: new Date().toISOString() } : item);
        this.stateSubject.next({ ...this.state, Notificaciones: notifications, NoLeidas: notifications.filter(item => !item.FechaLectura).length });
    }

    private openFromPush(notificationId: number): void {
        const generation = this.generation;
        this.findPushNotification(notificationId).subscribe({
            next: notification => {
                if (!notification || generation !== this.generation) return;
                this.ingest(notification);
                this.markRead(notification);
                void this.navigation.open(notification);
            },
            error: () => this.toasts.showSystem('No se pudo abrir el aviso. Puedes volver a intentarlo desde la campana.')
        });
    }

    private findPushNotification(notificationId: number): Observable<AppNotification | null> {
        return this.notifications.list({ limit: 50 }).pipe(
            expand(page => !page.Notificaciones.some(item => item.Id === notificationId) && page.SiguienteCursor
                ? this.notifications.list({ limit: 50, cursor: page.SiguienteCursor }) : EMPTY),
            filter(page => page.Notificaciones.some(item => item.Id === notificationId) || !page.SiguienteCursor),
            take(1),
            map(page => page.Notificaciones.find(item => item.Id === notificationId) ?? null)
        );
    }

    private mergeNotifications(current: AppNotification[], incoming: AppNotification[]): AppNotification[] {
        const byId = new Map<number, AppNotification>();
        [...current, ...incoming].forEach(item => byId.set(item.Id, item));
        return Array.from(byId.values()).sort((left, right) => right.FechaCreacion.localeCompare(left.FechaCreacion));
    }

    private toNotification(payload: Record<string, unknown>): AppNotification | null {
        const id = payload['Id'];
        const title = payload['Titulo'];
        const category = payload['Categoria'];
        const contextType = payload['ContextoTipo'];
        const context = payload['Contexto'];
        const createdAt = payload['FechaCreacion'];
        if (typeof id !== 'number' || !Number.isInteger(id) || id < 1 || typeof title !== 'string' || typeof category !== 'string' || typeof contextType !== 'string' || typeof createdAt !== 'string' || !context || typeof context !== 'object' || Array.isArray(context))
            return null;
        return payload as unknown as AppNotification;
    }

    private isDocumentVisible(): boolean {
        return typeof document === 'undefined' || document.visibilityState !== 'hidden';
    }
}
