import { fakeAsync, tick } from '@angular/core/testing';
import { AppToast } from './app-toast';
import { AppToastHostComponent } from './app-toast-host.component';
import { AppToastService } from './app-toast.service';

describe('AppToastHostComponent', () => {
    it('executes and closes an actionable toast', () => {
        const { component, toastService, toast } = createHost({ action: { label: 'Abrir', execute: jasmine.createSpy('execute') } });

        component.executeAction(new Event('click'), toast);

        expect(toast.action?.execute).toHaveBeenCalled();
        let current: AppToast[] = [];
        toastService.toasts$.subscribe(value => current = value);
        expect(current).toEqual([]);
    });

    it('retira el toast tras arrastrarlo hacia abajo', fakeAsync(() => {
        const { component, toastService, toast } = createHost();
        const element = gestureElement();

        component.startDrag(pointerEvent(1, 200, element), toast);
        component.moveDrag(pointerEvent(1, 276, element));
        component.finishDrag(pointerEvent(1, 276, element), toast);

        expect(component.motionFor(toast.id).phase).toBe('dismiss-down');
        tick(240);
        let current: AppToast[] = [];
        toastService.toasts$.subscribe(value => current = value);
        expect(current).toEqual([]);
    }));

    it('cancela un gesto corto y conserva el toast', fakeAsync(() => {
        const { component, toastService, toast } = createHost();
        const element = gestureElement();

        component.startDrag(pointerEvent(2, 200, element), toast);
        component.moveDrag(pointerEvent(2, 170, element));
        component.finishDrag(pointerEvent(2, 170, element), toast);

        expect(component.motionFor(toast.id).phase).toBe('returning');
        tick(220);
        let current: AppToast[] = [];
        toastService.toasts$.subscribe(value => current = value);
        expect(current.length).toBe(1);
        component.ngOnDestroy();
    }));

    it('retira también un arrastre ascendente suficiente (ya no hay campana propia a la que entregarlo)', fakeAsync(() => {
        const { component, toastService, toast } = createHost();
        const element = gestureElement();

        component.startDrag(pointerEvent(3, 600, element), toast);
        component.moveDrag(pointerEvent(3, 520, element));
        component.cancelDrag(pointerEvent(3, 520, element), toast);

        expect(component.motionFor(toast.id).phase).toBe('dismiss-up');
        tick(240);
        let current: AppToast[] = [];
        toastService.toasts$.subscribe(value => current = value);
        expect(current).toEqual([]);
    }));
});

function createHost(options: Partial<AppToast> = {}): { component: AppToastHostComponent; toastService: AppToastService; toast: AppToast } {
    const toastService = new AppToastService();
    let toast!: AppToast;
    toastService.toasts$.subscribe(items => { if (items[0]) toast = items[0]; });
    toastService.showInfo('Aviso de prueba', { durationMs: 3000, dedupeKey: 'test:gesture', action: options.action });
    const presentation = { snapshot: { isMobilePresentationActive: true } };
    return { component: new AppToastHostComponent(toastService, presentation as never), toastService, toast };
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
