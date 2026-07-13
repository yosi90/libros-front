import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommunityRelationshipStatus, CommunityUser } from '../../../../interfaces/community';
import { CommunityService } from '../../../../services/entities/community.service';
import { ChatService } from '../../../../services/entities/chat.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { DirectEligibility } from '../../../../interfaces/chat';
import { SessionService } from '../../../../services/auth/session.service';

@Component({
    standalone: true,
    selector: 'app-community-profile',
    imports: [NgIf, MatIconModule, RouterLink],
    templateUrl: './community-profile.component.html',
    styleUrl: './community-profile.component.sass'
})
export class CommunityProfileComponent implements OnInit {
    user: CommunityUser | null = null;
    relationship: CommunityRelationshipStatus | null = null;
    directEligibility: DirectEligibility | null = null;
    isLoading = true;
    actionPending = false;
    error = '';
    actionMessage = '';
    private userId = 0;

    constructor(private route: ActivatedRoute, private router: Router, private community: CommunityService, private chat: ChatService, private session: SessionService) { }

    ngOnInit(): void {
        this.userId = Number(this.route.snapshot.paramMap.get('id'));
        if (!Number.isInteger(this.userId) || this.userId < 1) {
            this.isLoading = false;
            this.error = 'El perfil solicitado no es válido.';
            return;
        }
        if (this.userId === this.session.userId) {
            void this.router.navigate(['/dashboard/profile']);
            return;
        }
        this.load();
    }

    load(): void {
        this.isLoading = true;
        this.error = '';
        this.actionMessage = '';
        this.community.user(this.userId).subscribe({
            next: user => {
                this.user = user;
                this.isLoading = false;
                this.loadRelationship();
                this.loadDirectEligibility();
            },
            error: () => {
                this.user = null;
                this.isLoading = false;
                this.error = 'Este perfil no está disponible.';
            }
        });
    }

    get displayName(): string { return this.user?.DisplayName || this.user?.Nombre || ''; }
    get canInteract(): boolean { return this.relationship?.PuedeInteractuar === true; }
    get isFollowing(): boolean { return this.relationship?.Siguiendo === true; }
    get friendshipLabel(): string {
        if (this.relationship?.Amistad) return 'Sois amistades';
        if (this.relationship?.SolicitudPendiente?.Direccion === 'enviada') return 'Solicitud enviada';
        if (this.relationship?.SolicitudPendiente?.Direccion === 'recibida') return 'Solicitud recibida';
        return 'Solicitar amistad';
    }

    toggleFollow(): void {
        if (!this.user || !this.canInteract || this.actionPending) return;
        this.runAction(this.isFollowing ? this.community.unfollowUser(this.user.Id) : this.community.followUser(this.user.Id), this.isFollowing ? 'Ya no sigues este perfil.' : 'Ahora sigues este perfil.');
    }

    requestFriendship(): void {
        if (!this.user || !this.canInteract || this.actionPending || this.relationship?.Amistad || this.relationship?.SolicitudPendiente) return;
        this.runAction(this.community.requestFriendship(this.user.Id), 'Solicitud de amistad enviada.');
    }

    block(): void {
        if (!this.user || this.actionPending || !window.confirm(`¿Quieres bloquear a ${this.displayName}?`)) return;
        this.actionPending = true;
        this.community.blockUser(this.user.Id).subscribe({
            next: () => void this.router.navigate(['/dashboard/community']),
            error: error => { this.actionMessage = getApiErrorMessage(error, 'No se ha podido bloquear este perfil.'); this.actionPending = false; }
        });
    }

    openDirect(): void {
        if (!this.user || !this.directEligibility?.PuedeIniciarDirecto || this.actionPending) return;
        this.actionPending = true;
        this.chat.createDirectConversation(this.user.Id).subscribe({
            next: id => void this.router.navigate(['/dashboard/chat', id]),
            error: error => { this.actionMessage = getApiErrorMessage(error, 'El acceso al chat ha cambiado.'); this.actionPending = false; this.loadDirectEligibility(); }
        });
    }

    directUnavailable(): string {
        const labels: Record<DirectEligibility['Motivo'], string> = {
            friendship: 'Chat disponible.', following: 'Chat disponible.', follow_required: 'Debes seguir a esta persona.', messages_disabled: 'No acepta mensajes.', blocked_or_unavailable: 'Chat no disponible.', same_user: 'No puedes abrir un chat contigo.'
        };
        return this.directEligibility ? labels[this.directEligibility.Motivo] : 'Comprobando disponibilidad de chat…';
    }

    private runAction(request: ReturnType<CommunityService['followUser']>, success: string): void {
        this.actionPending = true;
        this.actionMessage = '';
        request.subscribe({
            next: () => { this.actionPending = false; this.actionMessage = success; this.loadRelationship(); this.loadDirectEligibility(); },
            error: error => { this.actionPending = false; this.actionMessage = getApiErrorMessage(error, 'No se ha podido actualizar la relación.'); this.loadRelationship(); }
        });
    }

    private loadRelationship(): void {
        this.community.relationship(this.userId).subscribe({ next: relationship => this.relationship = relationship, error: () => this.relationship = null });
    }

    private loadDirectEligibility(): void {
        this.chat.directEligibility(this.userId).subscribe({ next: eligibility => this.directEligibility = eligibility, error: () => this.directEligibility = null });
    }
}
