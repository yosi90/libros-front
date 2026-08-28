import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { User } from '../../../../interfaces/user';
import { MobileAppBarComponent } from '../../ui/mobile-app-bar/mobile-app-bar.component';
import { MobileNavigationComponent, MobileNavigationItem } from '../../ui/mobile-navigation/mobile-navigation.component';
import { NotificationBellComponent } from '../../../shared/common/notification-bell/notification-bell.component';

@Component({
    selector: 'app-mobile-dashboard-chrome',
    standalone: true,
    imports: [MatIconModule, RouterLink, RouterLinkActive, MobileAppBarComponent, MobileNavigationComponent, NotificationBellComponent],
    templateUrl: './mobile-dashboard-chrome.component.html',
    styleUrl: './mobile-dashboard-chrome.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileDashboardChromeComponent {
    @Input({ required: true }) title = '';
    @Input({ required: true }) user!: User;
    @Input({ required: true }) imageUrl = '';
    @Input() notificationsEnabled = false;
    @Input() communityEnabled = false;
    @Input() chatEnabled = false;
    @Output() imageError = new EventEmitter<Event>();
    @Output() chatRequested = new EventEmitter<void>();
    @Output() logoutRequested = new EventEmitter<void>();

    moreOpen = false;

    get activeDestination(): MobileNavigationItem['id'] | null {
        return this.moreOpen ? 'more' : null;
    }

    toggleMore(): void {
        this.moreOpen = !this.moreOpen;
    }

    closeMore(): void {
        this.moreOpen = false;
    }

    openChat(): void {
        this.closeMore();
        this.chatRequested.emit();
    }

    logout(): void {
        this.closeMore();
        this.logoutRequested.emit();
    }
}
