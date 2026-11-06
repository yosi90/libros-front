import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { WebBookStatisticsViewComponent } from './web-book-statistics-view.component';
import type { BookStatisticsComponent } from '../../../shared/book-pages/book-statistics/book-statistics.component';
import { mixHex, presenceHeatmap, readingProgress } from '../../../../shared/book-charts';
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
            ratedDate: '2026-10-26T18:00:00+01:00',
            reviewedDate: null,
            readingMilestones: [
                { label: 'Comenzado', date: '2026-08-20T10:00:00Z', detail: '' },
                { label: 'Puntuado', date: '2026-10-26T18:00:00+01:00', detail: '4 ★' }
            ],
            readingStateLabel: 'Lectura actual',
            readingPace: null,
            canAddPurchaseDate: true,
            isSavingPurchaseDate: false,
            mostFrequentCharacter: { Nombre: 'Iria', Apariciones: 4 },
            mostMentionedCharacter: null,
            purchaseDate: new FormControl<Date | null>(null),
            savePurchaseDateFromInput: jasmine.createSpy('savePurchaseDateFromInput'),
            bookTitle: { available: false }
        };

        fixture = TestBed.createComponent(WebBookStatisticsViewComponent);
        fixture.componentInstance.controller = controller as unknown as BookStatisticsComponent;
        fixture.detectChanges();
    });

    it('shows the current page, without a bar, when the book has no page total', () => {
        expect(fixture.nativeElement.querySelector('.reading-progress__line strong').textContent).toBe('24');
        expect(fixture.nativeElement.querySelector('.reading-progress__bar')).toBeNull();
    });

    it('puts the start in the progress and does not repeat it in the dates; without pace there is no pace tile', () => {
        const text = (selector: string) => [...fixture.nativeElement.querySelectorAll(selector)].map((item: HTMLElement) => item.textContent!.replace(/\s+/g, ' ').trim());

        expect(text('.reading-progress__dates')[0]).toContain('Comenzado 20 ago');
        expect(text('.dates li strong')).toEqual(['Puntuado · 4 ★']);
        expect(fixture.nativeElement.textContent).not.toContain('Sin dato');
        expect(fixture.nativeElement.querySelector('#web-tile-pace')).toBeNull();
        expect(text('.tile__figure')[0]).toMatch(/^2 ?· 3 escenas$/);
        expect(text('.cast li .cast__name')).toEqual(['Iria']);
    });

    it('shows the pace against your average and the last days, with the best one highlighted', () => {
        controller['readingPace'] = {
            Desde: '2026-11-01', DiasActivos: 2, PaginasPorDia: 30, MejorDia: { Fecha: '2026-11-02', Paginas: 40 }, MediaPersonalPorDia: 20,
            Curva: [{ Fecha: '2026-11-01', Pagina: 20 }, { Fecha: '2026-11-02', Pagina: 60 }]
        };
        controller['snapshot'] = { ...snapshot };
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.note.is-up').textContent).toBe('+10 sobre tu media');
        expect(fixture.nativeElement.querySelector('.mini-line polyline')).not.toBeNull();
        const days = [...fixture.nativeElement.querySelectorAll('.days li')] as HTMLElement[];
        expect(days.length).toBe(7);
        expect(days[0].classList).toContain('is-best');
        expect(days[0].querySelector('.days__value')!.textContent).toBe('40');
    });

    it('keeps the big charts behind «Ver gráficos»', () => {
        const button = fixture.nativeElement.querySelector('.more') as HTMLButtonElement;
        expect(button.textContent).toContain('Ver gráficos');
        expect(fixture.nativeElement.querySelector('#web-book-charts')).toBeNull();

        button.click();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('#web-book-charts')).not.toBeNull();
        expect(button.textContent).toContain('Ocultar gráficos');
    });

    it('shows «Tu título» only for a book of the collection, as text', () => {
        expect(fixture.nativeElement.textContent).not.toContain('Tu título');

        controller['bookTitle'] = {
            available: true, title: '<b>Brumas</b> ⚙️ (¬‿¬)', html: null, styles: null, emptyText: 'Aún no tiene título divertido',
            editing: false, generatorOpen: false, generating: false
        };
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Tu título');
        expect(fixture.nativeElement.querySelector('app-web-book-title').textContent).toContain('<b>Brumas</b> ⚙️ (¬‿¬)');
        expect(fixture.nativeElement.querySelector('app-web-book-title b')).toBeNull();
    });

    it('saves a purchase date picked in the card', () => {
        const input = fixture.nativeElement.querySelector('.add-date input') as HTMLInputElement;
        input.value = '2026-07-01';
        input.dispatchEvent(new Event('change'));

        expect(controller['savePurchaseDateFromInput']).toHaveBeenCalledWith('2026-07-01');
    });
});
