import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { SocialSummaryComponent } from '../../../shared/user-pages/social-summary/social-summary.component';

@Component({
    selector: 'app-mobile-social-summary-view',
    standalone: true,
    imports: [MatIconModule, RouterLink],
    templateUrl: './mobile-social-summary-view.component.html',
    styleUrl: './mobile-social-summary-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileSocialSummaryViewComponent {
    @Input({ required: true }) controller!: SocialSummaryComponent;
    get c(): SocialSummaryComponent { return this.controller; }
}
