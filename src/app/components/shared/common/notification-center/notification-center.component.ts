import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, HostBinding, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { AppNotification } from '../../../../interfaces/notification';
import { SessionNotification } from '../../../../interfaces/session-notification';
import { NotificationNavigationService } from '../../../../services/navigation/notification-navigation.service';
import { NotificationStoreService } from '../../../../services/stores/notification-store.service';
import { SessionNotificationStoreService } from '../../../../services/stores/session-notification-store.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileNotificationCenterViewComponent } from '../../../mobile/social/mobile-notification-center-view/mobile-notification-center-view.component';
import { isSameToastText } from '../../../../shared/toast/app-toast';
import { NotificationService } from '../../../../services/entities/notification.service';

export interface NotificationCenterItem {
    key: string;
    kind: 'persistent' | 'session';
    title: string;
    message: string | null;
    occurredAt: number;
    repeatCount: number;
    unread: boolean;
    icon: string | null;
    actionLabel: string | null;
    addBookId?: number;
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
    readonly sameText = isSameToastText;
    @Input() anchor = { left: 18, top: 18, originX: 0, originY: 0 };
    @Output() closed = new EventEmitter<void>();
    navigationMessage = '';
    openingBookId: number | null = null;
    private readonly dismissalRevision = new BehaviorSubject(0);
    private readonly dismissedKeys = new Set<string>();
    readonly viewModel$ = combineLatest([this.notificationStore.state$, this.sessionNotifications.notices$, this.dismissalRevision]).pipe(map(([state, session]) => ({
        items: this.mergeItems(state.Notificaciones, session).filter(item => !this.dismissedKeys.has(item.key)),
        hasMore: !!state.SiguienteCursor
    })));

    @HostBinding('style.left.px') get hostLeft(): number { return this.anchor.left; }
    @HostBinding('style.top.px') get hostTop(): number { return this.anchor.top; }
    @HostBinding('class.notification-center-host--mobile') get mobileHostClass(): boolean { return this.isMobilePresentation; }

    constructor(private notificationStore: NotificationStoreService, private sessionNotifications: SessionNotificationStoreService, private notificationNavigation: NotificationNavigationService, private presentation: PresentationModeService, private notifications: NotificationService, private router: Router) { }

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

    addBook(item: NotificationCenterItem): void {
        if (!item.persistent || !item.addBookId || this.openingBookId !== null) return;
        this.navigationMessage = '';
        this.openingBookId = item.persistent.Id;
        this.notifications.get(item.persistent.Id).subscribe({
            next: current => {
                const bookId = this.addableBookId(current);
                if (!bookId) {
                    this.navigationMessage = current.EnBiblioteca === true
                        ? 'Este libro ya está en tu biblioteca.'
                        : 'Ya no se puede añadir este libro desde el aviso.';
                    this.notificationStore.load();
                    this.openingBookId = null;
                    return;
                }
                this.notificationStore.markRead(current);
                void this.router.navigate(['/dashboard/catalog'], { queryParams: { addBook: bookId } }).then(opened => {
                    if (opened) this.closed.emit();
                    else this.navigationMessage = 'No se ha podido abrir el libro en el catálogo.';
                    this.openingBookId = null;
                });
            },
            error: () => {
                this.navigationMessage = 'No se ha podido comprobar el libro. Inténtalo de nuevo.';
                this.openingBookId = null;
            }
        });
    }

    clearAll(items: NotificationCenterItem[]): void {
        this.sessionNotifications.hidePersistent(items.flatMap(item => item.persistent ? [item.persistent.Id] : []));
        this.sessionNotifications.clearNotices();
        this.notificationStore.markAllRead();
    }

    dismissItem(item: NotificationCenterItem): void {
        this.dismissedKeys.add(item.key);
        this.dismissalRevision.next(this.dismissalRevision.value + 1);
        if (item.persistent) {
            this.sessionNotifications.hidePersistent([item.persistent.Id]);
            this.notificationStore.markRead(item.persistent);
        }
        if (item.session) this.sessionNotifications.removeByDedupeKey(item.session.dedupeKey);
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
                addBookId: this.addableBookId(item),
                persistent: item
            }));
        const persistentKeys = new Set(persistent.map(item => `notification:${item.Id}`));
        const sessionItems: NotificationCenterItem[] = session.filter(item => !persistentKeys.has(item.dedupeKey)).map(item => ({
            key: `session:${item.id}`,
            kind: 'session',
            title: item.title,
            message: item.message,
            occurredAt: item.lastOccurredAt,
            repeatCount: item.repeatCount,
            unread: !item.seen,
            icon: item.type === 'success' ? null : item.type === 'error' ? 'error' : item.type === 'system' ? 'warning' : 'info',
            actionLabel: item.action?.label ?? null,
            session: item
        }));
        return [...durableItems, ...sessionItems].sort((left, right) => right.occurredAt - left.occurredAt);
    }

    private hasPersistentAction(notification: AppNotification): boolean {
        return notification.ContextoTipo !== 'none' || !!notification.ConversationId;
    }

    private addableBookId(notification: AppNotification): number | undefined {
        const id = notification.Contexto['EntidadId'];
        return notification.Codigo === 'catalog_request.resolved' && notification.ContextoTipo === 'catalog_request' &&
            notification.Contexto['Destino'] === 'propio' && notification.Contexto['Estado'] === 'aprobada' &&
            notification.Contexto['TipoEntidad'] === 'libro' && notification.EnBiblioteca === false &&
            typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : undefined;
    }
}
