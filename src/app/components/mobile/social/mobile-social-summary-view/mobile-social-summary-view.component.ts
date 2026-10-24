import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { SocialSummaryComponent } from '../../../shared/user-pages/social-summary/social-summary.component';
import { YosiftwareMarkComponent } from '../../../shared/common/yosiftware-mark/yosiftware-mark.component';

@Component({
    selector: 'app-mobile-social-summary-view',
    standalone: true,
    imports: [MatIconModule, RouterLink, YosiftwareMarkComponent],
    templateUrl: './mobile-social-summary-view.component.html',
    styleUrl: './mobile-social-summary-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileSocialSummaryViewComponent {
    @Input({ required: true }) controller!: SocialSummaryComponent;
    get c(): SocialSummaryComponent { return this.controller; }
}
