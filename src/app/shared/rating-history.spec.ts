import { ratingAverageRows, ratingCountRows, ratingEvolutionRows, ratingReviewTotal, RatingMonth } from './rating-history';

describe('rating-history', () => {
    const months: RatingMonth[] = [
        { Anio: 2026, Mes: 10, Puntuaciones: 0, Resenas: 0, NotaMedia: null },
        { Anio: 2026, Mes: 11, Puntuaciones: null, Resenas: null, NotaMedia: null },
        { Anio: 2026, Mes: 12, Puntuaciones: 3, Resenas: 2, NotaMedia: 3.67 }
    ];

    it('los meses ocultos por el umbral no salen como cero, y se empieza en el primero con datos', () => {
        expect(ratingCountRows(months)).toEqual([{ label: 'dic 2026', value: 3 }]);
        expect(ratingCountRows([...months, { Anio: 2027, Mes: 1, Puntuaciones: 0, Resenas: 0, NotaMedia: null }]).map(row => row.value)).toEqual([3, 0]);
    });

    it('sin ninguna puntuación no hay filas', () => {
        expect(ratingCountRows([{ Anio: 2026, Mes: 10, Puntuaciones: 0, Resenas: 0, NotaMedia: null }])).toEqual([]);
        expect(ratingCountRows(null)).toEqual([]);
    });

    it('la nota media solo en los meses que la tienen, y las reseñas sumadas', () => {
        expect(ratingAverageRows(months)).toEqual([{ label: 'dic 2026', value: 3.67 }]);
        expect(ratingReviewTotal(months)).toBe(2);
    });

    it('la evolución de una obra con la nota en formato español', () => {
        expect(ratingEvolutionRows([
            { Anio: 2026, Mes: 11, NotaMedia: null, Puntuaciones: null },
            { Anio: 2026, Mes: 12, NotaMedia: 4.5, Puntuaciones: 3 }
        ])).toEqual([{ label: 'dic 2026', value: '4,5' }]);
    });
});
