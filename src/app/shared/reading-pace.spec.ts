import { paceComparison, paceDayLabel, paceHourBandRows, paceMonthRows, paceWeekdayRows, ReadingPaceBook } from './reading-pace';
import { paceCurveChart } from './book-charts';

describe('reading-pace', () => {
    const book: ReadingPaceBook = {
        Desde: '2026-10-25',
        DiasActivos: 2,
        PaginasPorDia: 30,
        MejorDia: { Fecha: '2026-10-26', Paginas: 40 },
        MediaPersonalPorDia: 20,
        Curva: [{ Fecha: '2026-10-25', Pagina: 20 }, { Fecha: '2026-10-26', Pagina: 60 }]
    };

    it('los meses sin dato de la comunidad (null por el umbral) no salen como cero', () => {
        expect(paceMonthRows([
            { Anio: 2026, Mes: 10, Paginas: 120 },
            { Anio: 2026, Mes: 11, Paginas: null }
        ])).toEqual([{ label: 'oct 2026', value: 120 }]);
    });

    it('los días de la semana van de lunes a domingo y rellenan con cero', () => {
        const rows = paceWeekdayRows([5, 0, 3]);
        expect(rows.length).toBe(7);
        expect(rows[0]).toEqual({ label: 'Lunes', value: 5 });
        expect(rows[6]).toEqual({ label: 'Domingo', value: 0 });
    });

    it('agrupa las 24 horas en cuatro franjas', () => {
        const hours = Array.from({ length: 24 }, (_, hour) => hour === 7 ? 10 : hour === 22 ? 4 : 0);
        expect(paceHourBandRows(hours).map(row => row.value)).toEqual([0, 10, 0, 4]);
    });

    it('compara el ritmo de la obra con la media propia', () => {
        expect(paceComparison(book)).toBe('Más rápido que tu media');
        expect(paceComparison({ ...book, PaginasPorDia: 21 })).toBe('A tu ritmo de siempre');
        expect(paceComparison({ ...book, PaginasPorDia: 10 })).toBe('Más pausado que tu media');
        expect(paceComparison({ ...book, MediaPersonalPorDia: null })).toBe('');
        expect(paceComparison(null)).toBe('');
    });

    it('etiqueta los días sin desplazarse por la zona horaria', () => {
        expect(paceDayLabel('2026-10-25')).toContain('25');
        expect(paceDayLabel('no-es-fecha')).toBe('no-es-fecha');
    });

    it('la curva del libro sigue la página alcanzada cada día, y no se dibuja sin datos', () => {
        const palette = { ink: '#000', muted: '#555', outline: '#ccc', surface: '#fff', surfaceHigh: '#eee', primary: '#0b6b5e', accent: '#9a5b2e' };
        const chart = paceCurveChart(book, palette) as any;
        expect(chart.series[0].data).toEqual([20, 60]);
        expect(chart.xaxis.categories.length).toBe(2);
        expect(paceCurveChart(null, palette)).toBeNull();
        expect(paceCurveChart({ ...book, Curva: [] }, palette)).toBeNull();
    });
});
