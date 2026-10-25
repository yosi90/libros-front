import { ThemeOnboardingComponent } from '../../web/ui/theme-onboarding/theme-onboarding.component';
import { WebNavigationComponent } from '../../web/ui/web-navigation/web-navigation.component';
import { WebReadingWindowComponent } from '../../web/ui/web-reading-window/web-reading-window.component';
import { PwaLifecycleService } from '../../../services/ui/pwa-lifecycle.service';
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
import { PlatformSessionService } from '../../../services/auth/platform-session.service';
import { ModerationAccessService } from '../../../services/stores/moderation-access.service';
import { CommunityCapabilitiesService } from '../../../services/stores/community-capabilities.service';
import { distinctUntilChanged, map, skip, Subscription } from 'rxjs';
import { ChatStoreService } from '../../../services/stores/chat-store.service';
import { FloatingWindowHostComponent } from '../../shared/common/floating-window-host/floating-window-host.component';
import { ChatFloatingCoordinatorService } from '../../../services/stores/chat-floating-coordinator.service';
import { PresentationModeService } from '../../../services/ui/presentation-mode.service';
import { MobileDashboardChromeComponent } from '../../mobile/user/mobile-dashboard-chrome/mobile-dashboard-chrome.component';
import { YosiftwareAccountComponent } from '../../shared/common/yosiftware-account/yosiftware-account.component';
import { YosiftwareNotificationsComponent } from '../../shared/common/yosiftware-notifications/yosiftware-notifications.component';
import { YosiftwareWebsComponent } from '../../shared/common/yosiftware-webs/yosiftware-webs.component';

@Component({
    standalone: true,
    selector:  'app-dahsboard',
    imports: [
        ThemeOnboardingComponent,
        MatCardModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, CommonModule, MatTooltipModule, NgxDropzoneModule,
        RouterLink, RouterLinkActive, UserRouterComponent, FloatingWindowHostComponent, MobileDashboardChromeComponent, WebNavigationComponent, WebReadingWindowComponent, YosiftwareAccountComponent, YosiftwareNotificationsComponent, YosiftwareWebsComponent
    ],
    templateUrl: './dahsboard.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './dahsboard.component.sass'
})
export class DahsboardComponent implements OnInit, OnDestroy {
    readonly moderationAccess$ = this.moderationAccess.state$;
    readonly capabilities$ = this.capabilities.state$;
    readonly unreadChatCount$ = this.chatStore.state$.pipe(
        map(state => state.conversations.reduce((total, conversation) => total + conversation.NoLeidos, 0)),
        distinctUntilChanged()
    );
    private accessSubscription: Subscription;
    private viewInitialized = false;

    get userData() {
        return this.sessionSrv.userObject;
    }

    /** En Wood la instalación vive en la barra lateral en lugar del botón flotante. */
    installApp(): void {
        void this.pwa?.install();
    }

    get isWoodPresentation(): boolean { return this.presentation.snapshot.isWoodPresentationActive; }
    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get isWebPresentation(): boolean { return this.presentation.snapshot.activeMode === 'web'; }
    get displayName(): string { return this.sessionSrv.userName; }

    /** Avatar de la cuenta de Yosiftware (miniatura del perfil común); vacío pinta la inicial. */
    get profileImageUrl(): string {
        return this.sessionSrv.avatarUrl ?? '';
    }

    get pageTitle(): string {
        const url = this.router.url;
        if (url.includes('/catalog')) return 'Catálogo';
        if (url.includes('/community')) return 'Comunidad';
        if (url.includes('/statistics')) return 'Estadísticas';
        if (url.includes('/profile')) return 'Perfil';
        if (url.includes('/preferences')) return 'Preferencias';
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

    constructor(private sessionSrv: PlatformSessionService, private moderationAccess: ModerationAccessService, private capabilities: CommunityCapabilitiesService, private chatStore: ChatStoreService, private chatFloating: ChatFloatingCoordinatorService, private router: Router, private presentation: PresentationModeService, readonly pwa?: PwaLifecycleService) {
        this.accessSubscription = this.presentation.state$.pipe(skip(1)).subscribe(() => {
            if (!this.viewInitialized) return;
            if (this.isWoodPresentation || this.isWebPresentation) {
                if (!this.chatFloating.isInitialized) this.chatFloating.initialize(this.sessionSrv.userId);
                this.chatFloating.handleViewportChange();
            } else {
                this.chatFloating.closeAll();
            }
        });
    }

    accountRestrictionMessage(): string | null { return this.moderationAccess.accountRestrictionMessage(); }

    openChat(): void {
        void this.router.navigate(['/dashboard/community/messages']);
    }

    /**
     * El chat y las notificaciones son de la plataforma y están con cualquier sesión. La Comunidad de Libros (resumen y
     * clubes) también; dentro, los clubes siguen la capacidad `clubes` de la API.
     */
    readonly chatEnabled = true;
    readonly communityEnabled = true;

    isCapabilityActive(capability: 'clubes'): boolean {
        return this.capabilities.isActive(capability);
    }

    ngOnInit(): void {
        this.viewInitialized = true;
        // Las ventanas flotantes (chats y libro) existen en el escritorio de Wood y Web.
        if (this.isWoodPresentation || this.isWebPresentation)
            this.chatFloating.initialize(this.sessionSrv.userId);
        this.chatStore.initialize();
    }

    ngOnDestroy(): void {
        this.viewInitialized = false;
        this.accessSubscription.unsubscribe();
        this.chatStore.clear();
        this.chatFloating.clear();
    }

    handleProfileImageError(event: Event) {
        (event.target as HTMLImageElement).hidden = true;
    }
}
