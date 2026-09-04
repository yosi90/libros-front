import { fakeAsync, tick } from '@angular/core/testing';
import { NotificationCenterItem } from '../../../shared/common/notification-center/notification-center.component';
import { MobileNotificationCenterViewComponent } from './mobile-notification-center-view.component';

describe('MobileNotificationCenterViewComponent', () => {
    it('restaura una fila después de un gesto horizontal corto', fakeAsync(() => {
        const { component, controller, item, element } = createView();

        component.startSwipe(pointerEvent(1, 200, element), item);
        component.moveSwipe(pointerEvent(1, 296, element));
        component.finishSwipe(pointerEvent(1, 296, element), item);

        expect(component.motionFor(item.key)).toEqual({ phase: 'returning', offsetX: 0 });
        tick(200);
        expect(controller.dismissItem).not.toHaveBeenCalled();
    }));

    for (const direction of [-1, 1]) {
        it(`descarta una fila hacia ${direction < 0 ? 'la izquierda' : 'la derecha'}`, fakeAsync(() => {
            const { component, controller, item, element } = createView();

            component.startSwipe(pointerEvent(2, 200, element), item);
            component.moveSwipe(pointerEvent(2, 200 + direction * 128, element));
            component.finishSwipe(pointerEvent(2, 200 + direction * 128, element), item);

            expect(component.motionFor(item.key)).toEqual({ phase: 'dismissing', offsetX: direction * 352 });
            tick(200);
            expect(controller.dismissItem).toHaveBeenCalledOnceWith(item);
        }));
    }

    it('eleva el umbral en paneles anchos sin volverlo inalcanzable', () => {
        const { component, element } = createView();

        expect(component.dismissThreshold(element)).toBe(112);
        Object.defineProperty(element, 'clientWidth', { configurable: true, value: 600 });
        expect(component.dismissThreshold(element)).toBe(152);
    });
});

function createView(): {
    component: MobileNotificationCenterViewComponent;
    controller: { dismissItem: jasmine.Spy };
    item: NotificationCenterItem;
    element: HTMLElement;
} {
    const controller = { dismissItem: jasmine.createSpy('dismissItem') };
    const component = new MobileNotificationCenterViewComponent();
    component.controller = controller as never;
    const item: NotificationCenterItem = {
        key: 'session:test', kind: 'session', title: 'Aviso', message: 'Mensaje', occurredAt: 1,
        repeatCount: 1, unread: true, icon: 'info', actionLabel: null
    };
    const element = document.createElement('article');
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 320 });
    element.setPointerCapture = jasmine.createSpy('setPointerCapture');
    element.releasePointerCapture = jasmine.createSpy('releasePointerCapture');
    return { component, controller, item, element };
}

function pointerEvent(pointerId: number, clientX: number, currentTarget: HTMLElement): PointerEvent {
    return { button: 0, pointerId, clientX, currentTarget } as unknown as PointerEvent;
}
