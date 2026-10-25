import { WebSocialSummaryViewComponent } from '../../../web/social/web-social-summary-view/web-social-summary-view.component';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Subscription, catchError, forkJoin, map, of } from 'rxjs';
import { SocialSummary } from '../../../../interfaces/chat';
import { CommunityService } from '../../../../services/entities/community.service';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { PlatformSocialService, PlatformSocialSummary } from '../../../../services/platform/platform-social.service';
import { PlatformSpacesService } from '../../../../services/platform/platform-spaces.service';
import { clubIdFromSpace } from '../../../../shared/club-spaces';
import { ChatStoreService } from '../../../../services/stores/chat-store.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileSocialSummaryViewComponent } from '../../../mobile/social/mobile-social-summary-view/mobile-social-summary-view.component';
import { YosiftwareMarkComponent } from '../../common/yosiftware-mark/yosiftware-mark.component';

/** Una tarjeta del resumen: lleva a una sección de Libros (`path`) o a la web social (`href`, con el símbolo). */
export interface SummaryCard { label: string; value: number; icon: string; path?: string; href?: string; accent?: boolean }

/**
 * El resumen de Comunidad: los clubes (de Libros), los mensajes sin leer (del chat de la plataforma) y las relaciones
 * (de la plataforma, que se gestionan en la web social: ecosistema-kit/SOCIAL.md).
 */
@Component({
    standalone: true,
    selector: 'app-social-summary',
    imports: [WebSocialSummaryViewComponent, MatIconModule, RouterLink, MobileSocialSummaryViewComponent, YosiftwareMarkComponent],
    templateUrl: './social-summary.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './social-summary.component.sass'
})
export class SocialSummaryComponent implements OnInit, OnDestroy {
    summary: SocialSummary | null = null;
    relationships: PlatformSocialSummary | null = null;
    /** Parte del resumen (los clubes, las invitaciones o las relaciones) no ha llegado. */
    partial = false;
    cards: SummaryCard[] = [];
    loading = false;
    error = '';
    private unreadMessages = 0;
    /** Las invitaciones a clubes pendientes, de los espacios de la plataforma (`null` si no han llegado). */
    private clubInvitations: number | null = null;
    private readonly subscriptions = new Subscription();

    constructor(private community: CommunityService, private social: PlatformSocialService, private chats: ChatStoreService, private session: PlatformSessionService, private presentation: PresentationModeService, private spaces: PlatformSpacesService) { }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }

    ngOnInit(): void {
        this.chats.initialize();
        this.subscriptions.add(this.chats.state$.subscribe(state => {
            this.unreadMessages = state.conversations.reduce((total, item) => total + item.NoLeidos, 0);
            if (this.summary || this.relationships) this.cards = this.buildCards();
        }));
        this.load();
    }

    ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

    trackCard(_index: number, card: SummaryCard): string { return card.label; }

    load(): void {
        if (this.loading) return;
        this.loading = true;
        this.error = '';
        forkJoin({
            clubs: this.community.socialSummary().pipe(map(value => ({ value, failed: null })), catchError(error => of({ value: null, failed: error as unknown }))),
            relationships: this.social.summary().pipe(map(value => ({ value, failed: null })), catchError(error => of({ value: null, failed: error as unknown }))),
            // Las invitaciones son de los espacios (fase 4): `GET /v1/espacios/invitaciones`, solo las de clubes.
            invitations: this.spaces.myInvitations().pipe(map(items => items.filter(item => clubIdFromSpace(item.espacio.idExterno) !== null).length), catchError(() => of(null)))
        }).subscribe(({ clubs, relationships, invitations }) => {
            this.loading = false;
            this.clubInvitations = invitations;
            this.summary = clubs.value;
            this.relationships = relationships.value;
            if (!clubs.value && !relationships.value) {
                this.cards = [];
                this.error = getApiErrorMessage(clubs.failed, 'No se ha podido cargar el resumen social.');
                return;
            }
            this.partial = !clubs.value || !relationships.value || invitations === null || clubs.value.Parcial;
            this.cards = this.buildCards();
        });
    }

    private buildCards(): SummaryCard[] {
        const cards: SummaryCard[] = [];
        const relationships = this.relationships;
        if (relationships) cards.push(
            { label: 'Amistades', value: relationships.amistades, icon: 'group', href: this.session.socialUrl('amistades') },
            { label: 'Solicitudes de amistad', value: relationships.solicitudesRecibidas, icon: 'person_add', href: this.session.socialUrl('solicitudes'), accent: relationships.solicitudesRecibidas > 0 },
            { label: 'Seguidores', value: relationships.seguidores, icon: 'diversity_3', href: this.session.socialUrl('seguidores') },
            { label: 'Siguiendo', value: relationships.seguidos, icon: 'person_search', href: this.session.socialUrl('seguidos') }
        );
        const clubs = this.summary?.Resumen.Clubes;
        if (clubs) cards.push({ label: 'Clubes activos', value: clubs.Activos, icon: 'groups_3', path: '../clubs' });
        // Las invitaciones solo las cuenta la plataforma (la API ya no da `InvitacionesPendientes`): sin su respuesta, no hay tarjeta.
        const invitations = this.clubInvitations;
        if (invitations !== null) cards.push({ label: 'Invitaciones a clubes', value: invitations, icon: 'mark_email_unread', path: '../clubs', accent: invitations > 0 });
        cards.push({ label: 'Mensajes sin leer', value: this.unreadMessages, icon: 'forum', path: '../messages', accent: this.unreadMessages > 0 });
        return cards;
    }
}
