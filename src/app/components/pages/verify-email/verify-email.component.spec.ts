import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { VerifyEmailComponent } from './verify-email.component';

describe('VerifyEmailComponent', () => {
    it('muestra el estado de éxito sin emitir un segundo toast', fakeAsync(() => {
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openSnackBar']);
        const component = new VerifyEmailComponent(
            { snapshot: { queryParamMap: { get: () => 'token' } } } as never,
            jasmine.createSpyObj('Router', ['navigateByUrl']),
            { confirmEmailVerification: jasmine.createSpy().and.resolveTo() } as never,
            jasmine.createSpyObj('LoaderEmmitterService', ['activateLoader', 'deactivateLoader']),
            snackBar,
            jasmine.createSpyObj('SessionService', ['logout']),
            { state: () => ({ isMobilePresentationActive: false }) } as never
        );

        component.ngOnInit();
        flushMicrotasks();

        expect(component.verified).toBeTrue();
        expect(snackBar.openSnackBar).not.toHaveBeenCalled();
    }));
});
