import { FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { OnboardingComponent } from './onboarding.component';

describe('OnboardingComponent', () => {
    function create(context: Observable<unknown>) {
        const flow = { onboarding: { result: { Ticket: 't' }, draft: { registrationEmail: 'errata@example.com' } }, consumeOnboarding: jasmine.createSpy(), setRetryRegistrationEmail: jasmine.createSpy() };
        const api = jasmine.createSpyObj('AuthApiService', ['getOnboardingContext', 'onboard']);
        api.getOnboardingContext.and.returnValue(context);
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openApiError', 'openSnackBar']);
        const loader = jasmine.createSpyObj('LoaderEmmitterService', ['activateLoader', 'deactivateLoader']);
        const router = jasmine.createSpyObj('Router', ['navigateByUrl']);
        const provider = jasmine.createSpyObj('FirebaseProviderAuthService', ['discardPendingPasswordRegistration', 'sendVerification', 'freshIdToken']);
        provider.discardPendingPasswordRegistration.and.resolveTo();
        provider.sendVerification.and.resolveTo();
        provider.freshIdToken.and.resolveTo('firebase-token');
        const session = jasmine.createSpyObj('SessionService', ['completeFirebaseSession']);
        session.completeFirebaseSession.and.returnValue(of({ Estado: 'verification_required' }));
        const component = new OnboardingComponent(new FormBuilder(), flow as any, api, session, provider, loader, snackBar, router, {} as any);
        return { component, api, snackBar, loader, provider, flow, router, session };
    }

    it('explica que sin política no hay alta y permite reintentar la carga', () => {
        const { component, api, snackBar, loader } = create(throwError(() => ({ status: 503 })));
        component.ngOnInit();

        expect(component.viewState.policyFailed).toBeTrue();
        expect(component.viewState.loading).toBeFalse();
        expect(snackBar.openApiError).toHaveBeenCalled();
        component.form.patchValue({ accepted: true });
        component.submit();
        expect(loader.activateLoader).not.toHaveBeenCalled();

        api.getOnboardingContext.and.returnValue(of({ PoliticaUso: { Id: 4, Titulo: 'Normas de uso', Markdown: 'Texto' } }));
        component.loadPolicy();

        expect(component.viewState.policyFailed).toBeFalse();
        expect(component.viewState.policyTitle).toBe('Normas de uso');
    });

    it('no pide el país, muestra el correo y permite volver para corregirlo', async () => {
        const { component, provider, flow, router } = create(of({ PoliticaUso: { Id: 4, Titulo: 'Normas', Markdown: 'Texto' } }));
        component.ngOnInit();
        expect(component.form.contains('countryCode')).toBeFalse();
        expect(component.form.controls.alias.value).toBe('');
        expect(component.viewState.registrationEmail).toBe('errata@example.com');

        await component.changeEmail();
        expect(provider.discardPendingPasswordRegistration).toHaveBeenCalledWith('errata@example.com');
        expect(flow.consumeOnboarding).toHaveBeenCalled();
        expect(flow.setRetryRegistrationEmail).toHaveBeenCalledWith('errata@example.com');
        expect(router.navigateByUrl).toHaveBeenCalledWith('/register');
    });

    it('recupera el perfil pendiente antes de mostrar la verificación', async () => {
        const { component, api, provider, session, router } = create(of({ PoliticaUso: { Id: 4, Titulo: 'Normas', Markdown: 'Texto' } }));
        component.ngOnInit();
        component.form.patchValue({ alias: 'lectora', accepted: true });
        api.onboard.and.returnValue(of({ Estado: 'verification_required' }));

        component.submit();
        expect(api.onboard).toHaveBeenCalledWith(jasmine.objectContaining({ PaisCodigo: 'ES' }));
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(provider.sendVerification).toHaveBeenCalled();
        expect(session.completeFirebaseSession).toHaveBeenCalledWith('firebase-token');
        expect(router.navigateByUrl).toHaveBeenCalledWith('/verify-email-pending');
    });

    it('deja corregir el alias ocupado sin avanzar a verificación', () => {
        const { component, api, snackBar, router, provider } = create(of({ PoliticaUso: { Id: 4, Titulo: 'Normas', Markdown: 'Texto' } }));
        component.ngOnInit();
        component.form.patchValue({ alias: 'ocupado', accepted: true });
        const error = new HttpErrorResponse({ status: 409, error: {
            success: false, code: 'onboarding_alias_taken', field: 'Alias', error: 'Ese alias ya está en uso.'
        } });
        api.onboard.and.returnValue(throwError(() => error));

        component.submit();

        expect(component.form.controls.alias.touched).toBeTrue();
        expect(component.form.controls.alias.getError('server')).toBe('Ese alias ya está en uso.');
        expect(snackBar.openApiError).toHaveBeenCalledWith(error, 'No se pudo completar el registro');
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        expect(provider.sendVerification).not.toHaveBeenCalled();

        component.form.controls.alias.setValue('otro_alias');
        expect(component.form.controls.alias.getError('server')).toBeNull();
        expect(component.form.valid).toBeTrue();
    });
});
