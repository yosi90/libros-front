import { AsyncPipe } from '@angular/common';
import { Component, ElementRef, HostBinding, HostListener, Input, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationStart, Router } from '@angular/router';
import { combineLatest, map, Subscription } from 'rxjs';
import { NotificationStoreService } from '../../../../services/stores/notification-store.service';
import { SessionNotificationStoreService } from '../../../../services/stores/session-notification-store.service';
import { NotificationCenterComponent } from '../notification-center/notification-center.component';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';

@Component({
    standalone: true,
    selector: 'app-notification-bell',
    imports: [AsyncPipe, MatIconModule, MatTooltipModule, NotificationCenterComponent],
    templateUrl: './notification-bell.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './notification-bell.component.sass'
})
export class NotificationBellComponent implements OnInit, OnDestroy {
    @Input() placement: 'sidebar' | 'navbar' = 'sidebar';
    @ViewChild('trigger', { read: ElementRef }) private trigger?: ElementRef<HTMLElement>;
    @ViewChild(NotificationCenterComponent, { read: ElementRef }) private center?: ElementRef<HTMLElement>;
    open = false;
    anchor = { left: 12, top: 12, originX: 0, originY: 0 };
    readonly hasUnread$ = combineLatest([this.notifications.state$, this.sessionNotifications.notices$]).pipe(map(([state, notices]) => state.NoLeidas > 0 || notices.some(item => !item.seen)));
    readonly toastDelivery$ = this.sessionNotifications.toastDelivery$;
    private readonly lifecycle = new Subscription();
    private distanceTimer: ReturnType<typeof setTimeout> | null = null;

    @HostBinding('class.notification-bell--navbar') get navbarClass(): boolean { return this.placement === 'navbar'; }

    constructor(private element: ElementRef<HTMLElement>, private notifications: NotificationStoreService, private sessionNotifications: SessionNotificationStoreService, router: Router, private adaptiveLayout: AdaptiveLayoutService) {
        this.lifecycle.add(router.events.subscribe(event => { if (event instanceof NavigationStart) this.close(); }));
    }

    ngOnInit(): void { this.notifications.initialize(); }
    ngOnDestroy(): void { this.lifecycle.unsubscribe(); this.cancelDistanceClose(); }

    toggle(): void {
        if (this.open) { this.close(); return; }
        if (!this.trigger) return;
        const triggerRect = this.trigger.nativeElement.getBoundingClientRect();
        this.anchor = this.resolveAnchor(triggerRect);
        this.open = true;
        this.sessionNotifications.markAllSeen();
        requestAnimationFrame(() => this.adjustVerticalAnchor(triggerRect));
    }

    close(): void { this.open = false; this.cancelDistanceClose(); }

    @HostListener('document:pointerdown', ['$event']) onDocumentPointerDown(event: Event): void {
        if (this.open && !this.element.nativeElement.contains(event.target as Node)) this.close();
    }

    @HostListener('document:keydown.escape') onEscape(): void { if (this.open) this.close(); }

    @HostListener('document:pointermove', ['$event']) onPointerMove(event: PointerEvent): void {
        if (!this.open || !this.adaptiveLayout.snapshot.hasFinePointer) return;
        const rects = [this.trigger?.nativeElement.getBoundingClientRect(), this.center?.nativeElement.getBoundingClientRect()].filter((rect): rect is DOMRect => !!rect);
        const distance = Math.min(...rects.map(rect => this.distanceToRect(event.clientX, event.clientY, rect)));
        if (distance <= 120) this.cancelDistanceClose();
        else if (!this.distanceTimer) this.distanceTimer = setTimeout(() => this.close(), 600);
    }

    private resolveAnchor(rect: DOMRect): { left: number; top: number; originX: number; originY: number } {
        const viewportWidth = this.adaptiveLayout.snapshot.width;
        const width = Math.min(430, viewportWidth - 24);
        const left = Math.max(12, Math.min(this.placement === 'navbar' ? rect.right - width : rect.right + 17, viewportWidth - width - 12));
        const top = Math.max(12, this.placement === 'navbar' ? rect.bottom + 8 : rect.top);
        return { left, top, originX: rect.left + rect.width / 2 - left, originY: rect.top + rect.height / 2 - top };
    }

    private adjustVerticalAnchor(triggerRect: DOMRect): void {
        const panelHeight = this.center?.nativeElement.getBoundingClientRect().height;
        if (!this.open || !panelHeight || this.anchor.top + panelHeight <= this.adaptiveLayout.snapshot.height - 12) return;
        const top = Math.max(12, this.placement === 'navbar' ? triggerRect.top - panelHeight - 8 : triggerRect.bottom - panelHeight);
        this.anchor = { ...this.anchor, top, originY: triggerRect.top + triggerRect.height / 2 - top };
    }

    private distanceToRect(x: number, y: number, rect: DOMRect): number {
        const dx = Math.max(rect.left - x, 0, x - rect.right);
        const dy = Math.max(rect.top - y, 0, y - rect.bottom);
        return Math.hypot(dx, dy);
    }

    private cancelDistanceClose(): void { if (this.distanceTimer) clearTimeout(this.distanceTimer); this.distanceTimer = null; }
}
