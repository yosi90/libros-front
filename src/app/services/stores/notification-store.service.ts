import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AppNotification, NotificationList } from '../../interfaces/notification';
import { NotificationService } from '../entities/notification.service';
import { RealtimeSocketService } from '../realtime/realtime-socket.service';
import { AppToastService } from '../../shared/toast/app-toast.service';
import { PushNotificationService } from '../realtime/push-notification.service';
import { ChatAttentionService } from './chat-attention.service';

@Injectable({ providedIn: 'root' })
export class NotificationStoreService {
    private readonly stateSubject = new BehaviorSubject<NotificationList>({ Notificaciones: [], NoLeidas: 0, SiguienteCursor: null });
    private realtimeSubscription: Subscription | null = null;
    private connectionSubscription: Subscription | null = null;
    private pushSubscription: Subscription | null = null;
    private loading = false;
    private readonly announcedNotificationIds = new Set<number>();

    readonly state$ = this.stateSubject.asObservable();

    constructor(private notifications: NotificationService, private realtime: RealtimeSocketService, private toasts: AppToastService, private push: PushNotificationService, private chatAttention: ChatAttentionService) { }

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
        this.pushSubscription = this.push.foregroundNotificationIds$.subscribe(() => this.load());
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
                const message = notification.Cuerpo ? `${notification.Titulo}: ${notification.Cuerpo}` : notification.Titulo;
                if (notification.Categoria === 'moderacion' || notification.Categoria === 'sistema')
                    this.toasts.showSystem(message, { dedupeKey: `notification:${notification.Id}` });
                else
                    this.toasts.showInfo(message, { dedupeKey: `notification:${notification.Id}` });
            }
        }
    }

    clear(): void {
        this.realtimeSubscription?.unsubscribe();
        this.realtimeSubscription = null;
        this.connectionSubscription?.unsubscribe();
        this.connectionSubscription = null;
        this.pushSubscription?.unsubscribe();
        this.pushSubscription = null;
        this.announcedNotificationIds.clear();
        this.stateSubject.next({ Notificaciones: [], NoLeidas: 0, SiguienteCursor: null });
    }

    private patchRead(ids: number[]): void {
        const idSet = new Set(ids);
        const notifications = this.state.Notificaciones.map(item => idSet.has(item.Id) ? { ...item, FechaLectura: new Date().toISOString() } : item);
        this.stateSubject.next({ ...this.state, Notificaciones: notifications, NoLeidas: notifications.filter(item => !item.FechaLectura).length });
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
