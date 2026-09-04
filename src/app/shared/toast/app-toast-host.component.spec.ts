import { fakeAsync, tick } from '@angular/core/testing';
import { AppToast } from './app-toast';
import { AppToastHostComponent } from './app-toast-host.component';
import { AppToastService } from './app-toast.service';
import { SessionNotificationStoreService, ToastDeliveryState } from '../../services/stores/session-notification-store.service';

describe('AppToastHostComponent', () => {
    beforeEach(() => sessionStorage.clear());

    it('marca como leído y retira el toast tras arrastrarlo hacia abajo', fakeAsync(() => {
        const { component, toastService, session, toast } = createHost();
        const element = gestureElement();

        component.startDrag(pointerEvent(1, 200, element), toast);
        component.moveDrag(pointerEvent(1, 276, element));
        component.finishDrag(pointerEvent(1, 276, element), toast);

        expect(session.notices[0].seen).toBeTrue();
        expect(component.motionFor(toast.id).phase).toBe('dismiss-down');
        tick(240);
        let current: AppToast[] = [];
        toastService.toasts$.subscribe(value => current = value);
        expect(current).toEqual([]);
    }));

    it('cancela un gesto corto y conserva el toast y su estado no leído', fakeAsync(() => {
        const { component, session, toast } = createHost();
        const deliveries: ToastDeliveryState[] = [];
        session.toastDelivery$.subscribe(value => deliveries.push(value));
        const element = gestureElement();

        component.startDrag(pointerEvent(2, 200, element), toast);
        component.moveDrag(pointerEvent(2, 170, element));
        component.finishDrag(pointerEvent(2, 170, element), toast);

        expect(component.motionFor(toast.id).phase).toBe('returning');
        expect(deliveries.at(-1)).toEqual({ requested: false, cue: 'idle' });
        expect(session.notices[0].seen).toBeFalse();
        tick(220);
    }));

    it('entrega a la campana un arrastre ascendente y conserva el aviso no leído', fakeAsync(() => {
        const { component, toastService, session, toast } = createHost();
        const target = document.createElement('button');
        target.dataset['toastDropTarget'] = 'true';
        spyOn(target, 'getBoundingClientRect').and.returnValue(domRect(320, 20, 48, 48));
        document.body.appendChild(target);
        const element = gestureElement();
        spyOn(element, 'getBoundingClientRect').and.returnValue(domRect(20, 520, 320, 64));

        component.startDrag(pointerEvent(3, 600, element), toast);
        component.moveDrag(pointerEvent(3, 520, element));
        component.finishDrag(pointerEvent(3, 520, element), toast);
        tick(16);

        expect(component.motionFor(toast.id).phase).toBe('deliver-up');
        expect(component.motionFor(toast.id).offsetX).toBe(164);
        expect(component.motionFor(toast.id).offsetY).toBe(-588);
        expect(session.notices[0].seen).toBeFalse();
        let delivery: ToastDeliveryState = { requested: false, cue: 'idle' };
        session.toastDelivery$.subscribe(value => delivery = value);
        expect(delivery).toEqual({ requested: true, cue: 'received' });
        tick(240);
        let current: AppToast[] = [];
        toastService.toasts$.subscribe(value => current = value);
        expect(current).toEqual([]);
        target.remove();
        component.ngOnDestroy();
    }));

    it('permite arrastrar el toast hasta la campana sin limitarlo a 144 px', () => {
        const { component, toast } = createHost();
        const target = document.createElement('button');
        target.dataset['toastDropTarget'] = 'true';
        spyOn(target, 'getBoundingClientRect').and.returnValue(domRect(320, 20, 48, 48));
        document.body.appendChild(target);
        const element = gestureElement();
        spyOn(element, 'getBoundingClientRect').and.returnValue(domRect(20, 600, 320, 64));

        component.startDrag(pointerEvent(4, 620, element), toast);
        component.moveDrag(pointerEvent(4, 120, element));

        expect(component.motionFor(toast.id).offsetY).toBe(-500);
        target.remove();
        component.ngOnDestroy();
    });

    it('completa un gesto ascendente suficiente aunque Android emita pointercancel', fakeAsync(() => {
        const { component, session, toast } = createHost();
        const target = document.createElement('button');
        target.dataset['toastDropTarget'] = 'true';
        spyOn(target, 'getBoundingClientRect').and.returnValue(domRect(320, 20, 48, 48));
        document.body.appendChild(target);
        const element = gestureElement();
        spyOn(element, 'getBoundingClientRect').and.returnValue(domRect(20, 600, 320, 64));

        component.startDrag(pointerEvent(5, 620, element), toast);
        component.moveDrag(pointerEvent(5, 500, element));
        component.cancelDrag(pointerEvent(5, 500, element), toast);
        tick(16);

        expect(component.motionFor(toast.id).phase).toBe('deliver-up');
        expect(session.notices[0].seen).toBeFalse();
        target.remove();
        component.ngOnDestroy();
    }));
});

function createHost(): { component: AppToastHostComponent; toastService: AppToastService; session: SessionNotificationStoreService; toast: AppToast } {
    const session = new SessionNotificationStoreService();
    const toastService = new AppToastService(session);
    let toast!: AppToast;
    toastService.toasts$.subscribe(items => { if (items[0]) toast = items[0]; });
    toastService.showInfo('Aviso de prueba', { durationMs: 3000, dedupeKey: 'test:gesture' });
    const presentation = { snapshot: { isMobilePresentationActive: true } };
    return { component: new AppToastHostComponent(toastService, session, presentation as never), toastService, session, toast };
}

function gestureElement(): HTMLElement {
    const element = document.createElement('div');
    element.setPointerCapture = jasmine.createSpy('setPointerCapture');
    element.releasePointerCapture = jasmine.createSpy('releasePointerCapture');
    return element;
}

function pointerEvent(pointerId: number, clientY: number, currentTarget: HTMLElement): PointerEvent {
    return { button: 0, pointerId, clientY, currentTarget } as unknown as PointerEvent;
}

function domRect(left: number, top: number, width: number, height: number): DOMRect {
    return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}
