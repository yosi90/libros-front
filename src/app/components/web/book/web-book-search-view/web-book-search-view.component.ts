import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import type { BookAdvancedSearchComponent } from '../../../shared/book-pages/book-advanced-search/book-advanced-search.component';

/** Búsqueda Web dentro del libro: campo, categorías y resultados agrupados. */
@Component({
    selector: 'app-web-book-search-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatIconModule],
    templateUrl: './web-book-search-view.component.html',
    styleUrl: './web-book-search-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebBookSearchViewComponent implements AfterViewInit {
    @Input({ required: true }) controller!: BookAdvancedSearchComponent;
    @ViewChild('queryInput') private queryInput?: ElementRef<HTMLInputElement>;

    get c(): BookAdvancedSearchComponent { return this.controller; }

    ngAfterViewInit(): void {
        this.queryInput?.nativeElement.focus({ preventScroll: true });
    }
}
