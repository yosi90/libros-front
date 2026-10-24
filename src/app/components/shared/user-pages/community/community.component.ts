import { WebCommunityViewComponent } from '../../../web/social/web-community-view/web-community-view.component';
import { DatePipe } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClubAccessInboxCounters, ClubDiscoveryCursor, ClubDiscoveryItem, ClubPublicActivitySummary, ClubUpcomingEvent, ClubUpcomingEventCursor, MyClubSummary } from '../../../../interfaces/community';
import { CommunityService } from '../../../../services/entities/community.service';
import { getProductStateMessage } from '../../../../shared/api-error-message';
import { ModerationAccessService } from '../../../../services/stores/moderation-access.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { ClubAccessCenterComponent } from './club-access-center/club-access-center.component';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileCommunityViewComponent } from '../../../mobile/social/mobile-community-view/mobile-community-view.component';

/**
 * Los clubes de lectura de Libros (descubrir, los míos, próximos eventos y acceso). Las personas, las amistades, los
 * bloqueos y el muro general se retiraron con la adhesión a Yosiftware: las personas y las relaciones son de la web
 * social, y la actividad automática, novedades de la plataforma (`RUTAS_RETIRADAS.md`, «Adhesión a Yosiftware»).
 */
@Component({
    standalone: true,
    selector: 'app-community',
    imports: [WebCommunityViewComponent, ClubAccessCenterComponent, DatePipe, FormsModule, MatIconModule, MatTooltipModule, RouterLink, MobileCommunityViewComponent],
    templateUrl: './community.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './community.component.sass'
})
export class CommunityComponent implements OnInit {
    readonly view = 'clubs' as const;
    clubs: ClubDiscoveryItem[] = [];
    clubSearch = '';
    nextClubCursor: ClubDiscoveryCursor | null = null;
    isSearchingClubs = false;
    isLoading = true;
    loadError = false;
    clubComposerOpen = false;
    clubName = '';
    clubDescription = '';
    clubVisibility: 'abierto' | 'cerrado' = 'abierto';
    isCreatingClub = false;
    clubCreationError = '';
    clubTab: 'discover' | 'mine' | 'events' | 'access' = 'discover';
    clubAccessCounters: ClubAccessInboxCounters = {
        Solicitudes: { EnviadasPendientes: 0, RecibidasPendientes: 0 },
        Invitaciones: { EnviadasPendientes: 0, RecibidasPendientes: 0 }
    };
    clubAccessRefreshToken = 0;
    hasMyClubs = false;
    myClubs: MyClubSummary[] = [];
    upcomingClubEvents: ClubUpcomingEvent[] = [];
    popularClubs: ClubPublicActivitySummary[] = [];
    isLoadingMyClubs = false;
    isLoadingClubEvents = false;
    nextClubEventCursor: ClubUpcomingEventCursor | null = null;

    constructor(private community: CommunityService, private router: Router, private route: ActivatedRoute, private universeStore: UniverseStoreService, public readonly access: ModerationAccessService, private presentation: PresentationModeService) { }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }

    ngOnInit(): void {
        const requestedClubTab = this.route.snapshot.queryParamMap.get('clubTab');
        if (requestedClubTab === 'discover' || requestedClubTab === 'mine' || requestedClubTab === 'events' || requestedClubTab === 'access') this.clubTab = requestedClubTab;
        this.access.refresh().subscribe();
        this.load();
        this.loadClubHome();
    }

    load(): void {
        this.isLoading = true;
        this.loadError = false;
        this.community.discoverClubs({ query: this.clubSearch }).subscribe({
            next: clubs => { this.clubs = clubs.Clubes; this.nextClubCursor = clubs.SiguienteCursor; this.isLoading = false; },
            error: () => { this.isLoading = false; this.loadError = true; }
        });
    }

    get pageEyebrow(): string { return 'Clubes de lectura'; }
    get pageTitle(): string { return 'Lecturas compartidas'; }
    get pageDescription(): string { return 'Encuentra comunidades alrededor de libros, sagas y universos.'; }

    get hasBooksInCollection(): boolean { return this.universeStore.getAllBooks().length > 0; }
    get canCreateClub(): boolean { return this.access.canUse('clubes', true) && this.hasBooksInCollection; }
    get publishRestriction(): string | null { return this.access.restrictionMessage('publicacion', true); }
    get createClubDisabledReason(): string | null { return this.access.restrictionMessage('clubes', true) ?? (this.hasBooksInCollection ? null : 'Añade al menos un libro a tu colección antes de crear un club.'); }
    get clubCreationDisabledReason(): string | null {
        if (!this.canCreateClub) return this.createClubDisabledReason;
        if (this.isCreatingClub) return 'La creación del club está en curso.';
        return this.clubName.trim().length < 2 ? 'Escribe un nombre de al menos dos caracteres para crear el club.' : null;
    }
    get clubRestriction(): string | null { return this.createClubDisabledReason; }

    selectClubTab(tab: 'discover' | 'mine' | 'events' | 'access'): void {
        if ((tab === 'mine' || tab === 'events') && !this.hasMyClubs) return;
        this.clubTab = tab;
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: tab === 'access'
                ? { clubTab: 'access' }
                : { clubTab: tab === 'discover' ? null : tab, accessType: null, direction: null, status: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
        if (tab === 'mine' && !this.myClubs.length) this.loadMyClubs();
        if (tab === 'events' && !this.upcomingClubEvents.length) this.loadUpcomingClubEvents();
    }

    loadClubHome(): void {
        this.community.clubSocialSummary().subscribe({
            next: summary => {
                this.hasMyClubs = summary.TieneClubes;
                this.myClubs = summary.ClubesPropios;
                this.upcomingClubEvents = summary.ProximosEventos;
                this.popularClubs = summary.ClubesPublicosActivos;
                this.clubAccessCounters = summary.BandejasAcceso;
                if (!summary.TieneClubes && (this.clubTab === 'mine' || this.clubTab === 'events')) this.selectClubTab('discover');
            }
        });
    }

    get clubAccessPendingTotal(): number {
        const requests = this.clubAccessCounters.Solicitudes;
        const invitations = this.clubAccessCounters.Invitaciones;
        return requests.EnviadasPendientes + requests.RecibidasPendientes + invitations.EnviadasPendientes + invitations.RecibidasPendientes;
    }

    refreshClubContext(): void {
        this.searchClubs();
        this.loadClubHome();
        if (this.hasMyClubs) this.loadMyClubs();
        this.clubAccessRefreshToken += 1;
    }

    loadMyClubs(): void {
        this.isLoadingMyClubs = true;
        this.community.myClubs().subscribe({
            next: page => { this.hasMyClubs = page.TieneClubes; this.myClubs = page.Clubes; this.isLoadingMyClubs = false; },
            error: () => this.isLoadingMyClubs = false
        });
    }

    loadUpcomingClubEvents(cursor?: ClubUpcomingEventCursor): void {
        this.isLoadingClubEvents = true;
        this.community.myUpcomingClubEvents(cursor).subscribe({
            next: page => {
                this.upcomingClubEvents = cursor ? [...this.upcomingClubEvents, ...page.Eventos] : page.Eventos;
                this.nextClubEventCursor = page.SiguienteCursor;
                this.isLoadingClubEvents = false;
            },
            error: () => this.isLoadingClubEvents = false
        });
    }

    openClubEvent(event: ClubUpcomingEvent): void { void this.router.navigate(['/dashboard/community/clubs', event.Club.Id], { queryParams: { eventId: event.Id } }); }

    searchClubs(): void {
        if (this.isSearchingClubs) return;
        this.isSearchingClubs = true;
        this.community.discoverClubs({ query: this.clubSearch }).subscribe({ next: page => { this.clubs = page.Clubes; this.nextClubCursor = page.SiguienteCursor; this.isSearchingClubs = false; }, error: () => this.isSearchingClubs = false });
    }

    loadMoreClubs(): void {
        if (!this.nextClubCursor || this.isSearchingClubs) return;
        this.isSearchingClubs = true;
        this.community.discoverClubs({ query: this.clubSearch }, this.nextClubCursor).subscribe({ next: page => { const ids = new Set(this.clubs.map(club => club.Id)); this.clubs = [...this.clubs, ...page.Clubes.filter(club => !ids.has(club.Id))]; this.nextClubCursor = page.SiguienteCursor; this.isSearchingClubs = false; }, error: () => this.isSearchingClubs = false });
    }

    createClub(): void {
        const name = this.clubName.trim();
        if (name.length < 2 || this.isCreatingClub || !this.canCreateClub) return;

        this.isCreatingClub = true;
        this.clubCreationError = '';
        this.community.createClub({
            Nombre: name,
            Visibilidad: this.clubVisibility,
            DescripcionMarkdown: this.clubDescription.trim() || null
        }).subscribe({
            next: id => {
                this.isCreatingClub = false;
                this.clubComposerOpen = false;
                this.clubName = '';
                this.clubDescription = '';
                this.router.navigate(['/dashboard/community/clubs', id]);
            },
            error: error => { this.clubCreationError = getProductStateMessage(error, 'No se ha podido crear el club.'); this.isCreatingClub = false; }
        });
    }
}
