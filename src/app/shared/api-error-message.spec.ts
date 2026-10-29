import { HttpErrorResponse } from '@angular/common/http';
import { describePlatformRestriction, getApiErrorCode, getApiErrorMessage, getPlatformRestrictionMessage, getProductStateMessage, isPolicyAcceptanceBlock } from './api-error-message';

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
        expect(getProductStateMessage({ code: 'club_owner_limit_reached' })).toBe('Ya administras un club propio. Solo puedes crear uno.');
    });

    it('explains stale anthology section relationships', () => {
        expect(getProductStateMessage({ code: 'anthology_not_in_collection' })).toBe('Esta antología ya no está en tu biblioteca.');
        expect(getProductStateMessage({ code: 'anthology_section_relation_not_found' })).toBe('Esta sección ya no pertenece a la antología.');
    });

    it('explica lo limitado por la moderación de Yosiftware y hasta cuándo, en la hora local', () => {
        const hasta = '2026-11-02T17:30:00Z';
        const error = new HttpErrorResponse({ status: 403, error: {
            error: 'Tu cuenta tiene limitada la creación hasta el 02/11/2026 a las 17:30 (UTC).',
            code: 'platform_restriction_active',
            details: { Alcance: 'creacion', Hasta: hasta }
        } });
        const local = new Date(hasta);
        const expected = `Tu cuenta de Yosiftware tiene limitada la creación de contenido hasta el ${local.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} a las ${local.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.`;

        expect(getPlatformRestrictionMessage(error)).toBe(expected);
        expect(getApiErrorMessage(error, 'No se pudo guardar')).toBe(expected);
    });

    it('dice cuándo la restricción no tiene fin y deja pasar los demás errores', () => {
        expect(getPlatformRestrictionMessage({ code: 'platform_restriction_active', details: { Alcance: 'comunidad', Hasta: null } }))
            .toBe('Tu cuenta de Yosiftware tiene limitada la comunidad sin fecha de fin.');
        expect(describePlatformRestriction(['chat'], null)).toBe('Tu cuenta de Yosiftware tiene limitado el chat sin fecha de fin.');
        expect(getPlatformRestrictionMessage({ code: 'account_sanctioned' })).toBeNull();
    });

    it('trata las normas de Libros pendientes como un aviso de normas, no como un error', () => {
        expect(isPolicyAcceptanceBlock({ code: 'platform_rules_acceptance_required' })).toBeTrue();
        expect(getProductStateMessage({ code: 'platform_rules_acceptance_required' })).toBe('Acepta las normas de Libros para seguir.');
    });

    it('explains that QA deliberately refuses to generate full backups', () => {
        expect(getProductStateMessage({ code: 'admin_backup_unavailable_in_qa' }))
            .toBe('La descarga de backups no está disponible en el entorno de pruebas.');
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

