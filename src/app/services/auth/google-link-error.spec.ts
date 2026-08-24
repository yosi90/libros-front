import { HttpErrorResponse } from '@angular/common/http';
import { getGoogleEmailMismatchConfirmationDetails } from './google-link-error';

describe('getGoogleEmailMismatchConfirmationDetails', () => {
    it('accepts the strict backend confirmation response', () => {
        const details = getGoogleEmailMismatchConfirmationDetails(new HttpErrorResponse({
            status: 409,
            error: {
                success: false,
                error: 'Confirmation required',
                code: 'google_email_mismatch_confirmation_required',
                field: 'ConfirmEmailMismatch',
                details: {
                    EmailPrincipalEnmascarado: 'a***@o***.com',
                    EmailGoogleEnmascarado: 'g***@g***.com'
                }
            }
        }));

        expect(details).toEqual({
            EmailPrincipalEnmascarado: 'a***@o***.com',
            EmailGoogleEnmascarado: 'g***@g***.com'
        });
    });

    it('rejects an unrelated conflict or incomplete details', () => {
        expect(getGoogleEmailMismatchConfirmationDetails({
            code: 'firebase_identity_conflict',
            field: 'ConfirmEmailMismatch',
            details: { EmailPrincipalEnmascarado: 'a***@o***.com' }
        })).toBeNull();
    });
});
