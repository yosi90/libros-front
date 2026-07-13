import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { ClubDiscoveryCursor, ClubDiscoveryItem, ClubInvitation, ClubReading, CommunityComment, CommunityCursor, CommunityPost, CommunityUser } from '../../../../interfaces/community';
import { CommunityService } from '../../../../services/entities/community.service';
import { renderSafeMarkdown } from '../../../../shared/markdown';
import { getApiErrorCode, getApiErrorMessage, getProductStateMessage } from '../../../../shared/api-error-message';
import { RealtimeSocketService } from '../../../../services/realtime/realtime-socket.service';
import { SessionService } from '../../../../services/auth/session.service';
import { ChatService } from '../../../../services/entities/chat.service';
import { DirectEligibility } from '../../../../interfaces/chat';
import { ModerationAccessService } from '../../../../services/stores/moderation-access.service';

@Component({
    standalone: true,
    selector: 'app-community',
    imports: [DatePipe, FormsModule, NgFor, NgIf, MatIconModule, RouterLink],
    templateUrl: './community.component.html',
    styleUrl: './community.component.sass'
})
export class CommunityComponent implements OnInit, OnDestroy {
    users: CommunityUser[] = [];
    userSearch = '';
    isSearchingUsers = false;
    userSearchError = '';
    posts: CommunityPost[] = [];
    clubs: ClubDiscoveryItem[] = [];
    clubSearch = '';
    clubTargetType: ClubReading['Objetivo']['Tipo'] = 'libro';
    clubTargetId: number | null = null;
    nextClubCursor: ClubDiscoveryCursor | null = null;
    isSearchingClubs = false;
    clubInvitations: ClubInvitation[] = [];
    invitationActionIds = new Set<number>();
    invitationError = '';
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
    directEligibility = new Map<number, DirectEligibility>();
    checkingDirectUserIds = new Set<number>();
    openingDirectUserIds = new Set<number>();
    private realtimeSubscription: Subscription | null = null;

    constructor(private community: CommunityService, private realtime: RealtimeSocketService, private session: SessionService, private router: Router, private chat: ChatService, public readonly access: ModerationAccessService) { }

    ngOnInit(): void {
        this.access.refresh().subscribe();
        this.load();
        this.loadClubInvitations();
        this.realtime.open('community');
        this.realtimeSubscription = this.realtime.events$.subscribe(event => {
            if (event.channel !== 'community') return;
            if (event.type.startsWith('community.')) {
                this.refreshFeed();
                const postId = this.eventPostId(event.payload);
                if (postId && this.expandedCommentPostIds.has(postId)) this.loadComments(postId);
            }
            if (event.type === 'club.updated') this.searchClubs();
        });
        this.realtimeSubscription.add(this.realtime.connections$.subscribe(event => {
            if (event.channel === 'community' && event.reconnected) {
                this.refreshFeed();
                this.searchClubs();
                this.loadClubInvitations();
                this.access.refresh().subscribe();
            }
        }));
        this.realtimeSubscription.add(this.community.blockedUserIds$.subscribe(userId => {
            this.users = this.users.filter(item => item.Id !== userId);
            this.directEligibility.delete(userId);
            this.searchClubs();
            this.loadClubInvitations();
        }));
    }

    ngOnDestroy(): void { this.realtimeSubscription?.unsubscribe(); }

    load(): void {
        this.isLoading = true;
        this.loadError = false;
        forkJoin({ users: this.community.users(this.userSearch), feed: this.community.feed(undefined, this.revealSpoilers), clubs: this.community.discoverClubs({ query: this.clubSearch, ...(this.clubTargetId ? { targetType: this.clubTargetType, targetId: this.clubTargetId } : {}) }) }).subscribe({
            next: ({ users, feed, clubs }) => {
                this.users = users;
                this.posts = feed.Publicaciones;
                this.nextFeedCursor = feed.SiguienteCursor;
                this.clubs = clubs.Clubes;
                this.nextClubCursor = clubs.SiguienteCursor;
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
                this.loadError = true;
            }
        });
    }

    displayName(user: CommunityUser): string { return user.DisplayName || user.Nombre; }
    renderMarkdown(value: string | null): string { return renderSafeMarkdown(value || ''); }
    isHiddenSpoiler(item: CommunityPost | CommunityComment): boolean { return item.Spoiler?.Oculto === true; }
    revealAllSpoilers(): void { this.revealSpoilers = true; this.load(); Object.keys(this.commentsByPost).forEach(id => this.loadComments(Number(id))); }
    get canPublish(): boolean { return this.access.canUse('publicacion', true); }
    get canCreateClub(): boolean { return this.access.canUse('clubes', true); }
    get publishRestriction(): string | null { return this.access.restrictionMessage('publicacion', true); }
    get clubRestriction(): string | null { return this.access.restrictionMessage('clubes', true); }
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

    loadClubInvitations(): void {
        this.community.clubInvitations().subscribe({ next: page => this.clubInvitations = page.Invitaciones, error: () => this.clubInvitations = [] });
    }

    searchClubs(): void {
        if (this.isSearchingClubs) return;
        this.isSearchingClubs = true;
        this.community.discoverClubs({ query: this.clubSearch, ...(this.clubTargetId ? { targetType: this.clubTargetType, targetId: this.clubTargetId } : {}) }).subscribe({ next: page => { this.clubs = page.Clubes; this.nextClubCursor = page.SiguienteCursor; this.isSearchingClubs = false; }, error: () => this.isSearchingClubs = false });
    }

    loadMoreClubs(): void {
        if (!this.nextClubCursor || this.isSearchingClubs) return;
        this.isSearchingClubs = true;
        this.community.discoverClubs({ query: this.clubSearch, ...(this.clubTargetId ? { targetType: this.clubTargetType, targetId: this.clubTargetId } : {}) }, this.nextClubCursor).subscribe({ next: page => { const ids = new Set(this.clubs.map(club => club.Id)); this.clubs = [...this.clubs, ...page.Clubes.filter(club => !ids.has(club.Id))]; this.nextClubCursor = page.SiguienteCursor; this.isSearchingClubs = false; }, error: () => this.isSearchingClubs = false });
    }

    resolveClubInvitation(invitation: ClubInvitation, state: 'aceptada' | 'rechazada'): void {
        if (this.invitationActionIds.has(invitation.Id)) return;
        this.invitationActionIds.add(invitation.Id);
        this.invitationError = '';
        this.community.resolveClubInvitation(invitation.Club.Id, invitation.Id, state).subscribe({
            next: () => { this.invitationActionIds.delete(invitation.Id); this.loadClubInvitations(); this.load(); },
            error: error => { this.invitationError = getProductStateMessage(error, 'No se ha podido resolver la invitación.'); this.invitationActionIds.delete(invitation.Id); }
        });
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
                this.loadClubInvitations();
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
            next: id => { this.openingDirectUserIds.delete(user.Id); this.router.navigate(['/dashboard/chat', id]); },
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
