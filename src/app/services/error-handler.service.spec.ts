import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandlerService } from './error-handler.service';
import { connectionErrorMessage } from '../shared/api-error-message';

class TestErrorHandler extends ErrorHandlerService { }

describe('ErrorHandlerService', () => {
    function messageFor(error: HttpErrorResponse): string {
        let message = '';
        new TestErrorHandler().errorHandle(error, 'Libro').subscribe({ error: (custom: Error) => message = custom.message });
        return message;
    }

    it('sin conexión usa el mismo aviso que el resto de la app', () => {
        expect(messageFor(new HttpErrorResponse({ status: 0 }))).toBe(connectionErrorMessage);
    });

    it('prefiere la frase del backend', () => {
        expect(messageFor(new HttpErrorResponse({ status: 404, error: { error: 'El libro ya no existe.' } }))).toBe('El libro ya no existe.');
    });
});
