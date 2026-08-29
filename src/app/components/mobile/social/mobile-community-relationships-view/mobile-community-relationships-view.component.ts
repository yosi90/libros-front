import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { CommunityRelationshipsComponent } from '../../../shared/user-pages/community-relationships/community-relationships.component';

@Component({
    selector: 'app-mobile-community-relationships-view',
    standalone: true,
    imports: [DatePipe, MatIconModule, RouterLink],
    templateUrl: './mobile-community-relationships-view.component.html',
    styleUrl: './mobile-community-relationships-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileCommunityRelationshipsViewComponent {
    @Input({ required: true }) controller!: CommunityRelationshipsComponent;
    get c(): CommunityRelationshipsComponent { return this.controller; }
}
