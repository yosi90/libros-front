import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { CommunityProfileComponent } from '../../../shared/user-pages/community-profile/community-profile.component';

@Component({
    selector: 'app-mobile-community-profile-view',
    standalone: true,
    imports: [MatIconModule, RouterLink],
    templateUrl: './mobile-community-profile-view.component.html',
    styleUrl: './mobile-community-profile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileCommunityProfileViewComponent {
    @Input({ required: true }) controller!: CommunityProfileComponent;
    get c(): CommunityProfileComponent { return this.controller; }
}
