import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ClubAccessCenterComponent } from '../../../shared/user-pages/community/club-access-center/club-access-center.component';
import type { CommunityComponent } from '../../../shared/user-pages/community/community.component';

const audienceLabels: Record<string, string> = {
    publico: 'Público',
    seguidores: 'Seguidores',
    amigos: 'Amigos',
    club: 'Club'
};

/**
 * Vista Web de Comunidad (Personas, Actividad y Clubes). Consume el mismo
 * controlador que Mobile; la publicación nueva se escribe en un diálogo.
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

    audienceLabel(audience: string): string {
        return audienceLabels[audience] ?? audience;
    }

    @HostListener('document:keydown.escape')
    closeComposerOnEscape(): void {
        if (this.c.composerOpen && !this.c.isPublishing)
            this.c.closeComposer();
    }
}
