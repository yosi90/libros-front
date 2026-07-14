import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ClubAccessInboxCounters, ClubDiscoveryCursor, ClubDiscoveryItem, ClubPublicActivitySummary, ClubUpcomingEvent, ClubUpcomingEventCursor, CommunityComment, CommunityCursor, CommunityPost, CommunityUser, MyClubSummary } from '../../../../interfaces/community';
import { CommunityService } from '../../../../services/entities/community.service';
import { renderSafeMarkdown } from '../../../../shared/markdown';
import { getApiErrorCode, getApiErrorMessage, getProductStateMessage } from '../../../../shared/api-error-message';
import { RealtimeSocketService } from '../../../../services/realtime/realtime-socket.service';
import { SessionService } from '../../../../services/auth/session.service';
import { ChatService } from '../../../../services/entities/chat.service';
import { DirectEligibility } from '../../../../interfaces/chat';
import { ModerationAccessService } from '../../../../services/stores/moderation-access.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { ClubAccessCenterComponent } from './club-access-center/club-access-center.component';

@Component({
    standalone: true,
    selector: 'app-community',
    imports: [ClubAccessCenterComponent, DatePipe, FormsModule, NgFor, NgIf, MatIconModule, MatTooltipModule, RouterLink],
    templateUrl: './community.component.html',
    styleUrl: './community.component.sass'
})
export class CommunityComponent implements OnInit, OnDestroy {
    view: 'activity' | 'people' | 'clubs' = 'activity';
    users: CommunityUser[] = [];
    userSearch = '';
    isSearchingUsers = false;
    userSearchError = '';
    posts: CommunityPost[] = [];
    clubs: ClubDiscoveryItem[] = [];
    clubSearch = '';
    nextClubCursor: ClubDiscoveryCursor | null = null;
    isSearchingClubs = false;
    isLoading = true;
    loadError = false;
    postTitle = '';
    postContent = '';
    postAudience: 'publico' | 'seguidores' | 'amigos' | 'club' = 'seguidores';
    postClubId: number | null = null;
    postBookId: number | null = null;
    postAntologyId: number | null = null;
    postSpoilerStart: number | null = null;
    postSpoilerEnd: number | null = null;
    revealSpoilers = false;
    isPublishing = false;
    publishError = '';
    reactingPostIds = new Set<number>();
    reactionError = '';
    expandedCommentPostIds = new Set<number>();
    commentLoadingPostIds = new Set<number>();
    commentsByPost: Record<number, CommunityComment[]> = {};
    commentDrafts: Record<number, string> = {};
    commentSpoilerStart: Record<number, number | null> = {};
    commentSpoilerEnd: Record<number, number | null> = {};
    commentSubmittingPostIds = new Set<number>();
    commentError = '';
    nextFeedCursor: CommunityCursor | null = null;
    isLoadingMorePosts = false;
    editingPostId: number | null = null;
    editPostTitle = '';
    editPostContent = '';
    isSavingPostEdit = false;
    postActionError = '';
    reportingEntityIds = new Set<string>();
    reportMessage = '';
    editingCommentId: number | null = null;
    editCommentContent = '';
    isSavingCommentEdit = false;
    followingUserIds = new Set<number>();
    friendshipRequestedUserIds = new Set<number>();
    relationshipActionUserIds = new Set<number>();
    relationshipError = '';
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
    directEligibility = new Map<number, DirectEligibility>();
    checkingDirectUserIds = new Set<number>();
    openingDirectUserIds = new Set<number>();
    private realtimeSubscription: Subscription | null = null;

    constructor(private community: CommunityService, private realtime: RealtimeSocketService, private session: SessionService, private router: Router, private route: ActivatedRoute, private chat: ChatService, private universeStore: UniverseStoreService, public readonly access: ModerationAccessService) { }

    ngOnInit(): void {
        const routeView = this.route.snapshot.data['communityView'];
        if (routeView === 'people' || routeView === 'clubs' || routeView === 'activity') this.view = routeView;
        const requestedClubTab = this.route.snapshot.queryParamMap.get('clubTab');
        if (this.view === 'clubs' && (requestedClubTab === 'discover' || requestedClubTab === 'mine' || requestedClubTab === 'events' || requestedClubTab === 'access')) this.clubTab = requestedClubTab;
        this.access.refresh().subscribe();
        this.load();
        if (this.view === 'clubs') this.loadClubHome();
        this.realtime.open('community');
        this.realtimeSubscription = this.realtime.events$.subscribe(event => {
            if (event.channel !== 'community') return;
            if (event.type.startsWith('community.') && this.view === 'activity') {
                this.refreshFeed();
                const postId = this.eventPostId(event.payload);
                if (postId && this.expandedCommentPostIds.has(postId)) this.loadComments(postId);
            }
            if (event.type === 'club.updated' && this.view === 'clubs') this.refreshClubContext();
        });
        this.realtimeSubscription.add(this.realtime.connections$.subscribe(event => {
            if (event.channel === 'community' && event.reconnected) {
                if (this.view === 'activity') this.refreshFeed();
                if (this.view === 'people') this.searchUsers();
                if (this.view === 'clubs') this.refreshClubContext();
                this.access.refresh().subscribe();
            }
        }));
        this.realtimeSubscription.add(this.community.blockedUserIds$.subscribe(userId => {
            this.users = this.users.filter(item => item.Id !== userId);
            this.directEligibility.delete(userId);
            if (this.view === 'clubs') this.refreshClubContext();
        }));
    }

    ngOnDestroy(): void { this.realtimeSubscription?.unsubscribe(); }

    load(): void {
        this.isLoading = true;
        this.loadError = false;
        if (this.view === 'people') {
            this.community.users(this.userSearch).subscribe({ next: users => { this.users = users; this.isLoading = false; }, error: () => this.failInitialLoad() });
            return;
        }
        if (this.view === 'clubs') {
            this.community.discoverClubs({ query: this.clubSearch }).subscribe({
                next: clubs => { this.clubs = clubs.Clubes; this.nextClubCursor = clubs.SiguienteCursor; this.isLoading = false; },
                error: () => this.failInitialLoad()
            });
            return;
        }
        this.community.feed(undefined, this.revealSpoilers).subscribe({
            next: feed => { this.posts = feed.Publicaciones; this.nextFeedCursor = feed.SiguienteCursor; this.isLoading = false; },
            error: () => this.failInitialLoad()
        });
    }

    get pageEyebrow(): string { return this.view === 'people' ? 'Comunidad' : this.view === 'clubs' ? 'Clubes de lectura' : 'Actividad'; }
    get pageTitle(): string { return this.view === 'people' ? 'Descubre lectores' : this.view === 'clubs' ? 'Lecturas compartidas' : 'Lo que se está leyendo'; }
    get pageDescription(): string { return this.view === 'people' ? 'Encuentra perfiles públicos y amplía tu círculo lector.' : this.view === 'clubs' ? 'Encuentra comunidades alrededor de libros, sagas y universos.' : 'Publicaciones y avances de las personas y clubes que sigues.'; }

    displayName(user: CommunityUser): string { return user.DisplayName || user.Nombre; }
    renderMarkdown(value: string | null): string { return renderSafeMarkdown(value || ''); }
    isHiddenSpoiler(item: CommunityPost | CommunityComment): boolean { return item.Spoiler?.Oculto === true; }
    revealAllSpoilers(): void { this.revealSpoilers = true; this.load(); Object.keys(this.commentsByPost).forEach(id => this.loadComments(Number(id))); }
    get canPublish(): boolean { return this.access.canUse('publicacion', true); }
    get hasBooksInCollection(): boolean { return this.universeStore.getAllBooks().length > 0; }
    get composerBooks() { return this.universeStore.getAllBooks().slice().sort((a, b) => a.Nombre.localeCompare(b.Nombre)); }
    get composerAnthologies() { return this.universeStore.getAllAnthologies().slice().sort((a, b) => a.Nombre.localeCompare(b.Nombre)); }
    get composerClubs() { return this.myClubs.slice().sort((a, b) => a.Nombre.localeCompare(b.Nombre)); }
    get canCreateClub(): boolean { return this.access.canUse('clubes', true) && this.hasBooksInCollection; }
    get publishRestriction(): string | null { return this.access.restrictionMessage('publicacion', true); }
    get createClubDisabledReason(): string | null { return this.access.restrictionMessage('clubes', true) ?? (this.hasBooksInCollection ? null : 'Añade al menos un libro a tu colección antes de crear un club.'); }
    get clubCreationDisabledReason(): string | null {
        if (!this.canCreateClub) return this.createClubDisabledReason;
        if (this.isCreatingClub) return 'La creación del club está en curso.';
        return this.clubName.trim().length < 2 ? 'Escribe un nombre de al menos dos caracteres para crear el club.' : null;
    }
    get clubRestriction(): string | null { return this.createClubDisabledReason; }
    get hasInvalidCanonicalLink(): boolean { return !!this.postBookId && !!this.postAntologyId; }
    get hasInvalidPostSpoiler(): boolean {
        return (!!this.postSpoilerStart || !!this.postSpoilerEnd)
            && (!this.postBookId || (!!this.postSpoilerStart && !!this.postSpoilerEnd && this.postSpoilerEnd < this.postSpoilerStart));
    }
    get hasInvalidPostClubAudience(): boolean {
        const clubId = this.postClubId;
        return this.postAudience === 'club' && (!Number.isInteger(clubId) || !clubId || clubId < 1);
    }

    selectPostBook(): void { if (this.postBookId) this.postAntologyId = null; }
    selectPostAntology(): void { if (this.postAntologyId) this.postBookId = null; }
    selectPostAudience(): void { if (this.postAudience !== 'club') this.postClubId = null; }

    searchUsers(): void {
        if (this.isSearchingUsers) return;

        this.isSearchingUsers = true;
        this.userSearchError = '';
        this.community.users(this.userSearch).subscribe({
            next: users => { this.users = users; this.isSearchingUsers = false; },
            error: error => { this.userSearchError = getApiErrorMessage(error, 'No se ha podido buscar lectores.'); this.isSearchingUsers = false; }
        });
    }

    clearUserSearch(): void {
        if (!this.userSearch && !this.userSearchError) return;
        this.userSearch = '';
        this.searchUsers();
    }

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


    loadMorePosts(): void {
        if (!this.nextFeedCursor || this.isLoadingMorePosts) return;

        this.isLoadingMorePosts = true;
        this.community.feed(this.nextFeedCursor, this.revealSpoilers).subscribe({
            next: feed => {
                const existingIds = new Set(this.posts.map(post => post.Id));
                this.posts = [...this.posts, ...feed.Publicaciones.filter(post => !existingIds.has(post.Id))];
                this.nextFeedCursor = feed.SiguienteCursor;
                this.isLoadingMorePosts = false;
            },
            error: () => { this.reactionError = 'No se han podido cargar más publicaciones.'; this.isLoadingMorePosts = false; }
        });
    }

    private refreshFeed(): void {
        this.community.feed(undefined, this.revealSpoilers).subscribe({
            next: feed => { this.posts = feed.Publicaciones; this.nextFeedCursor = feed.SiguienteCursor; }
        });
    }

    private eventPostId(payload: Record<string, unknown>): number | null {
        const value = payload['PublicacionId'];
        return typeof value === 'number' && Number.isInteger(value) ? value : null;
    }

    isOwn(authorId: number): boolean { return authorId === this.session.userId; }

    startPostEdit(post: CommunityPost): void {
        this.editingPostId = post.Id;
        this.editPostTitle = post.Titulo || '';
        this.editPostContent = post.ContenidoMarkdown || '';
        this.postActionError = '';
    }

    cancelPostEdit(): void {
        this.editingPostId = null;
        this.editPostTitle = '';
        this.editPostContent = '';
    }

    savePostEdit(post: CommunityPost): void {
        const content = this.editPostContent.trim();
        if (!content || this.isSavingPostEdit) return;

        this.isSavingPostEdit = true;
        this.postActionError = '';
        this.community.updatePost(post.Id, {
            ContenidoMarkdown: content,
            Titulo: this.editPostTitle.trim() || undefined
        }).subscribe({
            next: () => { this.cancelPostEdit(); this.isSavingPostEdit = false; this.refreshFeed(); },
            error: error => { this.postActionError = getApiErrorMessage(error, 'No se ha podido editar la publicación.'); this.isSavingPostEdit = false; }
        });
    }

    deletePost(post: CommunityPost): void {
        if (!this.isOwn(post.Autor.Id) || !window.confirm('¿Quieres borrar esta publicación?')) return;

        this.postActionError = '';
        this.community.deletePost(post.Id).subscribe({
            next: () => this.refreshFeed(),
            error: error => this.postActionError = getApiErrorMessage(error, 'No se ha podido borrar la publicación.')
        });
    }

    startCommentEdit(comment: CommunityComment): void {
        this.editingCommentId = comment.Id;
        this.editCommentContent = comment.ContenidoMarkdown || '';
        this.postActionError = '';
    }

    cancelCommentEdit(): void {
        this.editingCommentId = null;
        this.editCommentContent = '';
    }

    saveCommentEdit(post: CommunityPost, comment: CommunityComment): void {
        const content = this.editCommentContent.trim();
        if (!content || this.isSavingCommentEdit) return;

        this.isSavingCommentEdit = true;
        this.postActionError = '';
        this.community.updateComment(post.Id, comment.Id, content).subscribe({
            next: () => { this.cancelCommentEdit(); this.isSavingCommentEdit = false; this.loadComments(post.Id); this.refreshFeed(); },
            error: error => { this.postActionError = getApiErrorMessage(error, 'No se ha podido editar el comentario.'); this.isSavingCommentEdit = false; }
        });
    }

    deleteComment(post: CommunityPost, comment: CommunityComment): void {
        if (!this.isOwn(comment.Autor.Id) || !window.confirm('¿Quieres borrar este comentario?')) return;

        this.postActionError = '';
        this.community.deleteComment(post.Id, comment.Id).subscribe({
            next: () => { this.loadComments(post.Id); this.refreshFeed(); },
            error: error => this.postActionError = getApiErrorMessage(error, 'No se ha podido borrar el comentario.')
        });
    }

    report(type: 'publicacion' | 'comentario', id: number): void {
        const key = `${type}:${id}`;
        if (this.reportingEntityIds.has(key)) return;
        const reason = window.prompt('Describe brevemente el motivo de la denuncia (máximo 1.000 caracteres).')?.trim();
        if (!reason) return;
        this.reportingEntityIds.add(key);
        this.reportMessage = '';
        this.community.report(type, id, reason.slice(0, 1000)).subscribe({
            next: () => { this.reportingEntityIds.delete(key); this.reportMessage = 'Denuncia enviada. Moderación revisará el contenido y su contexto mínimo.'; },
            error: error => { this.reportingEntityIds.delete(key); this.reportMessage = getApiErrorCode(error) === 'duplicate_content_report' ? 'Ya tienes una denuncia pendiente sobre este contenido.' : getApiErrorMessage(error, 'No se ha podido enviar la denuncia.'); }
        });
    }

    follow(user: CommunityUser): void {
        if (this.relationshipActionUserIds.has(user.Id)) return;
        this.relationshipActionUserIds.add(user.Id);
        this.relationshipError = '';
        const request = this.followingUserIds.has(user.Id) ? this.community.unfollowUser(user.Id) : this.community.followUser(user.Id);
        request.subscribe({
            next: () => {
                this.followingUserIds.has(user.Id) ? this.followingUserIds.delete(user.Id) : this.followingUserIds.add(user.Id);
                this.relationshipActionUserIds.delete(user.Id);
                this.refreshFeed();
            },
            error: error => { this.relationshipError = getApiErrorMessage(error, 'No se ha podido actualizar el seguimiento.'); this.relationshipActionUserIds.delete(user.Id); }
        });
    }

    requestFriendship(user: CommunityUser): void {
        if (this.relationshipActionUserIds.has(user.Id) || this.friendshipRequestedUserIds.has(user.Id)) return;
        this.relationshipActionUserIds.add(user.Id);
        this.relationshipError = '';
        this.community.requestFriendship(user.Id).subscribe({
            next: () => { this.friendshipRequestedUserIds.add(user.Id); this.relationshipActionUserIds.delete(user.Id); },
            error: error => { this.relationshipError = getApiErrorMessage(error, 'No se ha podido enviar la solicitud de amistad.'); this.relationshipActionUserIds.delete(user.Id); }
        });
    }

    block(user: CommunityUser): void {
        if (this.relationshipActionUserIds.has(user.Id) || !window.confirm(`¿Quieres bloquear a ${this.displayName(user)}?`)) return;
        this.relationshipActionUserIds.add(user.Id);
        this.relationshipError = '';
        this.community.blockUser(user.Id).subscribe({
            next: () => {
                this.users = this.users.filter(item => item.Id !== user.Id);
                this.posts = this.posts.filter(post => post.Autor.Id !== user.Id);
                Object.keys(this.commentsByPost).forEach(postId => {
                    this.commentsByPost[Number(postId)] = this.commentsByPost[Number(postId)].filter(comment => comment.Autor.Id !== user.Id);
                });
                this.relationshipActionUserIds.delete(user.Id);
                this.refreshFeed();
                this.searchClubs();
                this.refreshClubContext();
            },
            error: error => { this.relationshipError = getApiErrorMessage(error, 'No se ha podido bloquear a esta persona.'); this.relationshipActionUserIds.delete(user.Id); }
        });
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

    checkDirect(user: CommunityUser): void {
        if (this.checkingDirectUserIds.has(user.Id)) return;
        this.checkingDirectUserIds.add(user.Id);
        this.relationshipError = '';
        this.chat.directEligibility(user.Id).subscribe({
            next: eligibility => { this.directEligibility.set(user.Id, eligibility); this.checkingDirectUserIds.delete(user.Id); },
            error: error => { this.relationshipError = getApiErrorMessage(error, 'No se ha podido comprobar el acceso al chat.'); this.checkingDirectUserIds.delete(user.Id); }
        });
    }

    canOpenDirect(userId: number): boolean { return this.directEligibility.get(userId)?.PuedeIniciarDirecto === true; }

    directUnavailableReason(userId: number): string {
        const reason = this.directEligibility.get(userId)?.Motivo;
        const labels: Record<string, string> = { follow_required: 'Debes seguir a esta persona.', messages_disabled: 'No acepta mensajes.', blocked_or_unavailable: 'Chat no disponible.', same_user: 'No puedes abrir un chat contigo.' };
        return reason ? (labels[reason] || 'Chat no disponible.') : '';
    }

    openDirect(user: CommunityUser): void {
        if (!this.canOpenDirect(user.Id) || this.openingDirectUserIds.has(user.Id)) return;
        this.openingDirectUserIds.add(user.Id);
        this.relationshipError = '';
        this.chat.createDirectConversation(user.Id).subscribe({
            next: id => { this.openingDirectUserIds.delete(user.Id); this.router.navigate(['/dashboard/community/messages', id]); },
            error: error => { this.relationshipError = getApiErrorMessage(error, 'El acceso al chat ha cambiado.'); this.directEligibility.delete(user.Id); this.openingDirectUserIds.delete(user.Id); }
        });
    }

    react(post: CommunityPost): void {
        if (this.reactingPostIds.has(post.Id)) return;

        this.reactingPostIds.add(post.Id);
        this.reactionError = '';
        this.community.reactToPost(post.Id).subscribe({
            next: () => this.community.feed(undefined, this.revealSpoilers).subscribe({
                next: feed => { this.posts = feed.Publicaciones; this.nextFeedCursor = feed.SiguienteCursor; this.reactingPostIds.delete(post.Id); },
                error: () => { this.reactionError = 'La reacción se ha guardado, pero no se ha podido actualizar el feed.'; this.reactingPostIds.delete(post.Id); }
            }),
            error: error => { this.reactionError = getApiErrorMessage(error, 'No se ha podido guardar la reacción.'); this.reactingPostIds.delete(post.Id); }
        });
    }

    toggleComments(post: CommunityPost): void {
        if (this.expandedCommentPostIds.has(post.Id)) {
            this.expandedCommentPostIds.delete(post.Id);
            return;
        }

        this.expandedCommentPostIds.add(post.Id);
        if (!this.commentsByPost[post.Id]) this.loadComments(post.Id);
    }

    loadComments(postId: number): void {
        this.commentLoadingPostIds.add(postId);
        this.commentError = '';
        this.community.comments(postId, undefined, this.revealSpoilers).subscribe({
            next: page => { this.commentsByPost[postId] = page.Comentarios; this.commentLoadingPostIds.delete(postId); },
            error: error => { this.commentError = getApiErrorMessage(error, 'No se han podido cargar los comentarios.'); this.commentLoadingPostIds.delete(postId); }
        });
    }

    comment(post: CommunityPost): void {
        const content = (this.commentDrafts[post.Id] || '').trim();
        if (!content || this.commentSubmittingPostIds.has(post.Id)) return;

        const start = this.commentSpoilerStart[post.Id];
        const end = this.commentSpoilerEnd[post.Id];
        if (start && end && end < start) {
            this.commentError = 'La página final del spoiler no puede ser anterior a la inicial.';
            return;
        }

        this.commentSubmittingPostIds.add(post.Id);
        this.commentError = '';
        const spoiler = post.Spoiler ? undefined : (start || end ? { ...(start ? { PaginaInicio: start } : {}), ...(end ? { PaginaFin: end } : {}) } : undefined);
        this.community.createComment(post.Id, content, spoiler).subscribe({
            next: () => {
                this.commentDrafts[post.Id] = '';
                this.commentSpoilerStart[post.Id] = null;
                this.commentSpoilerEnd[post.Id] = null;
                this.commentSubmittingPostIds.delete(post.Id);
                this.loadComments(post.Id);
                this.community.feed(undefined, this.revealSpoilers).subscribe({ next: feed => { this.posts = feed.Publicaciones; this.nextFeedCursor = feed.SiguienteCursor; } });
            },
            error: error => { this.commentError = getProductStateMessage(error, 'No se ha podido publicar el comentario.'); this.commentSubmittingPostIds.delete(post.Id); }
        });
    }

    private failInitialLoad(): void { this.isLoading = false; this.loadError = true; }

    publish(): void {
        const content = this.postContent.trim();
        if (!content || this.isPublishing || !this.canPublish || this.hasInvalidCanonicalLink || this.hasInvalidPostSpoiler || this.hasInvalidPostClubAudience) return;

        this.isPublishing = true;
        this.publishError = '';
        this.community.createPost({
            ContenidoMarkdown: content,
            Audiencia: this.postAudience,
            ...(this.postAudience === 'club' && this.postClubId ? { ClubId: this.postClubId } : {}),
            ...(this.postTitle.trim() ? { Titulo: this.postTitle.trim() } : {}),
            ...(this.postBookId ? { LibroId: this.postBookId } : {}),
            ...(this.postAntologyId ? { AntologiaId: this.postAntologyId } : {}),
            ...(this.postSpoilerStart || this.postSpoilerEnd ? { Spoiler: { ...(this.postSpoilerStart ? { PaginaInicio: this.postSpoilerStart } : {}), ...(this.postSpoilerEnd ? { PaginaFin: this.postSpoilerEnd } : {}) } } : {})
        }).subscribe({
            next: () => {
                this.postTitle = '';
                this.postContent = '';
                this.postClubId = null;
                this.postBookId = null;
                this.postAntologyId = null;
                this.postSpoilerStart = null;
                this.postSpoilerEnd = null;
                this.isPublishing = false;
                this.load();
            },
            error: error => { this.publishError = getProductStateMessage(error, 'No se ha podido publicar ahora.'); this.isPublishing = false; }
        });
    }

}
