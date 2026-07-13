import { Component, EventEmitter, HostListener, Input, OnChanges, Output } from '@angular/core';
import { NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FLOATING_WINDOW_MINIMIZED_HEIGHT, FLOATING_WINDOW_MINIMIZED_WIDTH, FloatingWindowMode, FloatingWindowPlacement } from '../../../../interfaces/floating-window';

@Component({
    standalone: true,
    selector: 'app-floating-window',
    imports: [MatIconModule, NgIf, NgStyle],
    templateUrl: './floating-window.component.html',
    styleUrl: './floating-window.component.sass'
})
export class FloatingWindowComponent implements OnChanges {
    @Input({ required: true }) title = '';
    @Input() mode: FloatingWindowMode = 'window';
    @Input() placement: FloatingWindowPlacement = { left: 80, top: 80, width: 640, height: 480 };
    @Input() zIndex = 1201;
    @Input() allowMinimize = true;
    @Output() windowChange = new EventEmitter<{ mode: FloatingWindowMode; placement: FloatingWindowPlacement }>();
    @Output() closed = new EventEmitter<void>();
    @Output() focused = new EventEmitter<void>();

    current: FloatingWindowPlacement = { ...this.placement };
    private interaction: { type: 'move' | 'resize'; pointerId: number; x: number; y: number; placement: FloatingWindowPlacement } | null = null;

    ngOnChanges(): void { this.current = this.clamp(this.placement); }

    get frameStyle(): Record<string, string | number> {
        if (this.mode === 'maximized') return { left: '12px', top: '12px', width: 'calc(100vw - 24px)', height: 'calc(100vh - 24px)', zIndex: this.zIndex };
        if (this.mode === 'minimized') return { left: `${this.current.left}px`, top: `${this.current.top}px`, width: `${FLOATING_WINDOW_MINIMIZED_WIDTH}px`, height: `${FLOATING_WINDOW_MINIMIZED_HEIGHT}px`, zIndex: this.zIndex };
        return { left: `${this.current.left}px`, top: `${this.current.top}px`, width: `${this.current.width}px`, height: `${this.current.height}px`, zIndex: this.zIndex };
    }

    startMove(event: PointerEvent): void {
        if (event.button !== 0 || this.mode === 'maximized') return;
        this.startInteraction(event, 'move');
    }

    startResize(event: PointerEvent): void {
        if (event.button !== 0 || this.mode !== 'window') return;
        this.startInteraction(event, 'resize');
    }

    onPointerMove(event: PointerEvent): void {
        if (!this.interaction || event.pointerId !== this.interaction.pointerId) return;
        const dx = event.clientX - this.interaction.x;
        const dy = event.clientY - this.interaction.y;
        const start = this.interaction.placement;
        this.current = this.interaction.type === 'move'
            ? this.clamp({ ...start, left: start.left + dx, top: start.top + dy })
            : this.clamp({ ...start, width: start.width + dx, height: start.height + dy });
    }

    endInteraction(event: PointerEvent): void {
        if (!this.interaction || event.pointerId !== this.interaction.pointerId) return;
        this.interaction = null;
        this.windowChange.emit({ mode: this.mode, placement: this.current });
    }

    toggleMinimized(): void { if (this.allowMinimize || this.mode === 'minimized') this.setMode(this.mode === 'minimized' ? 'window' : 'minimized'); }
    toggleMaximized(): void { this.setMode(this.mode === 'maximized' ? 'window' : 'maximized'); }

    moveByKeyboard(event: KeyboardEvent): void {
        if (this.mode === 'maximized' || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const step = event.shiftKey ? 1 : 10;
        const left = this.current.left + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0);
        const top = this.current.top + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0);
        this.current = this.clamp({ ...this.current, left, top });
        this.windowChange.emit({ mode: this.mode, placement: this.current });
    }

    @HostListener('window:resize')
    onViewportResize(): void {
        this.current = this.clamp(this.current);
        this.windowChange.emit({ mode: this.mode, placement: this.current });
    }

    private startInteraction(event: PointerEvent, type: 'move' | 'resize'): void {
        event.preventDefault();
        event.stopPropagation();
        this.focused.emit();
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        this.interaction = { type, pointerId: event.pointerId, x: event.clientX, y: event.clientY, placement: { ...this.current } };
    }

    private setMode(mode: FloatingWindowMode): void {
        this.mode = mode;
        this.focused.emit();
        this.windowChange.emit({ mode, placement: this.current });
    }

    private clamp(value: FloatingWindowPlacement): FloatingWindowPlacement {
        const margin = 12;
        const width = Math.max(320, Math.min(value.width, Math.max(320, window.innerWidth - margin * 2)));
        const height = Math.max(220, Math.min(value.height, Math.max(220, window.innerHeight - margin * 2)));
        const visibleWidth = this.mode === 'minimized' ? FLOATING_WINDOW_MINIMIZED_WIDTH : width;
        const visibleHeight = this.mode === 'minimized' ? FLOATING_WINDOW_MINIMIZED_HEIGHT : height;
        return { left: Math.max(margin, Math.min(value.left, window.innerWidth - visibleWidth - margin)), top: Math.max(margin, Math.min(value.top, window.innerHeight - visibleHeight - margin)), width, height };
    }
}
