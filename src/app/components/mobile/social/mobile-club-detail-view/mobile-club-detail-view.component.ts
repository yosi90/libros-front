import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { ClubDetailComponent } from '../../../shared/user-pages/club-detail/club-detail.component';

@Component({
    selector: 'app-mobile-club-detail-view',
    standalone: true,
    imports: [DatePipe, FormsModule, MatIconModule, RouterLink],
    templateUrl: './mobile-club-detail-view.component.html',
    styleUrl: './mobile-club-detail-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileClubDetailViewComponent {
    @Input({ required: true }) controller!: ClubDetailComponent;
    get c(): ClubDetailComponent { return this.controller; }
}
