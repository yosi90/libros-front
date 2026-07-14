import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { UserRouterComponent } from '../../user-router/user-router.component';
import { NotificationStoreService } from '../../../services/stores/notification-store.service';
import { SessionService } from '../../../services/auth/session.service';
import { environment } from '../../../../environment/environment';
import { RealtimeConnectionStates, RealtimeSocketService } from '../../../services/realtime/realtime-socket.service';
import { ModerationAccessService } from '../../../services/stores/moderation-access.service';
import { CommunityCapabilitiesService } from '../../../services/stores/community-capabilities.service';
import { Subscription } from 'rxjs';
import { ChatStoreService } from '../../../services/stores/chat-store.service';
import { FloatingWindowHostComponent } from '../../shared/common/floating-window-host/floating-window-host.component';
import { ChatFloatingCoordinatorService } from '../../../services/stores/chat-floating-coordinator.service';
import { NotificationBellComponent } from '../../shared/common/notification-bell/notification-bell.component';
import { SessionNotificationStoreService } from '../../../services/stores/session-notification-store.service';
import { DecisionNoticeService } from '../../../services/navigation/decision-notice.service';
import { PolicyPromptService } from '../../../services/navigation/policy-prompt.service';

@Component({
    standalone: true,
    selector:  'app-dahsboard',
    imports: [
        MatCardModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, CommonModule, MatTooltipModule, NgxDropzoneModule,
        RouterLink, RouterLinkActive, UserRouterComponent, NotificationBellComponent, FloatingWindowHostComponent
    ],
    templateUrl: './dahsboard.component.html',
    styleUrl: './dahsboard.component.sass'
})
export class DahsboardComponent implements OnInit, OnDestroy {
    imgUrl = environment.getImgUrl;
    
    viewportSize!: { width: number, height: number };
    imageCacheBuster: number = Date.now();
    readonly realtimeStatus$ = this.realtime.status$;
    readonly moderationAccess$ = this.moderationAccess.state$;
    readonly capabilities$ = this.capabilities.state$;
    private accessSubscription: Subscription;

    get userData() {
        return this.sessionSrv.userObject;
    }

    get isUserAdmin(): boolean {
        return this.sessionSrv.isAdmin;
    }

    get canModerateCatalog(): boolean {
        return this.sessionSrv.canModerateCatalog;
    }

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
        this.chatFloating.handleViewportChange();
    }

    constructor(private sessionSrv: SessionService, private notificationStore: NotificationStoreService, private realtime: RealtimeSocketService, private moderationAccess: ModerationAccessService, private capabilities: CommunityCapabilitiesService, private chatStore: ChatStoreService, private chatFloating: ChatFloatingCoordinatorService, private sessionNotifications: SessionNotificationStoreService, private decisions: DecisionNoticeService, private policyPrompt: PolicyPromptService) {
        this.accessSubscription = this.moderationAccess.state$.subscribe(state => {
            if (state && !state.Politicas.some(policy => policy.Pendiente)) this.policyPrompt.clear();
        });
        this.accessSubscription.add(this.capabilities.state$.subscribe(state => {
            if (state.Conservadora || !state.Capacidades.chat.Activa) this.chatFloating.closeAll();
        }));
    }

    accountRestrictionMessage(): string | null { return this.moderationAccess.accountRestrictionMessage(); }

    hasRealtimeNotice(states: RealtimeConnectionStates): boolean {
        return Object.values(states).some(state => state === 'connecting' || state === 'reconnecting' || state === 'offline');
    }

    isOffline(states: RealtimeConnectionStates): boolean { return Object.values(states).some(state => state === 'offline'); }

    realtimeMessage(states: RealtimeConnectionStates): string {
        if (this.isOffline(states))
            return 'Sin conexión. Conservamos los datos visibles y reintentaremos al recuperar internet.';
        if (Object.values(states).some(state => state === 'reconnecting'))
            return 'Reconectando las actualizaciones en directo. Puedes seguir usando la aplicación mediante REST.';
        return 'Conectando las actualizaciones en directo. El contenido continúa disponible mediante REST.';
    }

    retryRealtime(): void { this.realtime.retry(); }

    openChat(): void {
        this.chatFloating.openList();
    }

    isCapabilityActive(capability: 'notificaciones' | 'feed' | 'chat' | 'clubes'): boolean {
        return this.capabilities.isActive(capability);
    }

    ngOnInit(): void {
        this.getViewportSize();
        this.chatFloating.initialize(this.sessionSrv.userId);
        if (this.isCapabilityActive('chat')) this.chatStore.initialize(this.sessionSrv.userId);
    }

    ngOnDestroy(): void {
        this.accessSubscription.unsubscribe();
        this.chatStore.clear();
        this.chatFloating.clear();
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    handleProfileImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    logout(): void {
        this.notificationStore.clear();
        this.sessionNotifications.resetSession();
        this.decisions.reset();
        this.sessionSrv.logout();
    }
}
