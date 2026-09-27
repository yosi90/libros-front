import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { OnboardingComponent } from './onboarding.component';

describe('OnboardingComponent', () => {
    function create(context: ReturnType<typeof of> | ReturnType<typeof throwError>) {
        const flow = { onboarding: { result: { Ticket: 't' }, draft: { alias: 'lector', countryCode: 'ES' } } };
        const api = jasmine.createSpyObj('AuthApiService', ['getOnboardingContext', 'onboard']);
        api.getOnboardingContext.and.returnValue(context);
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openApiError', 'openSnackBar']);
        const loader = jasmine.createSpyObj('LoaderEmmitterService', ['activateLoader', 'deactivateLoader']);
        const router = jasmine.createSpyObj('Router', ['navigateByUrl']);
        const component = new OnboardingComponent(new FormBuilder(), flow as any, api, {} as any, {} as any, loader, snackBar, router, {} as any);
        return { component, api, snackBar, loader };
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
});
