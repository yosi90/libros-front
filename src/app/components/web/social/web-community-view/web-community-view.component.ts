import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ClubAccessCenterComponent } from '../../../shared/user-pages/community/club-access-center/club-access-center.component';
import type { CommunityComponent } from '../../../shared/user-pages/community/community.component';

// Las solicitudes pendientes son de la plataforma: `EstadoMembresia` ya no vale `solicitud_pendiente` (fase 4).
const membershipLabels: Record<string, string> = {
    disponible: 'puedes unirte',
    miembro: 'ya eres miembro'
};

export const clubRoleLabels: Record<string, string> = {
    propietario: 'Propietario',
    moderador: 'Moderador',
    miembro: 'Miembro'
};

/**
 * Vista Web de los clubes de Comunidad. Consume el mismo controlador que Mobile. Las personas y el muro general se
 * retiraron con la adhesión (son de la web social y de las novedades de la plataforma).
 */
@Component({
    selector: 'app-web-community-view',
    standalone: true,
    imports: [DatePipe, FormsModule, MatIconModule, RouterLink, ClubAccessCenterComponent],
    templateUrl: './web-community-view.component.html',
    styleUrl: './web-community-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebCommunityViewComponent {
    @Input({ required: true }) controller!: CommunityComponent;
    get c(): CommunityComponent { return this.controller; }

    initial(name: string | null | undefined): string {
        return (name ?? '').trim().charAt(0).toUpperCase() || '?';
    }

    membershipLabel(state: string): string {
        return membershipLabels[state] ?? state;
    }

    roleLabel(role: string): string {
        return clubRoleLabels[role] ?? role;
    }
}
