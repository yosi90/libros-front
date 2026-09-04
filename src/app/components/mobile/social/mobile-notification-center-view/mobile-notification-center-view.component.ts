import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { NotificationCenterComponent, NotificationCenterItem } from '../../../shared/common/notification-center/notification-center.component';

type NotificationSwipePhase = 'idle' | 'dragging' | 'returning' | 'dismissing';

interface NotificationSwipeMotion {
    phase: NotificationSwipePhase;
    offsetX: number;
}

@Component({
    selector: 'app-mobile-notification-center-view',
    standalone: true,
    imports: [AsyncPipe, DatePipe, MatIconModule],
    templateUrl: './mobile-notification-center-view.component.html',
    styleUrl: './mobile-notification-center-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileNotificationCenterViewComponent implements OnDestroy {
    @Input({ required: true }) controller!: NotificationCenterComponent;
    private readonly motions = new Map<string, NotificationSwipeMotion>();
    private readonly motionTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private activePointer: { id: number; itemKey: string; startX: number } | null = null;

    get c(): NotificationCenterComponent { return this.controller; }

    ngOnDestroy(): void { this.motionTimers.forEach(timer => clearTimeout(timer)); }

    motionFor(key: string): NotificationSwipeMotion {
        return this.motions.get(key) ?? { phase: 'idle', offsetX: 0 };
    }

    startSwipe(event: PointerEvent, item: NotificationCenterItem): void {
        if (event.button !== 0 || this.activePointer) return;
        this.activePointer = { id: event.pointerId, itemKey: item.key, startX: event.clientX };
        this.motions.set(item.key, { phase: 'dragging', offsetX: 0 });
        (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    }

    moveSwipe(event: PointerEvent): void {
        const active = this.activePointer;
        if (!active || active.id !== event.pointerId) return;
        const offsetX = Math.max(-160, Math.min(160, event.clientX - active.startX));
        this.motions.set(active.itemKey, { phase: 'dragging', offsetX });
    }

    finishSwipe(event: PointerEvent, item: NotificationCenterItem): void {
        if (!this.matchesActivePointer(event, item)) return;
        (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
        this.activePointer = null;
        this.settleSwipe(item, event.currentTarget as HTMLElement);
    }

    cancelSwipe(event: PointerEvent, item: NotificationCenterItem): void {
        if (!this.matchesActivePointer(event, item)) return;
        this.activePointer = null;
        this.settleSwipe(item, event.currentTarget as HTMLElement);
    }

    dismissImmediately(item: NotificationCenterItem): void {
        this.clearMotion(item.key);
        this.c.dismissItem(item);
    }

    private settleSwipe(item: NotificationCenterItem, element: HTMLElement): void {
        const offsetX = this.motionFor(item.key).offsetX;
        if (Math.abs(offsetX) >= 72) {
            const direction = offsetX < 0 ? -1 : 1;
            this.motions.set(item.key, { phase: 'dismissing', offsetX: direction * ((element?.clientWidth || 320) + 32) });
            this.setMotionTimer(item.key, 200, () => this.dismissImmediately(item));
            return;
        }
        this.motions.set(item.key, { phase: 'returning', offsetX: 0 });
        this.setMotionTimer(item.key, 200, () => this.motions.delete(item.key));
    }

    private matchesActivePointer(event: PointerEvent, item: NotificationCenterItem): boolean {
        return !!this.activePointer && this.activePointer.id === event.pointerId && this.activePointer.itemKey === item.key;
    }

    private setMotionTimer(key: string, delay: number, action: () => void): void {
        this.clearTimer(key);
        const timer = setTimeout(() => {
            this.motionTimers.delete(key);
            action();
        }, delay);
        this.motionTimers.set(key, timer);
    }

    private clearMotion(key: string): void {
        this.clearTimer(key);
        this.motions.delete(key);
    }

    private clearTimer(key: string): void {
        const timer = this.motionTimers.get(key);
        if (timer) clearTimeout(timer);
        this.motionTimers.delete(key);
    }
}
