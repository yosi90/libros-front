import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { User } from '../../../../interfaces/user';
import { MobileAppBarComponent } from '../../ui/mobile-app-bar/mobile-app-bar.component';
import { MobileNavigationComponent, MobileNavigationItem } from '../../ui/mobile-navigation/mobile-navigation.component';
import { MobileThemeService } from '../../../../services/ui/mobile-theme.service';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';
import { YosiftwareAccountComponent } from '../../../shared/common/yosiftware-account/yosiftware-account.component';
import { YosiftwareNotificationsComponent } from '../../../shared/common/yosiftware-notifications/yosiftware-notifications.component';
import { YosiftwareWebsComponent } from '../../../shared/common/yosiftware-webs/yosiftware-webs.component';

@Component({
    selector: 'app-mobile-dashboard-chrome',
    standalone: true,
    imports: [MatIconModule, RouterLink, RouterLinkActive, MobileAppBarComponent, MobileNavigationComponent, YosiftwareAccountComponent, YosiftwareNotificationsComponent, YosiftwareWebsComponent],
    templateUrl: './mobile-dashboard-chrome.component.html',
    styleUrl: './mobile-dashboard-chrome.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileDashboardChromeComponent implements OnDestroy {
    @Input({ required: true }) title = '';
    @Input({ required: true }) user!: User;
    @Input({ required: true }) imageUrl = '';
    @Input() communityEnabled = false;
    @Input() chatEnabled = false;
    @Input() unreadChatCount = 0;
    @Output() imageError = new EventEmitter<Event>();
    @Output() chatRequested = new EventEmitter<void>();

    moreOpen = false;
    moreSheetDragOffset = 0;
    moreSheetDragging = false;
    moreSheetClosing = false;
    private moreSheetPointerId: number | null = null;
    private moreSheetDragStartY = 0;
    private moreSheetCloseTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        readonly mobileTheme: MobileThemeService,
        readonly layout: AdaptiveLayoutService
    ) {
        this.mobileTheme.initialize();
    }

    ngOnDestroy(): void {
        if (this.moreSheetCloseTimer) clearTimeout(this.moreSheetCloseTimer);
    }

    get initial(): string {
        return (this.user?.name || '?').trim().charAt(0).toLocaleUpperCase();
    }

    get activeDestination(): MobileNavigationItem['id'] | null {
        return this.moreOpen ? 'more' : null;
    }

    toggleMore(): void {
        if (this.moreSheetClosing) return;
        if (this.moreOpen) {
            this.closeMore();
            return;
        }
        this.resetMoreSheetDrag();
        this.moreOpen = true;
    }

    closeMore(): void {
        if (!this.moreOpen || this.moreSheetClosing) return;
        this.resetMoreSheetDrag();
        this.moreSheetClosing = true;
        const duration = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 80 : 240;
        this.moreSheetCloseTimer = setTimeout(() => {
            this.moreSheetCloseTimer = null;
            this.moreOpen = false;
            this.moreSheetClosing = false;
        }, duration);
    }

    startMoreSheetDrag(event: PointerEvent): void {
        if (this.moreSheetClosing || event.button !== 0) return;
        this.moreSheetPointerId = event.pointerId;
        this.moreSheetDragStartY = event.clientY;
        this.moreSheetDragOffset = 0;
        this.moreSheetDragging = true;
        (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    }

    moveMoreSheetDrag(event: PointerEvent): void {
        if (event.pointerId !== this.moreSheetPointerId) return;
        this.moreSheetDragOffset = Math.max(0, event.clientY - this.moreSheetDragStartY);
    }

    finishMoreSheetDrag(event: PointerEvent): void {
        if (event.pointerId !== this.moreSheetPointerId) return;
        const shouldClose = this.moreSheetDragOffset >= 72;
        (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
        this.resetMoreSheetDrag();
        if (shouldClose) this.closeMore();
    }

    cancelMoreSheetDrag(event: PointerEvent): void {
        if (event.pointerId !== this.moreSheetPointerId) return;
        this.resetMoreSheetDrag();
    }

    openChat(): void {
        this.closeMore();
        this.chatRequested.emit();
    }

    private resetMoreSheetDrag(): void {
        this.moreSheetPointerId = null;
        this.moreSheetDragStartY = 0;
        this.moreSheetDragOffset = 0;
        this.moreSheetDragging = false;
    }
}
