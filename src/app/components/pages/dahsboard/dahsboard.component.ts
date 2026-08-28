import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
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
import { skip, Subscription } from 'rxjs';
import { ChatStoreService } from '../../../services/stores/chat-store.service';
import { FloatingWindowHostComponent } from '../../shared/common/floating-window-host/floating-window-host.component';
import { ChatFloatingCoordinatorService } from '../../../services/stores/chat-floating-coordinator.service';
import { NotificationBellComponent } from '../../shared/common/notification-bell/notification-bell.component';
import { SessionNotificationStoreService } from '../../../services/stores/session-notification-store.service';
import { DecisionNoticeService } from '../../../services/navigation/decision-notice.service';
import { PolicyPromptService } from '../../../services/navigation/policy-prompt.service';
import { PresentationModeService } from '../../../services/ui/presentation-mode.service';
import { MobileDashboardChromeComponent } from '../../mobile/user/mobile-dashboard-chrome/mobile-dashboard-chrome.component';

@Component({
    standalone: true,
    selector:  'app-dahsboard',
    imports: [
        MatCardModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, CommonModule, MatTooltipModule, NgxDropzoneModule,
        RouterLink, RouterLinkActive, UserRouterComponent, NotificationBellComponent, FloatingWindowHostComponent, MobileDashboardChromeComponent
    ],
    templateUrl: './dahsboard.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './dahsboard.component.sass'
})
export class DahsboardComponent implements OnInit, OnDestroy {
    imgUrl = environment.getImgUrl;
    
    imageCacheBuster: number = Date.now();
    readonly realtimeStatus$ = this.realtime.status$;
    readonly moderationAccess$ = this.moderationAccess.state$;
    readonly capabilities$ = this.capabilities.state$;
    private accessSubscription: Subscription;
    private viewInitialized = false;
    private chatUserId: number | null = null;

    get userData() {
        return this.sessionSrv.userObject;
    }

    get isUserAdmin(): boolean {
        return this.sessionSrv.isAdmin;
    }

    get canModerateCatalog(): boolean {
        return this.sessionSrv.canModerateCatalog;
    }

    get isWoodPresentation(): boolean { return this.presentation.snapshot.isWoodPresentationActive; }
    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get canUseDesktopAdministration(): boolean { return this.presentation.snapshot.canUseDesktopAdministration; }

    get profileImageUrl(): string {
        return this.imgUrl + 'photo/' + this.userData.image + '?v=' + this.imageCacheBuster;
    }

    get pageTitle(): string {
        const url = this.router.url;
        if (url.includes('/catalog')) return 'Catálogo';
        if (url.includes('/community')) return 'Comunidad';
        if (url.includes('/statistics')) return 'Estadísticas';
        if (url.includes('/profile')) return 'Perfil';
        if (url.includes('/account-security')) return 'Cuenta y seguridad';
        if (url.includes('/authors')) return 'Autores';
        if (url.includes('/universes')) return 'Universos';
        if (url.includes('/sagas')) return 'Sagas';
        if (url.includes('/anthologies')) return 'Antologías';
        if (url.includes('/books/manage')) return 'Gestión de libros';
        return 'Mi biblioteca';
    }

    get contextualCreateRoute(): string {
        const url = this.router.url;
        if (url.includes('/authors')) return '/dashboard/authors/new';
        if (url.includes('/universes')) return '/dashboard/universes/new';
        if (url.includes('/sagas')) return '/dashboard/sagas/new';
        if (url.includes('/anthologies')) return '/dashboard/anthologies/new';
        return '/dashboard/books/manage/new';
    }

    constructor(private sessionSrv: SessionService, private notificationStore: NotificationStoreService, private realtime: RealtimeSocketService, private moderationAccess: ModerationAccessService, private capabilities: CommunityCapabilitiesService, private chatStore: ChatStoreService, private chatFloating: ChatFloatingCoordinatorService, private sessionNotifications: SessionNotificationStoreService, private decisions: DecisionNoticeService, private policyPrompt: PolicyPromptService, private router: Router, private presentation: PresentationModeService) {
        this.accessSubscription = this.moderationAccess.state$.subscribe(state => {
            if (state && !state.Politicas.some(policy => policy.Pendiente)) this.policyPrompt.clear();
        });
        this.accessSubscription.add(this.capabilities.state$.subscribe(state => {
            this.applyChatCapability(!state.Conservadora && state.Capacidades.chat.Activa);
        }));
        this.accessSubscription.add(this.presentation.state$.pipe(skip(1)).subscribe(() => {
            if (!this.viewInitialized) return;
            if (this.isWoodPresentation) {
                this.applyChatCapability(this.isCapabilityActive('chat'));
                this.chatFloating.handleViewportChange();
            } else {
                this.chatFloating.closeAll();
            }
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
        void this.router.navigate(['/dashboard/community/messages']);
    }

    isCapabilityActive(capability: 'notificaciones' | 'feed' | 'chat' | 'clubes'): boolean {
        return this.capabilities.isActive(capability);
    }

    ngOnInit(): void {
        this.viewInitialized = true;
        if (this.isWoodPresentation)
            this.chatFloating.initialize(this.sessionSrv.userId);
        this.applyChatCapability(this.isCapabilityActive('chat'));
    }

    ngOnDestroy(): void {
        this.viewInitialized = false;
        this.chatUserId = null;
        this.accessSubscription.unsubscribe();
        this.chatStore.clear();
        this.chatFloating.clear();
    }

    private applyChatCapability(active: boolean): void {
        if (!active) {
            this.chatFloating.closeAll();
            if (this.chatUserId !== null) this.chatStore.clear();
            this.chatUserId = null;
            return;
        }
        if (!this.viewInitialized || !this.isWoodPresentation || this.chatUserId === this.sessionSrv.userId) return;
        this.chatStore.initialize(this.sessionSrv.userId);
        this.chatUserId = this.sessionSrv.userId;
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
