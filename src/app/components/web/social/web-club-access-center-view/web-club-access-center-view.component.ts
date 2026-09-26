import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { ClubAccessCenterComponent } from '../../../shared/user-pages/community/club-access-center/club-access-center.component';

@Component({
    selector: 'app-web-club-access-center-view',
    standalone: true,
    imports: [DatePipe, FormsModule, MatIconModule, RouterLink],
    templateUrl: './web-club-access-center-view.component.html',
    styleUrl: './web-club-access-center-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebClubAccessCenterViewComponent {
    @Input({ required: true }) controller!: ClubAccessCenterComponent;
    get c(): ClubAccessCenterComponent { return this.controller; }
}
