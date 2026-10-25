import { StatRowsComponent } from '../../../shared/common/stat-rows/stat-rows.component';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { ClubDetailComponent } from '../../../shared/user-pages/club-detail/club-detail.component';
import { clubMilestoneTypeLabel, clubRoleLabel } from '../../../../shared/club-labels';
import { ChatConversationComponent } from '../../../shared/user-pages/chat-conversation/chat-conversation.component';

type ClubTab = 'readings' | 'chat' | 'debates' | 'publications' | 'polls' | 'calendar' | 'members';


/** Vista Web del club: cabecera, secciones en pestañas (con el chat del espacio) y columna con cifras y mi progreso. */
@Component({
    selector: 'app-web-club-detail-view',
    standalone: true,
    imports: [StatRowsComponent, DatePipe, FormsModule, MatIconModule, RouterLink, ChatConversationComponent],
    templateUrl: './web-club-detail-view.component.html',
    styleUrl: './web-club-detail-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebClubDetailViewComponent {
    @Input({ required: true }) controller!: ClubDetailComponent;
    get c(): ClubDetailComponent { return this.controller; }

    readonly tabs: ReadonlyArray<{ id: ClubTab; label: string; icon: string }> = [
        { id: 'readings', label: 'Lecturas', icon: 'collections_bookmark' },
        // La conversación del espacio del club, con la interfaz de chat de Libros.
        { id: 'chat', label: 'Chat', icon: 'chat' },
        { id: 'debates', label: 'Debates', icon: 'forum' },
        { id: 'publications', label: 'Publicaciones', icon: 'article' },
        { id: 'polls', label: 'Encuestas', icon: 'poll' },
        { id: 'calendar', label: 'Calendario', icon: 'calendar_month' },
        { id: 'members', label: 'Miembros', icon: 'groups' }
    ];
    activeTab: ClubTab = 'readings';

    initial(name: string | null | undefined): string {
        return (name ?? '').trim().charAt(0).toUpperCase() || '?';
    }

    roleLabel(role: string): string {
        return clubRoleLabel(role);
    }

    milestoneTypeLabel(type: string): string {
        return clubMilestoneTypeLabel(type);
    }
}
