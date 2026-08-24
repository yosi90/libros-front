import { HttpErrorResponse } from '@angular/common/http';
import { GoogleEmailMismatchConfirmationDetails, GoogleEmailMismatchConfirmationRequired } from '../../interfaces/auth';

export function getGoogleEmailMismatchConfirmationDetails(error: unknown): GoogleEmailMismatchConfirmationDetails | null {
    if (error instanceof HttpErrorResponse && error.status !== 409) return null;
    const body = error instanceof HttpErrorResponse ? error.error : error;
    if (!body || typeof body !== 'object') return null;

    const response = body as Partial<GoogleEmailMismatchConfirmationRequired>;
    const details = response.details;
    if (response.success !== false
        || typeof response.error !== 'string'
        || response.code !== 'google_email_mismatch_confirmation_required'
        || response.field !== 'ConfirmEmailMismatch'
        || !details
        || typeof details.EmailPrincipalEnmascarado !== 'string' || details.EmailPrincipalEnmascarado.length < 5
        || typeof details.EmailGoogleEnmascarado !== 'string' || details.EmailGoogleEnmascarado.length < 5) return null;

    return details;
}
