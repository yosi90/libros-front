import { HttpErrorResponse } from '@angular/common/http';
import { getApiErrorMessage } from '../shared/api-error-message';
import { CoverUploadError } from './cover-cache.service';

describe('CoverUploadError', () => {
    it('avisa de que los datos se guardaron y añade el motivo del backend', () => {
        const error = new CoverUploadError(new HttpErrorResponse({ status: 403, error: { success: false, error: 'No puedes cambiar esta portada.', code: 'forbidden' } }));

        expect(getApiErrorMessage(error, 'Error al actualizar el libro'))
            .toBe('Los datos se guardaron, pero no se pudo cambiar la portada. No puedes cambiar esta portada.');
    });

    it('sin motivo del backend deja solo el aviso', () => {
        expect(new CoverUploadError(new HttpErrorResponse({ status: 0 })).message)
            .toBe('Los datos se guardaron, pero no se pudo cambiar la portada.');
    });
});
