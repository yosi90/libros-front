import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { ClubAccessCenterComponent } from '../../../shared/user-pages/community/club-access-center/club-access-center.component';

@Component({
    selector: 'app-mobile-club-access-center-view',
    standalone: true,
    imports: [DatePipe, FormsModule, MatIconModule, RouterLink],
    templateUrl: './mobile-club-access-center-view.component.html',
    styleUrl: './mobile-club-access-center-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileClubAccessCenterViewComponent {
    @Input({ required: true }) controller!: ClubAccessCenterComponent;
    get c(): ClubAccessCenterComponent { return this.controller; }
}
