import { dateOnlyValue } from './all-books.component';

describe('dateOnlyValue', () => {
    it('conserva la fecha completa que exige el backend', () => {
        expect(dateOnlyValue('2016-11-22')).toBe('2016-11-22');
        expect(dateOnlyValue('2016-11-22T00:00:00.000Z')).toBe('2016-11-22');
    });

    it('descarta valores que el backend rechazaría, como el año suelto', () => {
        expect(dateOnlyValue('2016')).toBe('');
        expect(dateOnlyValue('')).toBe('');
        expect(dateOnlyValue(null)).toBe('');
    });
});
