import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Book } from '../../../../interfaces/book';
import {
    AdvancedBookSearchResult,
    AdvancedSearchCategory,
    AdvancedSearchGroup,
    AdvancedSearchResult,
    advancedSearchCategoryOptions,
    createAdvancedSearchFilters,
    searchBook
} from '../../../../shared/book-advanced-search';
import { BookStoreService } from '../../../../services/stores/book-store.service';

@Component({
    standalone: true,
    selector: 'app-book-advanced-search',
    imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule],
    templateUrl: './book-advanced-search.component.html',
    styleUrl: './book-advanced-search.component.sass'
})
export class BookAdvancedSearchComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    book: Book = this.bookStore.libroVacio;
    query = new FormControl('', { nonNullable: true });
    readonly categories = advancedSearchCategoryOptions;
    filters = createAdvancedSearchFilters();
    expandedCategories = new Set<AdvancedSearchCategory>(this.categories.map(category => category.id));
    result: AdvancedBookSearchResult = searchBook(this.book, '', this.filters);

    constructor(
        private bookStore: BookStoreService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.bookStore.book$
            .pipe(takeUntil(this.destroy$))
            .subscribe(book => {
                this.book = book;
                this.refreshResult();
            });

        this.query.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.refreshResult());
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get enabledCategoryCount(): number {
        return this.categories.filter(category => this.filters[category.id]).length;
    }

    get visibleGroups(): AdvancedSearchGroup[] {
        return this.result.groups.filter(group => group.total > 0);
    }

    clearSearch(): void {
        this.query.setValue('');
    }

    toggleCategory(category: AdvancedSearchCategory): void {
        this.filters = {
            ...this.filters,
            [category]: !this.filters[category]
        };
        this.refreshResult();
    }

    toggleGroup(category: AdvancedSearchCategory): void {
        if (this.expandedCategories.has(category)) {
            this.expandedCategories.delete(category);
            return;
        }

        this.expandedCategories.add(category);
    }

    isGroupExpanded(group: AdvancedSearchGroup): boolean {
        return this.expandedCategories.has(group.category);
    }

    openResult(result: AdvancedSearchResult): void {
        this.router.navigate(result.route, {
            queryParams: result.queryParams
        });
    }

    trackByCategory(_: number, group: AdvancedSearchGroup): AdvancedSearchCategory {
        return group.category;
    }

    trackByResult(_: number, result: AdvancedSearchResult): string {
        return `${result.category}-${result.id}`;
    }

    private refreshResult(): void {
        this.result = searchBook(this.book, this.query.value, this.filters);
    }
}
