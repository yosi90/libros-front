import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SwipeToCloseDirective } from './swipe-to-close.directive';

@Component({
    standalone: true,
    imports: [SwipeToCloseDirective],
    template: '<aside [swipeDirection]="direction" (appSwipeToClose)="closed = closed + 1"><input></aside>'
})
class HostComponent {
    direction: 'right' | 'left' = 'right';
    closed = 0;
}

describe('SwipeToCloseDirective', () => {
    let fixture: ComponentFixture<HostComponent>;
    let panel: HTMLElement;

    function pointer(type: string, x: number, y = 100, time = 0, pointerType = 'touch'): void {
        const event = new PointerEvent(type, { pointerId: 1, clientX: x, clientY: y, pointerType, bubbles: true });
        Object.defineProperty(event, 'timeStamp', { value: time });
        panel.dispatchEvent(event);
    }

    function render(direction: 'right' | 'left' = 'right'): void {
        fixture = TestBed.createComponent(HostComponent);
        fixture.componentInstance.direction = direction;
        fixture.detectChanges();
        panel = fixture.nativeElement.querySelector('aside');
    }

    beforeEach(() => render());

    it('closes when dragged far enough towards its edge', () => {
        pointer('pointerdown', 100, 100, 0);
        pointer('pointermove', 150, 102, 100);
        expect(panel.style.transform).toBe('translateX(50px)');
        pointer('pointermove', 220, 104, 400);
        pointer('pointerup', 220, 104, 400);

        expect(fixture.componentInstance.closed).toBe(1);
        expect(panel.style.transform).toBe('');
    });

    it('snaps back after a short drag', () => {
        pointer('pointerdown', 100, 100, 0);
        pointer('pointermove', 130, 100, 400);
        pointer('pointerup', 130, 100, 400);

        expect(fixture.componentInstance.closed).toBe(0);
        expect(panel.style.transform).toBe('');
    });

    it('leaves vertical scrolling and mouse drags alone', () => {
        pointer('pointerdown', 100, 100, 0);
        pointer('pointermove', 110, 200, 50);
        pointer('pointerup', 300, 200, 60);
        pointer('pointerdown', 100, 100, 0, 'mouse');
        pointer('pointermove', 300, 100, 50, 'mouse');
        pointer('pointerup', 300, 100, 60, 'mouse');

        expect(fixture.componentInstance.closed).toBe(0);
    });

    it('closes a left panel when dragged to the left', () => {
        render('left');
        pointer('pointerdown', 300, 100, 0);
        pointer('pointermove', 180, 100, 100);
        pointer('pointerup', 180, 100, 100);

        expect(fixture.componentInstance.closed).toBe(1);
    });
});
