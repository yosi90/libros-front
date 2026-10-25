
import { WebSocialShellViewComponent } from '../../../web/social/web-social-shell-view/web-social-shell-view.component';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommunityCapabilityId } from '../../../../interfaces/community-capabilities';
import { CommunityCapabilitiesService } from '../../../../services/stores/community-capabilities.service';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { PlatformSocialService } from '../../../../services/platform/platform-social.service';
import { ChatStoreService } from '../../../../services/stores/chat-store.service';
import { Subscription } from 'rxjs';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileSocialShellComponent } from '../../../mobile/social/mobile-social-shell/mobile-social-shell.component';
import { YosiftwareMarkComponent } from '../../common/yosiftware-mark/yosiftware-mark.component';

/** Lo que es de la plataforma (personas y relaciones) se abre en la web social, con el símbolo del ecosistema. */
export interface SocialExternalItem { label: string; description: string; icon: string; href: string }

interface SocialNavigationItem {
    label: string;
    description: string;
    icon: string;
    path: string;
    capability?: CommunityCapabilityId;
}

@Component({
    standalone: true,
    selector: 'app-social-shell',
    imports: [WebSocialShellViewComponent, MatIconModule, RouterLink, RouterLinkActive, RouterOutlet, MobileSocialShellComponent, YosiftwareMarkComponent],
    templateUrl: './social-shell.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './social-shell.component.sass'
})
export class SocialShellComponent implements OnInit, OnDestroy {
    readonly items: SocialNavigationItem[] = [
        { label: 'Resumen', description: 'Tu actividad social', icon: 'dashboard', path: 'summary' },
        { label: 'Actividad', description: 'Lo que comparten en Libros', icon: 'dynamic_feed', path: 'activity' },
        { label: 'Clubes', description: 'Lecturas compartidas', icon: 'groups_3', path: 'clubs', capability: 'clubes' },
        { label: 'Mensajes', description: 'Directos, grupos y clubes', icon: 'forum', path: 'messages' }
    ];
    readonly externalItems: SocialExternalItem[] = [
        { label: 'Personas', description: 'Descubrir lectores', icon: 'diversity_3', href: this.session.socialUrl('personas') },
        { label: 'Amistades', description: 'Relaciones y solicitudes', icon: 'group', href: this.session.socialUrl('amistades') },
        { label: 'Bloqueos', description: 'Cuentas bloqueadas', icon: 'block', href: this.session.socialUrl('bloqueos') }
    ];

    friendshipsCount = 0;
    unreadCount = 0;
    private readonly subscriptions = new Subscription();

    constructor(
        private capabilities: CommunityCapabilitiesService,
        private social: PlatformSocialService,
        private session: PlatformSessionService,
        private chats: ChatStoreService,
        private presentation: PresentationModeService
    ) { }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }

    ngOnInit(): void {
        this.social.summary().subscribe({ next: summary => this.friendshipsCount = summary?.amistades ?? this.friendshipsCount, error: () => void 0 });
        this.chats.initialize();
        this.subscriptions.add(this.chats.state$.subscribe(state => this.unreadCount = state.conversations.reduce((total, item) => total + item.NoLeidos, 0)));
    }

    ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

    isAvailable(item: SocialNavigationItem): boolean {
        return !item.capability || this.capabilities.isActive(item.capability);
    }
}
