import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { NotificationCenterComponent } from '../../../shared/common/notification-center/notification-center.component';

@Component({
    selector: 'app-mobile-notification-center-view',
    standalone: true,
    imports: [AsyncPipe, DatePipe, MatIconModule],
    templateUrl: './mobile-notification-center-view.component.html',
    styleUrl: './mobile-notification-center-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileNotificationCenterViewComponent {
    @Input({ required: true }) controller!: NotificationCenterComponent;
    get c(): NotificationCenterComponent { return this.controller; }
}
