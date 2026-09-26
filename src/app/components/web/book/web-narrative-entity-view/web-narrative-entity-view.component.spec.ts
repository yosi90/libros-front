import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebNarrativeEntityViewComponent } from './web-narrative-entity-view.component';
import type { NarrativeEntityPlaceholderComponent } from '../../../shared/book-pages/narrative-entity-placeholder/narrative-entity-placeholder.component';

describe('WebNarrativeEntityViewComponent', () => {
    let fixture: ComponentFixture<WebNarrativeEntityViewComponent>;
    let controller: Record<string, unknown>;
    const items = [{ Id: 1, Nombre: 'Ciudad de Bruma' }, { Id: 2, Nombre: 'Muelles' }];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WebNarrativeEntityViewComponent],
            providers: []
        }).compileComponents();

        controller = {
            book: { Id: 7, Nombre: 'Libro', Localizaciones: [], Personajes: [] },
            groupItemsByOrigin: false,
            isFormMode: () => false,
            isUpdateMode: () => false,
            getConfig: () => ({ title: 'Localizaciones', singular: 'localización', icon: 'my_location' }),
            getListPath: () => 'locations',
            getItems: () => items,
            getMixedItems: () => items,
            getTotalLabel: () => 'localizaciones',
            shouldShowViewMode: () => true,
            shouldShowItemIcon: () => false,
            shouldUseMaterialItemIcon: () => false,
            getItemIcon: () => '',
            getItemMeta: () => 'Libro actual',
            trackByEntityItem: (_: number, item: { Id: number }) => item.Id,
            openItem: jasmine.createSpy('openItem'),
            navigateToCreate: jasmine.createSpy('navigateToCreate')
        };

        fixture = TestBed.createComponent(WebNarrativeEntityViewComponent);
        fixture.componentInstance.controller = controller as unknown as NarrativeEntityPlaceholderComponent;
        fixture.detectChanges();
    });

    it('lists the items with their count and opens one on click', () => {
        const cards = [...fixture.nativeElement.querySelectorAll('.item')] as HTMLButtonElement[];

        expect(fixture.nativeElement.querySelector('.entity__title p').textContent).toBe('2 localizaciones');
        expect(cards.map(card => card.querySelector('strong')?.textContent)).toEqual(['Ciudad de Bruma', 'Muelles']);
        cards[1].click();
        expect(controller['openItem']).toHaveBeenCalledWith(items[1]);
    });

    it('switches the grouping from the segmented control', () => {
        const [mixed, byBook] = [...fixture.nativeElement.querySelectorAll('.segmented button')] as HTMLButtonElement[];

        expect(mixed.getAttribute('aria-pressed')).toBe('true');
        byBook.click();
        expect(controller['groupItemsByOrigin']).toBeTrue();
    });

    it('only gives characters, organizations and events a side column', () => {
        expect(fixture.componentInstance.hasSideColumn).toBeFalse();
        controller['getListPath'] = () => 'events';
        expect(fixture.componentInstance.hasSideColumn).toBeTrue();
    });
});
