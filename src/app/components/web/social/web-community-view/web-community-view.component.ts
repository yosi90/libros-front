import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ClubAccessCenterComponent } from '../../../shared/user-pages/community/club-access-center/club-access-center.component';
import { clubMembershipLabel, clubRoleLabel } from '../../../../shared/club-labels';
import type { CommunityComponent } from '../../../shared/user-pages/community/community.component';

export { clubRoleLabels } from '../../../../shared/club-labels';

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
        return clubMembershipLabel(state);
    }

    roleLabel(role: string): string {
        return clubRoleLabel(role);
    }
}
