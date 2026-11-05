import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { PlatformSessionService } from '../services/auth/platform-session.service';
import { getApiErrorCode, getApiErrorMessage } from './api-error-message';
import { afterEmailConfirmed, EMAIL_NOT_CONFIRMED } from './email-gate';

describe('afterEmailConfirmed', () => {
    function session(needs: boolean, confirms = false) {
        return {
            needsEmailConfirmation: () => needs,
            confirmEmail: jasmine.createSpy('confirmEmail').and.resolveTo(confirms),
        } as unknown as PlatformSessionService & { confirmEmail: jasmine.Spy };
    }

    it('sends at once when the email is confirmed', () => {
        const s = session(false);
        let value: string | undefined;
        afterEmailConfirmed(s, () => of('ok')).subscribe(v => value = v);
        expect(value).toBe('ok');
        expect(s.confirmEmail).not.toHaveBeenCalled();
    });

    it('asks for the code first and sends once confirmed', async () => {
        const s = session(true, true);
        const request = jasmine.createSpy('request').and.returnValue(of('ok'));
        const value = await new Promise(resolve => afterEmailConfirmed(s, request).subscribe(resolve));
        expect(value).toBe('ok');
        expect(s.confirmEmail).toHaveBeenCalled();
    });

    it('never calls the API if the person does not confirm it', async () => {
        const s = session(true, false);
        const request = jasmine.createSpy('request').and.returnValue(of('ok'));
        const error = await new Promise<unknown>(resolve => afterEmailConfirmed(s, request).subscribe({ error: resolve }));
        expect(request).not.toHaveBeenCalled();
        expect(error instanceof HttpErrorResponse).toBeTrue();
        expect(getApiErrorCode(error)).toBe(EMAIL_NOT_CONFIRMED);
        expect(getApiErrorMessage(error, 'x')).toBe('Confirma tu correo para publicar reseñas o denunciarlas.');
    });
});
