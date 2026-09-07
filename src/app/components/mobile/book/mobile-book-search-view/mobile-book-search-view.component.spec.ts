import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { MobileBookSearchViewComponent } from './mobile-book-search-view.component';
import type { BookAdvancedSearchComponent } from '../../../shared/book-pages/book-advanced-search/book-advanced-search.component';

describe('MobileBookSearchViewComponent', () => {
    let fixture: ComponentFixture<MobileBookSearchViewComponent>;
    let controller: Record<string, unknown>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [MobileBookSearchViewComponent] }).compileComponents();

        controller = {
            query: new FormControl('', { nonNullable: true }),
            result: { total: 0, mode: 'empty', groups: [] },
            categories: [{ id: 'chapters', icon: 'menu_book', label: 'Capítulos' }],
            filters: { chapters: true },
            visibleGroups: [],
            enabledCategoryCount: 1,
            clearSearch: jasmine.createSpy('clearSearch'),
            toggleCategory: jasmine.createSpy('toggleCategory'),
            toggleGroup: jasmine.createSpy('toggleGroup'),
            isGroupExpanded: () => true,
            openResult: jasmine.createSpy('openResult')
        };

        fixture = TestBed.createComponent(MobileBookSearchViewComponent);
        fixture.componentInstance.controller = controller as unknown as BookAdvancedSearchComponent;
        fixture.detectChanges();
    });

    it('uses the integrated search bar without a redundant page heading', () => {
        const toolbar = fixture.nativeElement.querySelector('.m-book-search__toolbar') as HTMLElement;

        expect(fixture.nativeElement.querySelector('h1')).toBeNull();
        expect(toolbar.textContent).toContain('0 resultados');
        expect(toolbar.querySelector('app-mobile-scoped-search')).not.toBeNull();
    });

    it('updates the shared query while typing', () => {
        const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
        input.value = 'Kaladin';
        input.dispatchEvent(new Event('input'));

        expect((controller['query'] as FormControl<string>).value).toBe('Kaladin');
    });

    it('activates the divider only after its own scroll moves', () => {
        fixture.componentInstance.onScroll({ currentTarget: { scrollTop: 1 } } as unknown as Event);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.m-book-search__toolbar').classList).toContain('is-scrolled');
    });
});
