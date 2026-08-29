import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, HostBinding, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { combineLatest, map } from 'rxjs';
import { AppNotification } from '../../../../interfaces/notification';
import { SessionNotification } from '../../../../interfaces/session-notification';
import { NotificationNavigationService } from '../../../../services/navigation/notification-navigation.service';
import { NotificationStoreService } from '../../../../services/stores/notification-store.service';
import { SessionNotificationStoreService } from '../../../../services/stores/session-notification-store.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileNotificationCenterViewComponent } from '../../../mobile/social/mobile-notification-center-view/mobile-notification-center-view.component';

export interface NotificationCenterItem {
    key: string;
    kind: 'persistent' | 'session';
    title: string;
    message: string | null;
    occurredAt: number;
    repeatCount: number;
    unread: boolean;
    icon: string;
    actionLabel: string | null;
    persistent?: AppNotification;
    session?: SessionNotification;
}

@Component({
    standalone: true,
    selector: 'app-notification-center',
    imports: [AsyncPipe, DatePipe, MatIconModule, MobileNotificationCenterViewComponent],
    templateUrl: './notification-center.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './notification-center.component.sass'
})
export class NotificationCenterComponent {
    @Input() anchor = { left: 18, top: 18, originX: 0, originY: 0 };
    @Output() closed = new EventEmitter<void>();
    navigationMessage = '';
    readonly viewModel$ = combineLatest([this.notificationStore.state$, this.sessionNotifications.notices$]).pipe(map(([state, session]) => ({
        items: this.mergeItems(state.Notificaciones, session),
        hasMore: !!state.SiguienteCursor
    })));

    @HostBinding('style.left.px') get hostLeft(): number { return this.anchor.left; }
    @HostBinding('style.top.px') get hostTop(): number { return this.anchor.top; }
    @HostBinding('class.notification-center-host--mobile') get mobileHostClass(): boolean { return this.isMobilePresentation; }

    constructor(private notificationStore: NotificationStoreService, private sessionNotifications: SessionNotificationStoreService, private notificationNavigation: NotificationNavigationService, private presentation: PresentationModeService) { }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }

    activate(item: NotificationCenterItem): void {
        this.navigationMessage = '';
        if (item.kind === 'session' && item.session?.action) {
            void item.session.action.execute();
            this.closed.emit();
            return;
        }
        if (!item.persistent) return;
        this.notificationStore.markRead(item.persistent);
        if (!item.actionLabel) return;
        void this.notificationNavigation.open(item.persistent).then(opened => {
            if (opened) this.closed.emit();
            else this.navigationMessage = this.notificationNavigation.unavailableMessage(item.persistent!);
        });
    }

    clearAll(items: NotificationCenterItem[]): void {
        this.sessionNotifications.hidePersistent(items.flatMap(item => item.persistent ? [item.persistent.Id] : []));
        this.sessionNotifications.clearNotices();
        this.notificationStore.markAllRead();
    }

    loadMore(): void { this.notificationStore.loadMore(); }

    private mergeItems(persistent: AppNotification[], session: SessionNotification[]): NotificationCenterItem[] {
        const durableItems: NotificationCenterItem[] = persistent
            .filter(item => !this.sessionNotifications.isPersistentHidden(item.Id))
            .map(item => ({
                key: `persistent:${item.Id}`,
                kind: 'persistent',
                title: item.Titulo,
                message: item.Cuerpo,
                occurredAt: Date.parse(item.FechaCreacion) || 0,
                repeatCount: 1,
                unread: !item.FechaLectura,
                icon: item.Categoria === 'moderacion' ? 'gavel' : item.Categoria === 'sistema' ? 'campaign' : 'notifications',
                actionLabel: this.hasPersistentAction(item) ? 'Abrir' : null,
                persistent: item
            }));
        const sessionItems: NotificationCenterItem[] = session.map(item => ({
            key: `session:${item.id}`,
            kind: 'session',
            title: item.title,
            message: item.message,
            occurredAt: item.lastOccurredAt,
            repeatCount: item.repeatCount,
            unread: !item.seen,
            icon: item.type === 'success' ? 'check_circle' : item.type === 'error' ? 'error' : item.type === 'system' ? 'warning' : 'info',
            actionLabel: item.action?.label ?? null,
            session: item
        }));
        return [...durableItems, ...sessionItems].sort((left, right) => right.occurredAt - left.occurredAt);
    }

    private hasPersistentAction(notification: AppNotification): boolean {
        return notification.ContextoTipo !== 'none' || !!notification.ConversationId;
    }
}
