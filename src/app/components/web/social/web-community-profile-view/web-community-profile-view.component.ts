import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { CommunityProfileComponent } from '../../../shared/user-pages/community-profile/community-profile.component';

@Component({
    selector: 'app-web-community-profile-view',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './web-community-profile-view.component.html',
    styleUrl: './web-community-profile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebCommunityProfileViewComponent {
    @Input({ required: true }) controller!: CommunityProfileComponent;
    get c(): CommunityProfileComponent { return this.controller; }

    initial(name: string | null | undefined): string {
        return (name ?? '').trim().charAt(0).toUpperCase() || '?';
    }
}
