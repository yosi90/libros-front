import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { AccountSecurityComponent } from './account-security.component';

describe('AccountSecurityComponent Google linking', () => {
    function createComponent(linkGoogleResult: ReturnType<typeof of> | ReturnType<typeof throwError>) {
        const api = jasmine.createSpyObj('AuthApiService', ['linkGoogle', 'getAccessMethods', 'getSessions']);
        api.linkGoogle.and.returnValue(linkGoogleResult);
        api.getAccessMethods.and.returnValue(of({ success: true, Metodos: [] }));
        api.getSessions.and.returnValue(of({ success: true, Sesiones: [] }));
        const providerAuth = {
            providers: { google: true, phone: false },
            signInGoogle: jasmine.createSpy('signInGoogle').and.resolveTo('firebase-id-token')
        };
        const session = { userEmail: 'reader@outlook.com', logout: jasmine.createSpy('logout') };
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openSnackBar']);
        const presentation = { snapshot: { isMobilePresentationActive: false } };
        const component = new AccountSecurityComponent(
            new FormBuilder(),
            api,
            providerAuth as never,
            session as never,
            snackBar,
            presentation as never
        );
        component.reauthenticationTicket = 'reauth-ticket';
        return { component, api, providerAuth, session, snackBar };
    }

    it('keeps the original ID token in memory and retries only after explicit acceptance', async () => {
        const mismatch = new HttpErrorResponse({
            status: 409,
            error: {
                success: false,
                error: 'Confirmation required',
                code: 'google_email_mismatch_confirmation_required',
                field: 'ConfirmEmailMismatch',
                details: {
                    EmailPrincipalEnmascarado: 'r***@o***.com',
                    EmailGoogleEnmascarado: 'r***@g***.com'
                }
            }
        });
        const { component, api } = createComponent(throwError(() => mismatch));
        api.linkGoogle.and.returnValues(throwError(() => mismatch), of({ success: true }));

        await component.linkGoogle();

        expect(component.googleEmailMismatchDetails?.EmailGoogleEnmascarado).toBe('r***@g***.com');
        expect(api.linkGoogle).toHaveBeenCalledOnceWith('reauth-ticket', 'firebase-id-token');

        component.confirmGoogleEmailMismatch();

        expect(component.googleEmailMismatchDetails).toBeNull();
        expect(api.linkGoogle).toHaveBeenCalledWith('reauth-ticket', 'firebase-id-token', true);
    });

    it('discards the pending proof when confirmation is cancelled', async () => {
        const mismatch = new HttpErrorResponse({
            status: 409,
            error: {
                success: false,
                error: 'Confirmation required',
                code: 'google_email_mismatch_confirmation_required',
                field: 'ConfirmEmailMismatch',
                details: {
                    EmailPrincipalEnmascarado: 'r***@o***.com',
                    EmailGoogleEnmascarado: 'r***@g***.com'
                }
            }
        });
        const { component, api } = createComponent(throwError(() => mismatch));

        await component.linkGoogle();
        component.cancelGoogleEmailMismatchConfirmation();
        component.confirmGoogleEmailMismatch();

        expect(component.googleEmailMismatchDetails).toBeNull();
        expect(api.linkGoogle).toHaveBeenCalledTimes(1);
    });

    it('silences an Android Google cancellation while linking', async () => {
        const { component, api, providerAuth, snackBar } = createComponent(throwError(() => new Error('unused')));
        providerAuth.signInGoogle.and.rejectWith({ message: '12501: ' });

        await component.linkGoogle();

        expect(component.busy).toBeFalse();
        expect(api.linkGoogle).not.toHaveBeenCalled();
        expect(snackBar.openSnackBar).not.toHaveBeenCalled();
    });

    it('closes the current session from account security', () => {
        const { component, session } = createComponent(throwError(() => new Error('unused')));

        component.logout();

        expect(session.logout).toHaveBeenCalledTimes(1);
    });
});
