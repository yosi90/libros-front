import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, Validators } from '@angular/forms';

import { getApiErrorField, markBackendFieldError } from './backend-field-error';

describe('markBackendFieldError', () => {
    const error = new HttpErrorResponse({ status: 400, error: { success: false, code: 'catalog_admin_validation_error', field: 'ISBN', error: 'Revisa el ISBN.' } });

    it('reads the rejected field from the backend error', () => {
        expect(getApiErrorField(error)).toBe('ISBN');
        expect(getApiErrorField(new Error('otro'))).toBeNull();
    });

    it('marks the matching control with the backend text until it changes', () => {
        const isbn = new FormControl('123', [Validators.maxLength(20)]);
        const marked = markBackendFieldError({ Nombre: new FormControl('Libro'), ISBN: isbn }, error);

        expect(marked).toBe(isbn);
        expect(isbn.touched).toBeTrue();
        expect(isbn.getError('server')).toBe('Revisa el ISBN.');
        isbn.setValue('9788410466135');
        expect(isbn.hasError('server')).toBeFalse();
    });

    it('ignores fields that are not in the form', () => {
        expect(markBackendFieldError({ Nombre: new FormControl('') }, error)).toBeNull();
    });
});
