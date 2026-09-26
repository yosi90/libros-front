import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { WebBookSearchViewComponent } from './web-book-search-view.component';
import type { BookAdvancedSearchComponent } from '../../../shared/book-pages/book-advanced-search/book-advanced-search.component';

describe('WebBookSearchViewComponent', () => {
    let fixture: ComponentFixture<WebBookSearchViewComponent>;
    let controller: Record<string, unknown>;

    const group = {
        category: 'characters', label: 'Personajes', icon: 'co_present', total: 1,
        results: [{ category: 'characters', id: 4, title: 'Iria', subtitle: 'Personaje', matches: [{ field: 'Nombre', snippet: 'Iria' }] }]
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [WebBookSearchViewComponent] }).compileComponents();

        controller = {
            query: new FormControl('Iria', { nonNullable: true }),
            categories: [{ id: 'characters', label: 'Personajes', icon: 'co_present' }, { id: 'quotes', label: 'Citas', icon: 'format_quote' }],
            filters: { characters: true, quotes: false },
            result: { mode: 'exact', total: 1 },
            visibleGroups: [group],
            enabledCategoryCount: 1,
            isGroupExpanded: () => true,
            toggleGroup: jasmine.createSpy('toggleGroup'),
            toggleCategory: jasmine.createSpy('toggleCategory'),
            clearSearch: jasmine.createSpy('clearSearch'),
            openResult: jasmine.createSpy('openResult')
        };

        fixture = TestBed.createComponent(WebBookSearchViewComponent);
        fixture.componentInstance.controller = controller as unknown as BookAdvancedSearchComponent;
        fixture.detectChanges();
    });

    it('focuses the search field on arrival', () => {
        expect(document.activeElement).toBe(fixture.nativeElement.querySelector('input[type=search]'));
    });

    it('reflects the active categories as pressed filters', () => {
        const filters = [...fixture.nativeElement.querySelectorAll('.filter')] as HTMLButtonElement[];

        expect(filters.map(filter => filter.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
        filters[1].click();
        expect(controller['toggleCategory']).toHaveBeenCalledWith('quotes');
    });

    it('opens a result and pluralises the summary', () => {
        expect(fixture.nativeElement.querySelector('.summary').textContent.trim()).toBe('1 resultado');

        (fixture.nativeElement.querySelector('.result') as HTMLButtonElement).click();
        expect(controller['openResult']).toHaveBeenCalledWith(group.results[0]);
    });
});
