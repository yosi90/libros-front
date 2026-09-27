import { SnackbarModule } from './snackbar.module';

describe('SnackbarModule', () => {
    it('deduplica por el evento y no por la clase visual heredada', () => {
        const toasts = jasmine.createSpyObj('AppToastService', ['showSuccess', 'showError', 'showInfo', 'showSystem']);
        const snackbar = new SnackbarModule(toasts);

        snackbar.openSnackBar('Email verificado. Ya puedes iniciar sesión.', 'successBar', 3000, { title: 'Correo verificado', dedupeKey: 'auth:email-verified' });
        snackbar.openSnackBar('Email verificado. Ya puedes iniciar sesión.', 'successBar-margin', 3000, { title: 'Correo verificado', dedupeKey: 'auth:email-verified' });

        expect(toasts.showSuccess.calls.count()).toBe(2);
        expect(toasts.showSuccess.calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({
            title: 'Correo verificado',
            dedupeKey: 'auth:email-verified'
        }));
        expect(toasts.showSuccess.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({
            title: 'Correo verificado',
            dedupeKey: 'auth:email-verified'
        }));
    });

    it('muestra los errores de la API con título genérico y el texto concreto del backend', () => {
        const toasts = jasmine.createSpyObj('AppToastService', ['showSuccess', 'showError', 'showInfo', 'showSystem']);
        const snackbar = new SnackbarModule(toasts);

        snackbar.openApiError({ error: { message: 'Échale un vistazo al título' } }, 'Error al actualizar el libro');
        snackbar.openApiError(null, 'Error al cargar el catálogo');

        expect(toasts.showError.calls.count()).toBe(2);
        expect(toasts.showError.calls.argsFor(0)[0]).toBe('Échale un vistazo al título');
        expect(toasts.showError.calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({ title: 'Error al actualizar el libro' }));
        expect(toasts.showError.calls.argsFor(1)[0]).toBe('Error al cargar el catálogo');
    });
});
