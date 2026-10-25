import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import type { CommunityActivityComponent } from '../../../shared/user-pages/community-activity/community-activity.component';
import { YosiftwareMarkComponent } from '../../../shared/common/yosiftware-mark/yosiftware-mark.component';

/** Vista Mobile de la Actividad de Comunidad. Consume el controlador compartido. */
@Component({
    selector: 'app-mobile-community-activity-view',
    standalone: true,
    imports: [DatePipe, NgTemplateOutlet, FormsModule, MatIconModule, YosiftwareMarkComponent],
    templateUrl: './mobile-community-activity-view.component.html',
    styleUrl: './mobile-community-activity-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileCommunityActivityViewComponent {
    @Input({ required: true }) controller!: CommunityActivityComponent;
    get c(): CommunityActivityComponent { return this.controller; }
}
