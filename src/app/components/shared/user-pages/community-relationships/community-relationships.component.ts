import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CommunityFriendRequest, CommunityRelationship, CommunityRelationshipKind } from '../../../../interfaces/community';
import { CommunityService } from '../../../../services/entities/community.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { RealtimeSocketService } from '../../../../services/realtime/realtime-socket.service';
import { Subscription } from 'rxjs';

type RelationshipView = CommunityRelationshipKind | 'recibidas' | 'enviadas';

@Component({
    standalone: true,
    selector: 'app-community-relationships',
    imports: [DatePipe, NgFor, NgIf, MatIconModule, RouterLink],
    templateUrl: './community-relationships.component.html',
    styleUrl: './community-relationships.component.sass'
})
export class CommunityRelationshipsComponent implements OnInit, OnDestroy {
    readonly views: { id: RelationshipView; label: string; icon: string }[] = [
        { id: 'seguidos', label: 'Siguiendo', icon: 'person_add' },
        { id: 'seguidores', label: 'Seguidores', icon: 'groups' },
        { id: 'amistades', label: 'Amistades', icon: 'favorite' },
        { id: 'recibidas', label: 'Solicitudes recibidas', icon: 'mark_email_unread' },
        { id: 'enviadas', label: 'Solicitudes enviadas', icon: 'outgoing_mail' },
        { id: 'bloqueos', label: 'Bloqueos', icon: 'block' }
    ];
    view: RelationshipView = 'seguidos';
    relationships: CommunityRelationship[] = [];
    requests: CommunityFriendRequest[] = [];
    nextAfterId: number | null = null;
    isLoading = true;
    isLoadingMore = false;
    error = '';
    actionId: number | null = null;
    private realtimeSubscription: Subscription | null = null;

    constructor(private community: CommunityService, private realtime: RealtimeSocketService) { }

    ngOnInit(): void {
        this.load();
        this.realtime.open('community');
        this.realtimeSubscription = this.realtime.connections$.subscribe(event => {
            if (event.channel === 'community' && event.reconnected)
                this.load();
        });
        this.realtimeSubscription.add(this.community.blockedUserIds$.subscribe(() => this.load()));
    }

    ngOnDestroy(): void { this.realtimeSubscription?.unsubscribe(); }

    get isRequestView(): boolean { return this.view === 'recibidas' || this.view === 'enviadas'; }
    get emptyMessage(): string {
        const messages: Record<RelationshipView, string> = {
            seguidos: 'Todavía no sigues a ninguna persona.', seguidores: 'Aún no tienes seguidores visibles.', amistades: 'Todavía no hay amistades activas.', recibidas: 'No tienes solicitudes de amistad pendientes.', enviadas: 'No has enviado solicitudes pendientes.', bloqueos: 'No has bloqueado a ninguna persona.'
        };
        return messages[this.view];
    }

    switchView(view: RelationshipView): void {
        if (this.view === view) return;
        this.view = view;
        this.load();
    }

    load(): void {
        this.isLoading = true;
        this.error = '';
        this.loadPage(undefined, false);
    }

    loadMore(): void {
        if (!this.nextAfterId || this.isLoadingMore) return;
        this.isLoadingMore = true;
        this.loadPage(this.nextAfterId, true);
    }

    resolve(request: CommunityFriendRequest, state: 'aceptada' | 'rechazada'): void {
        if (this.actionId !== null) return;
        this.actionId = request.Id;
        this.community.resolveFriendshipRequest(request.Id, state).subscribe({
            next: () => { this.actionId = null; this.load(); },
            error: error => { this.actionId = null; this.error = getApiErrorMessage(error, 'No se ha podido resolver la solicitud.'); }
        });
    }

    unblock(relationship: CommunityRelationship): void {
        if (this.actionId !== null || !window.confirm(`¿Quieres desbloquear a ${relationship.Usuario.Nombre}?`)) return;
        this.actionId = relationship.Usuario.Id;
        this.community.unblockUser(relationship.Usuario.Id).subscribe({
            next: () => { this.actionId = null; this.load(); },
            error: error => { this.actionId = null; this.error = getApiErrorMessage(error, 'No se ha podido desbloquear este perfil.'); }
        });
    }

    private loadPage(afterId: number | undefined, append: boolean): void {
        if (this.view === 'recibidas' || this.view === 'enviadas') {
            this.community.friendRequests(this.view, afterId).subscribe({
                next: page => {
                    this.requests = append ? this.mergeById(this.requests, page.Solicitudes) : page.Solicitudes;
                    this.nextAfterId = page.SiguienteAfterId;
                    this.finishLoading();
                },
                error: error => this.failLoading(error)
            });
            return;
        }

        this.community.relationships(this.view, afterId).subscribe({
            next: page => {
                this.relationships = append ? this.mergeRelationships(this.relationships, page.Relaciones) : page.Relaciones;
                this.nextAfterId = page.SiguienteAfterId;
                this.finishLoading();
            },
            error: error => this.failLoading(error)
        });
    }

    private finishLoading(): void {
        this.isLoading = false;
        this.isLoadingMore = false;
    }

    private failLoading(error: unknown): void {
        this.error = getApiErrorMessage(error, 'No se ha podido cargar esta relación.');
        this.finishLoading();
    }

    private mergeById<T extends { Id: number }>(current: T[], incoming: T[]): T[] {
        const ids = new Set(current.map(item => item.Id));
        return [...current, ...incoming.filter(item => !ids.has(item.Id))];
    }

    private mergeRelationships(current: CommunityRelationship[], incoming: CommunityRelationship[]): CommunityRelationship[] {
        const userIds = new Set(current.map(item => item.Usuario.Id));
        return [...current, ...incoming.filter(item => !userIds.has(item.Usuario.Id))];
    }
}
