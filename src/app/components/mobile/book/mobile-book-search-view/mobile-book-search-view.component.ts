import { ChangeDetectionStrategy, Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import type { BookAdvancedSearchComponent } from '../../../shared/book-pages/book-advanced-search/book-advanced-search.component';
import { MobileScopedSearchComponent } from '../../ui/mobile-scoped-search/mobile-scoped-search.component';

@Component({
    selector: 'app-mobile-book-search-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatIconModule, MobileScopedSearchComponent],
    templateUrl: './mobile-book-search-view.component.html',
    styleUrl: './mobile-book-search-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileBookSearchViewComponent {
    @Input({ required: true }) controller!: BookAdvancedSearchComponent;
    contentScrolled = false;

    @HostListener('scroll', ['$event'])
    onScroll(event: Event): void {
        this.contentScrolled = (event.currentTarget as HTMLElement).scrollTop > 0;
    }

    updateQuery(event: Event): void {
        this.controller.query.setValue((event.target as HTMLInputElement).value);
    }
}
