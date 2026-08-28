import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import type { BookAdvancedSearchComponent } from '../../../shared/book-pages/book-advanced-search/book-advanced-search.component';

@Component({
    selector: 'app-mobile-book-search-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatIconModule],
    templateUrl: './mobile-book-search-view.component.html',
    styleUrl: './mobile-book-search-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileBookSearchViewComponent {
    @Input({ required: true }) controller!: BookAdvancedSearchComponent;
}
