import { ChangeDetectionStrategy, Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BookRouterComponent } from '../../../book-router/book-router.component';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import type { BookComponent } from '../../../shared/book-pages/book/book.component';

@Component({
    selector: 'app-mobile-book-shell',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, BookRouterComponent, CoverCachePipe],
    templateUrl: './mobile-book-shell.component.html',
    styleUrl: './mobile-book-shell.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileBookShellComponent implements OnDestroy {
    @Input({ required: true }) controller!: BookComponent;

    indexDragOffset = 0;
    indexDragging = false;
    indexClosing = false;
    actionsDragOffset = 0;
    actionsDragging = false;
    actionsClosing = false;
    private indexPointerId: number | null = null;
    private indexDragStartX = 0;
    private indexDragStartY = 0;
    private actionsPointerId: number | null = null;
    private actionsDragStartY = 0;
    private indexCloseTimer: ReturnType<typeof setTimeout> | null = null;
    private actionsCloseTimer: ReturnType<typeof setTimeout> | null = null;

    ngOnDestroy(): void {
        if (this.indexCloseTimer) clearTimeout(this.indexCloseTimer);
        if (this.actionsCloseTimer) clearTimeout(this.actionsCloseTimer);
    }

    closeIndexFromBackdrop(): void {
        this.controller.bookIndexOpen = false;
    }

    startIndexDrag(event: PointerEvent): void {
        if (this.indexClosing || event.button !== 0) return;
        this.indexPointerId = event.pointerId;
        this.indexDragStartX = event.clientX;
        this.indexDragStartY = event.clientY;
        this.indexDragOffset = 0;
    }

    moveIndexDrag(event: PointerEvent): void {
        if (event.pointerId !== this.indexPointerId) return;
        const deltaX = event.clientX - this.indexDragStartX;
        const deltaY = event.clientY - this.indexDragStartY;
        if (!this.indexDragging) {
            if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
            if (Math.abs(deltaY) >= Math.abs(deltaX) || deltaX >= 0) {
                this.resetIndexDrag();
                return;
            }
            this.indexDragging = true;
            (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
        }
        this.indexDragOffset = Math.min(0, deltaX);
    }

    finishIndexDrag(event: PointerEvent): void {
        if (event.pointerId !== this.indexPointerId) return;
        (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
        if (this.indexDragging && Math.abs(this.indexDragOffset) >= 72) {
            this.indexDragging = false;
            this.indexClosing = true;
            this.indexDragOffset = -window.innerWidth;
            this.indexCloseTimer = setTimeout(() => {
                this.indexCloseTimer = null;
                this.controller.bookIndexOpen = false;
                this.indexClosing = false;
                this.resetIndexDrag();
            }, this.motionDuration(180));
            return;
        }
        this.resetIndexDrag();
    }

    cancelIndexDrag(event: PointerEvent): void {
        if (event.pointerId === this.indexPointerId) this.resetIndexDrag();
    }

    startActionsDrag(event: PointerEvent): void {
        if (this.actionsClosing || event.button !== 0) return;
        this.actionsPointerId = event.pointerId;
        this.actionsDragStartY = event.clientY;
        this.actionsDragOffset = 0;
        this.actionsDragging = true;
        (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    }

    moveActionsDrag(event: PointerEvent): void {
        if (event.pointerId !== this.actionsPointerId) return;
        this.actionsDragOffset = Math.max(0, event.clientY - this.actionsDragStartY);
    }

    finishActionsDrag(event: PointerEvent): void {
        if (event.pointerId !== this.actionsPointerId) return;
        (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
        if (this.actionsDragOffset >= 72) {
            this.actionsDragging = false;
            this.actionsClosing = true;
            this.actionsDragOffset = window.innerHeight;
            this.actionsCloseTimer = setTimeout(() => {
                this.actionsCloseTimer = null;
                this.controller.bookActionsOpen = false;
                this.actionsClosing = false;
                this.resetActionsDrag();
            }, this.motionDuration(200));
            return;
        }
        this.resetActionsDrag();
    }

    cancelActionsDrag(event: PointerEvent): void {
        if (event.pointerId === this.actionsPointerId) this.resetActionsDrag();
    }

    private resetIndexDrag(): void {
        this.indexPointerId = null;
        this.indexDragStartX = 0;
        this.indexDragStartY = 0;
        this.indexDragOffset = 0;
        this.indexDragging = false;
    }

    private resetActionsDrag(): void {
        this.actionsPointerId = null;
        this.actionsDragStartY = 0;
        this.actionsDragOffset = 0;
        this.actionsDragging = false;
    }

    private motionDuration(duration: number): number {
        return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : duration;
    }
}
