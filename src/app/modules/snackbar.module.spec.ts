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
});
