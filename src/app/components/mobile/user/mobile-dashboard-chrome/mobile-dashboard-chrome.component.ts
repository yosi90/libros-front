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
    moreSheetDragOffset = 0;
    moreSheetDragging = false;
    private moreSheetPointerId: number | null = null;
    private moreSheetDragStartY = 0;
    private suppressMoreSheetHandleClick = false;

    get activeDestination(): MobileNavigationItem['id'] | null {
        return this.moreOpen ? 'more' : null;
    }

    toggleMore(): void {
        this.resetMoreSheetDrag();
        this.moreOpen = !this.moreOpen;
    }

    closeMore(): void {
        this.resetMoreSheetDrag();
        this.moreOpen = false;
    }

    startMoreSheetDrag(event: PointerEvent): void {
        if (event.button !== 0) return;
        this.moreSheetPointerId = event.pointerId;
        this.moreSheetDragStartY = event.clientY;
        this.moreSheetDragOffset = 0;
        this.moreSheetDragging = true;
        this.suppressMoreSheetHandleClick = false;
        (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    }

    moveMoreSheetDrag(event: PointerEvent): void {
        if (event.pointerId !== this.moreSheetPointerId) return;
        this.moreSheetDragOffset = Math.max(0, event.clientY - this.moreSheetDragStartY);
        if (this.moreSheetDragOffset > 4) this.suppressMoreSheetHandleClick = true;
    }

    finishMoreSheetDrag(event: PointerEvent): void {
        if (event.pointerId !== this.moreSheetPointerId) return;
        const shouldClose = this.moreSheetDragOffset >= 72;
        (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
        this.resetMoreSheetDrag(!shouldClose);
        if (shouldClose) this.moreOpen = false;
    }

    cancelMoreSheetDrag(event: PointerEvent): void {
        if (event.pointerId !== this.moreSheetPointerId) return;
        this.resetMoreSheetDrag();
    }

    activateMoreSheetHandle(): void {
        if (this.suppressMoreSheetHandleClick) {
            this.suppressMoreSheetHandleClick = false;
            return;
        }
        this.closeMore();
    }

    openChat(): void {
        this.closeMore();
        this.chatRequested.emit();
    }

    logout(): void {
        this.closeMore();
        this.logoutRequested.emit();
    }

    private resetMoreSheetDrag(preserveClickSuppression = false): void {
        this.moreSheetPointerId = null;
        this.moreSheetDragStartY = 0;
        this.moreSheetDragOffset = 0;
        this.moreSheetDragging = false;
        if (!preserveClickSuppression) this.suppressMoreSheetHandleClick = false;
    }
}
