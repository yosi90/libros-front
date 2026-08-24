import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
    beforeEach(() => TestBed.configureTestingModule({}));

    it('closes the partial session and reports the cause when the library cannot be loaded', () => {
        const session = jasmine.createSpyObj('SessionService', ['login', 'logout'], { canAccessLibrary: true });
        session.login.and.returnValue(of({ success: true, Estado: 'authenticated', AccessToken: 'token', ExpiresIn: 900, CsrfToken: 'csrf', Usuario: {} }));
        const collection = jasmine.createSpyObj('CollectionService', ['getUniverses']);
        collection.getUniverses.and.returnValue(throwError(() => ({
            status: 403,
            code: 'usage_policy_acceptance_required',
            message: 'Debes aceptar las normas antes de continuar.'
        })));
        const authors = jasmine.createSpyObj('AuthorService', ['getAllAuthors']);
        authors.getAllAuthors.and.returnValue(of([]));
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openSnackBar']);
        const loader = jasmine.createSpyObj('LoaderEmmitterService', ['activateLoader', 'deactivateLoader']);
        const router = jasmine.createSpyObj('Router', ['navigateByUrl']);
        const route = { queryParams: of({}) };
        const universeStore = jasmine.createSpyObj('UniverseStoreService', ['setUniverses']);
        const authorStore = jasmine.createSpyObj('AuthorStoreService', ['setAuthors']);
        const provider = { providers: { google: false, phone: false }, signInPassword: jasmine.createSpy() };
        const flow = { link: null, consumeLink: jasmine.createSpy(), setLink: jasmine.createSpy(), setOnboarding: jasmine.createSpy() };
        const authApi = jasmine.createSpyObj('AuthApiService', ['reauthenticate', 'linkWithTicket']);
        const layout = { snapshot: { isDesktop: true } };

        const component = runInInjectionContext(TestBed.inject(EnvironmentInjector), () => new LoginComponent(
            new FormBuilder(), router, session, authors, snackBar, route as any,
            loader, collection, universeStore, authorStore, provider as any, flow as any, authApi, layout as any
        ));
        component.email.setValue('reader@example.com');
        component.contrasena.setValue('secret');

        component.doLogin();

        expect(session.logout).toHaveBeenCalledOnceWith(false);
        expect(loader.deactivateLoader).toHaveBeenCalled();
        expect(snackBar.openSnackBar).toHaveBeenCalledWith(
            'No se pudo completar el inicio de sesión. Debes aceptar la política de uso antes de continuar. Se ha cerrado la sesión.',
            'errorBar',
            6000
        );
        expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('consume el aviso transitorio de correo verificado una sola vez', () => {
        const session = jasmine.createSpyObj('SessionService', ['login', 'logout'], { canAccessLibrary: true });
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openSnackBar']);
        const router = jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate']);
        const route = { queryParams: of({ emailVerified: 'true' }) };
        const provider = { providers: { google: false, phone: false } };
        const component = runInInjectionContext(TestBed.inject(EnvironmentInjector), () => new LoginComponent(
            new FormBuilder(), router, session, jasmine.createSpyObj('AuthorService', ['getAllAuthors']), snackBar, route as any,
            jasmine.createSpyObj('LoaderEmmitterService', ['activateLoader', 'deactivateLoader']), jasmine.createSpyObj('CollectionService', ['getUniverses']),
            jasmine.createSpyObj('UniverseStoreService', ['setUniverses']), jasmine.createSpyObj('AuthorStoreService', ['setAuthors']),
            provider as any, {} as any, {} as any, { snapshot: { isDesktop: true } } as any
        ));

        component.ngOnInit();

        expect(snackBar.openSnackBar).toHaveBeenCalledOnceWith(
            'Email verificado. Ya puedes iniciar sesión.',
            'successBar-margin',
            3000,
            { title: 'Correo verificado', dedupeKey: 'auth:email-verified' }
        );
        expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
            queryParams: { emailVerified: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
        }));
    });

    it('libera el loader cuando el usuario cierra el popup de Google', async () => {
        spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
        const session = jasmine.createSpyObj('SessionService', ['login', 'logout', 'completeFirebaseSession'], { canAccessLibrary: true });
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openSnackBar']);
        const loader = jasmine.createSpyObj('LoaderEmmitterService', ['activateLoader', 'deactivateLoader']);
        const provider = {
            providers: { google: true, phone: false },
            signInGoogle: jasmine.createSpy().and.rejectWith({ code: 'auth/popup-closed-by-user' })
        };
        const component = runInInjectionContext(TestBed.inject(EnvironmentInjector), () => new LoginComponent(
            new FormBuilder(), jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate']), session,
            jasmine.createSpyObj('AuthorService', ['getAllAuthors']), snackBar, { queryParams: of({}) } as any,
            loader, jasmine.createSpyObj('CollectionService', ['getUniverses']),
            jasmine.createSpyObj('UniverseStoreService', ['setUniverses']), jasmine.createSpyObj('AuthorStoreService', ['setAuthors']),
            provider as any, {} as any, {} as any, { snapshot: { isDesktop: true } } as any
        ));

        await component.loginWithGoogle();

        expect(provider.signInGoogle).toHaveBeenCalledOnceWith('popup');
        expect(loader.deactivateLoader).toHaveBeenCalled();
        expect(component.busy).toBeFalse();
        expect(snackBar.openSnackBar).toHaveBeenCalledWith('Inicio de sesión con Google cancelado.', 'infoBar');
    });
});
