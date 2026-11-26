import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { WebNarrativeEntityViewComponent } from './web-narrative-entity-view.component';
import type { NarrativeEntityPlaceholderComponent } from '../../../shared/book-pages/narrative-entity-placeholder/narrative-entity-placeholder.component';

describe('WebNarrativeEntityViewComponent', () => {
    let fixture: ComponentFixture<WebNarrativeEntityViewComponent>;
    let controller: Record<string, unknown>;
    const items = [{ Id: 1, Nombre: 'Ciudad de Bruma' }, { Id: 2, Nombre: 'Muelles' }];
    const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WebNarrativeEntityViewComponent],
            providers: [provideRouter([])]
        }).compileComponents();

        controller = {
            book: {
                Id: 7, Nombre: 'Libro', Localizaciones: [], Personajes: [],
                Capitulos: [
                    { Id: 11, Orden: 1, Escenas: [{ Personajes: [{ Id: 5, Nombrado: false }] }] },
                    { Id: 12, Orden: 2, Escenas: [{ Personajes: [{ Id: 5, Nombrado: true }] }, { PersonajesDetalle: [{ Id: 6, Nombrado: false }] }] }
                ]
            },
            isUpdateMode: () => false,
            isCreatingEntity: () => false,
            getConfig: () => ({ title: 'Localizaciones', singular: 'localización', icon: 'my_location' }),
            getListPath: () => 'locations',
            getQuickCreateTitle: () => 'Nueva localización',
            getCurrentItems: () => items,
            getOriginGroups: () => [],
            getMixedItems: () => items,
            shouldShowViewMode: () => false,
            getItemMeta: () => 'Buen estado',
            trackByEntityItem: (_: number, item: { Id: number }) => item.Id,
            switchToItem: jasmine.createSpy('switchToItem'),
            navigateToCreate: jasmine.createSpy('navigateToCreate')
        };

        fixture = TestBed.createComponent(WebNarrativeEntityViewComponent);
        fixture.componentInstance.controller = controller as unknown as NarrativeEntityPlaceholderComponent;
        fixture.detectChanges();
    });

    it('lists the items as rows and opens one, saving the open one first, on click', () => {
        const rows = [...fixture.nativeElement.querySelectorAll('.list__item')] as HTMLButtonElement[];

        expect(rows.map(row => text(row))).toEqual(['Ciudad de BrumaBuen estado', 'MuellesBuen estado']);
        rows[1].click();
        expect(controller['switchToItem']).toHaveBeenCalledWith(items[1]);
        expect(text(fixture.nativeElement.querySelector('.ficha__empty'))).toBe('Elige uno de la lista.');
    });

    it('filters the list without accents', () => {
        fixture.componentInstance.query.setValue('muelle');
        fixture.detectChanges();

        expect([...fixture.nativeElement.querySelectorAll('.list__name')].map(text)).toEqual(['Muelles']);
    });

    it('offers to create from the list', () => {
        (fixture.nativeElement.querySelector('.list__top .web-button') as HTMLButtonElement).click();

        expect(controller['navigateToCreate']).toHaveBeenCalled();
    });

    it('knows in which chapters a character appears, and when only by name', () => {
        const seen = fixture.componentInstance.appearances(5);

        expect(seen.map(stop => [stop.chapter.Orden, stop.named])).toEqual([[1, false], [2, true]]);
        expect(fixture.componentInstance.appearances(6).map(stop => stop.chapter.Orden)).toEqual([2]);
    });
});
