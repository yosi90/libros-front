import { of } from 'rxjs';
import { VerifyEmailComponent } from './verify-email.component';

describe('VerifyEmailComponent', () => {
    it('muestra el estado de éxito sin emitir un segundo toast', () => {
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openSnackBar']);
        const component = new VerifyEmailComponent(
            { snapshot: { queryParamMap: { get: () => 'token' } } } as never,
            jasmine.createSpyObj('Router', ['navigateByUrl']),
            { confirm: jasmine.createSpy().and.returnValue(of(void 0)) } as never,
            jasmine.createSpyObj('LoaderEmmitterService', ['activateLoader', 'deactivateLoader']),
            snackBar,
            jasmine.createSpyObj('SessionService', ['logout'])
        );

        component.ngOnInit();

        expect(component.verified).toBeTrue();
        expect(snackBar.openSnackBar).not.toHaveBeenCalled();
    });
});
