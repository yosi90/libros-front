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
import { NotificationCenterComponent } from '../../shared/common/notification-center/notification-center.component';
import { NotificationStoreService } from '../../../services/stores/notification-store.service';
import { SessionService } from '../../../services/auth/session.service';
import { environment } from '../../../../environment/environment';
import { RealtimeConnectionStates, RealtimeSocketService } from '../../../services/realtime/realtime-socket.service';
import { ModerationAccessService } from '../../../services/stores/moderation-access.service';
import { CommunityCapabilitiesService } from '../../../services/stores/community-capabilities.service';
import { ActionNotice, ActionNoticeService } from '../../../services/navigation/action-notice.service';
import { Subscription } from 'rxjs';

@Component({
    standalone: true,
    selector:  'app-dahsboard',
    imports: [
        MatCardModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, CommonModule, MatTooltipModule, NgxDropzoneModule,
        RouterLink, RouterLinkActive, UserRouterComponent, NotificationCenterComponent
    ],
    templateUrl: './dahsboard.component.html',
    styleUrl: './dahsboard.component.sass'
})
export class DahsboardComponent implements OnInit, OnDestroy {
    imgUrl = environment.getImgUrl;
    
    viewportSize!: { width: number, height: number };
    imageCacheBuster: number = Date.now();
    notificationCenterOpen = false;
    communicationTab: 'notifications' | 'chat' = 'notifications';
    readonly notifications$ = this.notificationStore.state$;
    readonly realtimeStatus$ = this.realtime.status$;
    readonly moderationAccess$ = this.moderationAccess.state$;
    readonly capabilities$ = this.capabilities.state$;
    readonly actionNotice$ = this.actionNotice.notice$;
    private policyNoticeShown = false;
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
    }

    constructor(private sessionSrv: SessionService, private notificationStore: NotificationStoreService, private realtime: RealtimeSocketService, private moderationAccess: ModerationAccessService, private capabilities: CommunityCapabilitiesService, private actionNotice: ActionNoticeService) {
        this.accessSubscription = this.moderationAccess.state$.subscribe(state => {
            if (!state || this.isUserAdmin || this.policyNoticeShown) return;
            const pending = state.Politicas.filter(policy => policy.Pendiente);
            if (!pending.length) return;
            this.policyNoticeShown = true;
            this.actionNotice.show({
                id: 'community-policies',
                title: 'Normas de comunidad pendientes',
                message: pending.length === 2 ? 'Revisa y acepta las normas de uso y creación para utilizar todas las funciones sociales.' : 'Revisa y acepta la norma pendiente para utilizar todas las funciones sociales.',
                actionLabel: 'Revisar normas',
                commands: ['/dashboard/profile'],
                queryParams: { section: 'policies' }
            });
        });
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

    toggleCommunication(tab: 'notifications' | 'chat'): void {
        if (this.notificationCenterOpen && this.communicationTab === tab) {
            this.notificationCenterOpen = false;
            return;
        }
        this.communicationTab = tab;
        this.notificationCenterOpen = true;
    }

    isCapabilityActive(capability: 'notificaciones' | 'feed' | 'chat' | 'clubes'): boolean {
        return this.capabilities.isActive(capability);
    }

    openActionNotice(notice: ActionNotice): void { this.actionNotice.open(notice); }
    dismissActionNotice(notice: ActionNotice): void { this.actionNotice.dismiss(notice.id); }

    ngOnInit(): void {
        this.getViewportSize();
    }

    ngOnDestroy(): void { this.accessSubscription.unsubscribe(); }

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
        this.sessionSrv.logout();
    }
}
