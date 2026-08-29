import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ClubAccessCenterComponent } from '../../../shared/user-pages/community/club-access-center/club-access-center.component';
import type { CommunityComponent } from '../../../shared/user-pages/community/community.component';

@Component({
    selector: 'app-mobile-community-view',
    standalone: true,
    imports: [DatePipe, FormsModule, MatIconModule, RouterLink, ClubAccessCenterComponent],
    templateUrl: './mobile-community-view.component.html',
    styleUrl: './mobile-community-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileCommunityViewComponent {
    @Input({ required: true }) controller!: CommunityComponent;
    get c(): CommunityComponent { return this.controller; }
}
