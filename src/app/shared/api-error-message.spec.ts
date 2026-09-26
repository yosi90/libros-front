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

    it('explains stale anthology section relationships', () => {
        expect(getProductStateMessage({ code: 'anthology_not_in_collection' })).toBe('Esta antología ya no está en tu biblioteca.');
        expect(getProductStateMessage({ code: 'anthology_section_relation_not_found' })).toBe('Esta sección ya no pertenece a la antología.');
    });

    it('translates an invalid persisted session into an actionable message', () => {
        expect(getProductStateMessage({ code: 'invalid_token' })).toBe('Tu sesión ya no es válida. Inicia sesión de nuevo.');
        expect(getProductStateMessage({ code: 'user_not_found' })).toBe('Tu sesión ya no está disponible. Inicia sesión de nuevo.');
    });

    it('explains that QA deliberately refuses to generate full backups', () => {
        expect(getProductStateMessage({ code: 'admin_backup_unavailable_in_qa' }))
            .toBe('La descarga de backups no está disponible en el entorno de pruebas.');
    });

    it('explains Firebase failures without codes or technical text', () => {
        expect(getApiErrorMessage({ code: 'auth/network-request-failed', message: 'Firebase: Error (auth/network-request-failed).' }))
            .toBe('No se ha podido completar el acceso. Comprueba tu conexión o prueba otra red.');
        expect(getApiErrorMessage({ code: 'auth/unknown-thing', message: 'Firebase: Error (auth/unknown-thing).' }, 'No se pudo iniciar sesión'))
            .toBe('No se pudo iniciar sesión');
    });

    it('muestra solo `error` del backend, nunca `debug` ni el código', () => {
        const error = new HttpErrorResponse({ status: 400, error: {
            success: false,
            error: 'Revisa la fecha de publicación. Usa un año, un año y mes, o una fecha completa.',
            code: 'catalog_admin_validation_error',
            field: 'FechaPublicacion',
            debug: { message: 'HTTP 400: catalog_admin_validation_error; field=FechaPublicacion', requestId: '9fd1b686178c4c039e08c81f1027d85f' }
        } });

        expect(getApiErrorMessage(error, 'Error al actualizar el libro')).toBe('Revisa la fecha de publicación. Usa un año, un año y mes, o una fecha completa.');
        expect(getProductStateMessage(error)).toBe('Revisa la fecha de publicación. Usa un año, un año y mes, o una fecha completa.');
    });

    it('usa el texto de la pantalla cuando la respuesta no trae `error`', () => {
        const legacy = new HttpErrorResponse({ status: 400, error: { message: 'ValidationError: FechaPublicacion' } });
        expect(getApiErrorMessage(legacy, 'Error al actualizar el libro')).toBe('Error al actualizar el libro');
    });

    it('conserva los textos de error propios de la app', () => {
        expect(getApiErrorMessage(new Error('Solicita primero un código de acceso.'))).toBe('Solicita primero un código de acceso.');
        expect(getApiErrorMessage({ error: { message: 'Selecciona un universo' } })).toBe('Selecciona un universo');
    });

    it('nunca muestra el mensaje técnico de HttpErrorResponse', () => {
        const offline = new HttpErrorResponse({ status: 0, url: 'https://libros-api.yosiftware.es/comunidad/resumen', error: new ProgressEvent('error') });
        expect(getApiErrorMessage(offline, 'Error al cargar la comunidad'))
            .toBe('No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');

        const serverWithoutBody = new HttpErrorResponse({ status: 502, url: 'https://libros-api.yosiftware.es/comunidad/resumen', error: null });
        expect(getApiErrorMessage(serverWithoutBody, 'Error al cargar la comunidad')).toBe('Error al cargar la comunidad');
    });
});

