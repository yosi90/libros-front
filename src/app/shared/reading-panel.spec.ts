import { BookStatisticsSnapshot } from '../interfaces/statistics';
import {
    addDays, bestReadingDay, chapterPages, estimatedFinish, lastReadingDays, localDay, milestonesWithoutRepeats, naturalPace, pagesPerDay,
    paceVersusAverage, shortDate, shortWeekday, topCast
} from './reading-panel';
import { ReadingPaceBook } from './reading-pace';

/** Los mismos casos que la APK (`PanelDeLecturaTest`). */
describe('reading-panel', () => {
    /** Del 1 al 5 de noviembre (sin el 3): 24, 42, 13 y 18 páginas desde la 54 (lo de antes, sin fecha). */
    const pace: ReadingPaceBook = {
        Desde: '2026-11-01', DiasActivos: 4, PaginasPorDia: 24.3, MejorDia: { Fecha: '2026-11-02', Paginas: 42 }, MediaPersonalPorDia: 21,
        Curva: [{ Fecha: '2026-11-01', Pagina: 78 }, { Fecha: '2026-11-02', Pagina: 120 }, { Fecha: '2026-11-04', Pagina: 133 }, { Fecha: '2026-11-05', Pagina: 151 }]
    };

    it('las páginas de cada día salen de la curva desde el punto de partida', () => {
        expect(pagesPerDay(pace)).toEqual([
            { date: '2026-11-01', pages: 24 }, { date: '2026-11-02', pages: 42 }, { date: '2026-11-04', pages: 13 }, { date: '2026-11-05', pages: 18 }
        ]);
        // Sin nada antes de la primera fecha, el primer día cuenta desde la página 0.
        const fromZero = { ...pace, DiasActivos: 2, PaginasPorDia: 60, Curva: [{ Fecha: '2026-11-01', Pagina: 78 }, { Fecha: '2026-11-02', Pagina: 120 }] };
        expect(pagesPerDay(fromZero).map(day => day.pages)).toEqual([78, 42]);
        // Un día que no sube no resta.
        const flat = { ...pace, DiasActivos: 2, PaginasPorDia: 5, Curva: [{ Fecha: '2026-11-01', Pagina: 10 }, { Fecha: '2026-11-02', Pagina: 8 }] };
        expect(pagesPerDay(flat).map(day => day.pages)).toEqual([10, 0]);
    });

    it('los últimos días son naturales hasta el último con lectura y se destaca el mejor', () => {
        const days = lastReadingDays(pace, 5);
        expect(days).toEqual([
            { date: '2026-11-05', pages: 18 }, { date: '2026-11-04', pages: 13 }, { date: '2026-11-03', pages: null },
            { date: '2026-11-02', pages: 42 }, { date: '2026-11-01', pages: 24 }
        ]);
        expect(lastReadingDays(pace).length).toBe(7);
        expect(bestReadingDay(days)).toBe('2026-11-02');
        expect(bestReadingDay([{ date: '2026-11-03', pages: null }])).toBeNull();
        expect(lastReadingDays({ ...pace, Curva: [] })).toEqual([]);
    });

    it('el ritmo frente a tu media', () => {
        expect(paceVersusAverage(pace)).toBe('+3 sobre tu media');
        expect(paceVersusAverage({ ...pace, PaginasPorDia: 19 })).toBe('2 bajo tu media');
        expect(paceVersusAverage({ ...pace, PaginasPorDia: 21.2 })).toBe('Como tu media');
        expect(paceVersusAverage({ ...pace, MediaPersonalPorDia: null })).toBeNull();
        expect(paceVersusAverage(null)).toBeNull();
    });

    it('el fin estimado va al ritmo natural desde que empezó', () => {
        const today = '2026-11-06';
        // 97 páginas en 6 días naturales (del 1 al 6): 16,2 al día; quedan 528 - 151 = 377: 24 días.
        expect(naturalPace(pace, today)).toBeCloseTo(97 / 6, 3);
        expect(estimatedFinish({ page: 151, total: 528, percent: 29 }, pace, today, false)).toBe('2026-11-30');
        expect(estimatedFinish({ page: 151, total: null, percent: null }, pace, today, false)).toBeNull();
        expect(estimatedFinish({ page: 151, total: 528, percent: 29 }, pace, today, true)).toBeNull();
        expect(estimatedFinish({ page: 528, total: 528, percent: 100 }, pace, today, false)).toBeNull();
        expect(estimatedFinish({ page: 151, total: 528, percent: 29 }, null, today, false)).toBeNull();
        // A una página al mes no se estima nada.
        const slow = { ...pace, Desde: '2024-01-01', DiasActivos: 1, PaginasPorDia: 1, Curva: [{ Fecha: '2024-01-01', Pagina: 1 }] };
        expect(estimatedFinish({ page: 1, total: 5000, percent: 0 }, slow, today, false)).toBeNull();
    });

    it('las fechas con dato, de la más reciente a la más antigua y sin repetir', () => {
        const milestones = [
            { label: 'Comprado', date: '2026-10-12T00:00:00', detail: '' },
            { label: 'Comenzado', date: '2026-10-27T10:00:00', detail: '' },
            { label: 'Puntuado', date: '2026-11-02T09:00:00', detail: '4 ★' }
        ];
        expect(milestonesWithoutRepeats(milestones, new Set()).map(item => [item.label, item.day, item.detail])).toEqual([
            ['Puntuado', '2026-11-02', '4 ★'], ['Comenzado', '2026-10-27', ''], ['Comprado', '2026-10-12', '']
        ]);
        expect(milestonesWithoutRepeats(milestones, new Set(['Comenzado'])).map(item => item.label)).toEqual(['Puntuado', 'Comprado']);
    });

    it('las fechas cortas y los días', () => {
        const today = '2026-11-06';
        expect(shortDate('2026-10-27', today)).toBe('27 oct');
        expect(shortDate('2025-10-12', today)).toBe('12 oct 2025');
        expect(shortWeekday('2026-11-05')).toBe('jue 5');
        expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
        expect(localDay(new Date(2026, 0, 9, 23, 30))).toBe('2026-01-09');
        expect(localDay('no es fecha')).toBeNull();
    });

    it('el reparto y las páginas de los capítulos', () => {
        const snapshot = {
            LibroId: 1, Nombre: 'Siega',
            Capitulos: [
                { Id: 2, Nombre: 'B', Orden: 2, Pagina: 10, PaginasEstimadas: 7, Escenas: 1, PersonajesPresentes: 0, PersonajesNombrados: 0 },
                { Id: 1, Nombre: 'A', Orden: 1, Pagina: 1, PaginasEstimadas: 9, Escenas: 2, PersonajesPresentes: 0, PersonajesNombrados: 0 },
                { Id: 3, Nombre: 'C', Orden: 3, Pagina: 17, PaginasEstimadas: null, Escenas: 0, PersonajesPresentes: 0, PersonajesNombrados: 0 }
            ],
            Personajes: [
                { Id: 1, Nombre: 'Citra', Apariciones: 2, Nombramientos: 1, Total: 3 },
                { Id: 2, Nombre: 'Rowan', Apariciones: 5, Nombramientos: 0, Total: 5 },
                { Id: 3, Nombre: 'Nadie', Apariciones: 0, Nombramientos: 0, Total: 0 }
            ]
        } as BookStatisticsSnapshot;
        expect(topCast(snapshot).map(item => item.Nombre)).toEqual(['Rowan', 'Citra']);
        expect(topCast(snapshot, 1).map(item => item.Nombre)).toEqual(['Rowan']);
        expect(chapterPages(snapshot)).toEqual([9, 7]);
    });
});
