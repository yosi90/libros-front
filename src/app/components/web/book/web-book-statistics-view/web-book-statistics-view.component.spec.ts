import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { WebBookStatisticsViewComponent } from './web-book-statistics-view.component';
import type { BookStatisticsComponent } from '../../../shared/book-pages/book-statistics/book-statistics.component';

describe('WebBookStatisticsViewComponent', () => {
    let fixture: ComponentFixture<WebBookStatisticsViewComponent>;
    let controller: Record<string, unknown>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [WebBookStatisticsViewComponent] }).compileComponents();

        controller = {
            snapshot: {
                Capitulos: [
                    { Id: 1, Nombre: 'Corto', PaginasEstimadas: 4, PersonajesPresentes: 1, PersonajesNombrados: 0, Escenas: 1 },
                    { Id: 2, Nombre: 'Largo', PaginasEstimadas: 20, PersonajesPresentes: 3, PersonajesNombrados: 2, Escenas: 2 },
                    { Id: 3, Nombre: 'Sin páginas', PaginasEstimadas: null, PersonajesPresentes: 0, PersonajesNombrados: 0, Escenas: 0 }
                ],
                Personajes: [{ Id: 9, Nombre: 'Iria', Total: 5, Apariciones: 4, Nombramientos: 1 }],
                MetricasPersonajes: null
            },
            totalChapters: 3,
            totalScenes: 3,
            totalPresentCharacters: 4,
            totalMentionedCharacters: 2,
            averagePagesByChapter: 12,
            boughtDate: null,
            startedDate: '2026-08-20T10:00:00Z',
            finishedDate: null,
            startedDateLabel: 'Sin dato',
            readDateLabel: 'Lectura actual',
            canAddPurchaseDate: true,
            isSavingPurchaseDate: false,
            mostFrequentCharacter: { Nombre: 'Iria', Apariciones: 4 },
            mostMentionedCharacter: null,
            purchaseDate: new FormControl<Date | null>(null),
            savePurchaseDate: jasmine.createSpy('savePurchaseDate')
        };

        fixture = TestBed.createComponent(WebBookStatisticsViewComponent);
        fixture.componentInstance.controller = controller as unknown as BookStatisticsComponent;
        fixture.detectChanges();
    });

    it('ranks chapters by pages and skips chapters without them', () => {
        const rows = [...fixture.nativeElement.querySelectorAll('.rankings .panel:first-child .bar span')] as HTMLElement[];

        expect(rows.map(row => row.textContent)).toEqual(['Largo', 'Corto']);
    });

    it('marks the reached steps of the reading journey', () => {
        const steps = [...fixture.nativeElement.querySelectorAll('.journey li')] as HTMLElement[];

        expect(steps.map(step => step.classList.contains('is-done'))).toEqual([false, true, false]);
        expect(steps[2].textContent).toContain('Lectura actual');
    });

    it('saves a purchase date picked in the journey', () => {
        const input = fixture.nativeElement.querySelector('.journey__date input') as HTMLInputElement;
        input.value = '2026-07-01';
        input.dispatchEvent(new Event('change'));

        expect((controller['purchaseDate'] as FormControl<Date | null>).value?.getDate()).toBe(1);
        expect(controller['savePurchaseDate']).toHaveBeenCalled();
    });
});
