import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
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
export class MobileBookShellComponent {
    @Input({ required: true }) controller!: BookComponent;

    closeIndexFromBackdrop(): void {
        if (this.controller.isCompactLayout)
            this.controller.bookIndexOpen = false;
    }
}
