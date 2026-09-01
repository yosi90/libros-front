import { MobileDashboardChromeComponent } from './mobile-dashboard-chrome.component';

describe('MobileDashboardChromeComponent', () => {
    it('closes the More sheet after dragging its handle down', () => {
        const component = new MobileDashboardChromeComponent();
        const handle = jasmine.createSpyObj<HTMLElement>('handle', ['setPointerCapture', 'releasePointerCapture']);
        component.moreOpen = true;

        component.startMoreSheetDrag(pointerEvent(7, 100, handle));
        component.moveMoreSheetDrag(pointerEvent(7, 180, handle));
        component.finishMoreSheetDrag(pointerEvent(7, 180, handle));

        expect(component.moreOpen).toBeFalse();
        expect(component.moreSheetDragOffset).toBe(0);
        expect(handle.setPointerCapture).toHaveBeenCalledOnceWith(7);
        expect(handle.releasePointerCapture).toHaveBeenCalledOnceWith(7);
    });

    it('restores the sheet after a short drag', () => {
        const component = new MobileDashboardChromeComponent();
        const handle = jasmine.createSpyObj<HTMLElement>('handle', ['setPointerCapture', 'releasePointerCapture']);
        component.moreOpen = true;

        component.startMoreSheetDrag(pointerEvent(3, 100, handle));
        component.moveMoreSheetDrag(pointerEvent(3, 120, handle));
        component.finishMoreSheetDrag(pointerEvent(3, 120, handle));

        expect(component.moreOpen).toBeTrue();
        expect(component.moreSheetDragOffset).toBe(0);
    });

    it('keeps the sheet open when the drag handle is only tapped', () => {
        const component = new MobileDashboardChromeComponent();
        const handle = jasmine.createSpyObj<HTMLElement>('handle', ['setPointerCapture', 'releasePointerCapture']);
        component.moreOpen = true;

        component.startMoreSheetDrag(pointerEvent(5, 100, handle));
        component.finishMoreSheetDrag(pointerEvent(5, 100, handle));

        expect(component.moreOpen).toBeTrue();
        expect(component.moreSheetDragOffset).toBe(0);
    });
});

function pointerEvent(pointerId: number, clientY: number, currentTarget: HTMLElement): PointerEvent {
    return { button: 0, pointerId, clientY, currentTarget } as unknown as PointerEvent;
}
