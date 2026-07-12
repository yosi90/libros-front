import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AppNotification, NotificationList } from '../../interfaces/notification';
import { NotificationService } from '../entities/notification.service';
import { RealtimeSocketService } from '../realtime/realtime-socket.service';

@Injectable({ providedIn: 'root' })
export class NotificationStoreService {
    private readonly stateSubject = new BehaviorSubject<NotificationList>({ Notificaciones: [], NoLeidas: 0, SiguienteCursor: null });
    private realtimeSubscription: Subscription | null = null;
    private loading = false;

    readonly state$ = this.stateSubject.asObservable();

    constructor(private notifications: NotificationService, private realtime: RealtimeSocketService) { }

    get state(): NotificationList { return this.stateSubject.value; }

    initialize(): void {
        if (this.realtimeSubscription)
            return;

        this.load();
        this.realtime.open('community');
        this.realtimeSubscription = this.realtime.events$.subscribe(event => {
            if (event.type === 'notification.created' || event.type === 'notification.read')
                this.load();
        });
    }

    load(): void {
        if (this.loading)
            return;

        this.loading = true;
        this.notifications.list({ limit: 50 }).subscribe({
            next: state => this.stateSubject.next(state),
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
                Notificaciones: [...this.state.Notificaciones, ...page.Notificaciones],
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

    clear(): void {
        this.realtimeSubscription?.unsubscribe();
        this.realtimeSubscription = null;
        this.stateSubject.next({ Notificaciones: [], NoLeidas: 0, SiguienteCursor: null });
    }

    private patchRead(ids: number[]): void {
        const idSet = new Set(ids);
        const notifications = this.state.Notificaciones.map(item => idSet.has(item.Id) ? { ...item, FechaLectura: new Date().toISOString() } : item);
        this.stateSubject.next({ ...this.state, Notificaciones: notifications, NoLeidas: notifications.filter(item => !item.FechaLectura).length });
    }
}
