import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { WebBookStatisticsViewComponent } from './web-book-statistics-view.component';
import type { BookStatisticsComponent } from '../../../shared/book-pages/book-statistics/book-statistics.component';
import { mixHex, presenceHeatmap, readingProgress } from './web-book-charts';
import { Book } from '../../../../interfaces/book';
import { BookStatisticsSnapshot } from '../../../../interfaces/statistics';

const palette = { ink: '#000000', muted: '#555555', outline: '#dddddd', surface: '#ffffff', surfaceHigh: '#eeeeee', primary: '#0b6b5e', accent: '#9a5b2e' };

const snapshot = {
    LibroId: 7,
    Nombre: 'Libro',
    Capitulos: [
        { Id: 2, Nombre: 'Largo', Orden: 2, Pagina: 5, PaginaFinal: 24, PaginasEstimadas: 20, PersonajesPresentes: 3, PersonajesNombrados: 2, Escenas: 2 },
        { Id: 1, Nombre: 'Corto', Orden: 1, Pagina: 1, PaginaFinal: 4, PaginasEstimadas: 4, PersonajesPresentes: 1, PersonajesNombrados: 0, Escenas: 1 }
    ],
    Personajes: [{ Id: 9, Nombre: 'Iria', Total: 5, Apariciones: 4, Nombramientos: 1 }]
} as unknown as BookStatisticsSnapshot;

const book = {
    Id: 7,
    Paginas: 96,
    Personajes: [{ Id: 9, Nombre: 'Iria', Grupo: 'Principales' }],
    Capitulos: [
        { Id: 1, Orden: 1, Escenas: [{ Personajes: [{ Id: 9, Nombrado: false }] }] },
        { Id: 2, Orden: 2, Escenas: [{ Personajes: [{ Id: 9, Nombrado: true }] }] }
    ]
} as unknown as Book;

describe('web book charts', () => {
    it('computes the reading progress from the furthest chapter page', () => {
        expect(readingProgress(book, snapshot, false)).toEqual({ page: 24, total: 96, percent: 25 });
        expect(readingProgress({ ...book, Paginas: null }, snapshot, false).percent).toBeNull();
        expect(readingProgress(book, snapshot, true).percent).toBe(100);
    });

    it('marks presence per chapter and only-named chapters with half a point', () => {
        const heatmap = presenceHeatmap(book, snapshot, palette) as { series: Array<{ name: string; data: Array<{ x: string; y: number }> }> };

        expect(heatmap.series[0].name).toBe('Iria');
        expect(heatmap.series[0].data).toEqual([{ x: '1', y: 1 }, { x: '2', y: 0.5 }]);
    });

    it('mixes theme colours for intermediate shades', () => {
        expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    });
});

describe('WebBookStatisticsViewComponent', () => {
    let fixture: ComponentFixture<WebBookStatisticsViewComponent>;
    let controller: Record<string, unknown>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [WebBookStatisticsViewComponent] }).compileComponents();

        controller = {
            book: { ...book, Paginas: null },
            snapshot,
            totalChapters: 2,
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

    it('shows the current page when the book has no page total', () => {
        expect(fixture.nativeElement.querySelector('.reading__page strong').textContent).toBe('24');
        expect(fixture.componentInstance.progressOptions).toBeNull();
    });

    it('marks the reached steps of the reading journey', () => {
        const steps = [...fixture.nativeElement.querySelectorAll('.journey li')] as HTMLElement[];

        expect(steps.map(step => step.classList.contains('is-done'))).toEqual([false, true, false]);
    });

    it('saves a purchase date picked in the journey', () => {
        const input = fixture.nativeElement.querySelector('.journey__date input') as HTMLInputElement;
        input.value = '2026-07-01';
        input.dispatchEvent(new Event('change'));

        expect((controller['purchaseDate'] as FormControl<Date | null>).value?.getDate()).toBe(1);
        expect(controller['savePurchaseDate']).toHaveBeenCalled();
    });
});
