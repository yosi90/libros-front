import { Directive, ElementRef, EventEmitter, HostListener, Input, Output, Renderer2 } from '@angular/core';

const START_THRESHOLD = 10;
const CLOSE_DISTANCE = 80;
const CLOSE_VELOCITY = 0.5;
const INTERACTIVE = 'input, textarea, select, [contenteditable="true"], .rtf-toolbar, .cdk-drag';

/**
 * Cierra un panel lateral arrastrándolo hacia el borde por el que entró.
 * Solo con dedo o lápiz: con ratón se usa el botón de cerrar. Un gesto
 * mayoritariamente vertical se deja al desplazamiento normal.
 */
@Directive({
    selector: '[appSwipeToClose]',
    standalone: true,
    host: { '[style.touch-action]': "'pan-y'" }
})
export class SwipeToCloseDirective {
    /** Borde por el que sale el panel: `right` (fichas) o `left` (índice). */
    @Input() swipeDirection: 'right' | 'left' = 'right';
    @Input() swipeDisabled = false;
    @Output() readonly appSwipeToClose = new EventEmitter<void>();

    private pointerId: number | null = null;
    private startX = 0;
    private startY = 0;
    private startTime = 0;
    private offset = 0;
    private dragging = false;

    constructor(private host: ElementRef<HTMLElement>, private renderer: Renderer2) { }

    @HostListener('pointerdown', ['$event'])
    start(event: PointerEvent): void {
        if (this.swipeDisabled || event.pointerType === 'mouse' || this.pointerId !== null) return;
        if ((event.target as HTMLElement | null)?.closest(INTERACTIVE)) return;
        this.pointerId = event.pointerId;
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.startTime = event.timeStamp;
        this.offset = 0;
        this.dragging = false;
    }

    @HostListener('pointermove', ['$event'])
    move(event: PointerEvent): void {
        if (event.pointerId !== this.pointerId) return;
        const dx = (event.clientX - this.startX) * (this.swipeDirection === 'right' ? 1 : -1);
        const dy = event.clientY - this.startY;
        if (!this.dragging) {
            if (Math.abs(dx) < START_THRESHOLD && Math.abs(dy) < START_THRESHOLD) return;
            // Vertical o hacia dentro: no es un gesto de cierre.
            if (Math.abs(dy) >= Math.abs(dx) || dx <= 0) {
                this.reset();
                return;
            }
            this.dragging = true;
            this.host.nativeElement.setPointerCapture?.(event.pointerId);
            this.renderer.setStyle(this.host.nativeElement, 'transition', 'none');
        }
        this.offset = Math.max(0, dx);
        this.applyOffset(this.offset);
    }

    @HostListener('pointerup', ['$event'])
    end(event: PointerEvent): void {
        if (event.pointerId !== this.pointerId) return;
        const wasDragging = this.dragging;
        const velocity = this.offset / Math.max(1, event.timeStamp - this.startTime);
        const shouldClose = wasDragging && (this.offset >= CLOSE_DISTANCE || velocity >= CLOSE_VELOCITY);
        this.reset();
        if (!wasDragging) return;
        // Al cerrar, el panel se destruye o su propia transición lo saca desde donde quedó.
        this.clearOffset();
        if (shouldClose) this.appSwipeToClose.emit();
    }

    @HostListener('pointercancel', ['$event'])
    cancel(event: PointerEvent): void {
        if (event.pointerId !== this.pointerId) return;
        const wasDragging = this.dragging;
        this.reset();
        if (wasDragging) this.clearOffset();
    }

    private applyOffset(offset: number): void {
        const sign = this.swipeDirection === 'right' ? 1 : -1;
        this.renderer.setStyle(this.host.nativeElement, 'transform', `translateX(${sign * offset}px)`);
    }

    private clearOffset(): void {
        this.renderer.removeStyle(this.host.nativeElement, 'transition');
        this.renderer.removeStyle(this.host.nativeElement, 'transform');
    }

    private reset(): void {
        this.pointerId = null;
        this.dragging = false;
    }
}
