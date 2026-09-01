import { fakeAsync, tick } from '@angular/core/testing';
import { MobileDashboardChromeComponent } from './mobile-dashboard-chrome.component';
import { MobileThemeService } from '../../../../services/ui/mobile-theme.service';
import { SessionNotificationStoreService } from '../../../../services/stores/session-notification-store.service';

describe('MobileDashboardChromeComponent', () => {
    it('keeps the More sheet mounted until its closing transition ends', fakeAsync(() => {
        const component = createComponent();
        const handle = jasmine.createSpyObj<HTMLElement>('handle', ['setPointerCapture', 'releasePointerCapture']);
        component.moreOpen = true;

        component.startMoreSheetDrag(pointerEvent(7, 100, handle));
        component.moveMoreSheetDrag(pointerEvent(7, 180, handle));
        component.finishMoreSheetDrag(pointerEvent(7, 180, handle));

        expect(component.moreOpen).toBeTrue();
        expect(component.moreSheetClosing).toBeTrue();
        tick(240);
        expect(component.moreOpen).toBeFalse();
        expect(component.moreSheetClosing).toBeFalse();
        expect(component.moreSheetDragOffset).toBe(0);
        expect(handle.setPointerCapture).toHaveBeenCalledOnceWith(7);
        expect(handle.releasePointerCapture).toHaveBeenCalledOnceWith(7);
    }));

    it('restores the sheet after a short drag', () => {
        const component = createComponent();
        const handle = jasmine.createSpyObj<HTMLElement>('handle', ['setPointerCapture', 'releasePointerCapture']);
        component.moreOpen = true;

        component.startMoreSheetDrag(pointerEvent(3, 100, handle));
        component.moveMoreSheetDrag(pointerEvent(3, 120, handle));
        component.finishMoreSheetDrag(pointerEvent(3, 120, handle));

        expect(component.moreOpen).toBeTrue();
        expect(component.moreSheetDragOffset).toBe(0);
    });

    it('keeps the sheet open when the drag handle is only tapped', () => {
        const component = createComponent();
        const handle = jasmine.createSpyObj<HTMLElement>('handle', ['setPointerCapture', 'releasePointerCapture']);
        component.moreOpen = true;

        component.startMoreSheetDrag(pointerEvent(5, 100, handle));
        component.finishMoreSheetDrag(pointerEvent(5, 100, handle));

        expect(component.moreOpen).toBeTrue();
        expect(component.moreSheetDragOffset).toBe(0);
    });
});

function createComponent(): MobileDashboardChromeComponent {
    const theme = jasmine.createSpyObj<MobileThemeService>('theme', ['initialize', 'toggle']);
    return new MobileDashboardChromeComponent(theme, new SessionNotificationStoreService());
}

function pointerEvent(pointerId: number, clientY: number, currentTarget: HTMLElement): PointerEvent {
    return { button: 0, pointerId, clientY, currentTarget } as unknown as PointerEvent;
}
