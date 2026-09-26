import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { ClubDetailComponent } from '../../../shared/user-pages/club-detail/club-detail.component';
import { clubRoleLabels } from '../web-community-view/web-community-view.component';

type ClubTab = 'readings' | 'debates' | 'polls' | 'calendar' | 'members';

const milestoneTypeLabels: Record<string, string> = { pagina: 'Página', capitulo: 'Capítulo', evento: 'Evento' };

/** Vista Web del club: cabecera, secciones en pestañas y columna con cifras y mi progreso. */
@Component({
    selector: 'app-web-club-detail-view',
    standalone: true,
    imports: [DatePipe, FormsModule, MatIconModule, RouterLink],
    templateUrl: './web-club-detail-view.component.html',
    styleUrl: './web-club-detail-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebClubDetailViewComponent {
    @Input({ required: true }) controller!: ClubDetailComponent;
    get c(): ClubDetailComponent { return this.controller; }

    readonly tabs: ReadonlyArray<{ id: ClubTab; label: string; icon: string }> = [
        { id: 'readings', label: 'Lecturas', icon: 'collections_bookmark' },
        { id: 'debates', label: 'Debates', icon: 'forum' },
        { id: 'polls', label: 'Encuestas', icon: 'poll' },
        { id: 'calendar', label: 'Calendario', icon: 'calendar_month' },
        { id: 'members', label: 'Miembros', icon: 'groups' }
    ];
    activeTab: ClubTab = 'readings';

    initial(name: string | null | undefined): string {
        return (name ?? '').trim().charAt(0).toUpperCase() || '?';
    }

    roleLabel(role: string): string {
        return clubRoleLabels[role] ?? role;
    }

    milestoneTypeLabel(type: string): string {
        return milestoneTypeLabels[type] ?? type;
    }
}
