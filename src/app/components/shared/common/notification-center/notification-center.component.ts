import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, HostBinding, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { NotificationStoreService } from '../../../../services/stores/notification-store.service';
import { AppNotification, NotificationCategory, NotificationPreference } from '../../../../interfaces/notification';
import { NotificationService } from '../../../../services/entities/notification.service';
import { NotificationNavigationService } from '../../../../services/navigation/notification-navigation.service';
import { ChatConversation } from '../../../../interfaces/chat';
import { ChatService } from '../../../../services/entities/chat.service';
import { SessionService } from '../../../../services/auth/session.service';
import { PushNotificationService } from '../../../../services/realtime/push-notification.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { CommunityService } from '../../../../services/entities/community.service';
import { Subscription } from 'rxjs';

@Component({
    standalone: true,
    selector: 'app-notification-center',
    imports: [A11yModule, AsyncPipe, DatePipe, NgFor, NgIf, MatIconModule, RouterLink],
    templateUrl: './notification-center.component.html',
    styleUrl: './notification-center.component.sass'
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
    @Input() activeTab: 'notifications' | 'chat' = 'notifications';
    @Input() anchor = { left: 18, top: 18, originX: 0, originY: 0 };
    @Input() closing = false;
    @Output() closed = new EventEmitter<void>();
    readonly state$ = this.notificationStore.state$;
    readonly categories: { id: NotificationCategory; label: string }[] = [
        { id: 'amistades', label: 'Amistades' },
        { id: 'seguimiento', label: 'Seguimiento' },
        { id: 'feed', label: 'Feed lector' },
        { id: 'chat', label: 'Chat' },
        { id: 'clubes', label: 'Clubes' },
        { id: 'moderacion', label: 'Moderación' },
        { id: 'sistema', label: 'Sistema' }
    ];
    preferencesOpen = false;
    preferencesLoading = false;
    preferencesSaving = false;
    preferencesError = '';
    navigationMessage = '';
    preferences: NotificationPreference[] = [];
    conversations: ChatConversation[] = [];
    chatLoading = false;
    chatError = '';
    pushActivating = false;
    pushMessage = '';
    private blockSubscription: Subscription | null = null;

    @HostBinding('style.left.px') get hostLeft(): number { return this.anchor.left; }
    @HostBinding('style.top.px') get hostTop(): number { return this.anchor.top; }

    constructor(private notificationStore: NotificationStoreService, private notificationService: NotificationService, private notificationNavigation: NotificationNavigationService, private chatService: ChatService, private session: SessionService, private pushNotifications: PushNotificationService, private community: CommunityService) { }

    ngOnInit(): void {
        if (this.activeTab === 'chat') this.loadConversations();
        this.blockSubscription = this.community.blockedUserIds$.subscribe(() => this.loadConversations());
    }

    ngOnDestroy(): void { this.blockSubscription?.unsubscribe(); }

    @HostListener('document:keydown.escape', ['$event'])
    onEscape(event: Event): void {
        event.preventDefault();
        if (this.preferencesOpen) {
            this.closePreferences();
            return;
        }
        this.close();
    }

    selectTab(tab: 'notifications' | 'chat'): void {
        this.activeTab = tab;
        if (tab === 'chat' && !this.conversations.length) this.loadConversations();
    }

    onTabKeydown(event: KeyboardEvent): void {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const tab = event.key === 'Home' || event.key === 'ArrowLeft' ? 'notifications' : 'chat';
        this.selectTab(tab);
        document.getElementById(`communication-tab-${tab}`)?.focus();
    }

    loadConversations(): void {
        this.chatLoading = true;
        this.chatError = '';
        this.chatService.conversations().subscribe({
            next: conversations => { this.conversations = conversations; this.chatLoading = false; },
            error: () => { this.chatError = 'No se han podido cargar las conversaciones.'; this.chatLoading = false; }
        });
    }

    markRead(notification: AppNotification): void { this.notificationStore.markRead(notification); }
    openNotification(notification: AppNotification): void {
        this.navigationMessage = '';
        this.markRead(notification);
        void this.notificationNavigation.open(notification).then(opened => {
            if (opened)
                this.close();
            else
                this.navigationMessage = this.notificationNavigation.unavailableMessage(notification);
        });
    }
    markAllRead(): void { this.notificationStore.markAllRead(); }
    loadMore(): void { this.notificationStore.loadMore(); }
    close(): void { this.closed.emit(); }

    openPreferences(): void {
        this.preferencesOpen = true;
        this.preferencesError = '';
        this.preferencesLoading = true;
        this.notificationService.preferences().subscribe({
            next: preferences => {
                this.preferences = this.normalizePreferences(preferences);
                this.preferencesLoading = false;
            },
            error: () => {
                this.preferencesError = 'No se han podido cargar las preferencias.';
                this.preferencesLoading = false;
            }
        });
    }

    closePreferences(): void { this.preferencesOpen = false; }

    isEnabled(category: NotificationCategory, channel: NotificationPreference['Canal']): boolean {
        return this.preferences.some(item => item.Categoria === category && item.Canal === channel && item.Habilitado);
    }

    canChange(category: NotificationCategory, channel: NotificationPreference['Canal']): boolean {
        return !(channel === 'in_app' && (category === 'moderacion' || category === 'sistema'));
    }

    toggle(category: NotificationCategory, channel: NotificationPreference['Canal']): void {
        if (!this.canChange(category, channel) || this.preferencesSaving) return;

        this.preferences = this.preferences.map(item => item.Categoria === category && item.Canal === channel
            ? { ...item, Habilitado: !item.Habilitado }
            : item);
    }

    savePreferences(): void {
        this.preferencesSaving = true;
        this.preferencesError = '';
        this.notificationService.savePreferences(this.preferences).subscribe({
            next: () => {
                if (!this.preferences.some(item => item.Canal === 'push' && item.Habilitado))
                    this.pushNotifications.revoke(this.session.userId).subscribe();
                this.preferencesSaving = false;
                this.preferencesOpen = false;
            },
            error: () => {
                this.preferencesError = 'No se han podido guardar las preferencias.';
                this.preferencesSaving = false;
            }
        });
    }

    get canEnablePush(): boolean { return this.pushNotifications.supported; }

    enablePush(): void {
        if (this.pushActivating) return;
        this.pushActivating = true;
        this.pushMessage = '';
        this.pushNotifications.enable(this.session.userId).subscribe({
            next: () => { this.pushActivating = false; this.pushMessage = 'Push activado para este dispositivo.'; },
            error: error => { this.pushActivating = false; this.pushMessage = getApiErrorMessage(error, 'No se ha podido activar push.'); }
        });
    }

    private normalizePreferences(preferences: NotificationPreference[]): NotificationPreference[] {
        return this.categories.flatMap(({ id }) => (['in_app', 'push'] as const).map(channel => {
            const preference = preferences.find(item => item.Categoria === id && item.Canal === channel);
            return preference ?? { Categoria: id, Canal: channel, Habilitado: channel === 'in_app' };
        })).map(item => this.canChange(item.Categoria, item.Canal) ? item : { ...item, Habilitado: true });
    }
}
