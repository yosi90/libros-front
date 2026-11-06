import { FormControl } from '@angular/forms';
import { isValidIsbn, normalizeIsbn, optionalIsbnValidator } from './isbn';
import casos from './casos-de-validacion.json';

describe('ISBN', () => {
    it('sigue los casos compartidos con la APK (casos-de-validacion.json)', () => {
        for (const caso of casos.isbn) {
            expect(normalizeIsbn(caso.valor)).withContext(caso.valor).toBe(caso.normalizado);
            expect(isValidIsbn(caso.valor)).withContext(caso.valor).toBe(caso.valido);
        }
    });

    it('acepta ISBN-13 y ISBN-10 con separadores o X', () => {
        ['978-0-306-40615-7', '0 306 40615 2', '0-8044-2957-X'].forEach(value => expect(isValidIsbn(value)).toBeTrue());
    });

    it('rechaza ceros, prefijos ajenos al ISBN y digitos de control incorrectos', () => {
        ['0', '0000000000', '0000000000000', '9788445016764', '1234567890128', '0306406153'].forEach(value => expect(isValidIsbn(value)).toBeFalse());
    });

    it('admite el ISBN desconocido en un control opcional', () => {
        expect(optionalIsbnValidator(new FormControl(''))).toBeNull();
        expect(optionalIsbnValidator(new FormControl('9788445016764'))).toEqual({ isbn: true });
    });
});
