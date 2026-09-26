import { FormControl } from '@angular/forms';
import { publicationDateInput, publicationDatePayload, publicationDateValidator } from './all-books.component';

describe('fecha de publicación del editor de libros', () => {
    it('acepta año, mes y año o fecha completa y los envía como pide el backend', () => {
        expect(publicationDatePayload('2016')).toBe('2016');
        expect(publicationDatePayload('11/2016')).toBe('2016-11');
        expect(publicationDatePayload('3/2016')).toBe('2016-03');
        expect(publicationDatePayload('22/11/2016')).toBe('2016-11-22');
        expect(publicationDatePayload('2016-11-22')).toBe('2016-11-22');
        expect(publicationDatePayload('  ')).toBeNull();
    });

    it('rechaza fechas imposibles o con otro formato', () => {
        expect(publicationDatePayload('31/02/2016')).toBeUndefined();
        expect(publicationDatePayload('13/2016')).toBeUndefined();
        expect(publicationDatePayload('noviembre 2016')).toBeUndefined();
        expect(publicationDateValidator(new FormControl('16'))).toEqual({ publicationDate: true });
        expect(publicationDateValidator(new FormControl('2016'))).toBeNull();
    });

    it('muestra la fecha guardada como la escribiría una persona', () => {
        expect(publicationDateInput('2016-11-22')).toBe('22/11/2016');
        expect(publicationDateInput('2016-11-22T00:00:00Z')).toBe('22/11/2016');
        expect(publicationDateInput('2016')).toBe('2016');
        expect(publicationDateInput(null)).toBe('');
    });
});
