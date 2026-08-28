import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment';
import { NativeSessionTransportAdapter } from '../native/native-session-transport.adapter';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService access method linking', () => {
    let service: AuthApiService;
    let http: HttpTestingController;
    const endpoint = `${environment.apiUrl}auth/access-methods/link`;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
        service = TestBed.inject(AuthApiService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('does not send the email mismatch confirmation on the first Google attempt', () => {
        service.linkGoogle('reauth-ticket', 'firebase-token').subscribe();

        const request = http.expectOne(endpoint);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({
            ReauthenticationTicket: 'reauth-ticket',
            FirebaseIdToken: 'firebase-token'
        });
        request.flush({ success: true });
    });

    it('sends explicit confirmation when retrying the same Google link', () => {
        service.linkGoogle('reauth-ticket', 'firebase-token', true).subscribe();

        const request = http.expectOne(endpoint);
        expect(request.request.body).toEqual({
            ReauthenticationTicket: 'reauth-ticket',
            FirebaseIdToken: 'firebase-token',
            ConfirmEmailMismatch: true
        });
        request.flush({ success: true });
    });

    it('keeps the phone contract separate from Google confirmation', () => {
        service.linkPhone('reauth-ticket', 'firebase-token', 'phone-attempt').subscribe();

        const request = http.expectOne(endpoint);
        expect(request.request.body).toEqual({
            ReauthenticationTicket: 'reauth-ticket',
            FirebaseIdToken: 'firebase-token',
            PhoneAttemptId: 'phone-attempt'
        });
        request.flush({ success: true });
    });
});

describe('AuthApiService en Android', () => {
    it('intercambia la sesión mediante el transporte nativo', async () => {
        const nativeTransport = jasmine.createSpyObj<NativeSessionTransportAdapter>('NativeSessionTransportAdapter', [
            'exchange', 'restoreCsrf', 'refresh', 'logout'
        ]);
        nativeTransport.exchange.and.resolveTo({
            success: true,
            Estado: 'onboarding_required',
            Ticket: 'onboarding-ticket',
            ExpiresIn: 600
        });
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                AuthApiService,
                { provide: NativeSessionTransportAdapter, useValue: nativeTransport },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: true }
            ]
        });

        const service = TestBed.inject(AuthApiService);
        const request = { FirebaseIdToken: 'native-id-token', Device: { Platform: 'android' } };
        const result = await firstValueFrom(service.exchange(request));

        expect(result.Estado).toBe('onboarding_required');
        expect(nativeTransport.exchange).toHaveBeenCalledOnceWith(request);
        TestBed.inject(HttpTestingController).expectNone(`${environment.apiUrl}auth/session`);
    });
});
