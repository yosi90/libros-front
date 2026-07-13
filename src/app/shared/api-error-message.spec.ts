import { HttpErrorResponse } from '@angular/common/http';
import { getApiErrorCode, getApiErrorMessage, getProductStateMessage } from './api-error-message';

describe('api error helpers', () => {
    it('reads a stable functional code from an HTTP response body', () => {
        const error = new HttpErrorResponse({
            status: 403,
            error: { error: 'No puedes publicar ahora', code: 'account_sanctioned' }
        });

        expect(getApiErrorCode(error)).toBe('account_sanctioned');
        expect(getApiErrorMessage(error)).toBe('No puedes publicar ahora');
    });

    it('returns null when the response has no functional code', () => {
        expect(getApiErrorCode({ error: 'Acceso denegado' })).toBeNull();
    });

    it('translates club limits into a product state', () => {
        expect(getProductStateMessage({ code: 'club_membership_limit_reached' })).toBe('Ya participas en tres clubes activos. Sal de uno antes de unirte a otro.');
    });
});
