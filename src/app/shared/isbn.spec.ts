import { FormControl } from '@angular/forms';
import { isValidIsbn, optionalIsbnValidator } from './isbn';

describe('ISBN', () => {
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
