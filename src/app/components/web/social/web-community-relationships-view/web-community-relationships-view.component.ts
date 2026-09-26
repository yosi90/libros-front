import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { CommunityRelationshipsComponent } from '../../../shared/user-pages/community-relationships/community-relationships.component';

@Component({
    selector: 'app-web-community-relationships-view',
    standalone: true,
    imports: [DatePipe, MatIconModule, RouterLink],
    templateUrl: './web-community-relationships-view.component.html',
    styleUrl: './web-community-relationships-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebCommunityRelationshipsViewComponent {
    @Input({ required: true }) controller!: CommunityRelationshipsComponent;
    get c(): CommunityRelationshipsComponent { return this.controller; }

    initial(name: string | null | undefined): string {
        return (name ?? '').trim().charAt(0).toUpperCase() || '?';
    }
}
