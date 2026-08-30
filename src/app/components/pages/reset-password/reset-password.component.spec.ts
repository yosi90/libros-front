import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
    function create(inspectResult: Promise<unknown>, actionCode: string | null = 'invalid-code') {
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openSnackBar']);
        const component = TestBed.runInInjectionContext(() => new ResetPasswordComponent(
            new FormBuilder(),
            { snapshot: { queryParamMap: { get: () => actionCode } } } as never,
            jasmine.createSpyObj('Router', ['navigateByUrl']),
            { inspectPasswordResetCode: jasmine.createSpy().and.returnValue(inspectResult) } as never,
            snackBar,
            jasmine.createSpyObj('LoaderEmmitterService', ['activateLoader', 'deactivateLoader']),
            { userIsLogged: false, logout: jasmine.createSpy('logout') } as never,
            { state: () => ({ isMobilePresentationActive: false }) } as never
        ));
        return { component, snackBar };
    }

    it('distingue un enlace inválido del retorno gestionado', fakeAsync(() => {
        const { component, snackBar } = create(Promise.reject(new Error('expired')));

        component.ngOnInit();
        expect(component.flowState).toBe('checking');
        flushMicrotasks();

        expect(component.flowState).toBe('invalid');
        expect(component.actionCode).toBe('');
        expect(snackBar.openSnackBar).toHaveBeenCalledWith('El enlace de recuperación no es válido o ha caducado', 'errorBar');
    }));

    it('solo muestra el formulario después de validar el código', fakeAsync(() => {
        const { component } = create(Promise.resolve());

        component.ngOnInit();
        expect(component.flowState).toBe('checking');
        flushMicrotasks();

        expect(component.flowState).toBe('form');
        expect(component.actionCode).toBe('invalid-code');
    }));

    it('reserva la pantalla completada para el retorno sin código', () => {
        const { component } = create(Promise.resolve(), null);

        component.ngOnInit();

        expect(component.flowState).toBe('managed_return');
    });
});
